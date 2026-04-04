from __future__ import annotations

import os
import uuid

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.core.dependencies import get_current_admin
from app.core.security import create_token, verify_password
from app.models.auth import (
    AcceptInviteRequest,
    AcceptInviteResponse,
    AdminLoginRequest,
    AdminLoginResponse,
    CreateInvitationRequest,
    CreateInvitationResponse,
)

admin_router = APIRouter(prefix="/api/admin")
auth_router = APIRouter(prefix="/api/auth")


# ---------------------------------------------------------------------------
# Admin login
# ---------------------------------------------------------------------------


@auth_router.post("/admin/login", response_model=AdminLoginResponse)
async def admin_login(body: AdminLoginRequest) -> AdminLoginResponse:
    """Authenticate the admin and return a signed JWT.

    Credentials are validated against ``ADMIN_USERNAME`` and
    ``ADMIN_PASSWORD`` env vars. The returned token carries
    ``role: admin`` and expires per ``JWT_EXPIRE_HOURS`` (default 24 h).

    Raises:
        HTTPException 401: If credentials are invalid.
    """
    expected_username = os.environ.get("ADMIN_USERNAME", "")
    expected_password = os.environ.get("ADMIN_PASSWORD", "")

    username_ok = body.username == expected_username
    # verify_password handles timing-safe comparison via bcrypt.
    # Fall back to plain equality if the stored value is not a bcrypt hash
    # (allows plain-text passwords in .env without pre-hashing).
    try:
        password_ok = verify_password(body.password, expected_password)
    except Exception:
        password_ok = body.password == expected_password

    if not username_ok or not password_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid credentials",
        )

    token = create_token({"sub": "admin", "role": "admin"})
    return AdminLoginResponse(access_token=token)


# ---------------------------------------------------------------------------
# Invitations (admin-only)
# ---------------------------------------------------------------------------


@admin_router.post(
    "/invitations",
    response_model=CreateInvitationResponse,
    dependencies=[Depends(get_current_admin)],
)
async def create_invitation(
    body: CreateInvitationRequest,
    request: Request,
) -> CreateInvitationResponse:
    """Generate a recruiter invite token and return the invite URL.

    Requires a valid admin JWT (``Authorization: Bearer <token>``).
    Tokens are stored in ``app.state.invite_tokens`` keyed by invite_id.
    The invite URL is constructed from the ``FRONTEND_URL`` env var
    (defaults to ``http://localhost:3001``).

    Args:
        body: Recruiter email and optional note.
        request: FastAPI request (used to access app.state).

    Returns:
        Invite ID, raw token, email, and full invite URL.
    """
    invite_id = str(uuid.uuid4())
    invite_token = str(uuid.uuid4())

    # Store token → invite_id mapping for validation at accept-invite time.
    request.app.state.invite_tokens[invite_token] = {
        "invite_id": invite_id,
        "email": body.email,
        "note": body.note,
    }

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3001")
    invite_url = f"{frontend_url}/invite?token={invite_token}"

    return CreateInvitationResponse(
        invite_id=invite_id,
        invite_token=invite_token,
        email=body.email,
        invite_url=invite_url,
    )


# ---------------------------------------------------------------------------
# Accept invite
# ---------------------------------------------------------------------------


@auth_router.post("/accept-invite", response_model=AcceptInviteResponse)
async def accept_invite(
    body: AcceptInviteRequest,
    request: Request,
) -> AcceptInviteResponse:
    """Exchange an invite token for a recruiter JWT.

    Validates the invite token against ``app.state.invite_tokens``.
    On success, creates a recruiter JWT carrying a stable ``recruiter_id``
    (tied to the invite) so future chat history can be keyed to it.
    Token TTL is 7 days to avoid interrupting recruiter conversations.

    Args:
        body: The raw invite token.
        request: FastAPI request (used to access app.state).

    Returns:
        Recruiter JWT and the durable recruiter_id.

    Raises:
        HTTPException 401: If the invite token is not recognised.
    """
    invite_data = request.app.state.invite_tokens.get(body.invite_token)
    if invite_data is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired invite token",
        )

    recruiter_id = str(uuid.uuid4())
    token = create_token(
        {
            "sub": recruiter_id,
            "role": "recruiter",
            "invite_id": invite_data["invite_id"],
        },
        expire_hours=7 * 24,  # 7 days
    )

    return AcceptInviteResponse(
        access_token=token,
        recruiter_id=recruiter_id,
    )
