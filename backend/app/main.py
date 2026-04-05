from fastapi import FastAPI

from app.api.admin_config import router as admin_config_router
from app.api.admin_modes import router as admin_modes_router
from app.api.auth import admin_router, auth_router
from app.api.chat import router as chat_router
from app.api.health import router as health_router
from app.services.llm.base import DEFAULT_MODELS, MODES, LLMConfig
from app.services.prompt import load_mode_overlay

app = FastAPI(title="api")

# Active LLM config — held in memory, reset on restart.
# Defaults to Claude with the standard default model.
# Updated at runtime via PUT /api/admin/llm-config.
app.state.llm_config = LLMConfig(
    provider="claude",
    model=DEFAULT_MODELS["claude"],
)

# In-memory invite token store.
# Maps raw invite_token (UUID str) → { invite_id, email, note, allowed_modes, default_mode, can_switch_modes }.
# Reset on restart — acceptable for portfolio use.
app.state.invite_tokens: dict = {}

# Global mode enable/disable config. All modes on by default.
# Updated at runtime via PUT /api/admin/modes.
app.state.modes_config: dict[str, bool] = {mode: True for mode in MODES}

# Per-mode system prompt overlays — seeded from data/approved/overlays/<mode>.md if present.
# Updated at runtime via PUT /api/admin/modes/{mode}/overlay.
app.state.mode_overlays: dict[str, str] = {
    mode: load_mode_overlay(mode) for mode in MODES
}

app.include_router(health_router)
app.include_router(chat_router)
app.include_router(admin_config_router)
app.include_router(admin_modes_router)
app.include_router(admin_router)
app.include_router(auth_router)
