# LaudBot

> A privacy-aware, invite-only AI agent built to represent me to recruiters — demonstrating full-stack and AI system design skills through the product itself and the commit history that built it.

**Status: v1.0.0 — live in production with full DB persistence, chat history, and rate limiting.**
Live at [laudbot.laudtetteh.io](https://laudbot.laudtetteh.io)

---

## What is LaudBot?

LaudBot is a private web application that gives approved visitors (recruiters, co-workers, friends) a conversational interface to ask questions about my background, projects, skills, and career direction.

It is not a generic chatbot. It is a curated, privacy-aware professional agent that:

- Answers questions using **approved sources only** — no hallucination, no guessing
- Adapts its **tone and focus** to who is asking, via per-invite conversation modes
- Protects sensitive or private information by design
- Is administered entirely through an **in-app admin panel** — no redeployment needed for content or config changes

---

## Features

### For visitors (invite-only)
- Accept an invite link → receive a JWT-scoped to your allowed modes
- Chat with LaudBot in your assigned mode: **Professional**, **Peer**, or **Buddy**
- Switch between modes mid-session (if the admin enabled it for your invite)
- Clickable suggested prompts in the empty state to get you started
- Animated typing indicator while responses load
- Distinct styled bubbles for user vs assistant messages
- **Persistent chat history** — conversations survive page refresh and return visits
- **Conversation sidebar** — browse past conversations, start a new chat at any time
- Collapsible long assistant responses (read more / show less)
- Dark and light theme toggle, persisted across sessions
- Exit / log out at any time

### For the admin (me)
- Generate invite links from the admin panel — per-invite mode config: allowed modes, default mode, can-switch toggle
- Invite emails sent automatically via Resend (transactional) with a custom navy-palette template
- **Invite history** — view all issued invites, resend or revoke from the panel
- Toggle conversation modes on/off globally
- Edit the system prompt overlay for each mode live (no redeploy)
- Edit the base system prompt live from the admin panel (no redeploy)
- Configure suggested prompts per mode (backed by env vars, editable live)
- Switch the active LLM provider between Claude and OpenAI at runtime
- Select the specific model within each provider

### UI
- Responsive layout — mobile-first, full-height chat on all screen sizes
- Compact mobile header with collapsible sidebar and distinct panel-toggle icon
- Glassmorphism nav with active link highlight and mobile hamburger menu
- Staggered entrance animations on the landing page
- Custom Tailwind keyframes (`fadeIn`, `fadeInUp`, `slideDown`, `scaleIn`, `typingDot`)
- Dark/light theme with strong contrast calibration across both modes

### Infrastructure
- Full CI/CD: push to `main` → build production images → push to GHCR → deploy to DigitalOcean App Platform
- Provider-agnostic LLM service layer — new providers subclass one interface
- JWT role separation: admin tokens rejected on visitor routes and vice versa
- **Rate limiting** — per-visitor sliding-window limit via FastAPI Depends (configurable via env var)
- **Configurable JWT expiry** — visitor token lifetime set via `VISITOR_JWT_EXPIRE_HOURS` env var
- gitleaks pre-commit hook — blocks secrets from entering version control

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI (Python 3.12) |
| AI | Anthropic Claude + OpenAI — abstracted behind a provider-agnostic service layer |
| Email | Resend (transactional invite delivery) |
| Auth | JWT (HS256) — admin credentials via env vars, visitor access via invite tokens |
| Database | PostgreSQL + pgvector (asyncpg + SQLAlchemy async, Alembic migrations) |
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
| `JWT_SECRET_KEY` | Yes | Any random string — used to sign/verify JWTs |
| `ADMIN_USERNAME` | Yes | Admin panel login |
| `ADMIN_PASSWORD` | Yes | Admin panel login |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `RESEND_API_KEY` | For invite emails | [resend.com](https://resend.com) — app runs without it |
| `RESEND_FROM_EMAIL` | With Resend | e.g. `invites@yourdomain.com` |
| `FRONTEND_URL` | For invite links | e.g. `http://localhost:3001` |
| `VISITOR_JWT_EXPIRE_HOURS` | No | Visitor token lifetime (default: `168` — 7 days) |
| `RATE_LIMIT_CHAT` | No | Chat rate limit (default: `20/minute`) |

### 3. Start

```bash
docker-compose up
```

Docker builds both images on first run (~60s). The backend runs Alembic migrations automatically on startup. Subsequent starts are fast.

### 4. Verify

| Service | URL | Expected |
|---------|-----|----------|
| Frontend | http://localhost:3001 | Landing page |
| Backend health | http://localhost:8000/health | `{"status":"ok","service":"api"}` |
| API docs | http://localhost:8000/docs | FastAPI Swagger UI |
| Admin panel | http://localhost:3001/admin | Login page |

### 5. System prompt (optional)

Copy the example overlay files and customise them:

```bash
cp data/approved/system_prompt.md.example data/approved/system_prompt.md
cp data/approved/overlays/professional.md.example data/approved/overlays/professional.md
cp data/approved/overlays/peer.md.example data/approved/overlays/peer.md
cp data/approved/overlays/buddy.md.example data/approved/overlays/buddy.md
```

These files are gitignored — they contain personal content. The app runs without them using a minimal inline stub.

### 6. Stop

```bash
docker-compose down
```

---

## Project structure

```
laudbot/
├── backend/
│   ├── app/
│   │   ├── api/              # Route handlers
│   │   │   ├── auth.py       # Admin login + invite accept
│   │   │   ├── chat.py       # POST /api/chat + history + conversations
│   │   │   ├── admin_config.py  # LLM provider/model config
│   │   │   └── admin_modes.py   # Mode toggles, overlays, suggested prompts
│   │   ├── core/             # JWT security, rate limiter, FastAPI dependencies
│   │   ├── db/               # SQLAlchemy models, Alembic migrations, session
│   │   ├── models/           # Pydantic request/response models
│   │   └── services/
│   │       ├── llm/          # Provider-agnostic LLM service layer
│   │       │   ├── base.py   # LLMService ABC, MODES, DEFAULT_MODELS
│   │       │   ├── claude.py # ClaudeService (Anthropic SDK)
│   │       │   └── openai.py # OpenAIService (OpenAI SDK)
│   │       ├── prompt.py     # Base prompt + mode overlay composition
│   │       └── email.py      # Resend invite email
│   ├── Dockerfile
│   ├── Dockerfile.prod
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx          # Landing page
│   │   ├── chat/page.tsx     # Chat UI with history sidebar (JWT-gated)
│   │   ├── admin/page.tsx    # Admin controls (JWT-gated)
│   │   ├── invite/page.tsx   # Token → JWT exchange + session init
│   │   └── invite-required/  # No-token landing page
│   ├── Dockerfile
│   └── Dockerfile.prod
├── data/
│   └── approved/             # Gitignored — personal content
│       ├── system_prompt.md  # Base system prompt
│       └── overlays/         # Per-mode prompt overlays
├── docs/
│   ├── PRD.md
│   ├── ARCHITECTURE.md
│   └── DEPLOYMENT.md
├── .github/                  # Issue templates, PR template
├── .husky/                   # Commit-msg + pre-commit hooks (incl. gitleaks)
├── processes/                # Agentic coding workflows
├── rules/                    # Coding standards, git conventions, security
├── tasks/                    # active/, backlog/, done/
├── memory/                   # PROGRESS.md, ERRORS.md, CONTEXT_SNAPSHOT.md
├── docker-compose.yml
├── .env.example
├── SOURCES.md                # Approved source policy
└── README.md
```

---

## Build history

The PR sequence is a deliberate portfolio artifact — each PR tells a coherent story.

| PR | Branch | Feature |
|----|--------|---------|
| #2 | `chore/repo-init` | Repo init, git hooks, project structure |
| #4 | `devops/agentic-coding-setup` | Agentic coding system (tasks, processes, memory) |
| #6 | `feat/backend-scaffold` | FastAPI scaffold + health endpoint |
| #8 | `feat/backend-auth-stub` | Stubbed auth endpoints + Pydantic models |
| #10 | `feat/llm-service-layer` | Abstract LLM service layer with Claude stub |
| #12 | `feat/frontend-scaffold` | Next.js scaffold with config |
| #14 | `feat/frontend-pages` | Placeholder pages + nav |
| #16 | `docs/readme` | Full README + scaffold-complete reframe |
| #18 | `feat/llm-multi-provider` | Real LLM SDKs + provider factory (Claude + OpenAI) |
| #22 | `feat/chat-endpoint` | `POST /api/chat` — live LLM calls |
| #24 | `feat/frontend-chat` | Frontend chat wired via Next.js proxy rewrite |
| #26 | `feat/system-prompt` | System prompt from `data/approved/` (3-level fallback) |
| #28 | `feat/admin-llm-toggle` | Admin UI provider toggle + markdown rendering |
| #29 | `feat/auth` | JWT auth — admin login + visitor invite flow |
| #32 | `feat/admin-invite-ui` | Admin invite UI + agentic system improvements |
| #34 | `feat/do-deploy` | DO App Platform CI/CD pipeline |
| #36 | `fix/invite-suspense` | useSearchParams Suspense boundary fix |
| #38 | `fix/frontend-public-dir` | frontend/public .gitkeep for CI COPY |
| #40 | `chore/post-deploy-housekeeping` | Post-deploy housekeeping |
| #42 | `feat/invite-modes` | Invite modes: 3 personas, per-invite JWT config, mode controls, overlay editor |
| #44 | `feat/email-invites` | Resend transactional email for invite delivery |
| #46 | `feat/chat-ux-improvements` | Exit button, suggested prompts, mode labels + descriptions |
| #47 | `chore/post-merge-docs-v3` | Post-merge housekeeping and doc updates for v3 |
| #49 | `feat/ui-polish-v4` | v4 UI polish — animations, responsive layout, styled chat, admin improvements |
| #51 | `fix/chat-header-mobile-layout` | Fix mode pill and CTA alignment on mobile viewports |
| #52 | `chore/post-merge-docs-v4` | Post-merge housekeeping for v4 UI |
| #54 | `chore/nextjs-cve-patch` | Upgrade Next.js to 15.5.14 (CVE patch) |
| #56 | `feat/postgres-persistence` | PostgreSQL + pgvector — full persistence migration |
| #58 | `fix/secret-scanning` | gitleaks pre-commit hook + authoritative `.env.example` |
| #60 | `feat/chat-history-frontend` | Display persisted chat history on page load |
| #61 | `fix/alembic-ssl` | Strip `sslmode=require` from DATABASE_URL in Alembic env |
| #62 | `fix/history-not-loading` | Surface history fetch errors + fix empty-mode filter |
| #63 | `feat/backend-db-diagnostics` | Chat persist logging + admin db-status endpoint |
| #64 | `fix/ssl-cert-verification` | SSLContext for DO managed Postgres cert verification |
| #65 | `feat/admin-system-prompt` | Live system prompt editor in admin panel |
| #66 | `feat/ui-quick-wins` | Pill order, mobile layout, new chat button |
| #67 | `feat/expandable-answers` | Collapse long assistant messages with read more / show less |
| #71 | `feat/theme-switching` | Dark/light theme toggle with localStorage persistence |
| #75 | `refactor/visitor-naming` | Rename recruiter → visitor throughout |
| #76 | `refactor/mode-naming` | Rename mode slugs (recruiter → professional, coworker → peer) |
| #79 | `feat/admin-invite-history` | Admin invite history with resend and revoke |
| #81 | `fix/204-response-model` | Add `response_model=None` to 204 endpoints |
| #83 | `fix/migration-004-table-name` | Correct table name in migration 004 |
| #85 | `chore/buddy-overlay-cleanup` | Overlay `.example` files for all three modes |
| #87 | `feat/email-template-navy` | Redesign invite email template with navy brand palette |
| #89 | `fix/new-chat-conversation-id` | `conversation_id` — fix New Chat bug, add history sidebar |
| #91 | `feat/content-env-vars` | Env var backing for mode overlays and suggested prompts |
| #93 | `fix/chat-mobile-header-sidebar` | Compact mobile header, sidebar close + panel-toggle icon |
| #96 | `feat/visitor-jwt-and-rate-limiting` | Configurable visitor JWT expiry + per-visitor rate limiting |

---

## Roadmap

| Milestone | Scope | Status |
|-----------|-------|--------|
| v1 | PostgreSQL + pgvector — persistent chat history and invite storage | ✅ Done |
| v1 | Chat history sidebar — browse past conversations | ✅ Done |
| v1 | Live system prompt editor in admin panel | ✅ Done |
| v1 | Dark/light theme toggle | ✅ Done |
| v1 | Admin invite history — resend and revoke | ✅ Done |
| v1 | Rate limiting — per-visitor sliding window | ✅ Done |
| v1 | Configurable JWT expiry via env var | ✅ Done |
| v2 | Source ingestion pipeline — index approved files into vector store | 🔜 Planned |
| v2 | Retrieval-augmented generation — semantic search over approved content | 🔜 Planned |

---

## Data and privacy

LaudBot answers exclusively from approved sources. See [SOURCES.md](./SOURCES.md) for the full data policy.

---

## Docs

- [PRD](./docs/PRD.md) — product requirements and decisions log
- [Architecture](./docs/ARCHITECTURE.md) — system design, component map, design decisions
- [Deployment](./docs/DEPLOYMENT.md) — DO App Platform setup and CI/CD
