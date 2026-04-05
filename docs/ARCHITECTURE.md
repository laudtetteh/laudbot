# Architecture — LaudBot

> Last updated: 2026-04-05 (v4 UI complete — animations, responsive layout, glassmorphism nav, styled chat bubbles). Update this file as architectural decisions are made.

---

## System overview

LaudBot is a two-service web application: a FastAPI backend that handles API requests and LLM orchestration, and a Next.js frontend that provides the chat and admin interfaces. All AI calls are routed through a provider-agnostic abstraction layer so the LLM provider can be swapped without touching business logic.

Access is invite-only. The admin generates invite links from an in-app panel; recruiter JWTs are issued when an invite link is accepted. Admins authenticate via username + password → admin JWT. All protected endpoints validate JWTs via FastAPI dependency injection with strict role separation.

---

## Component map

```
┌──────────────────────────────────────────────────────────┐
│                        Browser                           │
│                                                          │
│  ┌────────────────────────────────────────────────────┐  │
│  │          Next.js Frontend (port 3001)              │  │
│  │                                                    │  │
│  │  /            /chat          /admin                │  │
│  │  (landing)    (recruiter,    (admin login gate +   │  │
│  │               JWT-gated)     controls)             │  │
│  │                                                    │  │
│  │  /invite      /invite-required                     │  │
│  │  (token →     (no-token                            │  │
│  │   JWT flow)    landing)                            │  │
│  └───────────────────┬────────────────────────────────┘  │
└─────────────────────│────────────────────────────────────┘
                      │ HTTP (REST) — via Next.js proxy rewrite
┌─────────────────────▼────────────────────────────────────┐
│              FastAPI Backend (port 8000)                  │
│                                                          │
│  GET  /health                                            │
│                                                          │
│  Auth (public)                                           │
│  POST /api/auth/admin/login                              │
│  POST /api/auth/accept-invite                            │
│                                                          │
│  Admin (requires admin JWT)                              │
│  POST /api/admin/invitations                             │
│  GET  /api/admin/llm-config                              │
│  PUT  /api/admin/llm-config                              │
│  GET  /api/admin/modes                                   │
│  PUT  /api/admin/modes                                   │
│  GET  /api/admin/modes/{mode}          (overlay)         │
│  PUT  /api/admin/modes/{mode}          (overlay)         │
│  GET  /api/admin/modes/{mode}/prompts                    │
│  PUT  /api/admin/modes/{mode}/prompts                    │
│                                                          │
│  Recruiter (requires recruiter JWT)                      │
│  POST /api/chat                                          │
│  GET  /api/chat/prompts                                  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │                Auth layer (core/)                 │   │
│  │  security.py     — JWT create/decode, bcrypt      │   │
│  │  dependencies.py — get_current_admin,             │   │
│  │                    get_current_recruiter deps      │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              LLM service layer                    │   │
│  │  LLMService (abstract base)                       │   │
│  │  ├── ClaudeService  (Anthropic SDK)               │   │
│  │  └── OpenAIService  (OpenAI SDK)                  │   │
│  │  provider_factory(LLMConfig) → LLMService         │   │
│  │  MODES / DEFAULT_MODELS / AVAILABLE_MODELS        │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           In-memory app state                     │   │
│  │  llm_config     — active provider/model           │   │
│  │  invite_tokens  — token → invite metadata         │   │
│  │  modes_config   — mode slug → enabled bool        │   │
│  │  mode_overlays  — mode slug → overlay text        │   │
│  │  mode_prompts   — mode slug → prompt list         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           services/prompt.py                      │   │
│  │  load_base_prompt()   — 3-level fallback          │   │
│  │  load_mode_overlay()  — reads overlays/<mode>.md  │   │
│  │  compose_system_prompt(mode, mode_overlays)       │   │
│  │    → base + mode_lock + overlay                   │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────┬──────────────────────────────────────┘
                    │
       ┌────────────▼─────────────┐  ┌──────────────────┐
       │  data/approved/          │  │  Resend API       │
       │  system_prompt.md        │  │  (invite email    │
       │  overlays/<mode>.md      │  │   delivery)       │
       │  (gitignored, mounted    │  └──────────────────┘
       │   via Docker volume)     │
       └──────────────────────────┘
              ┌──────┴──────┐
┌─────────────▼──────┐  ┌───▼──────────────────┐
│  Anthropic API     │  │  OpenAI API           │
│  (Claude)          │  │  (GPT-4o / etc.)      │
└────────────────────┘  └──────────────────────┘
```

---

## Request flow — recruiter chat

1. Admin generates an invite in the admin panel → `POST /api/admin/invitations` creates a UUID token stored in `app.state.invite_tokens` with mode config: `allowed_modes`, `default_mode`, `can_switch_modes`
2. Resend delivers an invite email with the accept link
3. Recruiter clicks the link → `/invite?token=<uuid>`
4. Frontend POSTs `POST /api/auth/accept-invite` → backend validates token, returns recruiter JWT containing `recruiter_id`, `role: recruiter`, `invite_id`, `allowed_modes`, `default_mode`, `can_switch_modes`
5. Frontend decodes JWT (client-side base64url, no library), stores all fields in `sessionStorage`, redirects to `/chat`
6. Recruiter sends a message → frontend POSTs `/api/chat` with `Authorization: Bearer <recruiter_jwt>` and `active_mode`
7. Backend resolves mode: `active_mode` from request body → `default_mode` from JWT; validates mode is in `allowed_modes` and globally enabled in `modes_config`
8. `compose_system_prompt(mode, mode_overlays)` builds: `base_prompt + mode_lock + overlay` (mode lock prevents cross-mode drift)
9. Active `LLMConfig` selects provider → `provider_factory` returns correct `LLMService`
10. `LLMService.complete(system, messages)` calls live LLM API
11. Response returned as `{ response, provider, model }`
12. Frontend renders response with `react-markdown` + `remark-gfm`

## Request flow — admin

1. Admin visits `/admin` → frontend checks `sessionStorage` for `admin_token`
2. If missing → login form shown; credentials POSTed to `POST /api/auth/admin/login`
3. Backend validates against `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars → returns admin JWT (`role: admin`)
4. Frontend stores JWT in `sessionStorage`, admin controls become visible
5. All admin API calls attach `Authorization: Bearer <admin_jwt>`

---

## Conversation modes

Three modes are defined in `backend/app/services/llm/base.py` as `MODES: list[str]`. This is the single source of truth — used for validation in every API route that accepts mode slugs.

| Mode | Persona |
|------|---------|
| `recruiter` | Professional — career, skills, role fit |
| `coworker` | Technical — architecture, decisions, engineering craft |
| `buddy` | Casual and playful, with friendly roasting |

Each mode has:
- A **system prompt overlay** — loaded from `data/approved/overlays/<mode>.md` at startup, editable live via admin API
- A **mode lock** injected by `compose_system_prompt()` — explicit instruction to the model not to drift into other modes' behavior regardless of user input
- A **suggested prompts list** — configurable per mode in the admin panel, returned to the chat UI as clickable chips

Per-invite mode config (embedded in recruiter JWT):
- `allowed_modes` — which modes the recruiter can use
- `default_mode` — which mode is active when they arrive
- `can_switch_modes` — whether they can switch modes mid-session

---

## External dependencies

| Service | Purpose | Auth method | Status |
|---------|---------|-------------|--------|
| Anthropic Claude API | LLM (primary default) | `ANTHROPIC_API_KEY` env var | ✅ Live |
| OpenAI API | LLM (admin-togglable) | `OPENAI_API_KEY` env var | ✅ Live |
| Resend | Transactional invite email | `RESEND_API_KEY` env var | ✅ Live |
| PostgreSQL + pgvector | Persistent storage, RAG | Connection string env var | 🔜 v4 |

---

## Production topology

```
GitHub (main branch)
        │ push
        ▼
GitHub Actions (deploy.yml)
  ├── build backend image  → ghcr.io/laudtetteh/laudbot-backend:latest
  ├── build frontend image → ghcr.io/laudtetteh/laudbot-frontend:latest
  └── doctl apps create-deployment <DO_APP_ID>
                │
                ▼
    DigitalOcean App Platform (nyc)
    ┌─────────────────────────────────────────┐
    │  frontend service  (laudbot-frontend)   │
    │  port 3001 — Next.js standalone         │
    │  BACKEND_URL=http://backend             │
    │               │ internal routing        │
    │  backend service   (laudbot-backend)    │
    │  port 8000 — FastAPI/uvicorn            │
    │  SYSTEM_PROMPT env var (secret)         │
    └─────────────────────────────────────────┘
                │
    laudbot.laudtetteh.io  (Cloudflare DNS-only → DO CNAME)
```

**System prompt in production:** `SYSTEM_PROMPT` env var (DO secret) takes priority over the file path. `load_base_prompt()` checks env var → file → inline stub.

---

## Local development

```bash
cp .env.example .env   # fill in API keys and admin credentials
docker-compose up
```

- Backend: http://localhost:8000 / API docs: http://localhost:8000/docs
- Frontend: http://localhost:3001

---

## Key design decisions

**Provider-agnostic LLM layer**
All LLM calls go through `LLMService` (abstract base class). `ClaudeService` and `OpenAIService` are the two concrete implementations. Adding a provider means subclassing `LLMService` and registering it in `provider_factory` — no route or business logic changes.

**Runtime provider toggle via admin UI**
Active provider is `app.state.llm_config` — an in-memory `LLMConfig(provider, model)` updated via `PUT /api/admin/llm-config`. Changes take effect on the next request. `AVAILABLE_MODELS` in `base.py` is the single source of truth for validation and populates the dropdown.

**JWT auth with role separation**
Two roles: `admin` and `recruiter`. Same JWT utilities, different `Depends()` guards. Admin JWT rejected on `/api/chat` (403); recruiter JWT rejected on `/api/admin/*` (403). No user DB needed at this stage.

**Recruiter JWT carries full mode config**
`allowed_modes`, `default_mode`, and `can_switch_modes` live in the JWT. When a recruiter accepts their invite these are embedded at token issuance — no DB lookup needed at chat time. The `recruiter_id` is also embedded; when chat history persistence lands, messages are keyed to it with no auth layer refactor.

**Mode isolation via explicit mode lock in system prompt**
Without a mode constraint, models drift — a buddy-mode user phrasing a question technically causes the model to start answering as if in co-worker mode. Fix: `compose_system_prompt()` injects an `## ACTIVE MODE: {MODE}` block with an explicit constraint before the overlay. This is a structural guarantee, not a prompt-engineering suggestion.

**In-memory app state**
`app.state` holds `llm_config`, `invite_tokens`, `modes_config`, `mode_overlays`, and `mode_prompts`. All reset on restart — acceptable for the current stage. When persistence lands, these migrate to DB tables.

**System prompt loaded from `data/approved/` — 3-level fallback**
1. `SYSTEM_PROMPT` env var — used in production (DO App Platform secret)
2. File at `data/approved/system_prompt.md` — used locally via Docker volume mount
3. Inline stub — ensures the app never crashes on missing content

**Mode overlays seeded from files, editable at runtime**
`mode_overlays` is seeded at startup from `data/approved/overlays/<mode>.md` if present. Updates via `PUT /api/admin/modes/{mode}` take effect immediately. Same pattern for `mode_prompts` (prompts are not file-seeded — admin sets them via UI).

**Next.js proxy rewrite — browser never calls the backend directly**
`/api/:path*` → `${BACKEND_URL}/api/:path*` via Next.js server-side rewrite. `BACKEND_URL` is a server-side runtime env var (not `NEXT_PUBLIC_`). A single image works across all environments with no rebuild.

| Environment | `BACKEND_URL` |
|---|---|
| Local (Docker Compose) | `http://backend:8000` |
| Production (DO App Platform) | `http://backend` |

**No direct SDK calls from routes**
FastAPI routes must never import `anthropic` or `openai` directly. All LLM access goes through the service layer.

**Resend email — lazy import, non-fatal**
`services/email.py` lazy-imports the `resend` SDK inside the function body. If `RESEND_API_KEY` is unset, the function exits silently — invite generation always succeeds regardless of email delivery. Email errors are logged, never raised.

**CI/CD via GitHub Actions → GHCR → DO App Platform**
Every merge to `main` builds production Docker images (`Dockerfile.prod`), pushes to GHCR as public packages, and triggers a DO App Platform deploy via `doctl`. `GITHUB_TOKEN` (automatic) handles GHCR auth; `DO_API_TOKEN` and `DO_APP_ID` are GitHub Actions secrets. See `docs/DEPLOYMENT.md`.

---

## Planned (not yet built)

| Feature | Notes |
|---|---|
| Next.js CVE patch | `next@15.3.0` — patch before public marketing push |
| PostgreSQL + pgvector | Persistent chat history, invite storage, source registry |
| Source ingestion pipeline | Index approved files into vector store |
| Retrieval-augmented generation | Semantic search over approved content at chat time |
| Rate limiting | Required before open/public deployment |

---

## Known technical debt

| Item | Why it exists | Fix |
|------|--------------|-----|
| In-memory invite token store | No DB yet | Migrate to DB table when persistence lands |
| Admin credentials in env vars (plaintext) | Simple to start | Hash password at startup or store hashed value |
| No rate limiting | Invite-only access mitigates risk | Add before any open/public access |
| Next.js CVEs (next@15.3.0) | Deferred | `npm install next@latest` + test |
| No retrieval layer | Requires DB + embedding pipeline | Add pgvector, ingestion job, retrieval service |
| In-memory mode config resets on restart | No DB yet | Persist to DB when that lands |
