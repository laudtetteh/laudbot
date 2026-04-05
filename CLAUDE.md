# LaudBot — project brain

## What this project is
LaudBot is a portfolio project built to showcase agentic coding skills and
proficiency working with Anthropic's Claude API. It demonstrates a full-stack
AI-powered application with a clean separation between backend intelligence and
frontend experience. The repo history itself is a deliberate portfolio artifact —
the commit and PR sequence tells a coherent build story for recruiters and
engineers reviewing the work.

## Stack
- **Runtime**: Python 3.12 (backend) · Node 20 (frontend)
- **Framework**: FastAPI (backend, port 8000) · Next.js (frontend, port 3001)
- **LLM**: Anthropic Claude API — primary AI provider, wrapped in a
  model-agnostic abstraction layer to allow future provider swaps
- **Database**: PostgreSQL + pgvector — not yet scaffolded (v2+)
- **Auth**: Invitation-based — stubbed in v1, real implementation deferred
- **Infra**: Docker + Docker Compose (local dev); production infra TBD
- **Testing**: TBD — decided before first test suite is written

## Repo structure
laudbot/
├── .claude/          # Claude Code config (commands, hooks, worktrees)
├── .github/          # Issue templates, PR template
├── .husky/           # Git hooks (commit-msg, pre-commit, post-commit)
├── backend/          # FastAPI application (being scaffolded)
├── frontend/         # Next.js application (being scaffolded)
├── data/
│   └── approved/
│       ├── exports/
│       ├── resume/
│       └── writeups/
├── docs/             # PRD, architecture, decisions
├── memory/           # PROGRESS, ERRORS, CONTEXT_SNAPSHOT
├── processes/        # Agent workflows
├── prompts/          # Prompt history and templates
├── rules/            # Coding standards, git conventions, security
├── tasks/            # active/, backlog/, done/
├── CLAUDE.md         # This file
├── README.md
└── SOURCES.md

## Key conventions
- Backend lives in `backend/` — FastAPI, Python 3.12
- Frontend lives in `frontend/` — Next.js, port 3001
- LLM calls go through the abstraction layer — never call Anthropic SDK directly
  from routes or components
- All config and secrets via environment variables — never hardcoded
- Conventional commits enforced via Husky — see `rules/git-conventions.md`
- PR history is a portfolio artifact — commit messages and PR descriptions matter

## Off-limits — never touch without explicit instruction
- `.husky/` — git hooks are stable, do not modify
- `.claude/worktrees/` — Claude Code internal, never edit
- `.github/` — issue and PR templates already configured
- `data/approved/` — approved data files, read-only unless explicitly told otherwise

## Active MCP tools
- None project-configured yet. Personal MCPs (gmail, gcal) are global and unrelated to this project.

## How to run locally
```bash
# Full stack (preferred)
docker compose up

# Backend only — http://localhost:8000
cd backend && pip install -r requirements.txt && uvicorn app.main:app --reload

# Frontend only — http://localhost:3001
cd frontend && npm install && npm run dev
```

Note: Docker build requires `/usr/local/bin` in PATH for credential helper.
Use full path `/usr/local/bin/docker` if `docker` is not found in shell.

## How to run tests
```bash
# TBD — test framework not yet decided
```

## Context files to load at session start
When starting a new session on this project, always read in this order:
1. `memory/CONTEXT_SNAPSHOT.md` — rolling state written at end of every session
2. `memory/PROGRESS.md` — full history of what's been done
3. `memory/ERRORS.md` — known pitfalls and footguns
4. `tasks/active/` — current active task(s)

`CONTEXT_SNAPSHOT.md` is the fastest way to orient. If it doesn't exist, fall back to PROGRESS.md.

## Imported rules
@rules/coding-standards.md
@rules/git-conventions.md
@rules/security.md