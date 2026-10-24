"""
Notification, Email, and Reminder Service for Intelligent Meeting Planner.
Dispatches immediate meeting confirmation emails with Jitsi video links to
all participants and organizer, and generates in-app reminders prior to scheduled
meetings (default 15 mins, configurable via REMINDER_LEAD_MINUTES).
Supports real SMTP email dispatch with automated fallback to logged simulation.
"""

import os
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
import sqlite3

from backend.database import get_connection

REMINDER_LEAD_MINUTES = int(os.getenv("REMINDER_LEAD_MINUTES", "15"))


def _send_real_email_if_configured(to_email: str, subject: str, text_body: str, html_body: str | None = None) -> bool:
    """Sends email via SMTP if SMTP_HOST and credentials exist in environment."""
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM", smtp_user or "notifications@meetwise.local")

    if not (smtp_host and smtp_user and smtp_pass):
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = smtp_from
        msg["To"] = to_email

        msg.attach(MIMEText(text_body, "plain"))
        if html_body:
            msg.attach(MIMEText(html_body, "html"))

        with smtplib.SMTP(smtp_host, smtp_port, timeout=8) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"[SMTP Warning] Failed to send real email to {to_email}: {e}")
        return False


def send_meeting_confirmation_emails(
    connection: sqlite3.Connection,
    meeting_id: int,
    organizer_email: str,
) -> dict:
    """
    Sends email confirmation with full meeting timings, attendee list,
    and Jitsi Meet link to all participants and to the creator's registered email.
    """
    meeting = connection.execute(
        "SELECT id, title, date, start_time, end_time, meeting_url FROM meetings WHERE id = ?",
        (meeting_id,),
    ).fetchone()

    if not meeting:
        return {"dispatched": 0, "recipients": []}

    title = meeting["title"]
    meeting_date = meeting["date"]
    start_iso = meeting["start_time"]
    end_iso = meeting["end_time"]
    meeting_url = meeting["meeting_url"] or f"https://meet.jit.si/MeetWise-{meeting_id}"

    # Format human-friendly time strings
    try:
        dt_start = datetime.fromisoformat(start_iso.replace("Z", "+00:00"))
        dt_end = datetime.fromisoformat(end_iso.replace("Z", "+00:00"))
        time_display = f"{dt_start.strftime('%a, %b %d, %Y at %H:%M')} – {dt_end.strftime('%H:%M')} UTC"
    except Exception:
        time_display = f"{meeting_date} ({start_iso} to {end_iso})"

    # Retrieve all participants for this meeting
    participants = connection.execute(
        """SELECT p.id, p.name, p.email, p.timezone, mp.required
           FROM meeting_participants mp
           JOIN participants p ON p.id = mp.participant_id
           WHERE mp.meeting_id = ?""",
        (meeting_id,),
    ).fetchall()

    attendee_names = [f"{p['name']} ({p['email']})" for p in participants]
    attendees_str = ", ".join(attendee_names) if attendee_names else "Team Members"

    # Gather unique recipient emails (all participants + organizer)
    recipients = set()
    for p in participants:
        if p["email"]:
            recipients.add((p["name"], p["email"].strip().lower()))

    # Add organizer
    if organizer_email:
        recipients.add(("Organizer", organizer_email.strip().lower()))

    subject = f"📅 Meeting Confirmed: {title} | MeetWise Invitation"

    plain_body = f"""Hi,

Your meeting has been scheduled and confirmed via MeetWise AI Planner!

============================================================
MEETING DETAILS
============================================================
Agenda:     {title}
Date & Time: {time_display}
Attendees:  {attendees_str}

👉 JOIN JITSI VIDEO MEETING:
{meeting_url}

(Click the link above at the meeting time to attend directly from your browser. No download required.)

Best regards,
MeetWise AI Planner
"""

    html_body = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; margin: 0; padding: 24px; }}
    .card {{ max-width: 580px; margin: 0 auto; background: #111827; border: 1px solid #242f44; border-radius: 14px; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }}
    .header {{ border-bottom: 1px solid #242f44; padding-bottom: 20px; margin-bottom: 24px; }}
    .badge {{ display: inline-block; background: rgba(99, 102, 241, 0.2); color: #818cf8; border: 1px solid #4f46e5; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; }}
    h1 {{ color: #ffffff; font-size: 22px; margin: 12px 0 6px 0; }}
    .detail-row {{ margin: 12px 0; font-size: 14.5px; color: #cbd5e1; }}
    .detail-label {{ font-weight: 600; color: #94a3b8; display: inline-block; width: 100px; }}
    .btn {{ display: inline-block; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: #ffffff !important; text-decoration: none; padding: 12px 26px; border-radius: 8px; font-weight: 700; font-size: 15px; margin: 24px 0 12px 0; box-shadow: 0 4px 14px rgba(99, 102, 241, 0.4); }}
    .footer {{ font-size: 12px; color: #64748b; margin-top: 24px; border-top: 1px solid #1f2937; padding-top: 16px; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">MeetWise AI Scheduling</span>
      <h1>{title}</h1>
      <p style="margin: 4px 0 0; color: #94a3b8; font-size: 13.5px;">Your meeting has been confirmed across attendee calendars.</p>
    </div>

    <div class="detail-row"><span class="detail-label">📅 Timings:</span> <strong>{time_display}</strong></div>
    <div class="detail-row"><span class="detail-label">👥 Attendees:</span> {attendees_str}</div>
    <div class="detail-row"><span class="detail-label">🌐 Room:</span> <a href="{meeting_url}" style="color:#818cf8;">{meeting_url}</a></div>

    <div style="text-align: center;">
      <a href="{meeting_url}" class="btn" target="_blank">🎥 Join Jitsi Video Meeting</a>
    </div>

    <div class="footer">
      This is an automated calendar confirmation from MeetWise AI Planner. Automated 15-minute reminders will also be delivered.
    </div>
  </div>
</body>
</html>"""

    dispatched_count = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for name, email in recipients:
        # 1. Console / server simulation log
        log_line = f"[Email Notification Sent] To: {name} <{email}> | Subject: '{subject}' | Jitsi Room: {meeting_url}"
        try:
            print(log_line)
        except UnicodeEncodeError:
            print(log_line.encode("ascii", errors="replace").decode("ascii"))

        # 2. Real SMTP if configured
        _send_real_email_if_configured(email, subject, plain_body, html_body)

        dispatched_count += 1

    # Record confirmation notification in database for each participant
    for p in participants:
        msg = f"Meeting confirmed: '{title}' on {meeting_date}. Attend via Jitsi: {meeting_url}"
        connection.execute(
            """INSERT INTO notifications(meeting_id, participant_id, message, notify_at, sent)
               VALUES (?, ?, ?, ?, 1)""",
            (meeting_id, p["id"], msg, now_iso),
        )

    return {"dispatched": dispatched_count, "recipients": [e for _, e in recipients], "meeting_url": meeting_url}


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
    msg = f"Your meeting starts in {lead_minutes} minutes. Click to attend via Jitsi video call."
    for participant_id in participant_ids:
        connection.execute(
            """INSERT INTO notifications(meeting_id, participant_id, message, notify_at, sent)
               VALUES (?, ?, ?, ?, 0)""",
            (meeting_id, participant_id, msg, notify_at),
        )


def deliver_due_notifications() -> int:
    """
    Checks for all due unsent notifications (notify_at <= current UTC time).
    Marks them as delivered and prints formatted simulation (or dispatches real SMTP).
    """
    now = datetime.now(timezone.utc).isoformat()
    delivered = 0

    with get_connection() as connection:
        rows = connection.execute(
            """SELECT n.id, n.message, p.name, p.email, m.title, m.start_time, m.meeting_url
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
            m_url = row["meeting_url"] or f"https://meet.jit.si/MeetWise-{title.replace(' ', '-')}"

            # Console simulation format
            print(
                f"[Reminder simulation] To: {name} <{email}> | "
                f"{msg_text} Meeting: '{title}' at {start_iso} | Link: {m_url}"
            )

            # Optional real SMTP dispatch
            _send_real_email_if_configured(
                to_email=email,
                subject=f"Meeting Reminder: {title}",
                text_body=f"Hi {name},\n\nYour meeting '{title}' is starting soon at {start_iso}.\nJoin call: {m_url}\n\nBest,\nMeetWise AI Planner",
            )

            connection.execute("UPDATE notifications SET sent = 1 WHERE id = ?", (row["id"],))
            delivered += 1

    return delivered
