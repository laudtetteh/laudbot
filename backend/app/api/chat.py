from __future__ import annotations

from fastapi import APIRouter, HTTPException, Request

from app.models.chat import ChatRequest, ChatResponse
from app.services.llm.base import LLMConfig
from app.services.llm.factory import provider_factory

router = APIRouter(prefix="/api")

# Placeholder system prompt — replaced with data/approved/ content in v2-PR4.
_SYSTEM_PROMPT = (
    "You are LaudBot, a professional agent that answers questions about Laud's "
    "background, projects, skills, and career direction. Answer only from approved "
    "content. If you don't know something, say so — never guess or fabricate."
)


@router.post("/chat", response_model=ChatResponse)
async def chat(body: ChatRequest, request: Request) -> ChatResponse:
    """Route a user message through the active LLM provider and return a response.

    The provider and model are resolved in this order:
    1. Values from the request body (if provided)
    2. Active config from app state (set by admin — defaults to Claude)

    Args:
        body: The chat request containing messages and optional provider override.
        request: The FastAPI request object, used to access app state.

    Returns:
        The model's response along with the provider and model that handled it.

    Raises:
        HTTPException 400: If the requested provider is not recognised.
        HTTPException 502: If the LLM API call fails (e.g. missing or invalid key).
    """
    active_config: LLMConfig = request.app.state.llm_config

    config = LLMConfig(
        provider=body.provider or active_config.provider,
        model=body.model or active_config.model,
    )

    try:
        service = provider_factory(config)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    try:
        response_text = await service.complete(
            system=_SYSTEM_PROMPT,
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
