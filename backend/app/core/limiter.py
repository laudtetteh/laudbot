"""Rate limiter configuration.

Uses slowapi (Starlette wrapper around limits) with a custom key function
that identifies requests by visitor_id from the JWT rather than by IP address.
Keying by visitor_id is correct here — visitors may share IPs (corporate NAT,
etc.) but the JWT uniquely identifies the session.

Falls back to the client IP if the JWT is absent or unparseable (e.g. on
unauthenticated requests, which the route guard will reject anyway).
"""
from __future__ import annotations

import os

import jwt
from slowapi import Limiter
from starlette.requests import Request

# Default: 20 messages per visitor per minute.
RATE_LIMIT_CHAT = os.environ.get("RATE_LIMIT_CHAT", "20/minute")


def _visitor_id_key(request: Request) -> str:
    """Extract visitor_id from the Bearer JWT for rate-limit keying.

    Args:
        request: Incoming Starlette request.

    Returns:
        The visitor_id string from the JWT sub claim, or the client IP
        as a fallback if the token is missing or cannot be decoded.
    """
    auth: str = request.headers.get("Authorization", "")
    if auth.startswith("Bearer "):
        token = auth.removeprefix("Bearer ")
        try:
            # Decode without verification — we only need the sub claim for
            # the key function. Actual signature verification happens in the
            # FastAPI dependency (get_current_visitor).
            payload = jwt.decode(token, options={"verify_signature": False})
            visitor_id: str | None = payload.get("sub")
            if visitor_id:
                return visitor_id
        except Exception:  # noqa: BLE001
            pass
    # Fallback: client IP (handles unauthenticated requests gracefully).
    return request.client.host if request.client else "unknown"


limiter = Limiter(key_func=_visitor_id_key)
