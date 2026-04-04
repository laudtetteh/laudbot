# Product requirements document — LaudBot

> This is the source of truth for what we're building. Keep it updated as scope evolves.
> Last updated: 2026-04-04

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

### v1 explicitly excludes
- Real authentication or session management
- Database migrations or persistent storage
- Source ingestion pipeline or embedding pipeline
- Vector search or retrieval-augmented generation
- Live Claude API integration (LLM layer is stubbed)
- Admin UI functionality (placeholder only)
- Background jobs, Redis, or caching
- Production deployment

### Permanently out of scope
- Exposing salary, location, financial, health, or other sensitive personal data
- Allowing unapproved sources to be ingested automatically
- Acting as a general-purpose chatbot (this is a curated agent, not a generic assistant)

---

## Features — MVP (v1)

| Feature | Description | Priority |
|---------|-------------|----------|
| Health endpoint | `GET /health` — basic liveness check | P0 |
| Stubbed auth | `POST /api/admin/invitations` and `POST /api/auth/accept-invite` — return spec-compliant stubs | P0 |
| Abstract LLM service | Model-agnostic `LLMService` base class with Claude stub implementation | P0 |
| Frontend scaffold | Next.js app with `/`, `/chat`, `/admin` placeholder pages and shared nav | P0 |
| Docker Compose | Backend + frontend services running locally via a single `docker-compose up` | P0 |
| Approved source structure | `data/approved/` directory structure, gitignored, with documented source policy | P0 |

---

## Features — post-MVP

| Feature | Description | Notes |
|---------|-------------|-------|
| Real auth | Invitation token flow with session management | Decided before implementation |
| Source ingestion | Pipeline to ingest approved files into vector store | Requires DB + pgvector |
| Retrieval layer | Semantic search over approved content (pgvector) | Requires ingestion |
| Live Claude integration | Wire `claude.py` stub to real Anthropic API | After retrieval layer |
| Admin UI | Content management, source approval, response review | After live AI |
| Response evaluation | Traceability, grounding checks, answer quality scoring | Later phase |
| Privacy filter | Policy-based layer that intercepts and blocks sensitive outputs | Later phase |

---

## API contract (v1)

### `GET /health`
Returns service status. Used for liveness checks and Docker health checks.

### `POST /api/admin/invitations`
Creates an invitation for a recruiter. **Stubbed in v1** — returns `not_implemented`.

Request:
```json
{ "email": "recruiter@example.com", "note": "optional" }
```

### `POST /api/auth/accept-invite`
Accepts an invitation token. **Stubbed in v1** — returns `not_implemented`.

Request:
```json
{ "invite_token": "opaque-token" }
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

## Success metrics (v1)

- App runs locally via `docker-compose up` with no manual steps
- `GET /health` returns 200
- Auth endpoints exist and return spec-compliant stub responses
- Frontend renders three pages with working nav
- Repo history tells a coherent, reviewable build story

---

## Open questions

- [ ] Which auth strategy for v2? (JWT, session cookies, magic link)
- [ ] Which embedding model for the retrieval layer?
- [ ] How are approved sources formally registered — a DB table, a YAML manifest, or a directory convention?

---

## Decisions log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-03-29 | Build around Claude (Anthropic) as primary LLM | Portfolio alignment; model-agnostic layer allows future swap |
| 2026-03-29 | Frontend port 3001, backend port 8000 | Avoids conflicts with common local dev services |
| 2026-03-29 | Invitation-based auth model | Controlled access — only approved recruiters should reach the bot |
| 2026-03-29 | Repo history as portfolio artifact | Commit/PR sequence should tell a deliberate build story |
| 2026-04-03 | PostgreSQL + pgvector for v2 DB | pgvector enables semantic search without a separate vector DB service |
