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
    assert details["duration_minutes"] == 45
    assert details["participant_names"] == ["Ravi Kumar", "Priya Sharma"]
    assert details["preferred_start"] == "13:00"


def test_health_check(client: TestClient) -> None:
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}

    res_api = client.get("/api/health")
    assert res_api.status_code == 200
    assert res_api.json() == {"status": "ok"}


def test_meeting_ics_export(client: TestClient) -> None:
    meeting_date = (date.today() + timedelta(days=1)).isoformat()
    suggestion = client.post(
        "/meetings/suggest",
        json={
            "title": "ICS Export Sync",
            "date": meeting_date,
            "duration_minutes": 30,
            "participant_ids": [1],
            "timezone": "Asia/Kolkata",
        },
    )
    assert suggestion.status_code == 200
    slot = suggestion.json()["slots"][0]
    created = client.post(
        "/meetings/confirm",
        json={
            "title": "ICS Export Sync",
            "start_time": slot["start_time"],
            "end_time": slot["end_time"],
            "participant_ids": [1],
            "timezone": "Asia/Kolkata",
        },
    )
    assert created.status_code == 201
    meeting_id = created.json()["id"]

    ics_res = client.get(f"/meetings/{meeting_id}/ics")
    assert ics_res.status_code == 200
    assert "text/calendar" in ics_res.headers.get("content-type", "")
    assert f'meeting-{meeting_id}.ics' in ics_res.headers.get("content-disposition", "")
    assert "BEGIN:VCALENDAR" in ics_res.text
    assert "SUMMARY:ICS Export Sync" in ics_res.text
    assert "END:VCALENDAR" in ics_res.text

