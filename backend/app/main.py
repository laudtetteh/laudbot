from fastapi import FastAPI

from app.api.auth import admin_router, auth_router
from app.api.chat import router as chat_router
from app.api.health import router as health_router
from app.services.llm.base import DEFAULT_MODELS, LLMConfig

app = FastAPI(title="api")

# Active LLM config — held in memory, reset on restart.
# Defaults to Claude with the standard default model.
# The admin UI (v2-PR5) will expose an endpoint to update this at runtime.
app.state.llm_config = LLMConfig(
    provider="claude",
    model=DEFAULT_MODELS["claude"],
)

app.include_router(health_router)
app.include_router(chat_router)
app.include_router(admin_router)
app.include_router(auth_router)
