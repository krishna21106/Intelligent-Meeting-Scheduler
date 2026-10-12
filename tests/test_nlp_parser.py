"""Tests for common phrases supported by the rule-based parser."""

from datetime import date, timedelta

from backend.nlp_parser import parse_meeting_request


def test_parser_reads_iso_date_duration_and_preference() -> None:
    today = date.today()
    participants = [{"id": 7, "name": "Ravi Kumar"}]
    details = parse_meeting_request(
        f"Schedule a 45 minute meeting about roadmap with Ravi on {today.isoformat()} afternoon",
        participants,
        "Asia/Kolkata",
    )
    assert details["title"] == "roadmap"
    assert details["date"] == today.isoformat()
    assert details["duration_minutes"] == 45
    assert details["participant_ids"] == [7]
    assert details["preferred_start"] == "13:00"


def test_parser_defaults_to_tomorrow_and_a_half_hour() -> None:
    details = parse_meeting_request("Plan a meeting with nobody", [], "UTC")
    assert details["date"] == (date.today() + timedelta(days=1)).isoformat()
    assert details["duration_minutes"] == 30
