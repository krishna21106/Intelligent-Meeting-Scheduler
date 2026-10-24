"""
Seed simulated team calendar data for demonstrations and testing.
Creates 6 diverse participants across multiple timezones (India, Singapore, UK, US),
with realistic working hours and busy slots across today and upcoming days.
"""

from datetime import date, datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from backend.auth import hash_password
from backend.database import get_connection

DEMO_PARTICIPANTS = [
    ("Ravi Kumar", "ravi@example.com", "Asia/Kolkata", "09:00", "17:00"),
    ("Priya Sharma", "priya@example.com", "Asia/Kolkata", "09:30", "17:30"),
    ("Asha Patel", "asha@example.com", "Asia/Kolkata", "10:00", "18:00"),
    ("Liam Chen", "liam@example.com", "Asia/Singapore", "09:00", "17:00"),
    ("Noah Williams", "noah@example.com", "Europe/London", "09:00", "17:00"),
    ("Maya Garcia", "maya@example.com", "America/New_York", "09:00", "17:00"),
]


def seed_demo_data(force: bool = False) -> None:
    """Insert demo participants, realistic calendar busy blocks, and default users."""
    with get_connection() as connection:
        # Seed default admin and member users if table is empty
        user_count = connection.execute("SELECT COUNT(*) FROM users").fetchone()[0]
        if user_count == 0 or force:
            now_iso = datetime.now(timezone.utc).isoformat()
            if force:
                connection.execute("DELETE FROM users;")
            connection.execute(
                """INSERT INTO users(name, email, password_hash, role, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                ("Admin User", "admin@meetwise.local", hash_password("AdminPass123!"), "admin", now_iso),
            )
            connection.execute(
                """INSERT INTO users(name, email, password_hash, role, created_at)
                   VALUES (?, ?, ?, ?, ?)""",
                ("Demo Member", "member@meetwise.local", hash_password("MemberPass123!"), "member", now_iso),
            )

        count = connection.execute("SELECT COUNT(*) FROM participants").fetchone()[0]
        if count > 0 and not force:
            return

        if force:
            connection.execute("DELETE FROM notifications;")
            connection.execute("DELETE FROM meeting_participants;")
            connection.execute("DELETE FROM meetings;")
            connection.execute("DELETE FROM busy_slots;")
            connection.execute("DELETE FROM participants;")


        participant_ids = []
        for name, email, tz_name, w_start, w_end in DEMO_PARTICIPANTS:
            cursor = connection.execute(
                """INSERT INTO participants(name, email, timezone, work_start, work_end)
                   VALUES (?, ?, ?, ?, ?)""",
                (name, email, tz_name, w_start, w_end),
            )
            participant_ids.append(cursor.lastrowid)

        # Populate busy slots for today and next 3 days
        base_date = date.today()
        for day_offset in range(4):
            target_day = base_date + timedelta(days=day_offset)
            for idx, participant_id in enumerate(participant_ids):
                tz = ZoneInfo(DEMO_PARTICIPANTS[idx][2])

                # Slot 1: Morning Focus block (varying by participant)
                start_h = 10 + (idx % 2)
                local_start = datetime.combine(target_day, time(start_h, 0), tz)
                local_end = local_start + timedelta(minutes=45)
                connection.execute(
                    """INSERT INTO busy_slots(participant_id, start_time, end_time, title)
                       VALUES (?, ?, ?, ?)""",
                    (participant_id, local_start.isoformat(), local_end.isoformat(), "Sprint Standup"),
                )

                # Slot 2: Afternoon Client call (for some participants)
                if idx in (0, 1, 4):
                    afternoon_start = datetime.combine(target_day, time(14 + (idx % 2), 30), tz)
                    afternoon_end = afternoon_start + timedelta(hours=1)
                    connection.execute(
                        """INSERT INTO busy_slots(participant_id, start_time, end_time, title)
                           VALUES (?, ?, ?, ?)""",
                        (participant_id, afternoon_start.isoformat(), afternoon_end.isoformat(), "Client Review"),
                    )


if __name__ == "__main__":
    seed_demo_data(force=True)
    print("Demo data seeded successfully.")

