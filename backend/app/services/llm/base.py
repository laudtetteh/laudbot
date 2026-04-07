from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass
class Message:
    """A single turn in a conversation.

    Attributes:
        role: The speaker — either "user" or "assistant".
        content: The text content of the message.
    """

    role: str
    content: str


# Valid invite modes — order determines display order in admin UI.
MODES: list[str] = ["professional", "peer", "buddy"]

# Default model IDs used when no override is provided.
DEFAULT_MODELS: dict[str, str] = {
    "claude": "claude-opus-4-6",
    "openai": "gpt-4o",
}

# Available models per provider — used to validate config updates and drive the admin UI.
AVAILABLE_MODELS: dict[str, list[str]] = {
    "claude": [
        "claude-opus-4-6",
        "claude-sonnet-4-6",
        "claude-haiku-4-5-20251001",
    ],
    "openai": [
        "gpt-4o",
        "gpt-4o-mini",
        "o1",
        "o1-mini",
    ],
}


@dataclass
class LLMConfig:
    """Selects a provider and model for a single LLM interaction.

    Attributes:
        provider: The LLM provider — "claude" or "openai".
        model: The model ID to use. Defaults to the provider's default
            if not set (resolved in provider_factory).
    """

    provider: str
    model: str | None = field(default=None)


class LLMService(ABC):
    """Provider-agnostic interface for LLM completions.

    All AI calls in LaudBot must go through this abstraction.
    Concrete implementations (e.g. ClaudeService) are swappable
    without touching any route or business logic.
    """

    @abstractmethod
    async def complete(self, system: str, messages: list[Message]) -> str:
        """Generate a completion from a system prompt and message history.

        Args:
            system: The system prompt that sets context and constraints.
            messages: Ordered conversation history (user/assistant turns).

        Returns:
            The model's response as a plain string.
        """
