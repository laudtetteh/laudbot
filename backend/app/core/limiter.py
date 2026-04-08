"""Per-visitor rate limiting as a FastAPI dependency.

Implemented as a sliding-window in-memory counter keyed by visitor_id from
the JWT. Using a FastAPI Depends rather than a decorator avoids the known
incompatibility between slowapi's wrapper pattern and FastAPI's Pydantic body
parameter introspection (which causes 422 "Field required" errors).

The counter resets on backend restart — acceptable for this use case.
Configurable via RATE_LIMIT_CHAT env var (default: "20/minute").
"""
from __future__ import annotations

import os
import time
from collections import defaultdict

from fastapi import Depends, HTTPException, Request

from app.core.dependencies import get_current_visitor

# Parse "N/period" from env var.  Supported periods: second, minute, hour.
_RATE_LIMIT_CHAT = os.environ.get("RATE_LIMIT_CHAT", "20/minute")

_PERIOD_SECONDS: dict[str, int] = {
    "second": 1,
    "minute": 60,
    "hour": 3600,
}


def _parse_rate_limit(spec: str) -> tuple[int, int]:
    """Parse a rate limit string into (count, window_seconds).

    Args:
        spec: Rate limit string in "N/period" format, e.g. "20/minute".

    Returns:
        Tuple of (max_requests, window_in_seconds).

    Raises:
        ValueError: If the spec format is unrecognised.
    """
    try:
        count_str, period = spec.strip().split("/")
        count = int(count_str)
        window = _PERIOD_SECONDS[period.lower().rstrip("s")]
        return count, window
    except (ValueError, KeyError) as exc:
        raise ValueError(
            f"Invalid RATE_LIMIT_CHAT value '{spec}'. "
            f"Expected format: 'N/second', 'N/minute', or 'N/hour'."
        ) from exc


_MAX_REQUESTS, _WINDOW_SECONDS = _parse_rate_limit(_RATE_LIMIT_CHAT)

# Sliding-window request timestamps per visitor_id.
_request_log: dict[str, list[float]] = defaultdict(list)


async def chat_rate_limit(
    request: Request,
    visitor: dict = Depends(get_current_visitor),
) -> None:
    """FastAPI dependency that enforces per-visitor rate limiting on chat.

    Raises HTTP 429 if the visitor has exceeded the configured request rate.

    Args:
        request: Incoming FastAPI request (unused directly; required by Depends chain).
        visitor: Decoded visitor JWT payload from get_current_visitor.

    Raises:
        HTTPException 429: When the rate limit is exceeded.
    """
    visitor_id: str = visitor["sub"]
    now = time.monotonic()

    # Drop timestamps outside the current window.
    window_start = now - _WINDOW_SECONDS
    log = _request_log[visitor_id]
    _request_log[visitor_id] = [t for t in log if t > window_start]

    if len(_request_log[visitor_id]) >= _MAX_REQUESTS:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded. You can send {_MAX_REQUESTS} messages per {_WINDOW_SECONDS // 60 or _WINDOW_SECONDS} {'minute' if _WINDOW_SECONDS >= 60 else 'second'}.",
        )

    _request_log[visitor_id].append(now)
