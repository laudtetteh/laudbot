"""Rate limiter — sliding-window in-memory implementation as a FastAPI Depends.

Using a FastAPI dependency (rather than a slowapi decorator) avoids an
incompatibility where the decorator wrapper breaks FastAPI's Pydantic body
parameter introspection, causing the request body to be misidentified as a
query parameter and returning a 422 error.

Configuration:
    RATE_LIMIT_CHAT env var (default ``20/minute``).
    Format: ``<count>/<unit>`` where unit is ``second``, ``minute``, or ``hour``.
"""
from __future__ import annotations

import os
import time
from collections import defaultdict

from fastapi import Depends, HTTPException
from starlette.requests import Request

from app.core.dependencies import get_current_visitor

_RATE_LIMIT_CHAT = os.environ.get("RATE_LIMIT_CHAT", "20/minute")

_UNIT_SECONDS: dict[str, float] = {
    "second": 1.0,
    "minute": 60.0,
    "hour": 3600.0,
}


def _parse_rate_limit(spec: str) -> tuple[int, float]:
    """Parse a ``<count>/<unit>`` rate-limit spec into (max_requests, window_seconds).

    Args:
        spec: Rate limit string, e.g. ``"20/minute"``.

    Returns:
        Tuple of (max_requests, window_seconds).

    Raises:
        ValueError: If the spec is not parseable.
    """
    try:
        count_str, unit = spec.strip().split("/")
        return int(count_str), _UNIT_SECONDS[unit.lower().rstrip("s")]
    except (ValueError, KeyError) as exc:
        raise ValueError(f"Invalid RATE_LIMIT_CHAT spec: {spec!r}") from exc


_MAX_REQUESTS, _WINDOW_SECONDS = _parse_rate_limit(_RATE_LIMIT_CHAT)

# visitor_id → list of request timestamps (monotonic clock)
_request_log: dict[str, list[float]] = defaultdict(list)


async def chat_rate_limit(
    request: Request,
    visitor: dict = Depends(get_current_visitor),
) -> None:
    """FastAPI dependency that enforces a per-visitor sliding-window rate limit.

    Args:
        request: Incoming Starlette request (unused directly; required for Depends chain).
        visitor: Decoded visitor JWT payload — provides the visitor_id key.

    Raises:
        HTTPException 429: When the visitor exceeds the configured request rate.
    """
    visitor_id: str = visitor["sub"]
    now = time.monotonic()
    window_start = now - _WINDOW_SECONDS

    # Evict timestamps outside the current window.
    _request_log[visitor_id] = [
        t for t in _request_log[visitor_id] if t > window_start
    ]

    if len(_request_log[visitor_id]) >= _MAX_REQUESTS:
        unit = next(k for k, v in _UNIT_SECONDS.items() if v == _WINDOW_SECONDS)
        raise HTTPException(
            status_code=429,
            detail=(
                f"Rate limit exceeded. You can send {_MAX_REQUESTS} messages "
                f"per {unit}. Please wait before sending another message."
            ),
        )

    _request_log[visitor_id].append(now)
