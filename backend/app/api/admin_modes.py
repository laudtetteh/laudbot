from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, field_validator

from app.core.dependencies import get_current_admin
from app.services.llm.base import MODES

router = APIRouter(prefix="/api/admin/modes", dependencies=[Depends(get_current_admin)])


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------


class ModesConfigResponse(BaseModel):
    """Current global mode enable/disable state."""

    modes: dict[str, bool]


class UpdateModesConfigRequest(BaseModel):
    """Partial or full update to global mode enable/disable state.

    Only keys present in the payload are updated — omitted modes are unchanged.
    """

    modes: dict[str, bool]


class ModeOverlayResponse(BaseModel):
    """Current overlay text for a single mode."""

    mode: str
    overlay: str


class UpdateModeOverlayRequest(BaseModel):
    """New overlay text for a single mode."""

    overlay: str


# ---------------------------------------------------------------------------
# Global mode config endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=ModesConfigResponse)
async def get_modes_config(request: Request) -> ModesConfigResponse:
    """Return the current global enable/disable state for all modes.

    Args:
        request: FastAPI request (used to access app.state).

    Returns:
        Map of mode slug → enabled boolean.
    """
    return ModesConfigResponse(modes=dict(request.app.state.modes_config))


@router.put("", response_model=ModesConfigResponse)
async def update_modes_config(
    body: UpdateModesConfigRequest,
    request: Request,
) -> ModesConfigResponse:
    """Update global enable/disable state for one or more modes.

    Unrecognised mode slugs are rejected. Only the modes present in the
    request payload are updated; others are left unchanged.

    Args:
        body: Partial or full map of mode slug → enabled boolean.
        request: FastAPI request (used to access app.state).

    Returns:
        Updated map of all mode slugs → enabled boolean.

    Raises:
        HTTPException 400: If any mode slug in the payload is not in MODES.
    """
    unknown = [m for m in body.modes if m not in MODES]
    if unknown:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unknown mode(s): {unknown}. Valid modes: {MODES}",
        )
    request.app.state.modes_config.update(body.modes)
    return ModesConfigResponse(modes=dict(request.app.state.modes_config))


# ---------------------------------------------------------------------------
# Per-mode overlay endpoints
# ---------------------------------------------------------------------------


@router.get("/{mode}", response_model=ModeOverlayResponse)
async def get_mode_overlay(mode: str, request: Request) -> ModeOverlayResponse:
    """Return the current overlay text for a single mode.

    Args:
        mode: Mode slug (e.g. "recruiter").
        request: FastAPI request (used to access app.state).

    Returns:
        Mode slug and its current overlay text.

    Raises:
        HTTPException 404: If the mode slug is not recognised.
    """
    if mode not in MODES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown mode: {mode}. Valid modes: {MODES}",
        )
    overlay = request.app.state.mode_overlays.get(mode, "")
    return ModeOverlayResponse(mode=mode, overlay=overlay)


@router.put("/{mode}", response_model=ModeOverlayResponse)
async def update_mode_overlay(
    mode: str,
    body: UpdateModeOverlayRequest,
    request: Request,
) -> ModeOverlayResponse:
    """Replace the overlay text for a single mode.

    The new overlay takes effect immediately for all subsequent chat requests.
    Stored in memory only — resets on restart.

    Args:
        mode: Mode slug (e.g. "recruiter").
        body: New overlay text.
        request: FastAPI request (used to access app.state).

    Returns:
        Mode slug and the saved overlay text.

    Raises:
        HTTPException 404: If the mode slug is not recognised.
    """
    if mode not in MODES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown mode: {mode}. Valid modes: {MODES}",
        )
    request.app.state.mode_overlays[mode] = body.overlay.strip()
    return ModeOverlayResponse(mode=mode, overlay=body.overlay.strip())


# ---------------------------------------------------------------------------
# Per-mode suggested prompts endpoints
# ---------------------------------------------------------------------------


class ModePromptsResponse(BaseModel):
    """Suggested prompts for a single mode."""

    mode: str
    prompts: list[str]


class UpdateModePromptsRequest(BaseModel):
    """New suggested prompts list for a single mode."""

    prompts: list[str]

    @field_validator("prompts")
    @classmethod
    def strip_empty(cls, v: list[str]) -> list[str]:
        """Drop blank entries so the UI doesn't render empty chips."""
        return [p.strip() for p in v if p.strip()]


@router.get("/{mode}/prompts", response_model=ModePromptsResponse)
async def get_mode_prompts(mode: str, request: Request) -> ModePromptsResponse:
    """Return the current suggested prompts for a single mode.

    Args:
        mode: Mode slug (e.g. "recruiter").
        request: FastAPI request (used to access app.state).

    Returns:
        Mode slug and its current suggested prompts list.

    Raises:
        HTTPException 404: If the mode slug is not recognised.
    """
    if mode not in MODES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown mode: {mode}. Valid modes: {MODES}",
        )
    prompts = request.app.state.mode_prompts.get(mode, [])
    return ModePromptsResponse(mode=mode, prompts=prompts)


@router.put("/{mode}/prompts", response_model=ModePromptsResponse)
async def update_mode_prompts(
    mode: str,
    body: UpdateModePromptsRequest,
    request: Request,
) -> ModePromptsResponse:
    """Replace the suggested prompts list for a single mode.

    Takes effect immediately for all subsequent chat sessions.
    Stored in memory only — resets on restart.

    Args:
        mode: Mode slug (e.g. "recruiter").
        body: New prompts list (blank entries are ignored).
        request: FastAPI request (used to access app.state).

    Returns:
        Mode slug and the saved prompts list.

    Raises:
        HTTPException 404: If the mode slug is not recognised.
    """
    if mode not in MODES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown mode: {mode}. Valid modes: {MODES}",
        )
    request.app.state.mode_prompts[mode] = body.prompts
    return ModePromptsResponse(mode=mode, prompts=body.prompts)
