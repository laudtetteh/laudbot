from __future__ import annotations

from app.services.llm.base import LLMConfig, LLMService
from app.services.llm.claude import ClaudeService
from app.services.llm.openai import OpenAIService


def provider_factory(config: LLMConfig) -> LLMService:
    """Instantiate the correct LLMService for the given config.

    The model field on LLMConfig is optional — each service falls back
    to its own default (env var, then hardcoded) if not set.

    Args:
        config: Provider and optional model selection.

    Returns:
        A ready-to-use LLMService instance.

    Raises:
        ValueError: If config.provider is not a recognised provider.
    """
    if config.provider == "claude":
        return ClaudeService(model=config.model)
    if config.provider == "openai":
        return OpenAIService(model=config.model)
    raise ValueError(
        f"Unknown LLM provider: {config.provider!r}. "
        f"Expected 'claude' or 'openai'."
    )
