from __future__ import annotations

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.security import decode_token

_bearer = HTTPBearer(auto_error=False)


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
