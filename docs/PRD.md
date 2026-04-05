# Product requirements document — LaudBot

> This is the source of truth for what we're building. Keep it updated as scope evolves.
> Last updated: 2026-04-05 (v4 UI complete — animations, responsive layout, glassmorphism nav, styled chat)

---

## Problem statement

Recruiters and hiring managers need to evaluate candidates quickly, but the usual artifacts — resume, LinkedIn, portfolio — are static and require effort to interpret. Scheduling a screening call just to answer basic background questions is expensive for both parties.

LaudBot gives recruiters a conversational interface to ask questions about me and get accurate, concise answers — grounded in curated, approved content — without needing to schedule a call or dig through documents.

---

## Target users

- **Primary**: Recruiters and hiring managers who have been given access to evaluate my background
- **Secondary**: Me (owner/admin) — managing approved content, privacy controls, and system behaviour

---

## Goals

1. A recruiter can ask natural-language questions about my background and get accurate, grounded answers
2. All responses are sourced exclusively from explicitly approved content — no hallucination, no guessing
3. Sensitive personal information is never surfaced, regardless of how it is asked for
4. The admin (me) can control what the bot knows and how it behaves
5. The project itself demonstrates strong full-stack and AI system design skills to anyone who reviews the repo

---

## Non-goals

### Permanently out of scope
- Exposing salary, location, financial, health, or other sensitive personal data
- Allowing unapproved sources to be ingested automatically
- Acting as a general-purpose chatbot (this is a curated agent, not a generic assistant)

---

## Features — Scaffold (v0.1.0-scaffold) ✅ Complete

| Feature | Description | Status |
|---------|-------------|--------|
| Health endpoint | `GET /health` — basic liveness check | ✅ |
| Stubbed auth | `POST /api/admin/invitations` and `POST /api/auth/accept-invite` stubs | ✅ |
| Abstract LLM service | Provider-agnostic `LLMService` base class with Claude stub | ✅ |
| Frontend scaffold | Next.js app with `/`, `/chat`, `/admin` placeholder pages and nav | ✅ |
| Docker Compose | Backend + frontend via a single `docker-compose up` | ✅ |
| Approved source structure | `data/approved/` directory structure with documented source policy | ✅ |

---

## Features — v2 ✅ Complete

| Feature | Description | Status |
|---------|-------------|--------|
| Multi-provider LLM | Claude + OpenAI via provider factory; `LLMConfig` dataclass; lazy SDK init | ✅ |
| `POST /api/chat` | Live chat endpoint through LLM service layer; 400/502 error handling | ✅ |
| System prompt from file | `load_system_prompt()` reads `data/approved/system_prompt.md`; Docker volume mount | ✅ |
| Admin UI — provider toggle | `GET/PUT /api/admin/llm-config`; runtime provider + model switch, no redeploy | ✅ |
| Markdown rendering | `react-markdown` + `remark-gfm` in assistant chat bubbles | ✅ |
| JWT auth — admin | `POST /api/auth/admin/login`; username + password → JWT (`role: admin`) | ✅ |
| JWT auth — recruiter invite | `POST /api/admin/invitations` (admin-only) → invite URL; `POST /api/auth/accept-invite` → recruiter JWT with `recruiter_id` | ✅ |
| Frontend auth gates | `/admin` login form; `/invite` token exchange; `/chat` Bearer attachment + redirect | ✅ |

---

## Features — v3 ✅ Complete

| Feature | Description | Status |
|---------|-------------|--------|
| Invite modes | 3 personas (`recruiter`, `coworker`, `buddy`) — mode embedded in JWT; per-invite `allowed_modes`, `default_mode`, `can_switch_modes` | ✅ |
| Admin invite UI | Generate invite links from admin panel with per-invite mode config | ✅ |
| Transactional invite email | Resend delivers invite link to recruiter email; non-fatal if key missing | ✅ |
| DO App Platform deployment | CI/CD → GHCR image push → DO auto-deploy on merge to main | ✅ |
| Exit / logout | Exit button in chat clears sessionStorage, redirects to `/` | ✅ |
| Suggested prompts | Per-mode clickable chips in chat empty state, admin-configurable | ✅ |
| Mode descriptions | Mode label and description shown in switch confirmation dialog | ✅ |

---

## Features — v4 UI ✅ Complete

| Feature | Description | Status |
|---------|-------------|--------|
| Custom animations | Tailwind keyframes: `fadeIn`, `fadeInUp`, `slideDown`, `scaleIn`, `typingDot` | ✅ |
| Full-height chat layout | `html`/`body` `h-full` scaffold → chat fills viewport, no fixed `h-[28rem]` | ✅ |
| Glassmorphism nav | `backdrop-blur-md`, active link via `usePathname`, mobile hamburger | ✅ |
| Hero gradient | Radial glow (indigo + violet), staggered entrance animation | ✅ |
| Styled chat bubbles | User: `bg-zinc-100 text-zinc-900`; assistant: `bg-zinc-800/80` with border | ✅ |
| Animated typing indicator | Three-dot bounce animation while waiting for response | ✅ |
| Admin `Card` + `SectionHeader` primitives | Shared visual components for admin panel sections | ✅ |
| Admin single-mode auto-select | When 1 mode globally enabled → allowed mode auto-checked/locked, default auto-set | ✅ |
| Per-mode prompt placeholders | Admin textarea shows context-appropriate placeholder per mode | ✅ |
| Invite/invite-required polish | Centered card layout, CSS spinner, error icon | ✅ |
| Mobile-responsive chat header | Pills and Exit CTA stack cleanly on narrow viewports | ✅ |

---

## Features — v4 remaining (planned)

| Feature | Description | Notes |
|---------|-------------|-------|
| Next.js CVE patch | Upgrade `next` to latest — critical CVEs in `15.3.0` | Before public push |
| Chat history persistence | Store messages keyed to `recruiter_id`; requires DB | `recruiter_id` already in JWT — no auth refactor |
| PostgreSQL + pgvector | Persistent invite store, chat history, source registry | Prerequisite for retrieval |
| Source ingestion pipeline | Index approved files into vector store | Requires DB |
| Retrieval-augmented generation | Semantic search over approved content at chat time | Requires ingestion |
| Rate limiting | Per-session or per-IP; required before public-facing | Add before open access |
| Response review | Audit past responses, flag corrections | Requires chat history persistence |
| Privacy filter | Policy-based layer intercepting sensitive outputs | Later phase |

---

## Current API contract

### Public

**`GET /health`**
Returns service liveness. No auth required.

**`POST /api/auth/admin/login`**
```json
Request:  { "username": "string", "password": "string" }
Response: { "access_token": "string", "token_type": "bearer" }
```

**`POST /api/auth/accept-invite`**
```json
Request:  { "invite_token": "string" }
Response: { "access_token": "string", "token_type": "bearer", "recruiter_id": "uuid" }
```

### Admin (requires `Authorization: Bearer <admin_jwt>`)

**`POST /api/admin/invitations`**
```json
Request:  { "email": "string", "note": "string|null" }
Response: { "invite_id": "uuid", "invite_token": "uuid", "email": "string", "invite_url": "string" }
```

**`GET /api/admin/llm-config`**
```json
Response: { "provider": "string", "model": "string", "available_models": { "claude": [...], "openai": [...] } }
```

**`PUT /api/admin/llm-config`**
```json
Request:  { "provider": "string", "model": "string" }
Response: { "provider": "string", "model": "string", "available_models": {...} }
```

### Recruiter (requires `Authorization: Bearer <recruiter_jwt>`)

**`POST /api/chat`**
```json
Request:  { "messages": [{ "role": "user|assistant", "content": "string" }], "provider": "string|null", "model": "string|null" }
Response: { "response": "string", "provider": "string", "model": "string" }
```

---

## Privacy model

- Answer using approved sources only — never infer or hallucinate personal details
- Redact or refuse questions about: exact location, financial info, health, credentials, private family details
- Prefer summaries over raw details
- Refuse unsafe or probing questions gracefully

| Question | Acceptable | Not acceptable |
|----------|-----------|---------------|
| "How many years of experience does he have?" | "10+ years in web development" | Fabricating specifics |
| "Where does he live?" | "That's not something I share" | Giving any location detail |
| "What's his salary expectation?" | "I can't discuss compensation here" | Any number |

---

## Open questions

- [ ] Which embedding model for the retrieval layer?
- [ ] How are approved sources formally registered — a DB table, a YAML manifest, or directory convention?
- [ ] Chat history: show recruiter their own history on return? Or session-only?

---

## Decisions log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-29 | Build around Claude (Anthropic) as primary LLM | Portfolio alignment; model-agnostic layer allows future swap |
| 2026-03-29 | Frontend port 3001, backend port 8000 | Avoids conflicts with common local dev services |
| 2026-03-29 | Invitation-based auth model | Controlled access — only approved recruiters should reach the bot |
| 2026-03-29 | Repo history as portfolio artifact | Commit/PR sequence should tell a deliberate build story |
| 2026-04-03 | PostgreSQL + pgvector for v3 DB | pgvector enables semantic search without a separate vector DB service |
| 2026-04-04 | Multi-provider LLM support (Claude + OpenAI) via admin UI toggle | Enables live A/B comparison; `LLMService` abstraction already makes this a subclass + factory addition |
| 2026-04-04 | "scaffold-complete" replaces "v1" as milestone label | v1 implies usable product — scaffold is more honest |
| 2026-04-04 | Frontend proxies API calls via Next.js rewrite | Avoids build-time URL baking, eliminates CORS, keeps backend off public internet, single image across environments |
| 2026-04-04 | Deployment target: Digital Ocean App Platform, images from GHCR | Auto-deploy on image tag push; build in CI, deploy pre-built |
| 2026-04-04 | JWT auth with role separation (admin vs recruiter) | Industry-standard pattern; clean dependency injection via FastAPI `Depends()`; roles enforced at the route level |
| 2026-04-04 | Recruiter JWT carries `recruiter_id` from day one | Chat history will be keyed to `recruiter_id` — embedding it now avoids an auth-layer refactor when persistence lands |
| 2026-04-04 | System prompt loaded from file, not hardcoded | Allows editing persona/knowledge without code changes or rebuilds; Docker volume mount keeps it out of the image |
| 2026-04-04 | Invite modes deferred to v3 | Core invite flow ships first; mode concept is architecturally compatible — `mode` field added to JWT payload when that PR lands |
| 2026-04-05 | UI polish as a dedicated v4 milestone | Accumulated technical UI debt from rapid v2/v3 feature builds — addressed in one focused pass rather than incrementally per PR |
| 2026-04-05 | Full-height chat via CSS flex chain, not fixed height | `h-full` on `html`/`body` + `min-h-0` chain gives true viewport fill without JS height calculation or fixed `vh` units |
| 2026-04-05 | Glassmorphism nav via `backdrop-blur-md` | Maintains visual hierarchy without a solid border; works across all page backgrounds |
