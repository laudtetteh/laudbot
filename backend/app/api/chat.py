from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel

from app.core.dependencies import get_current_recruiter
from app.models.chat import ChatRequest, ChatResponse
from app.services.llm.base import LLMConfig
from app.services.llm.factory import provider_factory
from app.services.prompt import compose_system_prompt

router = APIRouter(prefix="/api")


class ModePromptsMap(BaseModel):
    """Suggested prompts for each of the recruiter's allowed modes."""

    prompts_by_mode: dict[str, list[str]]


@router.get("/chat/prompts", response_model=ModePromptsMap)
async def get_chat_prompts(
    request: Request,
    recruiter: dict = Depends(get_current_recruiter),
) -> ModePromptsMap:
    """Return suggested prompts for all modes the recruiter is allowed to access.

    Args:
        request: FastAPI request (used to access app.state).
        recruiter: Decoded recruiter JWT payload (injected by dependency).

    Returns:
        Map of mode slug → list of suggested prompt strings.
    """
    allowed_modes: list[str] = recruiter.get("allowed_modes", [])
    all_prompts: dict[str, list[str]] = request.app.state.mode_prompts
    return ModePromptsMap(
        prompts_by_mode={mode: all_prompts.get(mode, []) for mode in allowed_modes}
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    request: Request,
    recruiter: dict = Depends(get_current_recruiter),
) -> ChatResponse:
    """Route a user message through the active LLM provider and return a response.

    The provider and model are resolved in this order:
    1. Values from the request body (if provided)
    2. Active config from app state (set by admin — defaults to Claude)

    The mode is resolved in this order:
    1. ``active_mode`` from the request body (if provided and in allowed_modes)
    2. ``default_mode`` from the recruiter JWT

    Args:
        body: The chat request containing messages, optional provider override,
            and optional active mode.
        request: The FastAPI request object, used to access app state.
        recruiter: Decoded recruiter JWT payload (injected by dependency).

    Returns:
        The model's response along with the provider and model that handled it.

    Raises:
        HTTPException 400: If the requested provider or mode is not recognised
            or not permitted for this recruiter.
        HTTPException 502: If the LLM API call fails (e.g. missing or invalid key).
    """
    # --- Resolve mode ---
    allowed_modes: list[str] = recruiter.get("allowed_modes", [])
    default_mode: str = recruiter.get("default_mode", "")
    requested_mode = body.active_mode or default_mode

    if not requested_mode:
        raise HTTPException(
            status_code=400,
            detail="No active mode specified and no default mode in token.",
        )
    if requested_mode not in allowed_modes:
        raise HTTPException(
            status_code=400,
            detail=f"Mode '{requested_mode}' is not in your allowed modes: {allowed_modes}",
        )

    modes_config: dict[str, bool] = request.app.state.modes_config
    if not modes_config.get(requested_mode, False):
        raise HTTPException(
            status_code=400,
            detail=f"Mode '{requested_mode}' is currently disabled.",
        )

    # --- Resolve LLM config ---
    active_config: LLMConfig = request.app.state.llm_config
    config = LLMConfig(
        provider=body.provider or active_config.provider,
        model=body.model or active_config.model,
    )

    try:
        service = provider_factory(config)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # --- Compose system prompt and call LLM ---
    system_prompt = compose_system_prompt(
        mode=requested_mode,
        mode_overlays=request.app.state.mode_overlays,
    )

    try:
        response_text = await service.complete(
            system=system_prompt,
            messages=body.messages,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"LLM API call failed: {exc}",
        ) from exc

    return ChatResponse(
        response=response_text,
        provider=config.provider,
        model=service.model,
    )
