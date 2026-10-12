"""
Notification and Reminder Service for Intelligent Meeting Planner.
Generates in-app reminders prior to scheduled meetings (default 15 mins, configurable via REMINDER_LEAD_MINUTES).
Dispatches reminders via console simulation, and optionally via real SMTP
if SMTP environment variables are configured in .env.
"""

import os
import smtplib
from email.mime.text import MIMEText
from datetime import datetime, timedelta, timezone
import sqlite3

from backend.database import get_connection

# Configurable reminder lead time (defaults to 15 minutes)
REMINDER_LEAD_MINUTES = int(os.getenv("REMINDER_LEAD_MINUTES", "15"))


def create_meeting_notifications(
    connection: sqlite3.Connection,
    meeting_id: int,
    participant_ids: list[int],
    start_time: datetime,
) -> None:
    """
    Creates one reminder per participant in the notifications table,
    scheduled REMINDER_LEAD_MINUTES before meeting start time.
    """
    lead_minutes = int(os.getenv("REMINDER_LEAD_MINUTES", str(REMINDER_LEAD_MINUTES)))
    notify_at = (start_time.astimezone(timezone.utc) - timedelta(minutes=lead_minutes)).isoformat()
    msg = f"Your meeting starts in {lead_minutes} minutes."
    for participant_id in participant_ids:
        connection.execute(
            """INSERT INTO notifications(meeting_id, participant_id, message, notify_at, sent)
               VALUES (?, ?, ?, ?, 0)""",
            (meeting_id, participant_id, msg, notify_at),
        )


def _send_real_email_if_configured(to_email: str, subject: str, body: str) -> bool:
    """Sends email via SMTP if SMTP_HOST and credentials exist in environment."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")

    if not (smtp_host and smtp_user and smtp_pass):
        return False

    try:
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = smtp_user
        msg["To"] = to_email

        with smtplib.SMTP(smtp_host, smtp_port, timeout=5) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[SMTP Warning] Failed to send real email to {to_email}: {e}")
        return False


def deliver_due_notifications() -> int:
    """
    Checks for all due unsent notifications (notify_at <= current UTC time).
    Marks them as delivered and prints formatted simulation (or dispatches real SMTP).
    """
    now = datetime.now(timezone.utc).isoformat()
    delivered = 0

    with get_connection() as connection:
        rows = connection.execute(
            """SELECT n.id, n.message, p.name, p.email, m.title, m.start_time
               FROM notifications n
               JOIN participants p ON p.id = n.participant_id
               JOIN meetings m ON m.id = n.meeting_id
               WHERE n.sent = 0 AND n.notify_at <= ? AND m.status = 'scheduled'""",
            (now,),
        ).fetchall()

        for row in rows:
            name = row["name"]
            email = row["email"]
            title = row["title"]
            start_iso = row["start_time"]
            msg_text = row["message"]

            # Console simulation format
            print(
                f"[Reminder simulation] To: {name} <{email}> | "
                f"{msg_text} Meeting: '{title}' at {start_iso}"
            )

            # Optional real SMTP dispatch
            _send_real_email_if_configured(
                to_email=email,
                subject=f"Meeting Reminder: {title}",
                body=f"Hi {name},\n\nThis is a reminder that your meeting '{title}' is scheduled for {start_iso}.\n\nBest,\nMeetWise AI Planner",
            )

            connection.execute("UPDATE notifications SET sent = 1 WHERE id = ?", (row["id"],))
            delivered += 1

    return delivered
