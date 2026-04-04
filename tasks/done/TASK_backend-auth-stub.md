# Task: backend-auth-stub

**Status**: `done`
**Created**: 2026-04-04
**Updated**: 2026-04-04

## Goal
Add stubbed auth endpoints and Pydantic request/response models that match the v1 API contract — endpoints exist and return spec-compliant `not_implemented` responses.

## Context
PR 3 of 7 in the v1 build plan. Branch: `feat/backend-auth-stub`.
See `docs/PRD.md` — API contract (v1): `/api/admin/invitations` and `/api/auth/accept-invite`.

## Acceptance criteria
- [x] `POST /api/admin/invitations` returns spec-compliant stub with HTTP 200
- [x] `POST /api/auth/accept-invite` returns spec-compliant stub with HTTP 200
- [x] All request and response shapes are defined as Pydantic models
- [x] Invite token field is named `invite_token` (opaque — no real logic)
- [x] Both routers are registered under their correct path prefixes in `main.py`
- [x] No real auth logic, no DB calls, no token generation

## Approach
1. Create `backend/app/models/invitations.py` — Pydantic request/response models
2. Create `backend/app/api/auth.py` — two stubbed route handlers
3. Wire both routers into `main.py` under `/api/admin` and `/api/auth`

## Files to be created/modified
- `backend/app/models/__init__.py` — new
- `backend/app/models/invitations.py` — new
- `backend/app/api/auth.py` — new
- `backend/app/main.py` — modified (add routers)

## Out of scope
- Real token generation or hashing
- Session management
- Any database interaction
- Middleware or auth guards

## Risks / open questions
- None — spec is fully defined in PRD.md

## Prompt history

### 2026-04-04
**Prompt**: Starting PR 3 — stubbed auth endpoints
**Outcome**: Task file created, awaiting go-ahead

## Blockers
- None

## Done notes
All acceptance criteria met. Verified all three endpoints live via docker compose before committing. Added `email-validator` dep for Pydantic `EmailStr` — not in original plan but required. No other deviations.
