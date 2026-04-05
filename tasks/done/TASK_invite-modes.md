# Task: invite-modes

**Status**: `active`
**Created**: 2026-04-04
**Updated**: 2026-04-04
**GitHub issue**: #41

## Goal

Ship invite modes (recruiter, friend, technical, roast) end-to-end: per-mode system prompt overlays, per-invite JWT config, admin controls, and in-chat mode switching UI.

## Context

LaudBot currently sends every invite with no mode — the system prompt is flat and context-unaware. This task introduces the mode layer: each invite carries allowed modes, a default mode, and a switching flag. The backend selects the right prompt overlay per request. The admin can configure modes globally and per invite.

Decided in planning: 4 modes (recruiter, friend, technical, roast). Base prompt = shared identity/privacy doc. Mode overlay = short tone/focus instruction injected alongside base. Single enriched base prompt; per-mode overlays tune the lens.

## Acceptance criteria

- [ ] All 4 modes defined: `recruiter`, `friend`, `technical`, `roast`
- [ ] JWT carries `allowed_modes`, `default_mode`, `can_switch_modes`
- [ ] Backend composes `base_prompt + mode_overlay` for every `/api/chat` request
- [ ] Globally disabled modes rejected server-side (400) and hidden in admin invite form
- [ ] Admin invite form: allowed modes checkbox group, default mode dropdown, can_switch_modes toggle
- [ ] Admin global section: enable/disable each mode app-wide
- [ ] Admin overlay editor: textarea per mode → PUT saves to in-memory state
- [ ] Chat header: mode badge always visible
- [ ] Mode switching (if `can_switch_modes=true`): pill selector, confirmation dialog, starts new conversation
- [ ] All existing auth flows (admin login, recruiter invite accept, /chat auth) unbroken
- [ ] Invite section renamed from "Invite recruiter" to "Send invite"

## Approach

### 1. Backend — mode definitions and config (`backend/`)
- Add `MODES` constant to `base.py`: list of valid mode slugs
- Add `modes_config` to `app.state` at startup: `{"recruiter": True, "friend": True, "technical": True, "roast": True}`
- Add `mode_overlays` to `app.state`: dict of `{mode: overlay_text}` seeded from `data/approved/overlays/<mode>.md` if present, else empty string

### 2. Backend — prompt composition (`backend/app/services/prompt.py`)
- Add `load_mode_overlay(mode: str) -> str` — reads from `app.state.mode_overlays[mode]`
- Update `load_system_prompt()` to accept `mode: str` param and append overlay when present

### 3. Backend — updated invite endpoint (`backend/app/routers/admin.py` or `invitations.py`)
- `POST /api/admin/invitations`: accept `allowed_modes: list[str]`, `default_mode: str`, `can_switch_modes: bool`
- Validate: all `allowed_modes` must be globally enabled; `default_mode` must be in `allowed_modes`
- Encode all three into the invite token

### 4. Backend — updated JWT (`backend/app/core/security.py`)
- `create_token` for recruiter: include `allowed_modes`, `default_mode`, `can_switch_modes`
- `decode_token` / `get_current_recruiter` dep: extract and expose these fields

### 5. Backend — mode admin endpoints (`backend/app/routers/admin_modes.py`)
- `GET /api/admin/modes` — returns `{mode: enabled}` map from `app.state`
- `PUT /api/admin/modes` — updates enabled/disabled per mode in `app.state`
- `GET /api/admin/modes/{mode}/overlay` — returns current overlay text
- `PUT /api/admin/modes/{mode}/overlay` — updates overlay in `app.state.mode_overlays`
- All endpoints require admin JWT

### 6. Backend — wire mode into chat (`backend/app/routers/chat.py`)
- Extract `current_mode` from recruiter JWT (from request body or token)
- Pass to `load_system_prompt(mode=current_mode)`
- Reject if mode not in `allowed_modes` or globally disabled

### 7. Frontend — admin invite form (`frontend/app/admin/page.tsx`)
- Rename section to "Send invite"
- Fetch globally enabled modes on mount (`GET /api/admin/modes`)
- Render: allowed modes checkbox group (only enabled modes), default mode dropdown (filtered to checked), can_switch_modes toggle
- POST updated payload to `/api/admin/invitations`

### 8. Frontend — admin global mode toggles (`frontend/app/admin/page.tsx`)
- New section: "Mode settings" — toggle per mode, PUT to `/api/admin/modes` on change

### 9. Frontend — admin overlay editor (`frontend/app/admin/page.tsx`)
- New section: "Mode overlays" — tab or accordion per mode, textarea, Save button → PUT `/api/admin/modes/{mode}/overlay`

### 10. Frontend — chat mode UI (`frontend/app/chat/page.tsx`)
- Read `default_mode` from JWT (decode client-side or store in sessionStorage at invite accept)
- Track `activeMode` in state
- Chat header: mode badge always shown
- If `can_switch_modes=true`: pill selector for `allowed_modes`; on switch → confirmation "This will start a new chat" → clear messages, update `activeMode`, include mode in next request
- Pass `active_mode` in POST `/api/chat` body

## Files likely affected

- `backend/app/services/llm/base.py` — add `MODES` constant
- `backend/app/services/prompt.py` — mode-aware prompt composition
- `backend/app/core/security.py` — JWT fields for mode
- `backend/app/core/dependencies.py` — expose mode fields from recruiter dep
- `backend/app/models/invitations.py` — updated request/response models
- `backend/app/routers/admin.py` (or equivalent) — updated invite endpoint
- `backend/app/routers/admin_modes.py` — new file: mode config + overlay endpoints
- `backend/app/routers/chat.py` — mode-aware prompt selection
- `backend/app/main.py` — register admin_modes router, seed app.state
- `frontend/app/admin/page.tsx` — invite form, global toggles, overlay editor
- `frontend/app/invite/page.tsx` — store mode fields in sessionStorage
- `frontend/app/chat/page.tsx` — mode badge, pill selector, mode in request body
- `data/approved/overlays/` — seed overlay files (gitignored like system_prompt.md)

## Out of scope

- Persistent mode config (DB) — in-memory only for now
- Email sending — v3-PR2
- UI polish/animations — v3-PR3
- Source management, response review

## Prompt history

### 2026-04-04
**Prompt**: Design and plan invite modes feature
**Outcome**: Task file created, issue #41 opened
**Notes**: Modes: recruiter (professional), friend (casual), technical (peer engineer), roast (😤). Base prompt + per-mode overlay architecture. JWT carries allowed_modes, default_mode, can_switch_modes. Mode switching starts new conversation.

## Blockers
- None

## Done notes
[Fill in when moving to done/]
