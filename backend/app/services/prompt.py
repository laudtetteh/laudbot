from __future__ import annotations

import os
from pathlib import Path

# Default path inside the container — matches the docker-compose volume mount.
_DEFAULT_PATH = "/data/approved/system_prompt.md"

_FALLBACK_PROMPT = (
    "You are LaudBot, a professional agent that answers questions about Laud's "
    "background, projects, skills, and career direction. "
    "You have not yet been given approved content to draw from. "
    "Let the user know you are not yet fully configured, and ask them to check back soon."
)


def load_system_prompt() -> str:
    """Load the system prompt, with three fallback levels.

    Resolution order:
    1. ``SYSTEM_PROMPT`` env var — used in production (DO App Platform) where
       no volume mount is available. Set the full prompt content as a secret.
    2. File at ``SYSTEM_PROMPT_PATH`` env var, or the default container path
       ``/data/approved/system_prompt.md`` — used in local Docker via volume mount.
    3. Inline stub — ensures the app never crashes on a missing prompt.

    Returns:
        The system prompt string to pass to the LLM.
    """
    # Production path: full prompt content supplied as an env var.
    env_content = os.getenv("SYSTEM_PROMPT", "").strip()
    if env_content:
        return env_content

    # Local dev path: read from mounted file.
    path = Path(os.getenv("SYSTEM_PROMPT_PATH", _DEFAULT_PATH))
    if path.exists():
        return path.read_text(encoding="utf-8").strip()

    return _FALLBACK_PROMPT
