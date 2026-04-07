from __future__ import annotations

from pydantic import BaseModel, EmailStr


# ---------------------------------------------------------------------------
# Admin login
# ---------------------------------------------------------------------------


class AdminLoginRequest(BaseModel):
    """Body for POST /api/auth/admin/login."""

    username: str
    password: str


class AdminLoginResponse(BaseModel):
    """Response for POST /api/auth/admin/login."""

    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Invitations
# ---------------------------------------------------------------------------


class CreateInvitationRequest(BaseModel):
    """Body for POST /api/admin/invitations."""

    email: EmailStr
    note: str | None = None
    # Mode config embedded into the visitor JWT.
    allowed_modes: list[str]
    default_mode: str
    can_switch_modes: bool = False


class CreateInvitationResponse(BaseModel):
    """Response for POST /api/admin/invitations."""

    invite_id: str
    invite_token: str
    email: str
    invite_url: str


# ---------------------------------------------------------------------------
# Accept invite
# ---------------------------------------------------------------------------


class AcceptInviteRequest(BaseModel):
    """Body for POST /api/auth/accept-invite."""

    invite_token: str


class AcceptInviteResponse(BaseModel):
    """Response for POST /api/auth/accept-invite."""

    access_token: str
    token_type: str = "bearer"
    visitor_id: str
