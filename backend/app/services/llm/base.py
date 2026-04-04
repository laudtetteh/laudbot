from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class Message:
    """A single turn in a conversation.

    Attributes:
        role: The speaker — either "user" or "assistant".
        content: The text content of the message.
    """

    role: str
    content: str


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
