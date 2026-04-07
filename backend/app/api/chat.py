"""Chat routes — message completion and history.

Mode config (enabled flag, overlays, prompts) is now read from the DB on
every request. Chat messages are persisted to ``chat_messages`` after each
successful exchange. ``app.state.llm_config`` remains in-memory.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

from app.core.dependencies import get_current_visitor, get_db
from app.db.models import ChatMessage, ModeConfig
from app.models.chat import ChatRequest, ChatResponse
from app.services.llm.base import LLMConfig
from app.services.llm.factory import provider_factory
from app.services.prompt import compose_system_prompt

router = APIRouter(prefix="/api")


class ModePromptsMap(BaseModel):
    """Suggested prompts for each of the visitor's allowed modes."""

    prompts_by_mode: dict[str, list[str]]


class ChatHistoryItem(BaseModel):
    """A single message turn from the chat history."""

    id: str
    mode: str
    role: str
    content: str
    provider: str | None
    model: str | None
    created_at: datetime


class ChatHistoryResponse(BaseModel):
    """Paginated chat history for the authenticated visitor."""

    messages: list[ChatHistoryItem]
    total: int


@router.get("/chat/prompts", response_model=ModePromptsMap)
async def get_chat_prompts(
    visitor: dict = Depends(get_current_visitor),
    db: AsyncSession = Depends(get_db),
) -> ModePromptsMap:
    """Return suggested prompts for all modes the recruiter is allowed to use.

    Args:
        visitor: Decoded visitor JWT payload.
        db: Injected async DB session.

    Returns:
        Map of mode slug → list of suggested prompt strings.
    """
    allowed_modes: list[str] = visitor.get("allowed_modes", [])
    result = await db.execute(
        select(ModeConfig).where(ModeConfig.mode.in_(allowed_modes))
    )
    rows = {row.mode: (row.prompts or []) for row in result.scalars()}
    return ModePromptsMap(
        prompts_by_mode={mode: rows.get(mode, []) for mode in allowed_modes}
    )


@router.get("/chat/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    visitor: dict = Depends(get_current_visitor),
    db: AsyncSession = Depends(get_db),
) -> ChatHistoryResponse:
    """Return all persisted chat messages for the authenticated visitor.

    Messages are ordered oldest-first. The ``visitor_id`` is sourced from
    the JWT ``sub`` claim so no additional lookup is needed.

    Args:
        visitor: Decoded visitor JWT payload.
        db: Injected async DB session.

    Returns:
        List of message turns and total count.
    """
    visitor_id = uuid.UUID(visitor["sub"])
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.visitor_id == visitor_id)
        .order_by(ChatMessage.created_at)
    )
    messages = result.scalars().all()
    return ChatHistoryResponse(
        messages=[
            ChatHistoryItem(
                id=str(msg.id),
                mode=msg.mode,
                role=msg.role,
                content=msg.content,
                provider=msg.provider,
                model=msg.model,
                created_at=msg.created_at,
            )
            for msg in messages
        ],
        total=len(messages),
    )


@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    request: Request,
    visitor: dict = Depends(get_current_visitor),
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    """Route a user message through the active LLM and persist both turns.

    Mode config (enabled flag, overlay) is read from the DB. The LLM
    provider/model comes from ``app.state.llm_config`` (runtime admin toggle).
    Both the user message and assistant response are written to ``chat_messages``.

    Args:
        body: Chat request — messages, optional provider override, active mode.
        request: FastAPI request (used to access ``app.state.llm_config``).
        visitor: Decoded visitor JWT payload.
        db: Injected async DB session.

    Returns:
        LLM response, provider, and model name.

    Raises:
        HTTPException 400: If mode or provider is invalid/not permitted.
        HTTPException 502: If the LLM API call fails.
    """
    # --- Resolve and validate mode ---
    allowed_modes: list[str] = visitor.get("allowed_modes", [])
    default_mode: str = visitor.get("default_mode", "")
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

    # Read mode config from DB — single query for enabled + overlay.
    mode_result = await db.execute(
        select(ModeConfig).where(ModeConfig.mode == requested_mode)
    )
    mode_row: ModeConfig | None = mode_result.scalar_one_or_none()

    if mode_row is None or not mode_row.enabled:
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
    # app.state.system_prompt is set at startup from the DB and updated when
    # the admin saves via POST /api/admin/system-prompt. Falls back to None,
    # which makes compose_system_prompt load from env var / file / stub.
    system_prompt = compose_system_prompt(
        mode=requested_mode,
        mode_overlays={requested_mode: mode_row.overlay},
        base_override=getattr(request.app.state, "system_prompt", None),
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

    # --- Persist both turns to the DB ---
    visitor_id = uuid.UUID(visitor["sub"])
    now = datetime.now(timezone.utc)
    # Assistant is saved 1 ms after the user message so ORDER BY created_at
    # is always deterministic even within the same request.
    asst_now = now + timedelta(milliseconds=1)

    # Persist the last user message (the one that triggered this response).
    last_user_message = next(
        (m for m in reversed(body.messages) if m.role == "user"), None
    )
    if last_user_message:
        db.add(
            ChatMessage(
                id=uuid.uuid4(),
                visitor_id=visitor_id,
                mode=requested_mode,
                role="user",
                content=last_user_message.content,
                created_at=now,
            )
        )

    db.add(
        ChatMessage(
            id=uuid.uuid4(),
            visitor_id=visitor_id,
            mode=requested_mode,
            role="assistant",
            content=response_text,
            provider=config.provider,
            model=service.model,
            created_at=asst_now,
        )
    )
    await db.commit()
    logger.info(
        "chat persisted | visitor_id=%s | mode=%s | provider=%s",
        visitor_id,
        requested_mode,
        config.provider,
    )

    return ChatResponse(
        response=response_text,
        provider=config.provider,
        model=service.model,
    )
