"""Chat routes — message completion and history.

Mode config (enabled flag, overlays, prompts) is now read from the DB on
every request. Chat messages are persisted to ``chat_messages`` after each
successful exchange. ``app.state.llm_config`` remains in-memory.
"""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from pydantic import BaseModel
from sqlalchemy import func, select, text
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
    """Messages for a single conversation."""

    messages: list[ChatHistoryItem]
    total: int
    conversation_id: str | None


class ConversationSummary(BaseModel):
    """One row in the conversation list sidebar."""

    conversation_id: str
    mode: str
    started_at: datetime
    message_count: int
    preview: str


class ConversationListResponse(BaseModel):
    """Ordered list of conversations for the visitor (newest first)."""

    conversations: list[ConversationSummary]


@router.get("/chat/prompts", response_model=ModePromptsMap)
async def get_chat_prompts(
    visitor: dict = Depends(get_current_visitor),
    db: AsyncSession = Depends(get_db),
) -> ModePromptsMap:
    """Return suggested prompts for all modes the visitor is allowed to use.

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


@router.get("/chat/conversations", response_model=ConversationListResponse)
async def get_conversations(
    visitor: dict = Depends(get_current_visitor),
    db: AsyncSession = Depends(get_db),
) -> ConversationListResponse:
    """Return the visitor's conversation list for the sidebar (max 20, newest first).

    Each row is derived from the first user message in a conversation —
    mode, timestamp, and a truncated preview string.

    Args:
        visitor: Decoded visitor JWT payload.
        db: Injected async DB session.

    Returns:
        List of conversation summaries ordered newest-first.
    """
    visitor_id = uuid.UUID(visitor["sub"])
    rows = await db.execute(
        text("""
            WITH first_user AS (
                SELECT DISTINCT ON (conversation_id)
                    conversation_id,
                    mode,
                    content  AS preview,
                    created_at AS started_at
                FROM chat_messages
                WHERE visitor_id = :vid AND role = 'user'
                ORDER BY conversation_id, created_at ASC
            ),
            counts AS (
                SELECT conversation_id, COUNT(*) AS message_count
                FROM chat_messages
                WHERE visitor_id = :vid
                GROUP BY conversation_id
            )
            SELECT
                f.conversation_id,
                f.mode,
                f.started_at,
                c.message_count,
                LEFT(f.preview, 80) AS preview
            FROM first_user f
            JOIN counts c ON c.conversation_id = f.conversation_id
            ORDER BY f.started_at DESC
            LIMIT 20
        """),
        {"vid": visitor_id},
    )
    return ConversationListResponse(
        conversations=[
            ConversationSummary(
                conversation_id=str(row.conversation_id),
                mode=row.mode,
                started_at=row.started_at,
                message_count=row.message_count,
                preview=row.preview,
            )
            for row in rows
        ]
    )


@router.get("/chat/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    conversation_id: str | None = Query(default=None),
    visitor: dict = Depends(get_current_visitor),
    db: AsyncSession = Depends(get_db),
) -> ChatHistoryResponse:
    """Return messages for a single conversation, oldest-first.

    If ``conversation_id`` is supplied, returns that specific conversation.
    Otherwise returns the most recent conversation for the visitor.

    Args:
        conversation_id: Optional UUID string scoping the query.
        visitor: Decoded visitor JWT payload.
        db: Injected async DB session.

    Returns:
        Message list, total count, and resolved conversation_id.
    """
    visitor_id = uuid.UUID(visitor["sub"])

    if conversation_id:
        conv_uuid = uuid.UUID(conversation_id)
    else:
        # Resolve most recent conversation for this visitor.
        latest = await db.execute(
            select(ChatMessage.conversation_id)
            .where(ChatMessage.visitor_id == visitor_id)
            .order_by(ChatMessage.created_at.desc())
            .limit(1)
        )
        conv_uuid_row = latest.scalar_one_or_none()
        if conv_uuid_row is None:
            return ChatHistoryResponse(messages=[], total=0, conversation_id=None)
        conv_uuid = conv_uuid_row

    result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.visitor_id == visitor_id,
            ChatMessage.conversation_id == conv_uuid,
        )
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
        conversation_id=str(conv_uuid),
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
    # Use the conversation_id from the request, or generate one if absent.
    conv_id = uuid.UUID(body.conversation_id) if body.conversation_id else uuid.uuid4()

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
                conversation_id=conv_id,
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
            conversation_id=conv_id,
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
        "chat persisted | visitor_id=%s | conversation_id=%s | mode=%s | provider=%s",
        visitor_id,
        conv_id,
        requested_mode,
        config.provider,
    )

    return ChatResponse(
        response=response_text,
        provider=config.provider,
        model=service.model,
        conversation_id=str(conv_id),
    )
