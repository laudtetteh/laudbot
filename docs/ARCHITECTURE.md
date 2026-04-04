# Architecture — LaudBot

> Last updated: 2026-04-04 (scaffold-complete + multi-provider decision). Update this file as architectural decisions are made.

---

## System overview

LaudBot is a two-service web application: a FastAPI backend that handles API requests and LLM orchestration, and a Next.js frontend that provides the chat and admin interfaces. All AI calls are routed through a provider-agnostic abstraction layer so the LLM provider can be swapped without touching business logic. In the scaffold the LLM layer is stubbed — no live API calls are made. In v2, the admin can toggle between Claude (Anthropic) and OpenAI at runtime via the admin UI.

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
│   │   ├── ClaudeService  (stub → real v2)    │  │
│   │   └── OpenAIService  (v2)                │  │
│   │   provider_factory(provider) → LLMService│  │
│   └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                       │ (v2+)
         ┌─────────────▼──────────────┐
         │   PostgreSQL + pgvector    │
         │   - Source registry        │
         │   - Embeddings             │
         │   - Sessions / auth        │
         └────────────────────────────┘
                ┌──────┴──────┐ (v2+)
  ┌─────────────▼──────┐  ┌───▼──────────────────┐
  │  Anthropic API     │  │  OpenAI API           │
  │  (Claude)          │  │  (GPT-4o / etc.)      │
  └────────────────────┘  └──────────────────────┘
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
| Anthropic Claude API | LLM for answer generation (primary) | `ANTHROPIC_API_KEY` env var | v2 |
| OpenAI API | LLM for answer generation (secondary, admin toggle) | `OPENAI_API_KEY` env var | v2 |
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

**Provider-agnostic LLM layer**
All LLM calls go through `LLMService` (abstract base class). `ClaudeService` is the first concrete implementation; `OpenAIService` will be the second. Adding a provider means subclassing `LLMService` and registering it in the factory — no route or business logic changes required. The `complete(system, messages)` interface is intentionally Claude-shaped but maps cleanly to OpenAI's Chat Completions API.

**Multi-provider support via admin toggle (v2)**
The active provider is controlled by a runtime config value, switchable from the admin UI without a redeploy. Both providers use the same knowledge base and system prompt — the toggle is purely about which API receives the call. This supports live A/B quality comparison without diverging product logic.

```
provider_factory(provider: str) -> LLMService
  "claude"  → ClaudeService()
  "openai"  → OpenAIService()
```

**Approved-sources-only constraint**
The retrieval layer only indexes content from `data/approved/`. Presence of a file does not grant permission — approval must be explicit. This is enforced at the data layer, not just by convention.

**No direct SDK calls from routes**
FastAPI routes must never import `anthropic` or `openai` directly. All LLM access goes through the service layer. This is enforced by convention (and eventually linting).

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
| Auth is fully stubbed | Scope decision — scaffold only | Implement token flow, session management, httpOnly cookies |
| No retrieval layer | Requires DB + embedding pipeline not yet built | Add pgvector, ingestion job, retrieval service |
| LLM layer returns stubs | Claude API not wired in scaffold | Implement `ClaudeService.complete()` with real API call; add `OpenAIService` |
| No `POST /api/chat` endpoint | No LLM call to route to yet | Add in v2 after LLM integration |
| No rate limiting | Not needed for local scaffold | Add before any public-facing deployment |
