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
# Backend
cd backend
# TBD — update once FastAPI is scaffolded

# Frontend
cd frontend
# TBD — update once Next.js is scaffolded
```

## How to run tests
```bash
# TBD — update once test framework is decided
```

## Context files to load at session start
When starting a new session on this project, always read:
1. `memory/PROGRESS.md` — what's been done
2. `memory/ERRORS.md` — known pitfalls
3. `tasks/active/` — current active task(s)

## Imported rules
@rules/coding-standards.md
@rules/git-conventions.md
@rules/security.md