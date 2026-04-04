from __future__ import annotations

from pydantic import BaseModel

from app.services.llm.base import AVAILABLE_MODELS


class LLMConfigRequest(BaseModel):
    """Request body for PUT /api/admin/llm-config.

    Attributes:
        provider: The LLM provider to activate — "claude" or "openai".
        model: The model ID to use. Must be a valid model for the given provider.
    """

    provider: str
    model: str

    def validate_provider_model(self) -> str | None:
        """Return an error message if the provider/model combination is invalid.

        Returns:
            An error string if invalid, None if valid.
        """
        if self.provider not in AVAILABLE_MODELS:
            return f"Unknown provider: {self.provider!r}. Choose from: {list(AVAILABLE_MODELS)}"
        if self.model not in AVAILABLE_MODELS[self.provider]:
            return (
                f"Model {self.model!r} is not available for provider {self.provider!r}. "
                f"Choose from: {AVAILABLE_MODELS[self.provider]}"
            )
        return None


class LLMConfigResponse(BaseModel):
    """Response body for GET and PUT /api/admin/llm-config.

    Attributes:
        provider: The currently active LLM provider.
        model: The currently active model ID.
        available_models: All supported models per provider.
    """

    provider: str
    model: str
    available_models: dict[str, list[str]]
