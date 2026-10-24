"""Small API workflow tests using an isolated temporary SQLite database."""

from datetime import date, timedelta

import pytest
from fastapi.testclient import TestClient

from backend import database
from backend.main import app


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "test-meetings.db")
    with TestClient(app) as test_client:
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
    assert len(client.get("/notifications").json()["notifications"]) == 2

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

