"""
Authentication and session management module for MeetWise.
Handles:
- Password hashing via standard library hashlib.scrypt with per-user salt
- Signed HMAC session tokens via itsdangerous stored in HttpOnly, SameSite=Lax cookies
- In-memory IP + email login rate limiting (5 attempts/min)
- Role-based authorization (admin / member)
- Current user dependency injection for protected routes
"""

import hashlib
import hmac
import os
import re
import time
from typing import Optional
from dotenv import load_dotenv
from fastapi import Depends, HTTPException, Request, Response
from itsdangerous import BadSignature, SignatureExpired, URLSafeTimedSerializer

from backend.database import get_connection

load_dotenv()

ENVIRONMENT = os.getenv("ENVIRONMENT", "development").lower()
SECRET_KEY = os.getenv("SECRET_KEY")

if ENVIRONMENT == "production" and not SECRET_KEY:
    raise RuntimeError("FATAL: SECRET_KEY must be configured in production environment via .env or environment variable!")

if not SECRET_KEY:
    SECRET_KEY = "meetwise-dev-fallback-secret-key-32-chars-long"

SESSION_COOKIE_NAME = "meetwise_session"
SESSION_MAX_AGE = 7 * 24 * 3600  # 7 days in seconds

serializer = URLSafeTimedSerializer(SECRET_KEY, salt="meetwise-session-v1")

# In-memory rate limiting store: key=(ip, email_lower) -> list of timestamp floats
_login_attempts: dict[tuple[str, str], list[float]] = {}
RATE_LIMIT_MAX_ATTEMPTS = 5
RATE_LIMIT_WINDOW_SECONDS = 60.0

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


def validate_email_format(email: str) -> str:
    """Validate and normalize email string."""
    cleaned = email.strip().lower()
    if not EMAIL_REGEX.match(cleaned):
        raise HTTPException(status_code=422, detail="Please enter a valid email address.")
    return cleaned


def hash_password(password: str) -> str:
    """Hash password using hashlib.scrypt with a random 16-byte salt."""
    if len(password) < 8:
        raise HTTPException(status_code=422, detail="Password must be at least 8 characters long.")
    salt = os.urandom(16)
    hashed = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1)
    return f"scrypt${salt.hex()}${hashed.hex()}"


def verify_password(password: str, hashed_value: str) -> bool:
    """Verify password against scrypt hash in constant time."""
    try:
        parts = hashed_value.split("$")
        if len(parts) != 3 or parts[0] != "scrypt":
            return False
        salt = bytes.fromhex(parts[1])
        expected = bytes.fromhex(parts[2])
        computed = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=16384, r=8, p=1)
        return hmac.compare_digest(computed, expected)
    except Exception:
        return False


def create_session_token(user_id: int) -> str:
    """Create signed, URL-safe timed session token for user ID."""
    return serializer.dumps({"sub": user_id})


def verify_session_token(token: str) -> Optional[int]:
    """Verify token signature and expiry; return user ID or None."""
    try:
        data = serializer.loads(token, max_age=SESSION_MAX_AGE)
        return data.get("sub")
    except (BadSignature, SignatureExpired, Exception):
        return None


def get_client_ip(request: Request) -> str:
    """Extract client IP, taking X-Forwarded-For into account."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "127.0.0.1"


def check_login_rate_limit(ip: str, email: str) -> None:
    """Enforce maximum 5 login attempts per minute per IP + email combination."""
    now = time.time()
    key = (ip.strip(), email.strip().lower())
    attempts = _login_attempts.get(key, [])
    # Filter attempts within the window
    recent = [t for t in attempts if now - t < RATE_LIMIT_WINDOW_SECONDS]
    _login_attempts[key] = recent

    if len(recent) >= RATE_LIMIT_MAX_ATTEMPTS:
        raise HTTPException(
            status_code=429,
            detail="Too many login attempts. Please wait 60 seconds before trying again.",
        )


def record_login_attempt(ip: str, email: str) -> None:
    """Record a failed or attempted login timestamp."""
    now = time.time()
    key = (ip.strip(), email.strip().lower())
    if key not in _login_attempts:
        _login_attempts[key] = []
    _login_attempts[key].append(now)


def reset_login_rate_limit(ip: str, email: str) -> None:
    """Clear failed login attempts on successful authentication."""
    key = (ip.strip(), email.strip().lower())
    _login_attempts.pop(key, None)


def set_auth_cookie(response: Response, token: str) -> None:
    """Set secure HttpOnly SameSite=Lax session cookie."""
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        max_age=SESSION_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=ENVIRONMENT == "production",
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    """Clear session cookie."""
    response.delete_cookie(
        key=SESSION_COOKIE_NAME,
        path="/",
        httponly=True,
        samesite="lax",
    )


def get_current_user(request: Request) -> dict:
    """
    FastAPI dependency: Authenticates user from HttpOnly session cookie
    or Bearer Authorization header. Returns user dictionary.
    Raises 401 if missing or invalid.
    """
    token = request.cookies.get(SESSION_COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("authorization", "")
        if auth_header.lower().startswith("bearer "):
            token = auth_header[7:].strip()

    if not token:
        raise HTTPException(status_code=401, detail="Authentication required.")

    user_id = verify_session_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired session. Please log in again.")

    with get_connection() as connection:
        row = connection.execute(
            "SELECT id, name, email, role, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()

    if not row:
        raise HTTPException(status_code=401, detail="User account not found.")

    return dict(row)


def require_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """FastAPI dependency: Requires authenticated user to have 'admin' role."""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin privileges required for this action.")
    return current_user


def get_optional_user(request: Request) -> dict | None:
    """Return user dict if authenticated, or None without raising exception."""
    try:
        return get_current_user(request)
    except HTTPException:
        return None

