from __future__ import annotations

from pydantic import BaseModel, EmailStr


# --- Request models ---


class CreateInvitationRequest(BaseModel):
    """Body for POST /api/admin/invitations."""

    email: EmailStr
    note: str | None = None


class AcceptInviteRequest(BaseModel):
    """Body for POST /api/auth/accept-invite."""

    invite_token: str


# --- Shared sub-models ---


class InvitationStub(BaseModel):
    """Placeholder invitation shape returned in v1 stubs."""

    id: None = None
    email: None = None
    state: str = "pending"
    expires_at: None = None


# --- Response models ---


class CreateInvitationResponse(BaseModel):
    """Response for POST /api/admin/invitations (v1 stub)."""

    status: str = "not_implemented"
    message: str = "Invitation creation is not implemented yet."
    invitation: InvitationStub = InvitationStub()


class AcceptInviteResponse(BaseModel):
    """Response for POST /api/auth/accept-invite (v1 stub)."""

    status: str = "not_implemented"
    message: str = "Invite acceptance is not implemented yet."
    invitation: InvitationStub = InvitationStub()
    account: None = None
    session: None = None
