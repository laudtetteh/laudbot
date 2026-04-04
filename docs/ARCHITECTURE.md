# Architecture — LaudBot

> Last updated: 2026-04-04 (v2 — auth, live LLM, admin UI complete). Update this file as architectural decisions are made.

---

## System overview

LaudBot is a two-service web application: a FastAPI backend that handles API requests and LLM orchestration, and a Next.js frontend that provides the chat and admin interfaces. All AI calls are routed through a provider-agnostic abstraction layer so the LLM provider can be swapped without touching business logic.

Access is invite-only. Recruiters receive an invite link from the admin (Laud). Admins authenticate via username + password → JWT. All protected endpoints validate JWTs via FastAPI dependency injection.

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
│                                                          │
│  Chat (requires recruiter JWT)                           │
│  POST /api/chat                                          │
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
│  │  DEFAULT_MODELS / AVAILABLE_MODELS (single source)│   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           In-memory app state                     │   │
│  │  app.state.llm_config    — active provider/model  │   │
│  │  app.state.invite_tokens — token → invite data    │   │
│  └──────────────────────────────────────────────────┘   │
└───────────────────┬──────────────────────────────────────┘
                    │
       ┌────────────▼─────────────┐
       │  data/approved/          │
       │  system_prompt.md        │
       │  (gitignored, mounted    │
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

1. Recruiter visits `/invite?token=<invite_token>`
2. Frontend POSTs to `POST /api/auth/accept-invite` → backend validates token from `app.state.invite_tokens` → returns recruiter JWT containing `recruiter_id`, `role: recruiter`, `invite_id`
3. Frontend stores JWT in `sessionStorage`, redirects to `/chat`
4. Recruiter sends a message → frontend POSTs to `/api/chat` with `Authorization: Bearer <recruiter_jwt>`
5. Backend `get_current_recruiter` dependency decodes JWT, asserts `role == "recruiter"`
6. `load_system_prompt()` reads `data/approved/system_prompt.md` (or fallback stub)
7. Active `LLMConfig` (from `app.state.llm_config`) selects provider → `provider_factory` returns correct `LLMService`
8. `LLMService.complete(system, messages)` calls live LLM API → returns response string
9. Response returned to frontend as `{ response, provider, model }`
10. Frontend renders response with `react-markdown` + `remark-gfm`

## Request flow — admin

1. Admin visits `/admin` → frontend checks `sessionStorage` for `admin_token`
2. If missing → login form shown; credentials POSTed to `POST /api/auth/admin/login`
3. Backend validates against `ADMIN_USERNAME` / `ADMIN_PASSWORD` env vars → returns admin JWT (`role: admin`)
4. Frontend stores JWT in `sessionStorage`, admin controls become visible
5. All subsequent admin API calls attach `Authorization: Bearer <admin_jwt>`

---

## External dependencies

| Service | Purpose | Auth method | Status |
|---------|---------|-------------|--------|
| Anthropic Claude API | LLM for answer generation (primary) | `ANTHROPIC_API_KEY` env var | ✅ Live |
| OpenAI API | LLM for answer generation (admin-togglable) | `OPENAI_API_KEY` env var | ✅ Live |
| PostgreSQL + pgvector | Persistent storage, source registry, chat history | Connection string env var | 🔜 Planned |

---

## Local development

```bash
cp .env.example .env   # fill in API keys and admin credentials
docker-compose up
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3001
- API docs: http://localhost:8000/docs

---

## Key design decisions

**Provider-agnostic LLM layer**
All LLM calls go through `LLMService` (abstract base class). `ClaudeService` and `OpenAIService` are the two concrete implementations. Adding a provider means subclassing `LLMService` and registering it in `provider_factory` — no route or business logic changes. The `complete(system, messages)` interface maps cleanly to both Anthropic and OpenAI SDKs.

**Runtime provider toggle via admin UI**
The active provider is `app.state.llm_config` — an in-memory `LLMConfig(provider, model)` updated via `PUT /api/admin/llm-config`. Changes take effect on the next chat request with no redeploy. `AVAILABLE_MODELS` in `base.py` is the single source of truth for validation and populates the admin UI dropdown.

**JWT auth with role separation**
Two roles: `admin` and `recruiter`. Both use the same `security.py` JWT utilities but different `Depends()` guards. An admin JWT is rejected on `/api/chat` (403); a recruiter JWT is rejected on `/api/admin/*` (403). Credentials live in env vars; no user DB needed at this stage.

**Recruiter JWT carries durable `recruiter_id`**
When a recruiter accepts an invite, their JWT payload includes a stable UUID `recruiter_id` (tied to the invite). Chat endpoints have this identity available now. When chat history persistence lands, messages are stored keyed to `recruiter_id` — no refactor of the auth layer required.

**In-memory token stores**
`app.state.invite_tokens` maps raw invite tokens to invite metadata. This resets on server restart — acceptable for the current stage. When persistence is added, this migrates to a DB table.

**System prompt from `data/approved/system_prompt.md`**
`load_system_prompt()` reads from `SYSTEM_PROMPT_PATH` env var (default `/data/approved/system_prompt.md`). The file is mounted via Docker volume (`./data:/data`) so it can be edited without a rebuild. Falls back to a minimal stub if the file is missing. The file is gitignored — it contains personal information not appropriate for a public repo.

**Next.js proxy rewrite — browser never calls the backend directly**
The frontend uses a Next.js server-side rewrite (`/api/:path*` → `${BACKEND_URL}/api/:path*`). `BACKEND_URL` is a server-side runtime env var, not a `NEXT_PUBLIC_` build-time variable. A single image works across all environments with no rebuild.

| Environment | `BACKEND_URL` |
|---|---|
| Local (bare `npm run dev`) | `http://localhost:8000` |
| Local (Docker Compose) | `http://backend:8000` |
| Production (DO App Platform) | `http://backend` |

**No direct SDK calls from routes**
FastAPI routes must never import `anthropic` or `openai` directly. All LLM access goes through the service layer.

---

## Planned (not yet built)

| Feature | Notes |
|---|---|
| PostgreSQL + pgvector | Persistent chat history, source registry, invite storage |
| Source ingestion pipeline | Index approved files into vector store |
| Retrieval-augmented generation | Semantic search over approved content at chat time |
| Invite modes | Per-invite persona selection (recruiter, friend, technical, etc.) with optional mode-switching |
| Admin invite UI | Generate invite links from the admin page without curl |
| DO App Platform deployment | CI/CD pipeline pushing images to GHCR, DO auto-deploy on tag |
| Rate limiting | Required before open/public deployment |

---

## Known technical debt

| Item | Why it exists | What it would take to fix |
|------|--------------|--------------------------|
| In-memory invite token store | No DB yet | Migrate to DB table when persistence lands |
| Admin credentials in env vars (plaintext) | Simple to start | Hash password at startup or store hashed value |
| No rate limiting | Not needed for invite-only access | Add before any open/public deployment |
| Next.js CVEs (next@15.3.0) | Deferred | `npm install next@latest` + test |
| No retrieval layer | Requires DB + embedding pipeline | Add pgvector, ingestion job, retrieval service |
