# Architecture — LaudBot

> Last updated: 2026-04-04. Update this file as architectural decisions are made.

---

## System overview

LaudBot is a two-service web application: a FastAPI backend that handles API requests and LLM orchestration, and a Next.js frontend that provides the chat and admin interfaces. All AI calls are routed through a model-agnostic abstraction layer so the LLM provider can be swapped without touching business logic. In v1 the LLM layer is stubbed — no live API calls are made.

---

## Component map

```
┌─────────────────────────────────────────────────┐
│                  Browser                         │
│                                                  │
│  ┌──────────────────────────────────────────┐   │
│  │         Next.js Frontend (port 3001)      │   │
│  │                                           │   │
│  │   /          Chat UI       Admin UI       │   │
│  │   (landing)  /chat         /admin         │   │
│  └───────────────────┬──────────────────────┘   │
└──────────────────────│──────────────────────────┘
                       │ HTTP (REST)
┌──────────────────────▼──────────────────────────┐
│           FastAPI Backend (port 8000)            │
│                                                  │
│   GET /health                                    │
│   POST /api/admin/invitations   (stubbed v1)     │
│   POST /api/auth/accept-invite  (stubbed v1)     │
│                                                  │
│   ┌──────────────────────────────────────────┐  │
│   │          LLM Service Layer               │  │
│   │   LLMService (abstract base)             │  │
│   │   └── ClaudeService (stub → real v2)     │  │
│   └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                       │ (v2+)
         ┌─────────────▼──────────────┐
         │   PostgreSQL + pgvector    │
         │   - Source registry        │
         │   - Embeddings             │
         │   - Sessions / auth        │
         └────────────────────────────┘
                       │ (v2+)
         ┌─────────────▼──────────────┐
         │   Anthropic Claude API     │
         │   (live in v2, stub in v1) │
         └────────────────────────────┘
```

---

## Data flow (v2 target — not yet implemented)

1. Recruiter sends a message via the `/chat` UI
2. Frontend POSTs to `POST /api/chat` on the FastAPI backend
3. Backend validates the session (auth middleware)
4. Backend queries the retrieval layer — pgvector semantic search over approved source embeddings
5. Retrieved context is assembled into a prompt
6. Prompt is passed to `LLMService.complete()` → `ClaudeService` → Anthropic API
7. Response is returned to the frontend and streamed to the user

**v1 data flow**: Steps 3–6 are stubbed. The endpoint structure exists but returns placeholder responses.

---

## External dependencies

| Service | Purpose | Auth method | Status |
|---------|---------|-------------|--------|
| Anthropic Claude API | LLM for answer generation | API key (`ANTHROPIC_API_KEY` env var) | v2 |
| PostgreSQL | Persistent storage, source registry, sessions | Connection string env var | v2 |
| pgvector | Semantic search over approved content | Via PostgreSQL | v2 |

---

## Local development

All services run via Docker Compose. No external dependencies needed for v1.

```
docker-compose up
```

- Backend: http://localhost:8000
- Frontend: http://localhost:3001
- API docs: http://localhost:8000/docs

---

## Key design decisions

**Model-agnostic LLM layer**
All LLM calls go through `LLMService` (abstract base). `ClaudeService` is the concrete implementation. Adding a new provider means subclassing `LLMService` — nothing else changes.

**Approved-sources-only constraint**
The retrieval layer only indexes content from `data/approved/`. Presence of a file does not grant permission — approval must be explicit. This is enforced at the data layer, not just by convention.

**No direct SDK calls from routes**
FastAPI routes must never import `anthropic` directly. All LLM access goes through the service layer. This is enforced by convention (and eventually linting).

---

## Scaling considerations

v1 is a single-instance local deployment. No scale considerations apply yet.

When retrieval is introduced (v2):
- Embedding generation can be slow — will need async background processing
- pgvector query performance degrades at very high document counts — may need HNSW index tuning
- Claude API has rate limits — will need request queuing or backoff

---

## Known technical debt

| Item | Why it exists | What it would take to fix |
|------|--------------|--------------------------|
| Auth is fully stubbed | Scope decision — v1 is scaffold only | Implement token flow, session management, httpOnly cookies |
| No retrieval layer | Requires DB + embedding pipeline not yet built | Add pgvector, ingestion job, retrieval service |
| LLM layer returns stubs | Claude API not wired in v1 | Implement `ClaudeService.complete()` with real API call |
| No rate limiting | Not needed for local v1 | Add before any public-facing deployment |
