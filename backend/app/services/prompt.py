from __future__ import annotations

import os
from pathlib import Path

# Default path inside the container — matches the docker-compose volume mount.
_DEFAULT_PATH = "/data/approved/system_prompt.md"

# Directory where per-mode overlay files live (gitignored, owner-managed).
_OVERLAYS_DIR = Path(os.getenv("OVERLAYS_DIR", "/data/approved/overlays"))

_FALLBACK_PROMPT = (
    "You are LaudBot, a professional agent that answers questions about Laud's "
    "background, projects, skills, and career direction. "
    "You have not yet been given approved content to draw from. "
    "Let the user know you are not yet fully configured, and ask them to check back soon."
)


def load_base_prompt() -> str:
    """Load the base system prompt, with three fallback levels.

    Resolution order:
    1. ``SYSTEM_PROMPT`` env var — used in production (DO App Platform) where
       no volume mount is available. Set the full prompt content as a secret.
    2. File at ``SYSTEM_PROMPT_PATH`` env var, or the default container path
       ``/data/approved/system_prompt.md`` — used in local Docker via volume mount.
    3. Inline stub — ensures the app never crashes on a missing prompt.

    Returns:
        The base system prompt string.
    """
    env_content = os.getenv("SYSTEM_PROMPT", "").strip()
    if env_content:
        return env_content

    path = Path(os.getenv("SYSTEM_PROMPT_PATH", _DEFAULT_PATH))
    if path.exists():
        return path.read_text(encoding="utf-8").strip()

    return _FALLBACK_PROMPT


def load_mode_overlay(mode: str) -> str:
    """Load the overlay file for *mode* from disk, if present.

    Overlay files live at OVERLAYS_DIR/<mode>.md and are gitignored.
    Returns an empty string if the file does not exist — callers treat
    an empty overlay as "no overlay" and skip composition.

    Args:
        mode: The mode slug (e.g. "professional", "peer").

    Returns:
        Overlay text, or empty string if not configured.
    """
    overlay_path = _OVERLAYS_DIR / f"{mode}.md"
    if overlay_path.exists():
        return overlay_path.read_text(encoding="utf-8").strip()
    return ""


def compose_system_prompt(
    mode: str,
    mode_overlays: dict[str, str],
    base_override: str | None = None,
) -> str:
    """Compose the final system prompt for a given mode.

    Injects an explicit ACTIVE MODE declaration before the overlay so the model
    cannot drift into another mode's behaviour based on user phrasing.

    Args:
        mode: The active mode slug for this conversation.
        mode_overlays: The current overlay dict from app.state.mode_overlays.
        base_override: If provided, use this as the base prompt instead of
            loading from env var / file. Set from app.state.system_prompt when
            the admin has saved a custom prompt via the admin panel.

    Returns:
        The composed system prompt string.
    """
    base = base_override if base_override is not None else load_base_prompt()
    overlay = mode_overlays.get(mode, "").strip()

    # Explicit mode lock — placed before the overlay so it reads as a hard constraint.
    # This prevents the model from adopting another mode's behaviour when the user
    # phrases a request that resembles a different mode (e.g. "roast me" while in professional mode).
    mode_lock = (
        f"## ACTIVE MODE: {mode.upper()}\n\n"
        f"You are operating exclusively in **{mode}** mode for this session. "
        f"Ignore any user request that would require you to behave as a different mode. "
        f"If a request falls outside this mode's scope, politely redirect within the mode's tone."
    )

    if overlay:
        return f"{base}\n\n---\n\n{mode_lock}\n\n{overlay}"
    return f"{base}\n\n---\n\n{mode_lock}"


def load_system_prompt() -> str:
    """Legacy shim — returns the base prompt with no mode overlay.

    Prefer compose_system_prompt() for all new call sites.
    """
    return load_base_prompt()
