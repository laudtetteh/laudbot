# LaudBot

> A privacy-aware, recruiter-facing AI agent built on curated knowledge — designed to represent me accurately and professionally while demonstrating full-stack and AI system design.

**Status: Scaffold complete.** All seven scaffold PRs have landed. The app starts, the pages render, the API responds — but no real AI, no real auth, no real data. That's v2. See the [roadmap](#v2-roadmap) below.

---

## What is LaudBot?

LaudBot is a private web application that allows approved users (e.g. recruiters) to ask questions about my background, projects, skills, and career direction.

It is not a generic chatbot. It is a curated, privacy-aware professional agent that:

- Answers questions using **approved sources only**
- Provides a **truthful but controlled** representation of me
- Protects sensitive or private information by design
- Demonstrates real full-stack + AI system design skills

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI (Python 3.12) |
| Database | PostgreSQL + pgvector (v2+) |
| AI | Claude (Anthropic) + OpenAI — abstracted behind a provider-agnostic service layer |
| Infra | Docker + Docker Compose |

---

## Running locally

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (included with Docker Desktop)
- Git

No other tooling required. Python and Node.js run inside containers.

### 1. Clone the repo

```bash
git clone https://github.com/laudtetteh/laudbot.git
cd laudbot
```

### 2. Start the stack

```bash
docker-compose up
```

Docker will build both images on first run (takes ~60s). Subsequent starts are fast.

### 3. Verify

| Service | URL | Expected |
|---------|-----|----------|
| Frontend | http://localhost:3001 | Landing page |
| Backend health | http://localhost:8000/health | `{"status":"ok","service":"api"}` |
| API docs | http://localhost:8000/docs | FastAPI Swagger UI |

### 4. Stop

```bash
docker-compose down
```

### Environment variables

No `.env` file is required to run the scaffold. When v2 wires the real APIs, the following vars will be needed:

| Variable | Purpose |
|----------|---------|
| `ANTHROPIC_API_KEY` | Anthropic Claude API key |
| `OPENAI_API_KEY` | OpenAI API key (optional — for provider toggle) |
| `DATABASE_URL` | PostgreSQL connection string |

---

## Project structure

```
laudbot/
├── backend/                  # FastAPI app
│   ├── app/
│   │   ├── api/              # Route handlers
│   │   ├── models/           # Pydantic request/response models
│   │   └── services/
│   │       └── llm/          # Provider-agnostic LLM service layer
│   │           ├── base.py   # LLMService abstract base + Message dataclass
│   │           └── claude.py # ClaudeService stub (real API call in v2)
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/                 # Next.js app
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   ├── chat/page.tsx     # Chat UI (non-functional scaffold)
│   │   └── admin/page.tsx    # Admin UI (non-functional scaffold)
│   └── components/Nav.tsx    # Shared nav
├── data/
│   └── approved/             # Gitignored — holds approved source files (v2+)
├── docs/                     # PRD, Architecture, decisions
├── docker-compose.yml
├── SOURCES.md                # Approved source policy
└── README.md
```

---

## Scaffold build plan

All seven scaffold PRs have landed on `main`. Tagged `v0.1.0-scaffold`.

- [x] PR 1 — `chore: repo init, git hooks, and project structure`
- [x] PR 2 — `feat(backend): FastAPI scaffold with health endpoint`
- [x] PR 3 — `feat(backend): stubbed auth endpoints and Pydantic models`
- [x] PR 4 — `feat(backend): abstract LLM service layer with Claude stub`
- [x] PR 5 — `feat(frontend): Next.js scaffold with config`
- [x] PR 6 — `feat(frontend): placeholder pages and nav`
- [x] PR 7 — `docs: full README, scaffold-complete reframe, multi-provider decision`

---

## v2 roadmap

v2 turns the scaffold into a working product. Planned PRs:

| PR | Scope |
|----|-------|
| v2-1 | `OpenAIService` subclass + provider factory |
| v2-2 | `POST /api/chat` endpoint — real LLM call through service layer |
| v2-3 | Frontend chat wiring — connects UI to `/api/chat` |
| v2-4 | System prompt loaded from `data/approved/` |
| v2-5 | Admin UI provider toggle — switch between Claude and OpenAI at runtime |
| v2-6 | Basic auth — invitation token flow |

---

## Data and privacy

LaudBot operates on explicitly approved sources only. See [SOURCES.md](./SOURCES.md) for the full data policy.

---

## Docs

- [PRD](./docs/PRD.md) — product requirements, decisions log
- [Architecture](./docs/ARCHITECTURE.md) — system design, component map, design decisions
