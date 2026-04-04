from __future__ import annotations

import os
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

# ---------------------------------------------------------------------------
# Password hashing
# ---------------------------------------------------------------------------

_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Return a bcrypt hash of *plain*."""
    return _pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Return True if *plain* matches *hashed*."""
    return _pwd_context.verify(plain, hashed)


# ---------------------------------------------------------------------------
# JWT helpers
# ---------------------------------------------------------------------------

_ALGORITHM = "HS256"


def _secret() -> str:
    secret = os.environ.get("JWT_SECRET_KEY", "")
    if not secret:
        raise RuntimeError("JWT_SECRET_KEY env var is not set")
    return secret


def create_token(payload: dict, expire_hours: float | None = None) -> str:
    """Sign *payload* and return a JWT string.

    Args:
        payload: Claims to embed. Must not include ``iat`` or ``exp`` —
            those are added here.
        expire_hours: Token lifetime in hours. Defaults to
            ``JWT_EXPIRE_HOURS`` env var, or 24 h if unset.

    Returns:
        Encoded JWT string.
    """
    if expire_hours is None:
        expire_hours = float(os.environ.get("JWT_EXPIRE_HOURS", "24"))

    now = datetime.now(tz=timezone.utc)
    claims = {
        **payload,
        "iat": now,
        "exp": now + timedelta(hours=expire_hours),
    }
    return jwt.encode(claims, _secret(), algorithm=_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify *token*.

    Args:
        token: JWT string to verify.

    Returns:
        Decoded payload dict.

    Raises:
        jwt.PyJWTError: If the token is invalid, expired, or tampered with.
    """
    return jwt.decode(token, _secret(), algorithms=[_ALGORITHM])
