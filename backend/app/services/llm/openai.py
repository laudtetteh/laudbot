from __future__ import annotations

import os

from openai import AsyncOpenAI

from app.services.llm.base import DEFAULT_MODELS, LLMService, Message


class OpenAIService(LLMService):
    """OpenAI implementation of LLMService.

    The OpenAI client is created lazily on first use so the app boots
    without OPENAI_API_KEY set. The key is only required when
    complete() is called.
    """

    def __init__(self, model: str | None = None) -> None:
        self.model = model or os.getenv("OPENAI_MODEL", DEFAULT_MODELS["openai"])
        self._client: AsyncOpenAI | None = None

    def _get_client(self) -> AsyncOpenAI:
        """Return the OpenAI client, creating it on first call."""
        if self._client is None:
            self._client = AsyncOpenAI(api_key=os.environ.get("OPENAI_API_KEY"))
        return self._client

    async def complete(self, system: str, messages: list[Message]) -> str:
        """Send a completion request to the OpenAI Chat Completions API.

        Args:
            system: The system prompt that sets context and constraints.
            messages: Ordered conversation history (user/assistant turns).

        Returns:
            The model's response as a plain string.
        """
        response = await self._get_client().chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": system},
                *[{"role": m.role, "content": m.content} for m in messages],
            ],
        )
        return response.choices[0].message.content
