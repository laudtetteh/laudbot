from __future__ import annotations

from pydantic import BaseModel

from app.services.llm.base import Message


class ChatRequest(BaseModel):
    """Request body for POST /api/chat.

    Attributes:
        messages: Ordered conversation history. Must contain at least one message.
        provider: LLM provider to use. Defaults to the active app config if omitted.
        model: Model ID override. Defaults to the provider's default if omitted.
        active_mode: The mode the visitor is currently using. Must be in their
            JWT's allowed_modes. Defaults to the JWT's default_mode if omitted.
    """

    messages: list[Message]
    provider: str | None = None
    model: str | None = None
    active_mode: str | None = None


class ChatResponse(BaseModel):
    """Response body for POST /api/chat.

    Attributes:
        response: The model's reply as a plain string.
        provider: The provider that handled the request.
        model: The model ID that was used.
    """

    response: str
    provider: str
    model: str
