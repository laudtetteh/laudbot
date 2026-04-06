from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, select, text
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_db
from app.db.models import ChatMessage, Invitation, ModeConfig, SystemConfig
from app.models.admin import LLMConfigRequest, LLMConfigResponse
from app.services.llm.base import AVAILABLE_MODELS, LLMConfig
from app.services.prompt import load_base_prompt

router = APIRouter(prefix="/api/admin")

_SYSTEM_PROMPT_KEY = "system_prompt"


class SystemPromptResponse(BaseModel):
    """Current system prompt content and metadata."""

    content: str
    source: str  # "database" | "env_var" | "file" | "fallback"
    updated_at: datetime | None


class SystemPromptRequest(BaseModel):
    """Payload for updating the system prompt."""

    content: str


@router.get("/llm-config", response_model=LLMConfigResponse, dependencies=[Depends(get_current_admin)])
async def get_llm_config(request: Request) -> LLMConfigResponse:
    """Return the currently active LLM provider and model.

    Args:
        request: FastAPI request — used to access app state.

    Returns:
        The active LLMConfig plus the full available models map.
    """
    config: LLMConfig = request.app.state.llm_config
    return LLMConfigResponse(
        provider=config.provider,
        model=config.model or "",
        available_models=AVAILABLE_MODELS,
    )


@router.get("/db-status", dependencies=[Depends(get_current_admin)])
async def db_status(db: AsyncSession = Depends(get_db)) -> dict:
    """Return row counts for all core tables — admin-only diagnostic endpoint.

    Args:
        db: Injected async DB session.

    Returns:
        Dict with row counts per table and Alembic migration version.
    """
    invitations_count = (await db.execute(select(func.count()).select_from(Invitation))).scalar()
    mode_config_count = (await db.execute(select(func.count()).select_from(ModeConfig))).scalar()
    chat_messages_count = (await db.execute(select(func.count()).select_from(ChatMessage))).scalar()
    alembic_version = (await db.execute(text("SELECT version_num FROM alembic_version"))).scalar()

    return {
        "alembic_version": alembic_version,
        "tables": {
            "invitations": invitations_count,
            "mode_config": mode_config_count,
            "chat_messages": chat_messages_count,
        },
    }


@router.put("/llm-config", response_model=LLMConfigResponse, dependencies=[Depends(get_current_admin)])
async def update_llm_config(
    body: LLMConfigRequest,
    request: Request,
) -> LLMConfigResponse:
    """Update the active LLM provider and model.

    Changes take effect immediately — the next chat request will use the new config.
    Config is held in memory and resets to the default on service restart.

    Args:
        body: The new provider and model to activate.
        request: FastAPI request — used to access and mutate app state.

    Returns:
        The updated active config.

    Raises:
        HTTPException 400: If the provider or model is not recognised.
    """
    error = body.validate_provider_model()
    if error:
        raise HTTPException(status_code=400, detail=error)

    request.app.state.llm_config = LLMConfig(
        provider=body.provider,
        model=body.model,
    )

    return LLMConfigResponse(
        provider=body.provider,
        model=body.model,
        available_models=AVAILABLE_MODELS,
    )


@router.get(
    "/system-prompt",
    response_model=SystemPromptResponse,
    dependencies=[Depends(get_current_admin)],
)
async def get_system_prompt(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> SystemPromptResponse:
    """Return the current system prompt content and its source.

    Resolution order mirrors prompt.py: DB → env var → file → inline stub.
    Always returns the content that would be used in the next chat request,
    so the admin sees exactly what's live.

    Args:
        request: FastAPI request — used to check app.state.system_prompt.
        db: Injected async DB session — used to fetch updated_at timestamp.

    Returns:
        Current prompt content, source label, and updated_at (if from DB).
    """
    import os
    from pathlib import Path

    # Check DB first for both content and timestamp.
    result = await db.execute(
        select(SystemConfig).where(SystemConfig.key == _SYSTEM_PROMPT_KEY)
    )
    row = result.scalar_one_or_none()

    if row:
        return SystemPromptResponse(
            content=row.value,
            source="database",
            updated_at=row.updated_at,
        )

    # Not in DB — return whatever load_base_prompt() would serve, with source label.
    env_content = os.getenv("SYSTEM_PROMPT", "").strip()
    if env_content:
        return SystemPromptResponse(
            content=env_content,
            source="env_var",
            updated_at=None,
        )

    path = Path(os.getenv("SYSTEM_PROMPT_PATH", "/data/approved/system_prompt.md"))
    if path.exists():
        return SystemPromptResponse(
            content=path.read_text(encoding="utf-8").strip(),
            source="file",
            updated_at=None,
        )

    return SystemPromptResponse(
        content=load_base_prompt(),
        source="fallback",
        updated_at=None,
    )


@router.post(
    "/system-prompt",
    response_model=SystemPromptResponse,
    dependencies=[Depends(get_current_admin)],
)
async def update_system_prompt(
    body: SystemPromptRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> SystemPromptResponse:
    """Save a new system prompt to the DB and update the in-memory cache.

    Changes take effect immediately — the next chat request will use the new prompt.
    The DB row persists across restarts; app.state.system_prompt is refreshed at startup.

    Args:
        body: The new prompt content. Must be non-empty.
        request: FastAPI request — used to update app.state.system_prompt.
        db: Injected async DB session — used to upsert the system_config row.

    Returns:
        The saved prompt content, source="database", and updated_at timestamp.

    Raises:
        HTTPException 400: If content is empty.
    """
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="System prompt content cannot be empty.")

    now = datetime.now(timezone.utc)

    stmt = (
        pg_insert(SystemConfig)
        .values(key=_SYSTEM_PROMPT_KEY, value=content, updated_at=now)
        .on_conflict_do_update(
            index_elements=["key"],
            set_={"value": content, "updated_at": now},
        )
    )
    await db.execute(stmt)
    await db.commit()

    # Update in-memory cache — takes effect on the next chat request.
    request.app.state.system_prompt = content

    return SystemPromptResponse(
        content=content,
        source="database",
        updated_at=now,
    )
