"""Comprehensive tests for MeetWise authentication and authorization."""

import pytest
from fastapi.testclient import TestClient

from backend import database
from backend.auth import reset_login_rate_limit
from backend.main import app


@pytest.fixture
def auth_client(tmp_path, monkeypatch):
    """Provides an isolated TestClient with a fresh temporary database."""
    from backend.seed_data import seed_demo_data
    db_file = tmp_path / "test-auth.db"
    monkeypatch.setattr(database, "DATABASE_PATH", db_file)
    database.initialize_database(db_file)
    seed_demo_data(force=True)
    # Reset any rate limits from other tests
    reset_login_rate_limit("testclient", "ratelimit_test@meetwise.local")
    yield TestClient(app)


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

    # Public landing page is always accessible directly (status 200)
    auth_landing = auth_client.get("/", follow_redirects=False)
    assert auth_landing.status_code == 200

    auth_landing_alias = auth_client.get("/landing", follow_redirects=False)
    assert auth_landing_alias.status_code == 200

    # Login and signup pages remain accessible for switching accounts
    assert auth_client.get("/login", follow_redirects=False).status_code == 200
    assert auth_client.get("/signup", follow_redirects=False).status_code == 200



def test_supreme_admin_create_and_delete_user(auth_client: TestClient) -> None:
    # 1. Member cannot create user -> 403
    auth_client.cookies.clear()
    auth_client.post("/auth/login", json={"email": "member@meetwise.local", "password": "MemberPass123!"})
    unauth_create = auth_client.post("/auth/users", json={
        "name": "New Hire",
        "email": "newhire@meetwise.local",
        "password": "Password123!",
        "role": "member",
    })
    assert unauth_create.status_code == 403

    # 2. Admin creates user successfully
    auth_client.cookies.clear()
    auth_client.post("/auth/login", json={"email": "admin@meetwise.local", "password": "AdminPass123!"})
    create_res = auth_client.post("/auth/users", json={
        "name": "New Hire",
        "email": "newhire@meetwise.local",
        "password": "NewHirePassword123!",
        "role": "member",
    })
    assert create_res.status_code == 201
    user_id = create_res.json()["id"]

    # 3. Newly created user can log in with their credentials!
    auth_client.cookies.clear()
    login_new_user = auth_client.post("/auth/login", json={
        "email": "newhire@meetwise.local",
        "password": "NewHirePassword123!",
    })
    assert login_new_user.status_code == 200
    assert login_new_user.json()["name"] == "New Hire"

    # 4. Member cannot delete user -> 403
    del_member_attempt = auth_client.delete(f"/auth/users/{user_id}")
    assert del_member_attempt.status_code == 403

    # 5. Admin cannot delete self -> 400
    auth_client.cookies.clear()
    admin_login = auth_client.post("/auth/login", json={"email": "admin@meetwise.local", "password": "AdminPass123!"})
    admin_id = admin_login.json()["id"]
    self_del = auth_client.delete(f"/auth/users/{admin_id}")
    assert self_del.status_code == 400
    assert "cannot delete your own" in self_del.json()["detail"].lower()

    # 6. Admin deletes the new user permanently
    del_res = auth_client.delete(f"/auth/users/{user_id}")
    assert del_res.status_code == 200

    # 7. Deleted user can no longer log in -> 401
    auth_client.cookies.clear()
    login_after_del = auth_client.post("/auth/login", json={
        "email": "newhire@meetwise.local",
        "password": "NewHirePassword123!",
    })
    assert login_after_del.status_code == 401
