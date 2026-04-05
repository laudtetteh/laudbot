# Task: chat-ux-improvements

**Status**: `done`
**Created**: 2026-04-04
**Updated**: 2026-04-04
**GitHub issue**: #45
**PR**: #46

## Goal

UX improvements to the chat experience: logout, suggested prompts, mode context labels, switch dialog descriptions, and quality-of-life tweaks.

## Acceptance criteria

- [x] Logout clears all sessionStorage keys and returns user to home page
- [x] "I am a…" label visible above mode selector
- [x] Switch dialog shows short mode description for the target mode
- [x] Suggested prompts shown as chips in empty state; clicking sends message directly
- [x] Admin can save suggested prompts per mode (one per line)
- [x] New conversation button clears messages without confirmation

## Approach

1. Backend: seed `app.state.mode_prompts` in `main.py`
2. Backend: `GET/PUT /api/admin/modes/{mode}/prompts` in `admin_modes.py`
3. Backend: `GET /api/chat/prompts` in `chat.py` (recruiter JWT)
4. Frontend admin: prompts textarea per mode tab in overlay editor
5. Frontend chat: logout, "I am a…" label, mode description in switch dialog, prompt chips, new conversation button, mode-aware empty state

## Done notes

All criteria met. PR #46 merged. Tested in production.
- Chip click calls `sendMessage(prompt)` directly — no pre-fill, sends immediately
- Admin overlay editor renamed to "Mode overlays & prompts" with two save buttons per mode tab
- `/api/chat/prompts` filters `mode_prompts` to only the recruiter's `allowed_modes`
