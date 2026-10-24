"""Comprehensive tests for MeetWise authentication and authorization."""

import pytest
from fastapi.testclient import TestClient

from backend import database
from backend.auth import reset_login_rate_limit
from backend.main import app


@pytest.fixture
def auth_client(tmp_path, monkeypatch):
    """Provides an isolated TestClient with a fresh temporary database."""
    monkeypatch.setattr(database, "DATABASE_PATH", tmp_path / "test-auth.db")
    # Reset any rate limits from other tests
    reset_login_rate_limit("testclient", "ratelimit_test@meetwise.local")
    with TestClient(app) as test_client:
        yield test_client


def test_signup_success_and_session_cookie(auth_client: TestClient) -> None:
    res = auth_client.post(
        "/auth/signup",
        json={
            "name": "Sarah Connor",
            "email": "sarah@resistance.local",
            "password": "SkynetPassword123!",
            "role": "member",
        },
    )
    assert res.status_code == 201
    data = res.json()
    assert data["name"] == "Sarah Connor"
    assert data["email"] == "sarah@resistance.local"
    assert data["role"] == "member"
    assert "id" in data
    # Verify session cookie was set
    assert "meetwise_session" in auth_client.cookies


def test_signup_validation_failures(auth_client: TestClient) -> None:
    # Password too short (< 8 chars)
    short_pwd_res = auth_client.post(
        "/auth/signup",
        json={
            "name": "Short Pwd",
            "email": "short@example.com",
            "password": "short",
            "role": "member",
        },
    )
    assert short_pwd_res.status_code == 422
    assert "8 characters" in str(short_pwd_res.json()["detail"]).lower()

    # Invalid email format
    invalid_email_res = auth_client.post(
        "/auth/signup",
        json={
            "name": "Invalid Email",
            "email": "invalid-email-no-at",
            "password": "ValidPassword123!",
            "role": "member",
        },
    )
    assert invalid_email_res.status_code == 422
    assert "email" in str(invalid_email_res.json()["detail"]).lower()


def test_signup_duplicate_email_rejected(auth_client: TestClient) -> None:
    # First signup
    res1 = auth_client.post(
        "/auth/signup",
        json={
            "name": "Duplicate User",
            "email": "duplicate@example.com",
            "password": "Password123!",
            "role": "member",
        },
    )
    assert res1.status_code == 201

    # Second signup with same email (case insensitive)
    res2 = auth_client.post(
        "/auth/signup",
        json={
            "name": "Duplicate User 2",
            "email": "DUPLICATE@EXAMPLE.COM",
            "password": "DifferentPassword123!",
            "role": "member",
        },
    )
    assert res2.status_code == 409
    assert "already exists" in res2.json()["detail"].lower()


def test_login_seeded_accounts(auth_client: TestClient) -> None:
    # Clear cookies first
    auth_client.cookies.clear()

    # Log in as seeded Admin
    admin_login = auth_client.post(
        "/auth/login",
        json={
            "email": "admin@meetwise.local",
            "password": "AdminPass123!",
        },
    )
    assert admin_login.status_code == 200
    admin_data = admin_login.json()
    assert admin_data["role"] == "admin"
    assert "meetwise_session" in auth_client.cookies

    # Clear and log in as seeded Member
    auth_client.cookies.clear()
    member_login = auth_client.post(
        "/auth/login",
        json={
            "email": "member@meetwise.local",
            "password": "MemberPass123!",
        },
    )
    assert member_login.status_code == 200
    member_data = member_login.json()
    assert member_data["role"] == "member"


def test_login_invalid_password_returns_generic_401(auth_client: TestClient) -> None:
    auth_client.cookies.clear()
    res = auth_client.post(
        "/auth/login",
        json={
            "email": "admin@meetwise.local",
            "password": "WrongPasswordAttempt!",
        },
    )
    assert res.status_code == 401
    assert "invalid email or password" in res.json()["detail"].lower()


def test_login_rate_limiting_triggers_429(auth_client: TestClient) -> None:
    auth_client.cookies.clear()
    test_email = "ratelimit_test@meetwise.local"

    # Make 5 failed attempts
    for attempt in range(5):
        fail_res = auth_client.post(
            "/auth/login",
            json={"email": test_email, "password": f"WrongAttempt{attempt}!"},
        )
        assert fail_res.status_code == 401

    # 6th attempt should be blocked with 429 Too Many Requests
    blocked_res = auth_client.post(
        "/auth/login",
        json={"email": test_email, "password": "AnyPassword!"},
    )
    assert blocked_res.status_code == 429
    assert "too many login attempts" in blocked_res.json()["detail"].lower()


def test_auth_me_and_logout_cycle(auth_client: TestClient) -> None:
    # Log in
    login_res = auth_client.post(
        "/auth/login",
        json={"email": "member@meetwise.local", "password": "MemberPass123!"},
    )
    assert login_res.status_code == 200

    # GET /auth/me returns user info
    me_res = auth_client.get("/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["email"] == "member@meetwise.local"

    # POST /auth/logout
    logout_res = auth_client.post("/auth/logout")
    assert logout_res.status_code == 200
    assert "logged out" in logout_res.json()["message"].lower()

    # GET /auth/me now returns 401
    me_after_logout = auth_client.get("/auth/me")
    assert me_after_logout.status_code == 401


def test_unauthenticated_access_to_protected_routes_blocked(auth_client: TestClient) -> None:
    auth_client.cookies.clear()

    # Health check is public
    health = auth_client.get("/health")
    assert health.status_code == 200

    # API endpoints require authentication
    assert auth_client.get("/participants").status_code == 401
    assert auth_client.get("/meetings").status_code == 401
    assert auth_client.get("/notifications").status_code == 401
    assert auth_client.post("/meetings/suggest", json={}).status_code == 401


def test_admin_vs_member_authorization_and_role_management(auth_client: TestClient) -> None:
    # 1. Member cannot access /auth/users
    auth_client.cookies.clear()
    auth_client.post(
        "/auth/login",
        json={"email": "member@meetwise.local", "password": "MemberPass123!"},
    )
    forbidden_res = auth_client.get("/auth/users")
    assert forbidden_res.status_code == 403
    assert "admin privileges required" in forbidden_res.json()["detail"].lower()

    # 2. Admin can access /auth/users
    auth_client.cookies.clear()
    auth_client.post(
        "/auth/login",
        json={"email": "admin@meetwise.local", "password": "AdminPass123!"},
    )
    users_res = auth_client.get("/auth/users")
    assert users_res.status_code == 200
    users = users_res.json()
    assert len(users) >= 2

    # Find member user
    member_user = next(u for u in users if u["email"] == "member@meetwise.local")

    # 3. Admin promotes member to admin
    promote_res = auth_client.put(
        f"/auth/users/{member_user['id']}/role",
        json={"role": "admin"},
    )
    assert promote_res.status_code == 200
    assert promote_res.json()["role"] == "admin"

    # 4. Revert back to member
    demote_res = auth_client.put(
        f"/auth/users/{member_user['id']}/role",
        json={"role": "member"},
    )
    assert demote_res.status_code == 200
    assert demote_res.json()["role"] == "member"


def test_navigation_redirects(auth_client: TestClient) -> None:
    # 1. Unauthenticated redirects
    auth_client.cookies.clear()

    # Unauthenticated /dashboard -> 302 to /login
    dash_res = auth_client.get("/dashboard", follow_redirects=False)
    assert dash_res.status_code == 302
    assert dash_res.headers["location"] == "/login"

    # Unauthenticated /schedule -> 302 to /login
    sched_res = auth_client.get("/schedule", follow_redirects=False)
    assert sched_res.status_code == 302
    assert sched_res.headers["location"] == "/login"

    # Unauthenticated /participants (HTML) -> 302 to /login
    part_res = auth_client.get("/participants", headers={"accept": "text/html"}, follow_redirects=False)
    assert part_res.status_code == 302
    assert part_res.headers["location"] == "/login"

    # Unauthenticated / and /login serve pages
    assert auth_client.get("/", follow_redirects=False).status_code == 200
    assert auth_client.get("/login", follow_redirects=False).status_code == 200
    assert auth_client.get("/signup", follow_redirects=False).status_code == 200

    # 2. Authenticated redirects
    auth_client.post(
        "/auth/login",
        json={"email": "member@meetwise.local", "password": "MemberPass123!"},
    )

    # Authenticated user accessing / -> 302 to /dashboard
    auth_landing = auth_client.get("/", follow_redirects=False)
    assert auth_landing.status_code == 302
    assert auth_landing.headers["location"] == "/dashboard"

    # Authenticated user accessing /login -> 302 to /dashboard
    auth_login_page = auth_client.get("/login", follow_redirects=False)
    assert auth_login_page.status_code == 302
    assert auth_login_page.headers["location"] == "/dashboard"

    # Authenticated user accessing /signup -> 302 to /dashboard
    auth_signup_page = auth_client.get("/signup", follow_redirects=False)
    assert auth_signup_page.status_code == 302
    assert auth_signup_page.headers["location"] == "/dashboard"

