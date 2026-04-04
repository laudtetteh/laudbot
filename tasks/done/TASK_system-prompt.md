# Task: system-prompt

**Status**: `done`
**Created**: 2026-04-04
**Updated**: 2026-04-04

## Goal
Replace hardcoded placeholder system prompt with content loaded from data/approved/system_prompt.md.

## Done notes
All criteria met. load_system_prompt() reads from SYSTEM_PROMPT_PATH env var (default:
/data/approved/system_prompt.md, matched to docker-compose volume mount). Graceful fallback
to a stub that tells the user LaudBot is not yet configured — better UX than the old
fabricating placeholder. system_prompt.md.example committed as template. SOURCES.md and
.env.example updated. Verified in-container: both fallback and file-load paths clean.

Next step for Laud: copy system_prompt.md.example to system_prompt.md and fill in
approved content. No code change needed — just restart docker-compose.
