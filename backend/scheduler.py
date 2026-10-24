"""
Interval Intersection Scheduling Algorithm Core Module.

Implements the 5-step scheduling workflow:
1. Normalize participant working hours to a common timezone (UTC).
2. Subtract busy intervals and existing meetings to compute disjoint free blocks.
3. Intersect free intervals across all REQUIRED participants using two-pointer intersection: O(N+M).
4. Slice common free intervals into candidate slots >= requested duration.
5. Score and rank slots by:
   - Preferred time window
   - Avoiding local lunch hours (12:00 - 13:30 in each participant's local timezone)
   - Attendance of OPTIONAL participants
   - Buffer before/after meetings (avoiding back-to-back zoom fatigue)
   - Earliest time in day preference
"""

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from typing import List, Tuple, Dict, Any, Optional
import sqlite3

from backend.database import get_connection, rows_as_dicts


# ============================================================================
# TIMEZONE & DATETIME UTILITIES
# ============================================================================

def get_timezone(tz_name: str) -> ZoneInfo:
    """Safely returns a ZoneInfo object, defaulting to UTC if not found."""
    try:
        return ZoneInfo(tz_name.strip())
    except (ZoneInfoNotFoundError, Exception):
        return ZoneInfo("UTC")


def parse_datetime(value: str | datetime, default_tz: str = "UTC") -> datetime:
    """
    Parses an ISO datetime string into a timezone-aware UTC datetime.
    If naive, applies default_tz then converts to UTC.
    """
    if isinstance(value, datetime):
        if value.tzinfo is None:
            return value.replace(tzinfo=get_timezone(default_tz)).astimezone(timezone.utc)
        return value.astimezone(timezone.utc)

    cleaned = str(value).strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(cleaned)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=get_timezone(default_tz))
    return dt.astimezone(timezone.utc)


# Alias for backward compatibility
parse_iso_datetime = parse_datetime


def format_iso(dt: datetime) -> str:
    """Formats datetime to standard ISO 8601 UTC string ending with Z."""
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def parse_time_str(time_str: str) -> time:
    """Parses 'HH:MM' string into a datetime.time object."""
    parts = time_str.strip().split(":")
    return time(hour=int(parts[0]), minute=int(parts[1]))


def get_working_hours_utc(
    target_date: date,
    work_start_str: str,
    work_end_str: str,
    tz_name: str,
) -> Tuple[datetime, datetime]:
    """
    Converts participant's local working hours on a given calendar date
    into a timezone-aware (start_utc, end_utc) tuple.

    Example for Viva:
    Date: 2026-10-15, Work: 09:00 - 17:00, TZ: Asia/Kolkata (+05:30)
    Local start: 2026-10-15 09:00:00 IST -> UTC: 2026-10-15 03:30:00 UTC
    Local end:   2026-10-15 17:00:00 IST -> UTC: 2026-10-15 11:30:00 UTC
    """
    tz = get_timezone(tz_name)
    start_t = parse_time_str(work_start_str)
    end_t = parse_time_str(work_end_str)

    local_start = datetime.combine(target_date, start_t, tzinfo=tz)
    local_end = datetime.combine(target_date, end_t, tzinfo=tz)

    utc_start = local_start.astimezone(timezone.utc)
    utc_end = local_end.astimezone(timezone.utc)
    return (utc_start, utc_end)


# ============================================================================
# INTERVAL ARITHMETIC CORE (Viva Examination Highlight)
# ============================================================================

def merge_intervals(
    intervals: List[Tuple[datetime, datetime]],
) -> List[Tuple[datetime, datetime]]:
    """
    Merges overlapping or contiguous intervals into disjoint intervals.
    Sort by start time + single linear scan: O(N log N).
    """
    if not intervals:
        return []

    sorted_intervals = sorted(intervals, key=lambda item: item[0])
    merged = [sorted_intervals[0]]

    for current_start, current_end in sorted_intervals[1:]:
        last_start, last_end = merged[-1]
        if current_start <= last_end:
            # Overlapping or adjacent -> merge
            merged[-1] = (last_start, max(last_end, current_end))
        else:
            merged.append((current_start, current_end))

    return merged


def subtract_intervals(
    base_intervals: List[Tuple[datetime, datetime]],
    busy_intervals: List[Tuple[datetime, datetime]],
) -> List[Tuple[datetime, datetime]]:
    """
    Subtracts busy intervals from base working hours.
    Returns disjoint free intervals.

    Algorithm:
    For each busy block [B_start, B_end] against current free interval [F_start, F_end]:
    - If no overlap: keep [F_start, F_end].
    - If overlap:
      * Keep left remainder [F_start, B_start] if F_start < B_start.
      * Keep right remainder [B_end, F_end] if B_end < F_end.
    """
    if not base_intervals:
        return []
    if not busy_intervals:
        return base_intervals

    merged_busy = merge_intervals(busy_intervals)
    current_free = list(base_intervals)

    for b_start, b_end in merged_busy:
        next_free = []
        for f_start, f_end in current_free:
            if b_start >= f_end or b_end <= f_start:
                # No overlap
                next_free.append((f_start, f_end))
            else:
                # Overlap -> slice
                if f_start < b_start:
                    next_free.append((f_start, b_start))
                if b_end < f_end:
                    next_free.append((b_end, f_end))
        current_free = next_free

    return current_free


def intersect_two_interval_lists(
    list_a: List[Tuple[datetime, datetime]],
    list_b: List[Tuple[datetime, datetime]],
) -> List[Tuple[datetime, datetime]]:
    """
    Two-Pointer Interval Intersection Algorithm:
    Computes common overlapping intervals between two sorted disjoint lists.
    Time Complexity: O(len(list_a) + len(list_b)).
    """
    result = []
    i = 0
    j = 0

    while i < len(list_a) and j < len(list_b):
        a_start, a_end = list_a[i]
        b_start, b_end = list_b[j]

        overlap_start = max(a_start, b_start)
        overlap_end = min(a_end, b_end)

        if overlap_start < overlap_end:
            result.append((overlap_start, overlap_end))

        # Advance pointer of the interval that ends earlier
        if a_end < b_end:
            i += 1
        else:
            j += 1

    return result


def intersect_multiple_interval_lists(
    all_lists: List[List[Tuple[datetime, datetime]]],
) -> List[Tuple[datetime, datetime]]:
    """
    Iteratively computes the intersection across all participant free intervals:
    Result = (List_1 ∩ List_2) ∩ List_3 ∩ ... ∩ List_N
    """
    if not all_lists:
        return []

    common = all_lists[0]
    for next_list in all_lists[1:]:
        common = intersect_two_interval_lists(common, next_list)
        if not common:
            break

    return common


# ============================================================================
# PRIMARY SCHEDULING & RANKING ENGINE
# ============================================================================

def _compute_participant_free_intervals(
    person: Dict[str, Any],
    all_busy: List[Dict[str, Any]],
    target_date: date,
) -> List[Tuple[datetime, datetime]]:
    """Calculates a participant's free intervals for target_date in UTC."""
    w_start, w_end = get_working_hours_utc(
        target_date=target_date,
        work_start_str=person["work_start"],
        work_end_str=person["work_end"],
        tz_name=person["timezone"],
    )

    person_busy_intervals = []
    pid = person["id"]
    for b in all_busy:
        if b["participant_id"] == pid:
            b_s = parse_datetime(b["start_time"])
            b_e = parse_datetime(b["end_time"])
            # Only consider busy blocks that intersect working window
            if b_s < w_end and b_e > w_start:
                person_busy_intervals.append((b_s, b_e))

    return subtract_intervals([(w_start, w_end)], person_busy_intervals)


def find_common_slots(
    people: List[Dict[str, Any]],
    busy: List[Dict[str, Any]],
    target_date: date,
    duration_minutes: int,
    required_ids: List[int],
    optional_ids: Optional[List[int]] = None,
    timezone_name: str = "UTC",
    preferred_start: Optional[str] = None,
    preferred_end: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """
    Finds and ranks all common free meeting slots across participants.
    Returns list of slot dicts with scoring, optional participant counts,
    and preference flags for display in UI and API responses.
    """
    if optional_ids is None:
        optional_ids = []

    people_map = {p["id"]: p for p in people}
    organizer_tz = get_timezone(timezone_name)

    # 1. Compute free intervals for each required participant
    required_free_lists = []
    for pid in required_ids:
        if pid not in people_map:
            continue
        free_intervals = _compute_participant_free_intervals(
            people_map[pid], busy, target_date
        )
        required_free_lists.append(free_intervals)

    if not required_free_lists:
        return []

    # 2. Intersect across all required participants
    common_free = intersect_multiple_interval_lists(required_free_lists)

    # 3. Filter intervals with sufficient duration
    duration_td = timedelta(minutes=duration_minutes)
    valid_common = [
        (s, e) for s, e in common_free if (e - s) >= duration_td
    ]

    if not valid_common:
        return []

    # 4. Compute optional participants' free intervals
    optional_free_map = {}
    for opid in optional_ids:
        if opid in people_map:
            optional_free_map[opid] = _compute_participant_free_intervals(
                people_map[opid], busy, target_date
            )

    # 5. Parse preferred window in organizer's timezone
    pref_start_t = parse_time_str(preferred_start) if preferred_start else None
    pref_end_t = parse_time_str(preferred_end) if preferred_end else None

    # 6. Generate candidate slots in 15-minute increments
    step = timedelta(minutes=15)
    candidates: List[Tuple[datetime, datetime]] = []

    for f_start, f_end in valid_common:
        curr = f_start
        while curr + duration_td <= f_end:
            candidates.append((curr, curr + duration_td))
            curr += step

    # 7. Score and evaluate each candidate slot
    evaluated_slots = []
    total_optional = len(optional_ids)

    all_participant_ids = list(dict.fromkeys(required_ids + optional_ids))
    all_people = [people_map[pid] for pid in all_participant_ids if pid in people_map]

    for slot_start, slot_end in candidates:
        score = 0.0
        reasons = []

        # (a) Check Optional Participants Attendance (+30 max)
        free_opt_count = 0
        if total_optional > 0:
            for opid in optional_ids:
                opt_free_list = optional_free_map.get(opid, [])
                if any(f_s <= slot_start and slot_end <= f_e for f_s, f_e in opt_free_list):
                    free_opt_count += 1
            opt_score = (free_opt_count / total_optional) * 30.0
            score += opt_score
            if free_opt_count == total_optional:
                reasons.append(f"All {total_optional} optional participants free (+{round(opt_score)} pts)")
            elif free_opt_count > 0:
                reasons.append(f"{free_opt_count}/{total_optional} optional participants free (+{round(opt_score)} pts)")
        else:
            score += 30.0  # Full points if no optional participants specified

        # (b) Preferred Time Window (+25 max)
        local_start = slot_start.astimezone(organizer_tz)
        local_end = slot_end.astimezone(organizer_tz)
        within_preferred = True

        if pref_start_t and pref_end_t:
            window_start_dt = datetime.combine(local_start.date(), pref_start_t, tzinfo=organizer_tz)
            window_end_dt = datetime.combine(local_start.date(), pref_end_t, tzinfo=organizer_tz)
            if local_start >= window_start_dt and local_end <= window_end_dt:
                score += 25.0
                reasons.append("Matches preferred time window (+25 pts)")
            else:
                within_preferred = False
                reasons.append("Outside preferred time window (0 pts)")
        else:
            score += 20.0
            within_preferred = True

        # (c) Lunch Hour Avoidance (+20 max)
        # Check if slot overlaps 12:00-13:30 in each participant's local timezone
        lunch_conflicts = []
        for p in all_people:
            ptz = get_timezone(p["timezone"])
            p_s = slot_start.astimezone(ptz)
            p_e = slot_end.astimezone(ptz)

            p_lunch_start = p_s.replace(hour=12, minute=0, second=0)
            p_lunch_end = p_s.replace(hour=13, minute=30, second=0)

            if p_s < p_lunch_end and p_e > p_lunch_start:
                lunch_conflicts.append(p["name"])

        avoids_lunch = len(lunch_conflicts) == 0
        if avoids_lunch:
            score += 20.0
            reasons.append("Avoids lunch hour (12:00-13:30) for all (+20 pts)")
        else:
            penalty = min(20.0, len(lunch_conflicts) * 10.0)
            score += max(0.0, 20.0 - penalty)
            reasons.append(f"Overlaps lunch break for: {', '.join(lunch_conflicts)}")

        # (d) Fewer Back-to-Back Meetings (+15 max)
        # Reward buffer of >= 10 mins before & after existing meetings
        is_back_to_back = False
        for b in busy:
            if b["participant_id"] in required_ids:
                b_s = parse_datetime(b["start_time"])
                b_e = parse_datetime(b["end_time"])
                if abs((slot_start - b_e).total_seconds()) < 300 or abs((b_s - slot_end).total_seconds()) < 300:
                    is_back_to_back = True
                    break

        if not is_back_to_back:
            score += 15.0
            reasons.append("Buffer time before and after meeting (+15 pts)")
        else:
            score += 5.0
            reasons.append("Back-to-back meeting for a participant (+5 pts)")

        # (e) Earlier Start Preference (+10 max)
        # Normal work day hour offset: 09:00 -> 10 pts, 17:00 -> 2 pts
        org_hour = local_start.hour + (local_start.minute / 60.0)
        hour_offset = max(0.0, min(8.0, org_hour - 9.0))
        score += round(10.0 * (1.0 - (0.7 * (hour_offset / 8.0))), 1)

        # Build participant localized time displays
        participant_local_times = {}
        for p in all_people:
            ptz = get_timezone(p["timezone"])
            p_start_local = slot_start.astimezone(ptz).strftime("%H:%M")
            p_end_local = slot_end.astimezone(ptz).strftime("%H:%M")
            tz_abbr = p["timezone"].split("/")[-1].replace("_", " ")
            participant_local_times[p["name"]] = f"{p_start_local} - {p_end_local} ({tz_abbr})"

        evaluated_slots.append({
            "start_time": slot_start.isoformat(),
            "end_time": slot_end.isoformat(),
            "available_optional_participants": free_opt_count,
            "within_preferred_window": within_preferred,
            "avoids_lunch": avoids_lunch,
            "score": round(score, 1),
            "reasons": reasons,
            "participant_local_times": participant_local_times,
        })

    # Sort descending by score, tiebreak with earliest start_time
    evaluated_slots.sort(key=lambda item: (-item["score"], item["start_time"]))
    return evaluated_slots


# ============================================================================
# COMPATIBILITY WRAPPERS FOR DIRECT CALLS & TESTS
# ============================================================================

def suggest_meeting_slots(
    target_date_str: str,
    duration_minutes: int,
    required_participant_ids: List[int],
    optional_participant_ids: Optional[List[int]] = None,
    preferred_window: Optional[str] = None,
    organizer_timezone: str = "UTC",
    conn: Optional[sqlite3.Connection] = None,
    **kwargs,
) -> Any:
    """
    High-level convenience function supporting integration tests.
    Loads data from SQLite and delegates to find_common_slots.
    """
    from backend.models import SuggestResponse, SlotSuggestion, ConflictAnalysis

    if optional_participant_ids is None:
        optional_participant_ids = []

    target_date = datetime.strptime(target_date_str.strip(), "%Y-%m-%d").date()

    # Translate preferred_window string ("morning", "afternoon", "evening") to start/end
    pref_start = None
    pref_end = None
    if preferred_window:
        pw = preferred_window.lower().strip()
        if pw == "morning":
            pref_start, pref_end = "09:00", "12:00"
        elif pw == "afternoon":
            pref_start, pref_end = "13:00", "17:00"
        elif pw == "evening":
            pref_start, pref_end = "17:00", "20:00"

    def _query_data(c: sqlite3.Connection):
        p_rows = rows_as_dicts(c.execute("SELECT * FROM participants").fetchall())
        b_rows = rows_as_dicts(c.execute("SELECT * FROM busy_slots").fetchall())
        m_rows = c.execute(
            """SELECT mp.participant_id, m.start_time, m.end_time, m.title
               FROM meeting_participants mp JOIN meetings m ON m.id = mp.meeting_id
               WHERE m.status = 'scheduled'"""
        ).fetchall()
        b_rows.extend(
            {
                "participant_id": row["participant_id"],
                "start_time": row["start_time"],
                "end_time": row["end_time"],
                "title": row["title"],
            }
            for row in m_rows
        )
        return p_rows, b_rows

    if conn is not None:
        people, busy = _query_data(conn)
    else:
        with get_connection() as c:
            people, busy = _query_data(c)

    raw_slots = find_common_slots(
        people=people,
        busy=busy,
        target_date=target_date,
        duration_minutes=duration_minutes,
        required_ids=required_participant_ids,
        optional_ids=optional_participant_ids,
        timezone_name=organizer_timezone,
        preferred_start=pref_start,
        preferred_end=pref_end,
    )

    if raw_slots:
        formatted_slots = [
            SlotSuggestion(
                start_time=format_iso(parse_datetime(s["start_time"])),
                end_time=format_iso(parse_datetime(s["end_time"])),
                start_time_local=parse_datetime(s["start_time"]).astimezone(get_timezone(organizer_timezone)).strftime("%H:%M"),
                end_time_local=parse_datetime(s["end_time"]).astimezone(get_timezone(organizer_timezone)).strftime("%H:%M"),
                available_optional_participants=s.get("available_optional_participants", 0),
                free_optional_count=s.get("available_optional_participants", 0),
                total_optional_count=len(optional_participant_ids),
                within_preferred_window=s.get("within_preferred_window", True),
                avoids_lunch=s.get("avoids_lunch", True),
                score=s["score"],
                reasons=s.get("reasons", []),
                participant_local_times=s.get("participant_local_times", {}),
            )
            for s in raw_slots
        ]
        return SuggestResponse(
            date=target_date_str,
            duration_minutes=duration_minutes,
            slots=formatted_slots,
            conflict_analysis=None,
        )

    # Conflict diagnosis when no slots exist
    individually_free = {
        pid
        for pid in required_participant_ids
        if find_common_slots(
            people, busy, target_date, duration_minutes, [pid], timezone_name=organizer_timezone
        )
    }
    blocking_ids = [pid for pid in required_participant_ids if pid not in individually_free]
    if not blocking_ids:
        blocking_ids = list(required_participant_ids)

    blocker_names = [p["name"] for p in people if p["id"] in blocking_ids]

    # Search upcoming days for nearest alternatives
    suggested_alternatives = []
    for offset in range(1, 6):
        alt_date = target_date + timedelta(days=offset)
        alt_slots = find_common_slots(
            people, busy, alt_date, duration_minutes, required_participant_ids, timezone_name=organizer_timezone
        )
        if alt_slots:
            suggested_alternatives.append({
                "date": alt_date.isoformat(),
                "day_of_week": alt_date.strftime("%A"),
                "available_slots_count": len(alt_slots),
                "top_slots": [
                    {
                        "start_time_local": parse_datetime(s["start_time"]).astimezone(get_timezone(organizer_timezone)).strftime("%H:%M"),
                        "end_time_local": parse_datetime(s["end_time"]).astimezone(get_timezone(organizer_timezone)).strftime("%H:%M"),
                        "score": s["score"],
                    }
                    for s in alt_slots[:2]
                ],
            })
            if len(suggested_alternatives) >= 3:
                break

    conflict_obj = ConflictAnalysis(
        conflict_detected=True,
        summary=f"Conflict detected: Scheduling blocked by: {', '.join(blocker_names)}.",
        blocking_participants=blocker_names,
        nearest_alternative_day=suggested_alternatives[0] if suggested_alternatives else None,
        suggested_alternative_days=suggested_alternatives,
    )

    return SuggestResponse(
        date=target_date_str,
        duration_minutes=duration_minutes,
        slots=[],
        conflict_analysis=conflict_obj,
    )


def check_double_booking(
    conn: sqlite3.Connection,
    participant_ids: List[int],
    start_time_iso: str,
    end_time_iso: str,
    exclude_meeting_id: Optional[int] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Prevents double-booking: returns (True, error_message) if any participant
    already has a scheduled meeting or busy slot during [start_time, end_time].
    """
    new_start = parse_datetime(start_time_iso)
    new_end = parse_datetime(end_time_iso)

    for pid in participant_ids:
        # Check busy slots
        busy_rows = conn.execute(
            "SELECT start_time, end_time, title FROM busy_slots WHERE participant_id = ?",
            (pid,),
        ).fetchall()
        for b in busy_rows:
            if parse_datetime(b["start_time"]) < new_end and parse_datetime(b["end_time"]) > new_start:
                p_row = conn.execute("SELECT name FROM participants WHERE id = ?", (pid,)).fetchone()
                p_name = p_row["name"] if p_row else f"Participant #{pid}"
                return True, f"Conflict: {p_name} is already booked for '{b['title']}'."

        # Check existing scheduled meetings
        sql = """SELECT m.id, m.title, m.start_time, m.end_time
                 FROM meeting_participants mp JOIN meetings m ON m.id = mp.meeting_id
                 WHERE mp.participant_id = ? AND m.status = 'scheduled'"""
        params: list = [pid]
        if exclude_meeting_id is not None:
            sql += " AND m.id != ?"
            params.append(exclude_meeting_id)

        meetings = conn.execute(sql, tuple(params)).fetchall()
        for m in meetings:
            if parse_datetime(m["start_time"]) < new_end and parse_datetime(m["end_time"]) > new_start:
                p_row = conn.execute("SELECT name FROM participants WHERE id = ?", (pid,)).fetchone()
                p_name = p_row["name"] if p_row else f"Participant #{pid}"
                return True, f"Conflict: {p_name} has a conflicting meeting '{m['title']}'."

    return False, None
