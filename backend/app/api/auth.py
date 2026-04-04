from __future__ import annotations

from fastapi import APIRouter

from app.models.invitations import (
    AcceptInviteRequest,
    AcceptInviteResponse,
    CreateInvitationRequest,
    CreateInvitationResponse,
)

admin_router = APIRouter(prefix="/api/admin")
auth_router = APIRouter(prefix="/api/auth")


@admin_router.post("/invitations", response_model=CreateInvitationResponse)
async def create_invitation(body: CreateInvitationRequest) -> CreateInvitationResponse:
    """Create a recruiter invitation. Stubbed in v1 — no real logic."""
    return CreateInvitationResponse()


@auth_router.post("/accept-invite", response_model=AcceptInviteResponse)
async def accept_invite(body: AcceptInviteRequest) -> AcceptInviteResponse:
    """Accept an invitation token. Stubbed in v1 — no real logic."""
    return AcceptInviteResponse()
