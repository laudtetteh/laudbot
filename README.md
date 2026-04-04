# LaudBot

> A privacy-aware, recruiter-facing AI agent built on curated knowledge — designed to represent me accurately and professionally while demonstrating full-stack and AI system design.

**Status: Work in progress.** This repo is being built in deliberate stages. See the [build plan](#build-plan) below.

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
| Frontend | Next.js (App Router), TypeScript, Tailwind CSS |
| Backend | FastAPI (Python) |
| Database | PostgreSQL + pgvector (v2+) |
| AI | Claude (Anthropic) — abstracted behind a service layer |
| Infra | Docker + Docker Compose |

---

## Build Plan

The project is being built in stages. Each stage is a separate PR.

- [x] PR 1 — `chore: repo init and project structure`
- [ ] PR 2 — `feat(backend): FastAPI scaffold with health endpoint`
- [ ] PR 3 — `feat(backend): stubbed auth endpoints and Pydantic models`
- [ ] PR 4 — `feat(backend): abstract LLM service layer with Claude stub`
- [ ] PR 5 — `feat(frontend): Next.js scaffold with config`
- [ ] PR 6 — `feat(frontend): placeholder pages and nav`
- [ ] PR 7 — `docs: update README with setup and run instructions`

---

## Project Structure (planned)

```
laudbot/
├── backend/          # FastAPI app
├── frontend/         # Next.js app
├── data/
│   └── approved/     # Gitignored — holds approved source files
├── docker-compose.yml
├── SOURCES.md        # Approved source policy
└── README.md
```

---

## Running Locally

Setup and run instructions will be added in PR 7 once the full stack is wired together via Docker Compose.

---

## Data and Privacy

LaudBot operates on explicitly approved sources only. See [SOURCES.md](./SOURCES.md) for the full data policy.
