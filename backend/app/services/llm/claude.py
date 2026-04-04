from __future__ import annotations

from app.services.llm.base import LLMService, Message


class ClaudeService(LLMService):
    """Claude (Anthropic) implementation of LLMService.

    Stubbed in v1 — returns a placeholder response without making
    any API calls. Wire up the Anthropic SDK here in v2.
    """

    async def complete(self, system: str, messages: list[Message]) -> str:
        """Return a stub response. No live API call in v1.

        Args:
            system: The system prompt (ignored in stub).
            messages: Conversation history (ignored in stub).

        Returns:
            A placeholder string indicating the stub is active.
        """
        return "[LaudBot stub] Claude integration is not yet active."
