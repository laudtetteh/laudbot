"""Auth routes — admin login and visitor invite flow.

All invite state is now persisted to the ``invitations`` DB table.
"""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_db
from app.core.security import create_token, verify_password
from app.db.models import Invitation, ModeConfig
from app.models.auth import (
    AcceptInviteRequest,
    AcceptInviteResponse,
    AdminLoginRequest,
    AdminLoginResponse,
    CreateInvitationRequest,
    CreateInvitationResponse,
    InvitationListResponse,
    InvitationRecord,
)
from app.services.email import send_invite_email
from app.services.llm.base import MODES

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
    db: AsyncSession = Depends(get_db),
) -> CreateInvitationResponse:
    """Generate a visitor invite token and persist it to the DB.

    Validates that all requested modes are valid and globally enabled.
    The invite URL is constructed from the ``FRONTEND_URL`` env var.

    Args:
        body: Visitor email, optional note, and mode config.
        db: Injected async DB session.

    Returns:
        Invite ID, raw token, email, and full invite URL.

    Raises:
        HTTPException 400: If any mode is unknown or globally disabled.
    """
    result = await db.execute(select(ModeConfig))
    mode_rows: dict[str, bool] = {row.mode: row.enabled for row in result.scalars()}

    invalid = [m for m in body.allowed_modes if m not in MODES]
    if invalid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown mode(s): {invalid}. Valid modes: {MODES}",
        )
    disabled = [m for m in body.allowed_modes if not mode_rows.get(m, False)]
    if disabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Mode(s) are globally disabled: {disabled}",
        )
    if body.default_mode not in body.allowed_modes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="default_mode must be one of the allowed_modes",
        )

    invite_id = uuid.uuid4()
    invite_token = uuid.uuid4()

    invitation = Invitation(
        id=invite_id,
        email=str(body.email),
        note=body.note,
        invite_token=invite_token,
        allowed_modes=body.allowed_modes,
        default_mode=body.default_mode,
        can_switch_modes=body.can_switch_modes,
    )
    db.add(invitation)
    await db.commit()

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3001")
    invite_url = f"{frontend_url}/invite?token={invite_token}"

    await send_invite_email(
        to_email=str(body.email),
        invite_url=invite_url,
        mode=body.default_mode,
        note=body.note,
    )

    return CreateInvitationResponse(
        invite_id=str(invite_id),
        invite_token=str(invite_token),
        email=body.email,
        invite_url=invite_url,
    )


@admin_router.get(
    "/invitations",
    response_model=InvitationListResponse,
    dependencies=[Depends(get_current_admin)],
)
async def list_invitations(
    db: AsyncSession = Depends(get_db),
) -> InvitationListResponse:
    """Return all invitations ordered newest first.

    Args:
        db: Injected async DB session.

    Returns:
        All invitation rows with status fields.
    """
    from sqlalchemy import desc

    result = await db.execute(
        select(Invitation).order_by(desc(Invitation.created_at))
    )
    rows = result.scalars().all()

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3001")

    return InvitationListResponse(
        invitations=[
            InvitationRecord(
                id=str(row.id),
                email=row.email,
                note=row.note,
                invite_url=f"{frontend_url}/invite?token={row.invite_token}",
                allowed_modes=row.allowed_modes,
                default_mode=row.default_mode,
                can_switch_modes=row.can_switch_modes,
                created_at=row.created_at,
                accepted_at=row.accepted_at,
                revoked_at=row.revoked_at,
                visitor_id=str(row.visitor_id) if row.visitor_id else None,
            )
            for row in rows
        ]
    )


@admin_router.post(
    "/invitations/{invite_id}/resend",
    status_code=204,
    dependencies=[Depends(get_current_admin)],
)
async def resend_invitation(
    invite_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Re-send the original invite email for an existing invitation.

    Uses the existing token — the visitor receives the same link.
    Blocked if the invitation has been revoked.

    Args:
        invite_id: UUID of the invitation row.
        db: Injected async DB session.

    Raises:
        HTTPException 404: If the invitation does not exist.
        HTTPException 409: If the invitation has been revoked.
    """
    try:
        row_id = uuid.UUID(invite_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    result = await db.execute(select(Invitation).where(Invitation.id == row_id))
    invitation: Invitation | None = result.scalar_one_or_none()

    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    if invitation.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot resend a revoked invitation",
        )

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3001")
    invite_url = f"{frontend_url}/invite?token={invitation.invite_token}"

    await send_invite_email(
        to_email=invitation.email,
        invite_url=invite_url,
        mode=invitation.default_mode,
        note=invitation.note,
    )


@admin_router.delete(
    "/invitations/{invite_id}",
    status_code=204,
    dependencies=[Depends(get_current_admin)],
)
async def revoke_invitation(
    invite_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Soft-revoke an invitation by setting revoked_at.

    The row is retained for history. Revoked tokens are rejected at
    accept-invite time. Already-revoked invitations are silently idempotent.

    Args:
        invite_id: UUID of the invitation row.
        db: Injected async DB session.

    Raises:
        HTTPException 404: If the invitation does not exist.
    """
    try:
        row_id = uuid.UUID(invite_id)
    except (ValueError, AttributeError):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    result = await db.execute(select(Invitation).where(Invitation.id == row_id))
    invitation: Invitation | None = result.scalar_one_or_none()

    if invitation is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    if invitation.revoked_at is None:
        invitation.revoked_at = datetime.now(timezone.utc)
        await db.commit()


# ---------------------------------------------------------------------------
# Accept invite
# ---------------------------------------------------------------------------


@auth_router.post("/accept-invite", response_model=AcceptInviteResponse)
async def accept_invite(
    body: AcceptInviteRequest,
    db: AsyncSession = Depends(get_db),
) -> AcceptInviteResponse:
    """Exchange an invite token for a visitor JWT.

    Looks up the token in the ``invitations`` table, stamps ``accepted_at``
    and ``visitor_id``, then returns a signed JWT. The token remains valid
    for repeat visits (idempotent accept).

    Args:
        body: The raw invite token (UUID string).
        db: Injected async DB session.

    Returns:
        Visitor JWT and the durable visitor_id.

    Raises:
        HTTPException 401: If the invite token is not recognised.
    """
    try:
        token_uuid = uuid.UUID(body.invite_token)
    except (ValueError, AttributeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired invite token",
        )

    result = await db.execute(
        select(Invitation).where(Invitation.invite_token == token_uuid)
    )
    invitation: Invitation | None = result.scalar_one_or_none()

    if invitation is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired invite token",
        )

    if invitation.revoked_at is not None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="This invite has been revoked",
        )

    # Use existing visitor_id if this token was already accepted.
    visitor_id = invitation.visitor_id or uuid.uuid4()

    invitation.accepted_at = datetime.now(timezone.utc)
    invitation.visitor_id = visitor_id
    await db.commit()

    token = create_token(
        {
            "sub": str(visitor_id),
            "role": "visitor",
            "invite_id": str(invitation.id),
            "allowed_modes": invitation.allowed_modes,
            "default_mode": invitation.default_mode,
            "can_switch_modes": invitation.can_switch_modes,
        },
        expire_hours=7 * 24,
    )

    return AcceptInviteResponse(
        access_token=token,
        visitor_id=str(visitor_id),
    )
