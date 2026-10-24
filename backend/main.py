"""FastAPI application for the AI-Powered Intelligent Meeting Planner."""

import sqlite3
from contextlib import asynccontextmanager
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from fastapi import Depends, FastAPI, HTTPException, Query, Request, Response
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.middleware.gzip import GZipMiddleware

from backend.auth import (
    check_login_rate_limit,
    clear_auth_cookie,
    create_session_token,
    get_client_ip,
    get_current_user,
    get_optional_user,
    hash_password,
    record_login_attempt,
    require_admin,
    reset_login_rate_limit,
    set_auth_cookie,
    validate_email_format,
    verify_password,
)
from backend.database import get_connection, initialize_database, rows_as_dicts
from backend.models import (
    BusySlotCreate,
    MeetingConfirmRequest,
    MeetingRescheduleRequest,
    MeetingSuggestRequest,
    ParseRequest,
    ParticipantCreate,
    UserLoginRequest,
    UserRoleUpdateRequest,
    UserSignupRequest,
)
from backend.nlp_parser import parse_meeting_request
from backend.notifier import create_meeting_notifications, deliver_due_notifications
from backend.scheduler import find_common_slots, parse_datetime
from backend.seed_data import seed_demo_data

@asynccontextmanager
async def lifespan(application: FastAPI):
    initialize_database()
    seed_demo_data()
    yield


app = FastAPI(title="AI-Powered Intelligent Meeting Planner", lifespan=lifespan)


# Add GZip compression for responses > 1000 bytes
app.add_middleware(GZipMiddleware, minimum_size=1000)

FRONTEND = Path(__file__).resolve().parent.parent / "frontend"


# Cache-Control headers for static frontend assets
@app.middleware("http")
async def add_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/static/"):
        response.headers["Cache-Control"] = "public, max-age=3600"
    return response


app.mount("/static", StaticFiles(directory=FRONTEND), name="static")


def _validate_timezone(timezone_name: str) -> None:
    try:
        ZoneInfo(timezone_name)
    except ZoneInfoNotFoundError as error:
        raise HTTPException(status_code=422, detail=f"Unknown timezone: {timezone_name}") from error


def _people_and_busy(connection: sqlite3.Connection) -> tuple[list[dict], list[dict]]:
    people = rows_as_dicts(connection.execute("SELECT * FROM participants ORDER BY name").fetchall())
    busy = rows_as_dicts(connection.execute("SELECT * FROM busy_slots").fetchall())
    meetings = connection.execute(
        """SELECT mp.participant_id, m.start_time, m.end_time, m.title
           FROM meeting_participants mp JOIN meetings m ON m.id = mp.meeting_id
           WHERE m.status = 'scheduled'"""
    ).fetchall()
    busy.extend(
        {
            "participant_id": row["participant_id"],
            "start_time": row["start_time"],
            "end_time": row["end_time"],
            "title": row["title"],
        }
        for row in meetings
    )
    return people, busy


def _all_ids(required: list[int], optional: list[int]) -> list[int]:
    return list(dict.fromkeys(required + optional))


def _check_overlap(
    connection: sqlite3.Connection,
    participant_ids: list[int],
    start: datetime,
    end: datetime,
    exclude_meeting_id: int | None = None,
) -> list[str]:
    """Return people with an overlapping busy block or scheduled meeting."""
    conflicts: set[int] = set()
    for participant_id in participant_ids:
        blocks = connection.execute(
            """SELECT start_time, end_time FROM busy_slots
               WHERE participant_id = ?""",
            (participant_id,),
        ).fetchall()
        for block in blocks:
            if parse_datetime(block["start_time"]) < end and parse_datetime(block["end_time"]) > start:
                conflicts.add(participant_id)
                break
        sql = """SELECT m.id, m.start_time, m.end_time
                 FROM meeting_participants mp JOIN meetings m ON m.id = mp.meeting_id
                 WHERE mp.participant_id = ? AND m.status = 'scheduled'"""
        values: list = [participant_id]
        if exclude_meeting_id is not None:
            sql += " AND m.id != ?"
            values.append(exclude_meeting_id)
        for meeting in connection.execute(sql, values).fetchall():
            if parse_datetime(meeting["start_time"]) < end and parse_datetime(meeting["end_time"]) > start:
                conflicts.add(participant_id)
                break
    if not conflicts:
        return []
    placeholders = ",".join("?" for _ in conflicts)
    return [
        row["name"]
        for row in connection.execute(
            f"SELECT name FROM participants WHERE id IN ({placeholders}) ORDER BY name",
            tuple(conflicts),
        ).fetchall()
    ]


@app.get("/")
def landing_page(request: Request) -> Response:
    if get_optional_user(request):
        return RedirectResponse(url="/dashboard", status_code=302)
    return FileResponse(FRONTEND / "landing.html")


@app.get("/dashboard")
def dashboard_page(request: Request) -> Response:
    if not get_optional_user(request):
        return RedirectResponse(url="/login", status_code=302)
    return FileResponse(FRONTEND / "index.html")


@app.get("/login")
def login_page(request: Request) -> Response:
    if get_optional_user(request):
        return RedirectResponse(url="/dashboard", status_code=302)
    return FileResponse(FRONTEND / "login.html")


@app.get("/signup")
def signup_page(request: Request) -> Response:
    if get_optional_user(request):
        return RedirectResponse(url="/dashboard", status_code=302)
    return FileResponse(FRONTEND / "signup.html")


@app.get("/schedule")
def schedule_page(request: Request) -> Response:
    if not get_optional_user(request):
        return RedirectResponse(url="/login", status_code=302)
    return FileResponse(FRONTEND / "schedule.html")


# ============================================================================
# AUTHENTICATION ENDPOINTS
# ============================================================================

@app.post("/auth/signup", status_code=201)
def auth_signup(req: UserSignupRequest, response: Response) -> dict:
    email = validate_email_format(req.email)
    if len(req.password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters long.")

    role = "admin" if req.role == "admin" else "member"
    pwd_hash = hash_password(req.password)
    now_iso = datetime.now(timezone.utc).isoformat()

    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """INSERT INTO users(name, email, password_hash, role, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                (req.name.strip(), email, pwd_hash, role, now_iso),
            )
            user_id = cursor.lastrowid
            user = dict(
                connection.execute(
                    "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
                    (user_id,),
                ).fetchone()
            )
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="An account with this email address already exists.")

    token = create_session_token(user_id)
    set_auth_cookie(response, token)
    return user


@app.post("/auth/login")
def auth_login(req: UserLoginRequest, request: Request, response: Response) -> dict:
    ip = get_client_ip(request)
    email = req.email.strip().lower()
    check_login_rate_limit(ip, email)

    with get_connection() as connection:
        user_row = connection.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()

    if not user_row or not verify_password(req.password, user_row["password_hash"]):
        record_login_attempt(ip, email)
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    reset_login_rate_limit(ip, email)
    token = create_session_token(user_row["id"])
    set_auth_cookie(response, token)
    return {
        "id": user_row["id"],
        "name": user_row["name"],
        "email": user_row["email"],
        "role": user_row["role"],
        "created_at": user_row["created_at"],
    }


@app.post("/auth/logout")
def auth_logout(response: Response) -> dict:
    clear_auth_cookie(response)
    return {"message": "Logged out successfully."}


@app.get("/auth/me")
def auth_me(current_user: dict = Depends(get_current_user)) -> dict:
    return current_user


@app.get("/auth/users")
def auth_list_users(admin: dict = Depends(require_admin)) -> list[dict]:
    with get_connection() as connection:
        rows = connection.execute(
            "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
        ).fetchall()
        return rows_as_dicts(rows)


@app.put("/auth/users/{user_id}/role")
def auth_update_user_role(
    user_id: int, role_data: UserRoleUpdateRequest, admin: dict = Depends(require_admin)
) -> dict:
    if role_data.role not in ("admin", "member"):
        raise HTTPException(status_code=422, detail="Role must be either 'admin' or 'member'.")

    with get_connection() as connection:
        cursor = connection.execute(
            "UPDATE users SET role = ? WHERE id = ?", (role_data.role, user_id)
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="User not found.")
        row = connection.execute(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ?", (user_id,)
        ).fetchone()
        return dict(row)


@app.get("/admin/analytics")
def get_admin_analytics(
    days: int = Query(default=30, ge=1, le=365, description="Number of past days for trend analysis"),
    admin: dict = Depends(require_admin),
) -> dict:
    """Return comprehensive aggregated analytics covering all system tables for the admin dashboard."""
    today = date.today()
    date_list = [(today - timedelta(days=d)).isoformat() for d in range(days - 1, -1, -1)]
    now_iso = datetime.now(timezone.utc).isoformat()

    with get_connection() as connection:
        total_users = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        total_participants = connection.execute("SELECT COUNT(*) FROM participants").fetchone()[0]
        total_meetings = connection.execute("SELECT COUNT(*) FROM meetings").fetchone()[0]
        total_busy_slots = connection.execute("SELECT COUNT(*) FROM busy_slots").fetchone()[0]

        upcoming_meetings = connection.execute(
            "SELECT COUNT(*) FROM meetings WHERE status = 'scheduled' AND start_time >= ?",
            (now_iso,),
        ).fetchone()[0]

        pending_notifications = connection.execute(
            "SELECT COUNT(*) FROM notifications WHERE sent = 0"
        ).fetchone()[0]
        sent_notifications = connection.execute(
            "SELECT COUNT(*) FROM notifications WHERE sent = 1"
        ).fetchone()[0]

        all_meetings = rows_as_dicts(
            connection.execute(
                "SELECT id, title, date, start_time, end_time, status, created_at, user_id FROM meetings"
            ).fetchall()
        )

        durations: list[float] = []
        duration_buckets_map = {"<=30m": 0, "31-60m": 0, "61-90m": 0, ">90m": 0}
        weekday_counts = {i: 0 for i in range(7)}  # 0: Mon ... 6: Sun
        hour_counts = {h: 0 for h in range(24)}
        meeting_date_counts: dict[str, int] = {}

        for m in all_meetings:
            m_date = m.get("date") or (m.get("start_time", "")[:10])
            if m_date:
                meeting_date_counts[m_date] = meeting_date_counts.get(m_date, 0) + 1

            try:
                st = parse_datetime(m["start_time"])
                et = parse_datetime(m["end_time"])
                diff_mins = max(0.0, (et - st).total_seconds() / 60.0)
                durations.append(diff_mins)
                if diff_mins <= 30:
                    duration_buckets_map["<=30m"] += 1
                elif diff_mins <= 60:
                    duration_buckets_map["31-60m"] += 1
                elif diff_mins <= 90:
                    duration_buckets_map["61-90m"] += 1
                else:
                    duration_buckets_map[">90m"] += 1

                weekday_counts[st.weekday()] += 1
                hour_counts[st.hour] += 1
            except Exception:
                continue

        avg_meeting_minutes = round(sum(durations) / len(durations), 1) if durations else 0.0

        meetings_per_day = [{"date": d, "count": meeting_date_counts.get(d, 0)} for d in date_list]

        weekday_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
        meetings_by_weekday = [
            {"day": weekday_names[i], "count": weekday_counts[i]} for i in range(7)
        ]
        meetings_by_hour = [{"hour": h, "count": hour_counts[h]} for h in range(24)]
        meeting_duration_buckets = [
            {"bucket": k, "count": v} for k, v in duration_buckets_map.items()
        ]

        all_users = rows_as_dicts(
            connection.execute("SELECT id, name, email, role, created_at FROM users").fetchall()
        )
        user_date_counts: dict[str, int] = {}
        for u in all_users:
            u_date = (u.get("created_at") or "")[:10]
            if u_date:
                user_date_counts[u_date] = user_date_counts.get(u_date, 0) + 1
        signups_over_time = [{"date": d, "count": user_date_counts.get(d, 0)} for d in date_list]

        role_rows = connection.execute(
            "SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY count DESC"
        ).fetchall()
        users_by_role = [{"label": row["role"], "value": row["count"]} for row in role_rows]

        status_rows = connection.execute(
            "SELECT status, COUNT(*) as count FROM meetings GROUP BY status ORDER BY count DESC"
        ).fetchall()
        meetings_by_status = [{"label": row["status"], "value": row["count"]} for row in status_rows]

        tz_rows = connection.execute(
            "SELECT timezone, COUNT(*) as count FROM participants GROUP BY timezone ORDER BY count DESC"
        ).fetchall()
        participants_by_timezone = [{"label": row["timezone"], "value": row["count"]} for row in tz_rows]

        busiest_by_meetings = [
            {"id": row["id"], "name": row["name"], "count": row["count"]}
            for row in connection.execute(
                """SELECT p.id, p.name, COUNT(mp.meeting_id) as count
                   FROM participants p
                   JOIN meeting_participants mp ON p.id = mp.participant_id
                   GROUP BY p.id, p.name
                   ORDER BY count DESC
                   LIMIT 5"""
            ).fetchall()
        ]

        busiest_by_busy_slots = [
            {"id": row["id"], "name": row["name"], "count": row["count"]}
            for row in connection.execute(
                """SELECT p.id, p.name, COUNT(b.id) as count
                   FROM participants p
                   JOIN busy_slots b ON p.id = b.participant_id
                   GROUP BY p.id, p.name
                   ORDER BY count DESC
                   LIMIT 5"""
            ).fetchall()
        ]

        req_count = connection.execute(
            "SELECT COUNT(*) FROM meeting_participants WHERE required = 1"
        ).fetchone()[0]
        opt_count = connection.execute(
            "SELECT COUNT(*) FROM meeting_participants WHERE required = 0"
        ).fetchone()[0]
        required_vs_optional = [
            {"label": "Required", "value": req_count},
            {"label": "Optional", "value": opt_count},
        ]

        notifications_sent_vs_pending = [
            {"label": "Sent", "value": sent_notifications},
            {"label": "Pending", "value": pending_notifications},
        ]

        meetings_per_user = [
            {"id": row["id"], "name": row["name"], "count": row["count"]}
            for row in connection.execute(
                """SELECT u.id, u.name, COUNT(m.id) as count
                   FROM users u
                   JOIN meetings m ON u.id = m.user_id
                   GROUP BY u.id, u.name
                   ORDER BY count DESC
                   LIMIT 5"""
            ).fetchall()
        ]

    return {
        "kpis": {
            "total_users": total_users,
            "total_participants": total_participants,
            "total_meetings": total_meetings,
            "upcoming_meetings": upcoming_meetings,
            "total_busy_slots": total_busy_slots,
            "pending_notifications": pending_notifications,
            "sent_notifications": sent_notifications,
            "avg_meeting_minutes": avg_meeting_minutes,
        },
        "users_by_role": users_by_role,
        "meetings_by_status": meetings_by_status,
        "meetings_per_day": meetings_per_day,
        "meetings_by_weekday": meetings_by_weekday,
        "meetings_by_hour": meetings_by_hour,
        "meeting_duration_buckets": meeting_duration_buckets,
        "participants_by_timezone": participants_by_timezone,
        "busiest_participants": {
            "by_meetings": busiest_by_meetings,
            "by_busy_slots": busiest_by_busy_slots,
        },
        "required_vs_optional": required_vs_optional,
        "notifications_sent_vs_pending": notifications_sent_vs_pending,
        "signups_over_time": signups_over_time,
        "meetings_per_user": meetings_per_user,
        "time_range_days": days,
    }


# ============================================================================
# PARTICIPANTS & CALENDAR ENDPOINTS
# ============================================================================

@app.get("/participants")
def list_or_view_participants(request: Request):
    accept = request.headers.get("accept", "")
    if "text/html" in accept and "application/json" not in accept:
        if not get_optional_user(request):
            return RedirectResponse(url="/login", status_code=302)
        return FileResponse(FRONTEND / "participants.html")
    # For JSON requests, enforce authentication
    current_user = get_current_user(request)
    with get_connection() as connection:
        return rows_as_dicts(connection.execute("SELECT * FROM participants ORDER BY name").fetchall())


@app.get("/health")
@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/participants", status_code=201)
def create_participant(
    participant: ParticipantCreate, current_user: dict = Depends(get_current_user)
) -> dict:
    _validate_timezone(participant.timezone)
    try:
        time.fromisoformat(participant.work_start)
        time.fromisoformat(participant.work_end)
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Working hours must use HH:MM format.") from error
    try:
        with get_connection() as connection:
            cursor = connection.execute(
                """INSERT INTO participants(name, email, timezone, work_start, work_end, user_id)
                   VALUES (?, ?, ?, ?, ?, ?)""",
                (
                    participant.name.strip(),
                    participant.email.strip().lower(),
                    participant.timezone,
                    participant.work_start,
                    participant.work_end,
                    current_user["id"],
                ),
            )
            row = connection.execute(
                "SELECT * FROM participants WHERE id = ?", (cursor.lastrowid,)
            ).fetchone()
            return dict(row)
    except sqlite3.IntegrityError as error:
        raise HTTPException(status_code=409, detail="That email address is already registered.") from error


@app.delete("/participants/{participant_id}")
def delete_participant(
    participant_id: int, current_user: dict = Depends(get_current_user)
) -> dict[str, str]:
    with get_connection() as connection:
        cursor = connection.execute("DELETE FROM participants WHERE id = ?", (participant_id,))
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Participant not found.")
    return {"message": "Participant deleted."}


@app.post("/busy-slots", status_code=201)
def create_busy_slot(
    block: BusySlotCreate, current_user: dict = Depends(get_current_user)
) -> dict:
    try:
        start = parse_datetime(block.start_time)
        end = parse_datetime(block.end_time)
    except (ValueError, ZoneInfoNotFoundError) as error:
        raise HTTPException(status_code=422, detail="Busy slot times must be valid ISO datetimes.") from error
    if end <= start:
        raise HTTPException(status_code=422, detail="Busy slot end must be after its start.")
    with get_connection() as connection:
        try:
            cursor = connection.execute(
                """INSERT INTO busy_slots(participant_id, start_time, end_time, title)
                   VALUES (?, ?, ?, ?)""",
                (block.participant_id, start.isoformat(), end.isoformat(), block.title),
            )
        except sqlite3.IntegrityError as error:
            raise HTTPException(status_code=404, detail="Participant not found.") from error
        return dict(
            connection.execute("SELECT * FROM busy_slots WHERE id = ?", (cursor.lastrowid,)).fetchone()
        )


@app.get("/participants/{participant_id}/availability")
def participant_availability(
    participant_id: int,
    day: date = Query(alias="date"),
    current_user: dict = Depends(get_current_user),
) -> dict:
    with get_connection() as connection:
        people, busy = _people_and_busy(connection)
    selected = next((person for person in people if person["id"] == participant_id), None)
    if not selected:
        raise HTTPException(status_code=404, detail="Participant not found.")
    slots = find_common_slots(people, busy, day, 30, [participant_id], timezone_name="UTC")
    return {"participant": selected, "date": day.isoformat(), "available_slots": slots}



def _suggest_for_day(request: MeetingSuggestRequest, day: date) -> list[dict]:
    with get_connection() as connection:
        people, busy = _people_and_busy(connection)
    _validate_timezone(request.timezone)
    return find_common_slots(
        people,
        busy,
        day,
        request.duration_minutes,
        request.participant_ids,
        request.optional_participant_ids,
        request.timezone,
        request.preferred_start,
        request.preferred_end,
    )


@app.post("/meetings/suggest")
def suggest_meeting(
    request: MeetingSuggestRequest, current_user: dict = Depends(get_current_user)
) -> dict:
    _validate_timezone(request.timezone)
    selected_ids = _all_ids(request.participant_ids, request.optional_participant_ids)
    with get_connection() as connection:
        people, _ = _people_and_busy(connection)
    valid_ids = {person["id"] for person in people}
    if any(person_id not in valid_ids for person_id in selected_ids):
        raise HTTPException(status_code=404, detail="A selected participant does not exist.")
    try:
        slots = _suggest_for_day(request, request.date)
    except ValueError as error:
        raise HTTPException(status_code=422, detail=str(error)) from error
    if slots:
        return {"slots": slots, "blocking_participants": [], "nearest_alternative_day": None}

    individually_free = {
        person_id
        for person_id in request.participant_ids
        if _suggest_for_day(
            request.model_copy(update={"participant_ids": [person_id], "optional_participant_ids": []}),
            request.date,
        )
    }
    blocking_ids = [person_id for person_id in request.participant_ids if person_id not in individually_free]
    if not blocking_ids:
        blocking_ids = list(request.participant_ids)
    blockers = [person["name"] for person in people if person["id"] in blocking_ids]
    alternative = None
    for offset in range(1, 8):
        next_day = request.date + timedelta(days=offset)
        alternatives = _suggest_for_day(request, next_day)
        if alternatives:
            alternative = {"date": next_day.isoformat(), "slots": alternatives[:3]}
            break
    return {
        "slots": [],
        "blocking_participants": blockers,
        "nearest_alternative_day": alternative,
    }


@app.post("/meetings/confirm", status_code=201)
def confirm_meeting(
    request: MeetingConfirmRequest, current_user: dict = Depends(get_current_user)
) -> dict:
    _validate_timezone(request.timezone)
    try:
        start = parse_datetime(request.start_time, request.timezone)
        end = parse_datetime(request.end_time, request.timezone)
    except (ValueError, ZoneInfoNotFoundError) as error:
        raise HTTPException(status_code=422, detail="Meeting times must be valid ISO datetimes.") from error
    if end <= start:
        raise HTTPException(status_code=422, detail="Meeting end must be after its start.")
    duration_seconds = (end - start).total_seconds()
    if duration_seconds % 60:
        raise HTTPException(status_code=422, detail="Meeting duration must use whole minutes.")
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        existing = {
            row["id"] for row in connection.execute("SELECT id FROM participants").fetchall()
        }
        participant_ids = _all_ids(request.participant_ids, request.optional_participant_ids)
        if not participant_ids or any(person_id not in existing for person_id in participant_ids):
            raise HTTPException(status_code=404, detail="A selected participant does not exist.")
        conflicts = _check_overlap(connection, request.participant_ids, start, end)
        if conflicts:
            raise HTTPException(
                status_code=409,
                detail=f"Double-booking prevented. Conflicting participants: {', '.join(conflicts)}.",
            )
        local_start = start.astimezone(ZoneInfo(request.timezone))
        people, busy = _people_and_busy(connection)
        duration_minutes = int(duration_seconds // 60)
        valid_required_slots = find_common_slots(
            people,
            busy,
            local_start.date(),
            duration_minutes,
            request.participant_ids,
            timezone_name=request.timezone,
        )
        if not any(
            parse_datetime(slot["start_time"]) == start and parse_datetime(slot["end_time"]) == end
            for slot in valid_required_slots
        ):
            raise HTTPException(
                status_code=409,
                detail="This time is no longer available for all required participants.",
            )
        available_optional_ids = []
        for person_id in request.optional_participant_ids:
            optional_slots = find_common_slots(
                people,
                busy,
                local_start.date(),
                duration_minutes,
                request.participant_ids,
                [person_id],
                request.timezone,
            )
            if any(
                parse_datetime(slot["start_time"]) == start
                and parse_datetime(slot["end_time"]) == end
                for slot in optional_slots
            ):
                available_optional_ids.append(person_id)
        participant_ids = _all_ids(request.participant_ids, available_optional_ids)
        cursor = connection.execute(
            """INSERT INTO meetings(title, date, start_time, end_time, status, created_at, user_id)
               VALUES (?, ?, ?, ?, 'scheduled', ?, ?)""",
            (
                request.title.strip(),
                local_start.date().isoformat(),
                start.isoformat(),
                end.isoformat(),
                datetime.now(timezone.utc).isoformat(),
                current_user["id"],
            ),
        )
        meeting_id = cursor.lastrowid
        for person_id in participant_ids:
            connection.execute(
                "INSERT INTO meeting_participants(meeting_id, participant_id, required) VALUES (?, ?, ?)",
                (meeting_id, person_id, int(person_id in request.participant_ids)),
            )
        create_meeting_notifications(connection, meeting_id, participant_ids, start)
        row = connection.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
        return dict(row)


@app.get("/meetings")
def list_meetings(current_user: dict = Depends(get_current_user)) -> list[dict]:
    """Optimized batch query to eliminate N+1 database queries."""
    with get_connection() as connection:
        meetings = rows_as_dicts(
            connection.execute("SELECT * FROM meetings ORDER BY start_time").fetchall()
        )
        if not meetings:
            return []

        meeting_ids = [m["id"] for m in meetings]
        placeholders = ",".join("?" for _ in meeting_ids)
        participant_rows = connection.execute(
            f"""SELECT mp.meeting_id, p.id, p.name, p.email, mp.required
               FROM meeting_participants mp JOIN participants p ON p.id = mp.participant_id
               WHERE mp.meeting_id IN ({placeholders}) ORDER BY p.name""",
            tuple(meeting_ids),
        ).fetchall()

        parts_by_meeting: dict[int, list[dict]] = {}
        for row in participant_rows:
            mid = row["meeting_id"]
            if mid not in parts_by_meeting:
                parts_by_meeting[mid] = []
            parts_by_meeting[mid].append({
                "id": row["id"],
                "name": row["name"],
                "email": row["email"],
                "required": row["required"],
            })

        for meeting in meetings:
            meeting["participants"] = parts_by_meeting.get(meeting["id"], [])

    return meetings


@app.get("/meetings/{meeting_id}/ics")
def download_meeting_ics(
    meeting_id: int, current_user: dict = Depends(get_current_user)
) -> Response:
    """Generates standard iCalendar (.ics) file for 1-click import into Google/Outlook/Apple Calendar."""
    with get_connection() as connection:
        meeting = connection.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,)).fetchone()
        if not meeting:
            raise HTTPException(status_code=404, detail="Meeting not found.")
        m_dict = dict(meeting)
        attendees = connection.execute(
            """SELECT p.name, p.email FROM meeting_participants mp
               JOIN participants p ON p.id = mp.participant_id
               WHERE mp.meeting_id = ?""",
            (meeting_id,),
        ).fetchall()

    dt_start = parse_datetime(m_dict["start_time"]).strftime("%Y%m%dT%H%M%SZ")
    dt_end = parse_datetime(m_dict["end_time"]).strftime("%Y%m%dT%H%M%SZ")
    now_stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    attendee_lines = "\n".join(f"ATTENDEE;CN={row['name']}:mailto:{row['email']}" for row in attendees)
    
    # Safe summary string
    clean_title = m_dict["title"].replace("\n", " ").replace("\r", "")
    ics_body = f"""BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//MeetWise//AI Meeting Planner//EN
CALSCALE:GREGORIAN
METHOD:REQUEST
BEGIN:VEVENT
UID:meetwise-{meeting_id}-{dt_start}@meetwise.local
DTSTAMP:{now_stamp}
DTSTART:{dt_start}
DTEND:{dt_end}
SUMMARY:{clean_title}
DESCRIPTION:Scheduled via MeetWise AI-Powered Meeting Planner
STATUS:CONFIRMED
{attendee_lines}
END:VEVENT
END:VCALENDAR"""

    return Response(
        content=ics_body.strip(),
        media_type="text/calendar",
        headers={"Content-Disposition": f'attachment; filename="meeting-{meeting_id}.ics"'},
    )


@app.delete("/meetings/{meeting_id}")
def cancel_meeting(
    meeting_id: int, current_user: dict = Depends(get_current_user)
) -> dict[str, str]:
    with get_connection() as connection:
        cursor = connection.execute(
            "UPDATE meetings SET status = 'cancelled' WHERE id = ? AND status = 'scheduled'",
            (meeting_id,),
        )
        if cursor.rowcount == 0:
            raise HTTPException(status_code=404, detail="Scheduled meeting not found.")
        connection.execute("DELETE FROM notifications WHERE meeting_id = ?", (meeting_id,))
    return {"message": "Meeting cancelled."}


@app.put("/meetings/{meeting_id}/reschedule")
def reschedule_meeting(
    meeting_id: int,
    request: MeetingRescheduleRequest,
    current_user: dict = Depends(get_current_user),
) -> dict:
    try:
        start = parse_datetime(request.start_time)
        end = parse_datetime(request.end_time)
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Meeting times must be valid ISO datetimes.") from error
    if end <= start:
        raise HTTPException(status_code=422, detail="Meeting end must be after its start.")
    with get_connection() as connection:
        connection.execute("BEGIN IMMEDIATE")
        meeting = connection.execute(
            "SELECT * FROM meetings WHERE id = ? AND status = 'scheduled'", (meeting_id,)
        ).fetchone()
        if not meeting:
            raise HTTPException(status_code=404, detail="Scheduled meeting not found.")
        participant_ids = [
            row["participant_id"]
            for row in connection.execute(
                "SELECT participant_id FROM meeting_participants WHERE meeting_id = ?",
                (meeting_id,),
            ).fetchall()
        ]
        conflicts = _check_overlap(connection, participant_ids, start, end, meeting_id)
        if conflicts:
            raise HTTPException(
                status_code=409,
                detail=f"Double-booking prevented. Conflicting participants: {', '.join(conflicts)}.",
            )
        connection.execute(
            "UPDATE meetings SET date = ?, start_time = ?, end_time = ? WHERE id = ?",
            (start.date().isoformat(), start.isoformat(), end.isoformat(), meeting_id),
        )
        connection.execute("DELETE FROM notifications WHERE meeting_id = ?", (meeting_id,))
        create_meeting_notifications(connection, meeting_id, participant_ids, start)
        return dict(connection.execute("SELECT * FROM meetings WHERE id = ?", (meeting_id,)).fetchone())


@app.post("/parse-request")
def parse_request(
    request: ParseRequest, current_user: dict = Depends(get_current_user)
) -> dict:
    _validate_timezone(request.timezone)
    with get_connection() as connection:
        people = rows_as_dicts(connection.execute("SELECT * FROM participants").fetchall())
    try:
        return parse_meeting_request(request.text, people, request.timezone)
    except (ValueError, ZoneInfoNotFoundError) as error:
        raise HTTPException(status_code=422, detail=str(error)) from error


@app.get("/notifications")
def list_notifications(current_user: dict = Depends(get_current_user)) -> dict:
    delivered = deliver_due_notifications()
    with get_connection() as connection:
        notifications = rows_as_dicts(
            connection.execute(
                """SELECT n.*, p.name AS participant_name, m.title AS meeting_title,
                          m.start_time AS meeting_start
                   FROM notifications n
                   JOIN participants p ON p.id = n.participant_id
                   JOIN meetings m ON m.id = n.meeting_id
                   ORDER BY n.notify_at DESC"""
            ).fetchall()
        )
    return {"notifications": notifications, "newly_delivered": delivered}


@app.post("/notifications/check-due")
def check_due_notifications(current_user: dict = Depends(get_current_user)) -> dict[str, int]:
    return {"delivered": deliver_due_notifications()}


@app.post("/seed-demo-data")
def trigger_seed_demo_data(
    force: bool = True, current_user: dict = Depends(get_current_user)
) -> dict[str, str]:
    seed_demo_data(force=force)
    return {"message": "Demo data seeded successfully."}



# ============================================================================
# EXTENSION STUBS (For future Google Calendar / Microsoft Graph / Zoom sync)
# ============================================================================

def sync_with_google_calendar_stub(meeting_id: int) -> bool:
    """
    Hook for Google Calendar API synchronization (v3).
    When GOOGLE_CLIENT_ID and refresh token are present, creates event via Google API.
    """
    return False


def generate_video_conference_link_stub(provider: str = "meet") -> str:
    """
    Hook for Google Meet / Zoom API meeting link generation.
    Returns generated room URL or fallback.
    """
    return f"https://meet.google.com/xyz-{provider}-abc"

