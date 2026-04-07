# LaudBot

> An invite-only AI agent built to represent me to recruiters and engineers — demonstrating full-stack and AI system design through the product itself and the 91-PR commit history that built it.

**v1.0.0 — live in production.**
[laudbot.laudtetteh.io](https://laudbot.laudtetteh.io)

---

## What is LaudBot?

LaudBot is a privacy-aware web application that gives approved visitors a conversational interface to ask questions about my background, projects, skills, and career direction.

It is not a generic chatbot. It is a curated, invite-only professional agent that:

- Answers questions using **approved sources only** — no hallucination, no guessing
- Adapts its **tone and focus** to who is asking, via per-invite conversation modes
- Protects sensitive or private information by design
- Is administered entirely through an **in-app admin panel** — no redeployment needed for content or config changes

---

## Features

### For visitors (invite-only)
- Accept an invite link → receive a JWT scoped to your allowed modes
- Chat with LaudBot in your assigned mode: **Professional**, **Peer**, or **Buddy**
- Switch between modes mid-session (if the admin enabled it for your invite)
- Persisted conversation history with a sidebar browser — pick up any past conversation
- Clickable suggested prompts in the empty state to get started
- Expandable/collapsible long answers (TL;DR toggle)
- Animated typing indicator while responses load
- Distinct styled bubbles for user vs assistant messages
- Dark mode, responsive layout, exit / log out at any time

### For the admin (me)
- Generate invite links from the admin panel — per-invite mode config: allowed modes, default mode, can-switch toggle
- Invite emails sent automatically via Resend (transactional)
- Invite history with resend and revoke
- Toggle conversation modes on/off globally
- Edit the system prompt and per-mode overlay live (no redeploy)
- Configure suggested prompts per mode
- Switch the active LLM provider between Claude and OpenAI at runtime
- Select the specific model within each provider

### Infrastructure
- Full CI/CD: push to `main` → build production images → push to GHCR → deploy to DigitalOcean App Platform
- Provider-agnostic LLM service layer — new providers subclass one interface, zero route changes
- JWT role separation: admin tokens rejected on visitor routes and vice versa
- Content env vars (`SYSTEM_PROMPT`, `OVERLAY_{MODE}`, `SUGGESTED_PROMPTS_{MODE}`) for full local/prod parity

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI (Python 3.12) |
| AI | Anthropic Claude + OpenAI — abstracted behind a provider-agnostic service layer |
| Database | PostgreSQL 16 + pgvector (persistence live; RAG planned) |
| Email | Resend (transactional invite delivery) |
| Auth | JWT (HS256) — admin credentials via env vars, visitor access via invite tokens |
| Infra | Docker + Docker Compose (local), DigitalOcean App Platform (production) |
| CI/CD | GitHub Actions → GHCR → DO App Platform |

---

## Running locally

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) and Docker Compose (included with Docker Desktop)
- Git

No other tooling required. Python and Node.js run inside containers.

### 1. Clone

```bash
git clone https://github.com/laudtetteh/laudbot.git
cd laudbot
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Notes |
|----------|----------|-------|
| `ANTHROPIC_API_KEY` | To use Claude | [console.anthropic.com](https://console.anthropic.com/settings/keys) |
| `OPENAI_API_KEY` | To use OpenAI | [platform.openai.com](https://platform.openai.com/api-keys) |
| `JWT_SECRET_KEY` | Yes | Any random string — `openssl rand -hex 32` |
| `ADMIN_USERNAME` | Yes | Admin panel login |
| `ADMIN_PASSWORD` | Yes | Admin panel login |
| `RESEND_API_KEY` | For invite emails | [resend.com](https://resend.com) — app runs without it |
| `RESEND_FROM_EMAIL` | With Resend | e.g. `invites@yourdomain.com` |
| `FRONTEND_URL` | For invite links | e.g. `http://localhost:3001` |

### 3. Start

```bash
docker compose up
```

Docker builds both images on first run (~60s). Subsequent starts are fast.

### 4. Verify

| Service | URL | Expected |
|---------|-----|----------|
| Frontend | http://localhost:3001 | Landing page |
| Backend health | http://localhost:8000/health | `{"status":"ok","service":"api"}` |
| API docs | http://localhost:8000/docs | FastAPI Swagger UI |
| Admin panel | http://localhost:3001/admin | Login page |

### 5. Content (optional)

Copy the example files and customise them with your own content:

```bash
# System prompt
cp data/approved/system_prompt.md.example data/approved/system_prompt.md

# Per-mode overlays
cp data/approved/overlays/professional.md.example data/approved/overlays/professional.md
cp data/approved/overlays/peer.md.example         data/approved/overlays/peer.md
cp data/approved/overlays/buddy.md.example        data/approved/overlays/buddy.md

# Suggested prompts (one per line)
cp data/approved/prompts/professional.txt.example data/approved/prompts/professional.txt
cp data/approved/prompts/peer.txt.example         data/approved/prompts/peer.txt
cp data/approved/prompts/buddy.txt.example        data/approved/prompts/buddy.txt
```

All these files are gitignored — they contain personal content. The app runs without them using an inline stub.

### 6. Stop

```bash
docker compose down
```

---

## Project structure

```
laudbot/
├── backend/
│   ├── app/
│   │   ├── api/                  # Route handlers (thin — no business logic)
│   │   │   ├── auth.py           # Admin login + invite accept
│   │   │   ├── chat.py           # Chat, history, conversations, prompts endpoints
│   │   │   ├── admin_config.py   # LLM provider/model config
│   │   │   └── admin_modes.py    # Mode toggles, overlays, suggested prompts
│   │   ├── core/                 # JWT security + FastAPI dependencies
│   │   ├── db/                   # SQLAlchemy models + async session
│   │   ├── models/               # Pydantic request/response models
│   │   └── services/
│   │       ├── llm/              # Provider-agnostic LLM service layer
│   │       │   ├── base.py       # LLMService ABC, MODES, DEFAULT_MODELS
│   │       │   ├── claude.py     # ClaudeService (Anthropic SDK)
│   │       │   └── openai.py     # OpenAIService (OpenAI SDK)
│   │       ├── prompt.py         # Base prompt + mode overlay composition
│   │       └── email.py          # Resend invite email
│   ├── migrations/               # Alembic migrations (auto-run at startup)
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx              # Landing page
│   │   ├── chat/page.tsx         # Visitor chat UI (JWT-gated, conversation sidebar)
│   │   ├── admin/page.tsx        # Admin controls (JWT-gated)
│   │   ├── invite/page.tsx       # Token → JWT exchange + session init
│   │   └── invite-required/      # No-token fallback page
│   ├── Dockerfile
│   └── Dockerfile.prod
├── data/
│   └── approved/                 # Gitignored — personal content
│       ├── system_prompt.md      # Base system prompt
│       ├── overlays/             # Per-mode prompt overlays
│       └── prompts/              # Per-mode suggested prompts (one per line)
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   ├── BRAND.md
│   └── DEPLOYMENT.md
├── .github/                      # Issue templates, PR template
├── .husky/                       # Commit-msg + pre-commit hooks (gitleaks, conventional commits)
├── processes/                    # Agentic coding workflows
├── rules/                        # Coding standards, git conventions, security
├── tasks/                        # active/, backlog/, done/
├── memory/                       # PROGRESS.md, ERRORS.md, CONTEXT_SNAPSHOT.md
├── docker-compose.yml
├── .env.example
├── SOURCES.md                    # Approved source policy
└── README.md
```

---

## Build history

The PR sequence is a deliberate portfolio artifact — each PR tells a coherent story of how the system was assembled. Selected milestones below; full history on [GitHub](https://github.com/laudtetteh/laudbot/pulls?q=is%3Apr+is%3Aclosed).

| PR | Feature |
|----|---------|
| [#2](https://github.com/laudtetteh/laudbot/pull/2) | Repo init, git hooks, project structure |
| [#4](https://github.com/laudtetteh/laudbot/pull/4) | Agentic coding system (tasks, processes, memory, hooks) |
| [#6](https://github.com/laudtetteh/laudbot/pull/6) | FastAPI scaffold + health endpoint |
| [#10](https://github.com/laudtetteh/laudbot/pull/10) | Abstract LLM service layer with Claude stub |
| [#12](https://github.com/laudtetteh/laudbot/pull/12) | Next.js scaffold with config |
| [#18](https://github.com/laudtetteh/laudbot/pull/18) | Real LLM SDKs + provider factory (Claude + OpenAI) |
| [#22](https://github.com/laudtetteh/laudbot/pull/22) | `POST /api/chat` — live LLM calls |
| [#24](https://github.com/laudtetteh/laudbot/pull/24) | Frontend chat wired via Next.js proxy rewrite |
| [#26](https://github.com/laudtetteh/laudbot/pull/26) | System prompt from `data/approved/` (3-level fallback) |
| [#28](https://github.com/laudtetteh/laudbot/pull/28) | Admin UI provider toggle + markdown rendering |
| [#29](https://github.com/laudtetteh/laudbot/pull/29) | JWT auth — admin login + visitor invite flow |
| [#34](https://github.com/laudtetteh/laudbot/pull/34) | DO App Platform CI/CD pipeline |
| [#42](https://github.com/laudtetteh/laudbot/pull/42) | Three chat modes, per-invite JWT config, overlay editor |
| [#44](https://github.com/laudtetteh/laudbot/pull/44) | Resend transactional email for invite delivery |
| [#49](https://github.com/laudtetteh/laudbot/pull/49) | v1 UI — animations, responsive layout, styled chat bubbles |
| [#56](https://github.com/laudtetteh/laudbot/pull/56) | PostgreSQL persistence — chat history, invite storage, Alembic |
| [#65](https://github.com/laudtetteh/laudbot/pull/65) | System prompt editor in admin panel |
| [#67](https://github.com/laudtetteh/laudbot/pull/67) | Expandable/collapsible long answers (TL;DR toggle) |
| [#71](https://github.com/laudtetteh/laudbot/pull/71) | Dark mode with anti-flash script |
| [#76](https://github.com/laudtetteh/laudbot/pull/76) | Mode slug rename: recruiter → professional, coworker → peer |
| [#79](https://github.com/laudtetteh/laudbot/pull/79) | Admin invite history with resend and revoke |
| [#87](https://github.com/laudtetteh/laudbot/pull/87) | Invite email redesign (navy brand palette) |
| [#89](https://github.com/laudtetteh/laudbot/pull/89) | Conversation IDs — fix New Chat bug, add history sidebar |
| [#91](https://github.com/laudtetteh/laudbot/pull/91) | Content env vars — full local/prod parity for all content types |

---

## Roadmap

| Item | Status |
|------|--------|
| Full-stack scaffold (FastAPI + Next.js + Docker + CI/CD) | ✅ Done |
| JWT auth with role separation | ✅ Done |
| Invite system with email delivery | ✅ Done |
| Multi-mode chat (Professional, Peer, Buddy) | ✅ Done |
| Provider-agnostic LLM layer (Claude + OpenAI, runtime-switchable) | ✅ Done |
| Admin panel (prompt editor, mode config, LLM selector, invite management) | ✅ Done |
| PostgreSQL persistence (chat history, invites, mode config) | ✅ Done |
| Conversation history sidebar | ✅ Done |
| Dark mode | ✅ Done |
| Content env vars (local/prod parity) | ✅ Done |
| Rate limiting | 🔜 v1.1 |
| RAG / source ingestion pipeline (pgvector ready) | 🔜 Planned |

---

## Data and privacy

LaudBot answers exclusively from approved sources. See [SOURCES.md](./SOURCES.md) for the full data policy.

---

## Docs

- [PRD](./docs/PRD.md) — product requirements and decisions log
- [Architecture](./docs/ARCHITECTURE.md) — system design, component map, design decisions
- [Brand](./docs/BRAND.md) — colour palette, typography, voice
- [Deployment](./docs/DEPLOYMENT.md) — DO App Platform setup and CI/CD
