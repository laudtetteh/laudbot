"""FastAPI application factory and lifespan handler.

On startup:
1. Runs Alembic migrations (``alembic upgrade head``) via subprocess so
   the DB schema is always current before any request is served.
2. Seeds ``mode_config`` rows for any mode not yet in the DB, loading
   overlay text from ``data/approved/overlays/<mode>.md`` if present.

``app.state.llm_config`` remains in-memory — it is the admin's runtime
provider/model preference and intentionally resets on restart.
"""
from __future__ import annotations

import subprocess
import sys
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy import select

from app.api.admin_config import router as admin_config_router
from app.api.admin_modes import router as admin_modes_router
from app.api.auth import admin_router, auth_router
from app.api.chat import router as chat_router
from app.api.health import router as health_router
from app.db.base import AsyncSessionLocal
from app.db.models import ModeConfig, SystemConfig
from app.services.llm.base import DEFAULT_MODELS, MODES, LLMConfig
from app.services.prompt import load_mode_overlay, load_mode_prompts


def _run_migrations() -> None:
    """Run ``alembic upgrade head`` synchronously before the app starts.

    Raises:
        SystemExit: If Alembic exits non-zero so the container fails fast
            rather than starting with a stale schema.
    """
    result = subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        print(result.stdout, flush=True)
        print(result.stderr, flush=True)
        raise SystemExit(f"Alembic migration failed (exit {result.returncode})")
    if result.stdout:
        print(result.stdout, flush=True)


async def _seed_mode_config() -> None:
    """Insert a ``mode_config`` row for any mode not already in the DB.

    Uses ``ON CONFLICT DO NOTHING`` so existing admin edits (overlay text,
    prompts) are never overwritten on restart.
    """
    async with AsyncSessionLocal() as session:
        for mode in MODES:
            stmt = (
                pg_insert(ModeConfig)
                .values(
                    mode=mode,
                    enabled=True,
                    overlay=load_mode_overlay(mode),
                    prompts=load_mode_prompts(mode),
                )
                .on_conflict_do_nothing(index_elements=["mode"])
            )
            await session.execute(stmt)
        await session.commit()


async def _load_system_prompt(app: FastAPI) -> None:
    """Load the admin-saved system prompt from the DB into app.state.

    If no row exists (fresh install or first use of the admin panel),
    app.state.system_prompt remains None and prompt.py falls back to
    the SYSTEM_PROMPT env var, then the file, then the inline stub.

    Args:
        app: The FastAPI application instance.
    """
    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(SystemConfig).where(SystemConfig.key == "system_prompt")
        )
        row = result.scalar_one_or_none()
        app.state.system_prompt = row.value if row else None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup tasks before serving requests."""
    _run_migrations()
    await _seed_mode_config()
    await _load_system_prompt(app)
    yield


app = FastAPI(title="api", lifespan=lifespan)

# Active LLM config — held in memory, resets on restart.
# Defaults to Claude with the standard default model.
# Updated at runtime via PUT /api/admin/llm-config.
app.state.llm_config = LLMConfig(
    provider="claude",
    model=DEFAULT_MODELS["claude"],
)

app.include_router(health_router)
app.include_router(chat_router)
app.include_router(admin_config_router)
app.include_router(admin_modes_router)
app.include_router(admin_router)
app.include_router(auth_router)
