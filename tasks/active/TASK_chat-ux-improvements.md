# Task: chat-ux-improvements

**Status**: `active`
**Created**: 2026-04-04
**Updated**: 2026-04-04
**GitHub issue**: #45

## Goal

UX improvements to the chat experience: logout, suggested prompts, mode context labels, switch dialog descriptions, and quality-of-life tweaks.

## Acceptance criteria

- [ ] Logout clears all sessionStorage keys and returns user to home page
- [ ] "I am a…" label visible above mode selector
- [ ] Switch dialog shows short mode description for the target mode
- [ ] Suggested prompts shown as chips in empty state; clicking pre-fills input
- [ ] Admin can save suggested prompts per mode (one per line)
- [ ] New conversation button clears messages without confirmation

## Approach

1. Backend: seed `app.state.mode_prompts` in `main.py`
2. Backend: `GET/PUT /api/admin/modes/{mode}/prompts` in `admin_modes.py`
3. Backend: `GET /api/chat/prompts` in `chat.py` (recruiter JWT)
4. Frontend admin: prompts textarea per mode tab in overlay editor
5. Frontend chat: logout, "I am a…" label, mode description in switch dialog, prompt chips, new conversation button, mode-aware empty state

## Files likely affected

- `backend/app/main.py`
- `backend/app/api/admin_modes.py`
- `backend/app/api/chat.py`
- `frontend/app/admin/page.tsx`
- `frontend/app/chat/page.tsx`

## Done notes
[Fill in when moving to done/]
