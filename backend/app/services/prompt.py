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
    """Load the system prompt from the approved content directory.

    Reads the file at SYSTEM_PROMPT_PATH (env var) or the default path.
    Falls back to a stub prompt if the file does not exist, so the app
    never crashes on a missing file.

    Returns:
        The system prompt string to pass to the LLM.
    """
    path = Path(os.getenv("SYSTEM_PROMPT_PATH", _DEFAULT_PATH))

    if path.exists():
        return path.read_text(encoding="utf-8").strip()

    return _FALLBACK_PROMPT
