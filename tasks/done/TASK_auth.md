# Task: auth

**Status**: `active`
**Created**: 2026-04-04
**Branch**: `feat/auth`

## Goal

Implement full auth for LaudBot:
- Admin: username + password → JWT (protects `/api/admin/*`)
- Recruiter: invite token → JWT with durable `recruiter_id` (protects `/api/chat`)

The recruiter JWT carries identity now so chat history persistence (future PR) has
a stable key to tie to — no refactor needed when persistence lands.

## Acceptance criteria

### Backend
- [ ] `POST /api/auth/admin/login` — validates credentials from env → returns JWT
- [ ] `POST /api/admin/invitations` — JWT-admin-guarded — generates invite token, stores in `app.state.invite_tokens`
- [ ] `POST /api/auth/accept-invite` — validates invite token → returns recruiter JWT with `recruiter_id` + `invite_id`
- [ ] `POST /api/chat` — requires valid recruiter JWT (`Authorization: Bearer`) → 401 if missing/invalid
- [ ] `GET/PUT /api/admin/llm-config` — requires valid admin JWT → 401 if missing/invalid
- [ ] `backend/app/core/security.py` — `create_token()`, `decode_token()`, `hash_password()`, `verify_password()`
- [ ] `backend/app/core/dependencies.py` — `get_current_admin`, `get_current_recruiter` FastAPI deps
- [ ] `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET_KEY`, `JWT_EXPIRE_HOURS` in `.env.example`
- [ ] Passwords never stored in plaintext — bcrypt via passlib

### Frontend
- [ ] `/admin` — shows login form if no admin JWT in sessionStorage; locks behind JWT
- [ ] `/invite` — new page: accepts `?token=` query param, POSTs to accept-invite, stores recruiter JWT, redirects to `/chat`
- [ ] `/chat` — attaches recruiter JWT as `Authorization: Bearer` on every chat request; redirects to `/invite` if no token
- [ ] No admin JWT → admin controls not visible; no recruiter JWT → chat shows "get an invite" message

## Approach

1. `backend/app/core/security.py` — JWT + bcrypt utilities
2. `backend/app/core/dependencies.py` — `get_current_admin`, `get_current_recruiter`
3. Update `backend/app/models/auth.py` — real request/response shapes
4. `backend/app/api/auth.py` — admin login + accept-invite (real logic)
5. `backend/app/api/admin_invitations.py` — real invite gen, JWT-guarded
6. Guard `POST /api/chat` with `get_current_recruiter`
7. Guard `GET/PUT /api/admin/llm-config` with `get_current_admin`
8. `backend/requirements.txt` — add `PyJWT`, `passlib[bcrypt]`
9. `frontend/app/invite/page.tsx` — recruiter landing page
10. `frontend/app/admin/page.tsx` — login gate wrapping existing controls
11. `frontend/app/chat/page.tsx` — attach Bearer token, redirect if missing
12. `.env.example` + `.env` — new vars

## Files to touch

### Backend
- `backend/app/core/security.py` — new
- `backend/app/core/dependencies.py` — new
- `backend/app/models/auth.py` — new (replaces invitations.py shapes)
- `backend/app/api/auth.py` — rewrite stubs with real logic
- `backend/app/api/admin_invitations.py` — new (split from auth.py for clarity)
- `backend/app/api/chat.py` — add recruiter JWT dependency
- `backend/app/api/admin_config.py` — add admin JWT dependency
- `backend/app/main.py` — init `app.state.invite_tokens` + `app.state.recruiter_sessions`
- `backend/requirements.txt` — add deps

### Frontend
- `frontend/app/invite/page.tsx` — new
- `frontend/app/admin/page.tsx` — add login gate
- `frontend/app/chat/page.tsx` — attach Bearer, redirect logic

### Config
- `.env.example` — add `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET_KEY`, `JWT_EXPIRE_HOURS`
- `.env` — add same (local only, gitignored)

## Token design

```
Admin JWT payload:   { sub: "admin", role: "admin", iat, exp }
Recruiter JWT payload: { sub: <recruiter_id UUID>, role: "recruiter", invite_id: <UUID>, iat, exp }
```

Both signed with `JWT_SECRET_KEY`. `decode_token()` returns payload dict; callers check `role`.

## Out of scope
- Refresh tokens
- Multi-admin support
- Recruiter registration or password reset
- Email delivery of invite links (manual share for now)
- Persistent storage of tokens (in-memory only)

## Risks / open questions
- In-memory token stores reset on restart — accepted for now; persistence PR will address
- Recruiter JWT expiry: if a recruiter's token expires mid-conversation, they'll need a new invite. Set TTL long enough (e.g. 7 days for recruiter, 24h for admin).
