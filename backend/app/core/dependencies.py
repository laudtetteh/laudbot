"""FastAPI dependency functions.

Provides:
- ``get_db``              — yields an async DB session per request
- ``get_current_admin``   — validates admin JWT and returns payload
- ``get_current_recruiter`` — validates recruiter JWT and returns payload
"""
from __future__ import annotations

from typing import AsyncGenerator

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.base import AsyncSessionLocal

_bearer = HTTPBearer(auto_error=False)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a SQLAlchemy async session, closing it when the request is done.

    Yields:
        An ``AsyncSession`` bound to the request lifecycle.
    """
    async with AsyncSessionLocal() as session:
        yield session


def _extract_payload(
    credentials: HTTPAuthorizationCredentials | None,
    required_role: str,
) -> dict:
    """Decode the Bearer JWT and assert the required role.

    Args:
        credentials: Parsed Authorization header from FastAPI's HTTPBearer.
        required_role: Expected value of the ``role`` claim.

    Returns:
        Decoded JWT payload dict.

    Raises:
        HTTPException 401: If the token is missing, invalid, or has the wrong role.
    """
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )
    try:
        payload = decode_token(credentials.credentials)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid or expired token: {exc}",
        ) from exc

    if payload.get("role") != required_role:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return payload


def get_current_admin(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """FastAPI dependency — requires a valid admin JWT.

    Returns:
        Decoded JWT payload for the authenticated admin.
    """
    return _extract_payload(credentials, required_role="admin")


def get_current_recruiter(
    credentials: HTTPAuthorizationCredentials | None = Depends(_bearer),
) -> dict:
    """FastAPI dependency — requires a valid recruiter JWT.

    Returns:
        Decoded JWT payload for the authenticated recruiter.
    """
    return _extract_payload(credentials, required_role="recruiter")
