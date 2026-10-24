"""Small API workflow tests using an isolated temporary SQLite database."""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from backend import database
from backend.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    from backend.seed_data import seed_demo_data
    db_path = tmp_path / "test-meetings.db"
    monkeypatch.setattr(database, "DATABASE_PATH", db_path)
    database.initialize_database(db_path)
    seed_demo_data(force=True)
    test_client = TestClient(app)
    test_client.post(
        "/auth/signup",
        json={
            "name": "Test Runner",
            "email": "testrunner@meetwise.local",
            "password": "Password123!",
            "role": "admin",
        },
    )
    yield test_client



def test_suggest_confirm_and_prevent_double_booking(client: TestClient) -> None:
    meeting_date = (date.today() + timedelta(days=1)).isoformat()
    suggestion = client.post(
        "/meetings/suggest",
        json={
            "title": "Demo review",
            "date": meeting_date,
            "duration_minutes": 30,
            "participant_ids": [1, 2],
            "timezone": "Asia/Kolkata",
        },
    )
    assert suggestion.status_code == 200
    slot = suggestion.json()["slots"][0]
    confirmation = {
        "title": "Demo review",
        "start_time": slot["start_time"],
        "end_time": slot["end_time"],
        "participant_ids": [1, 2],
        "timezone": "Asia/Kolkata",
    }
    created = client.post("/meetings/confirm", json=confirmation)
    assert created.status_code == 201
    assert created.json()["status"] == "scheduled"
    assert len(client.get("/notifications").json()["notifications"]) >= 2

    repeated = client.post("/meetings/confirm", json=confirmation)
    assert repeated.status_code == 409
    assert "double-booking prevented" in repeated.json()["detail"].lower()


def test_parse_request_fills_date_duration_and_known_people(client: TestClient) -> None:
    response = client.post(
        "/parse-request",
        json={
            "text": "Schedule a 45 minute meeting with Ravi and Priya tomorrow afternoon",
            "timezone": "Asia/Kolkata",
        },
    )
    assert response.status_code == 200
    details = response.json()
    assert details["date"] == (date.today() + timedelta(days=1)).isoformat()


def test_meeting_confirmation_includes_jitsi_and_emails(client: TestClient) -> None:
    meeting_date = (date.today() + timedelta(days=2)).isoformat()
    suggestion = client.post(
        "/meetings/suggest",
        json={
            "title": "Strategy Sync",
            "date": meeting_date,
            "duration_minutes": 30,
            "participant_ids": [1],
            "timezone": "Asia/Kolkata",
        },
    )
    assert suggestion.status_code == 200
    slot = suggestion.json()["slots"][0]
    confirmation = {
        "title": "Strategy Sync",
        "start_time": slot["start_time"],
        "end_time": slot["end_time"],
        "participant_ids": [1],
        "timezone": "Asia/Kolkata",
    }
    created = client.post("/meetings/confirm", json=confirmation)
    assert created.status_code == 201
    data = created.json()
    assert "meeting_url" in data
    assert "https://meet.jit.si/MeetWise-" in data["meeting_url"]

    meetings = client.get("/meetings").json()
    matched = next(m for m in meetings if m["id"] == data["id"])
    assert "meeting_url" in matched
    assert "meet.jit.si" in matched["meeting_url"]
