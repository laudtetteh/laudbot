from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_admin, get_db
from app.db.models import ChatMessage, Invitation, ModeConfig
from app.models.admin import LLMConfigRequest, LLMConfigResponse
from app.services.llm.base import AVAILABLE_MODELS, LLMConfig

router = APIRouter(prefix="/api/admin")


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
