"""Admin routes for mode config — enabled flag, overlays, and suggested prompts.

All state is now persisted to the ``mode_config`` DB table. The in-memory
``app.state.modes_config``, ``app.state.mode_overlays``, and
``app.state.mode_prompts`` dicts have been removed.
"""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, field_validator
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_db
from app.db.models import ModeConfig
from app.services.llm.base import MODES

router = APIRouter(prefix="/api/admin/modes", dependencies=[Depends(get_current_admin)])


# ---------------------------------------------------------------------------
# Request / response models
# ---------------------------------------------------------------------------


class ModesConfigResponse(BaseModel):
    """Current global mode enable/disable state."""

    modes: dict[str, bool]


class UpdateModesConfigRequest(BaseModel):
    """Partial update to global mode enable/disable state."""

    modes: dict[str, bool]


class ModeOverlayResponse(BaseModel):
    """Current overlay text for a single mode."""

    mode: str
    overlay: str


class UpdateModeOverlayRequest(BaseModel):
    """New overlay text for a single mode."""

    overlay: str


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


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


async def _get_mode_row(mode: str, db: AsyncSession) -> ModeConfig:
    """Fetch a single ModeConfig row or raise 404.

    Args:
        mode: Mode slug to look up.
        db: Active async session.

    Returns:
        The ``ModeConfig`` ORM instance.

    Raises:
        HTTPException 404: If the mode slug is not in MODES.
    """
    if mode not in MODES:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Unknown mode: {mode}. Valid modes: {MODES}",
        )
    result = await db.execute(select(ModeConfig).where(ModeConfig.mode == mode))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Mode config not found for '{mode}' — DB may not be seeded yet.",
        )
    return row


# ---------------------------------------------------------------------------
# Global mode config endpoints
# ---------------------------------------------------------------------------


@router.get("", response_model=ModesConfigResponse)
async def get_modes_config(db: AsyncSession = Depends(get_db)) -> ModesConfigResponse:
    """Return the current global enable/disable state for all modes.

    Args:
        db: Injected async DB session.

    Returns:
        Map of mode slug → enabled boolean.
    """
    result = await db.execute(select(ModeConfig))
    rows = result.scalars().all()
    return ModesConfigResponse(modes={row.mode: row.enabled for row in rows})


@router.put("", response_model=ModesConfigResponse)
async def update_modes_config(
    body: UpdateModesConfigRequest,
    db: AsyncSession = Depends(get_db),
) -> ModesConfigResponse:
    """Update global enable/disable state for one or more modes.

    Only modes present in the payload are updated; others are unchanged.

    Args:
        body: Partial map of mode slug → enabled boolean.
        db: Injected async DB session.

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
    for mode, enabled in body.modes.items():
        row = await _get_mode_row(mode, db)
        row.enabled = enabled

    await db.commit()

    result = await db.execute(select(ModeConfig))
    rows = result.scalars().all()
    return ModesConfigResponse(modes={row.mode: row.enabled for row in rows})


# ---------------------------------------------------------------------------
# Per-mode overlay endpoints
# ---------------------------------------------------------------------------


@router.get("/{mode}", response_model=ModeOverlayResponse)
async def get_mode_overlay(
    mode: str, db: AsyncSession = Depends(get_db)
) -> ModeOverlayResponse:
    """Return the current overlay text for a single mode.

    Args:
        mode: Mode slug (e.g. ``"recruiter"``).
        db: Injected async DB session.

    Returns:
        Mode slug and its current overlay text.
    """
    row = await _get_mode_row(mode, db)
    return ModeOverlayResponse(mode=mode, overlay=row.overlay)


@router.put("/{mode}", response_model=ModeOverlayResponse)
async def update_mode_overlay(
    mode: str,
    body: UpdateModeOverlayRequest,
    db: AsyncSession = Depends(get_db),
) -> ModeOverlayResponse:
    """Replace the overlay text for a single mode.

    Takes effect immediately for all subsequent chat requests. Persisted to DB.

    Args:
        mode: Mode slug (e.g. ``"recruiter"``).
        body: New overlay text.
        db: Injected async DB session.

    Returns:
        Mode slug and the saved overlay text.
    """
    row = await _get_mode_row(mode, db)
    row.overlay = body.overlay.strip()
    await db.commit()
    return ModeOverlayResponse(mode=mode, overlay=row.overlay)


# ---------------------------------------------------------------------------
# Per-mode suggested prompts endpoints
# ---------------------------------------------------------------------------


@router.get("/{mode}/prompts", response_model=ModePromptsResponse)
async def get_mode_prompts(
    mode: str, db: AsyncSession = Depends(get_db)
) -> ModePromptsResponse:
    """Return the current suggested prompts for a single mode.

    Args:
        mode: Mode slug (e.g. ``"recruiter"``).
        db: Injected async DB session.

    Returns:
        Mode slug and its current suggested prompts list.
    """
    row = await _get_mode_row(mode, db)
    return ModePromptsResponse(mode=mode, prompts=row.prompts or [])


@router.put("/{mode}/prompts", response_model=ModePromptsResponse)
async def update_mode_prompts(
    mode: str,
    body: UpdateModePromptsRequest,
    db: AsyncSession = Depends(get_db),
) -> ModePromptsResponse:
    """Replace the suggested prompts list for a single mode. Persisted to DB.

    Args:
        mode: Mode slug (e.g. ``"recruiter"``).
        body: New prompts list (blank entries are stripped).
        db: Injected async DB session.

    Returns:
        Mode slug and the saved prompts list.
    """
    row = await _get_mode_row(mode, db)
    row.prompts = body.prompts
    await db.commit()
    return ModePromptsResponse(mode=mode, prompts=row.prompts)
