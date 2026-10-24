"""Comprehensive tests for the Admin Analytics Dashboard endpoint (GET /admin/analytics)."""

import pytest
from fastapi.testclient import TestClient

from backend import database
from backend.auth import hash_password
from backend.main import app


@pytest.fixture
def analytics_client(tmp_path, monkeypatch):
    """Provides a fresh isolated database with seeded demo data."""
    db_path = tmp_path / "test-analytics.db"
    monkeypatch.setattr(database, "DATABASE_PATH", db_path)
    with TestClient(app) as test_client:
        yield test_client


def test_admin_analytics_rbac_protection(analytics_client: TestClient) -> None:
    # 1. Unauthenticated request -> 401 Unauthorized
    analytics_client.cookies.clear()
    unauth_res = analytics_client.get("/admin/analytics")
    assert unauth_res.status_code == 401

    # 2. Authenticated as standard member -> 403 Forbidden
    login_member = analytics_client.post(
        "/auth/login",
        json={"email": "member@meetwise.local", "password": "MemberPass123!"},
    )
    assert login_member.status_code == 200
    member_res = analytics_client.get("/admin/analytics")
    assert member_res.status_code == 403
    assert "admin privileges required" in member_res.json()["detail"].lower()

    # 3. Authenticated as admin -> 200 OK
    analytics_client.cookies.clear()
    login_admin = analytics_client.post(
        "/auth/login",
        json={"email": "admin@meetwise.local", "password": "AdminPass123!"},
    )
    assert login_admin.status_code == 200
    admin_res = analytics_client.get("/admin/analytics")
    assert admin_res.status_code == 200


def test_admin_analytics_seeded_data_metrics(analytics_client: TestClient) -> None:
    analytics_client.cookies.clear()
    analytics_client.post(
        "/auth/login",
        json={"email": "admin@meetwise.local", "password": "AdminPass123!"},
    )

    res = analytics_client.get("/admin/analytics?days=30")
    assert res.status_code == 200
    data = res.json()

    # Check KPIs structure & values
    kpis = data["kpis"]
    assert kpis["total_users"] >= 2
    assert kpis["total_participants"] == 6
    assert kpis["total_busy_slots"] >= 36
    assert isinstance(kpis["avg_meeting_minutes"], (int, float))

    # Check distributions
    assert len(data["users_by_role"]) >= 2
    assert any(item["label"] == "admin" for item in data["users_by_role"])
    assert any(item["label"] == "member" for item in data["users_by_role"])

    assert len(data["participants_by_timezone"]) >= 4
    assert len(data["meetings_by_weekday"]) == 7
    assert len(data["meetings_by_hour"]) == 24
    assert len(data["meeting_duration_buckets"]) == 4

    # Check zero-filled time ranges
    assert len(data["meetings_per_day"]) == 30
    assert len(data["signups_over_time"]) == 30
    assert data["time_range_days"] == 30

    # Check busiest participants structure
    assert "by_meetings" in data["busiest_participants"]
    assert "by_busy_slots" in data["busiest_participants"]
    assert len(data["busiest_participants"]["by_busy_slots"]) <= 5
    assert len(data["busiest_participants"]["by_busy_slots"]) > 0


def test_admin_analytics_days_query_parameter(analytics_client: TestClient) -> None:
    analytics_client.cookies.clear()
    analytics_client.post(
        "/auth/login",
        json={"email": "admin@meetwise.local", "password": "AdminPass123!"},
    )

    # Test 7 days window
    res_7 = analytics_client.get("/admin/analytics?days=7")
    assert res_7.status_code == 200
    data_7 = res_7.json()
    assert data_7["time_range_days"] == 7
    assert len(data_7["meetings_per_day"]) == 7
    assert len(data_7["signups_over_time"]) == 7

    # Test 90 days window
    res_90 = analytics_client.get("/admin/analytics?days=90")
    assert res_90.status_code == 200
    data_90 = res_90.json()
    assert data_90["time_range_days"] == 90
    assert len(data_90["meetings_per_day"]) == 90
    assert len(data_90["signups_over_time"]) == 90


def test_admin_analytics_empty_database_handling(tmp_path, monkeypatch) -> None:
    """Verifies that empty tables return zeroed metrics without exceptions."""
    empty_db = tmp_path / "empty-analytics.db"
    monkeypatch.setattr(database, "DATABASE_PATH", empty_db)

    with database.get_connection(empty_db) as conn:
        conn.executescript(
            """
            CREATE TABLE users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'member',
                created_at TEXT NOT NULL
            );
            CREATE TABLE participants (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                timezone TEXT NOT NULL,
                work_start TEXT, work_end TEXT, user_id INTEGER
            );
            CREATE TABLE busy_slots (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                participant_id INTEGER, start_time TEXT, end_time TEXT, title TEXT
            );
            CREATE TABLE meetings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT, date TEXT, start_time TEXT, end_time TEXT, status TEXT, created_at TEXT, user_id INTEGER
            );
            CREATE TABLE meeting_participants (
                meeting_id INTEGER, participant_id INTEGER, required INTEGER,
                PRIMARY KEY (meeting_id, participant_id)
            );
            CREATE TABLE notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                meeting_id INTEGER, participant_id INTEGER, message TEXT, notify_at TEXT, sent INTEGER
            );
            """
        )
        # Insert only 1 admin user
        conn.execute(
            "INSERT INTO users(name, email, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?)",
            ("Admin", "admin@empty.local", hash_password("AdminPass123!"), "admin", "2026-10-12T00:00:00Z"),
        )

    with TestClient(app) as client:
        # Clear out any auto-seeded participants/meetings for empty test case
        with database.get_connection(empty_db) as conn:
            conn.execute("DELETE FROM notifications;")
            conn.execute("DELETE FROM meeting_participants;")
            conn.execute("DELETE FROM meetings;")
            conn.execute("DELETE FROM busy_slots;")
            conn.execute("DELETE FROM participants;")
            conn.execute("DELETE FROM users WHERE email != 'admin@empty.local';")

        client.post("/auth/login", json={"email": "admin@empty.local", "password": "AdminPass123!"})
        res = client.get("/admin/analytics?days=14")
        assert res.status_code == 200
        data = res.json()

        assert data["kpis"]["total_users"] == 1
        assert data["kpis"]["total_participants"] == 0
        assert data["kpis"]["total_meetings"] == 0
        assert data["kpis"]["avg_meeting_minutes"] == 0.0
        assert data["kpis"]["upcoming_meetings"] == 0
        assert data["kpis"]["total_busy_slots"] == 0
        assert data["kpis"]["pending_notifications"] == 0
        assert data["kpis"]["sent_notifications"] == 0

        assert len(data["meetings_per_day"]) == 14
        assert all(d["count"] == 0 for d in data["meetings_per_day"])
        assert data["busiest_participants"]["by_meetings"] == []
        assert data["busiest_participants"]["by_busy_slots"] == []
        assert data["meetings_per_user"] == []

