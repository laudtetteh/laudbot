from __future__ import annotations

import os

from anthropic import AsyncAnthropic

from app.services.llm.base import DEFAULT_MODELS, LLMService, Message


class ClaudeService(LLMService):
    """Claude (Anthropic) implementation of LLMService.

    The Anthropic client is created lazily on first use so the app boots
    without ANTHROPIC_API_KEY set. The key is only required when
    complete() is called.
    """

    def __init__(self, model: str | None = None) -> None:
        self.model = model or os.getenv("CLAUDE_MODEL", DEFAULT_MODELS["claude"])
        self._client: AsyncAnthropic | None = None

    def _get_client(self) -> AsyncAnthropic:
        """Return the Anthropic client, creating it on first call."""
        if self._client is None:
            self._client = AsyncAnthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        return self._client

    async def complete(self, system: str, messages: list[Message]) -> str:
        """Send a completion request to the Anthropic Messages API.

        Args:
            system: The system prompt that sets context and constraints.
            messages: Ordered conversation history (user/assistant turns).

        Returns:
            The model's response as a plain string.
        """
        response = await self._get_client().messages.create(
            model=self.model,
            max_tokens=1024,
            system=system,
            messages=[{"role": m.role, "content": m.content} for m in messages],
        )
        return response.content[0].text
