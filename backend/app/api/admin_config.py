from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.models.admin import LLMConfigRequest, LLMConfigResponse
from app.services.llm.base import AVAILABLE_MODELS, LLMConfig

router = APIRouter(prefix="/api/admin")


@router.get("/llm-config", response_model=LLMConfigResponse)
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


@router.put("/llm-config", response_model=LLMConfigResponse)
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
