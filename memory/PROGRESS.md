# Progress log

> Updated at the end of every work session. Most recent entry at the top.
> Format: ## [YYYY-MM-DD] — [one-line summary]

---

## 2026-04-04 — v2-PR1: real LLM SDKs and provider factory

- `LLMConfig` dataclass added to `base.py` — bundles provider + optional model
- `DEFAULT_MODELS` dict centralises default model IDs (`claude-opus-4-6`, `gpt-4o`)
- `ClaudeService` rewired to Anthropic SDK; lazy client init (no key needed at boot)
- `OpenAIService` added — real OpenAI Chat Completions; same lazy init pattern
- `provider_factory(LLMConfig) -> LLMService` in `factory.py`; raises `ValueError` for unknown provider
- `anthropic==0.40.0`, `openai==1.55.3` pinned in requirements.txt
- Verified in-container: 5 assertions clean, full stack boots without API keys
- PR #18 open, pending merge — branch: `feat/llm-multi-provider`

---

## 2026-04-04 — PR 7: docs, README, scaffold-complete reframe

- README fully rewritten — full Docker setup and run instructions, scaffold-complete status, v2 roadmap table
- `docs/PRD.md` — "v1" language replaced with "scaffold", multi-provider decision logged, two new open questions added
- `docs/ARCHITECTURE.md` — component map updated with `OpenAIService`, provider factory documented, OpenAI API added to external deps, known tech debt updated
- All 7 scaffold PRs marked done in the build plan checklist
- PR #16 open, pending merge — branch: `docs/readme`
- **Scaffold complete. Next: tag `v0.1.0-scaffold` on main, then begin v2 planning**

---

## 2026-04-04 — PR 6: placeholder pages and nav

- `Nav.tsx` — shared nav rendered on all pages via layout.tsx
- `app/page.tsx` — landing with description and CTA to /chat
- `app/chat/page.tsx` — placeholder chat UI (non-functional input)
- `app/admin/page.tsx` — admin placeholder with planned feature cards
- All three pages verified 200 via docker compose
- PR #14 open, pending merge — branch: `feat/frontend-pages`

---

## 2026-04-04 — PR 5: Next.js frontend scaffold

- Next.js 15, React 19, TypeScript, Tailwind CSS, PostCSS configured
- Shell `layout.tsx` with metadata — no pages yet
- `frontend/Dockerfile` running `next dev` on port 3001
- `docker-compose.yml` updated — both backend (8000) and frontend (3001) services
- Verified both services start cleanly together
- PR #12 open, pending merge — branch: `feat/frontend-scaffold`

---

## 2026-04-04 — PR 4: abstract LLM service layer with Claude stub

- `LLMService` abstract base class in `backend/app/services/llm/base.py`
- `Message` dataclass with `role` and `content` fields
- `ClaudeService` stub in `backend/app/services/llm/claude.py` — returns placeholder, no SDK
- Verified in-container: abstract class, subclass relationship, stub output all correct
- PR #10 open, pending merge — branch: `feat/llm-service-layer`

---

## 2026-04-04 — PR 3: stubbed auth endpoints and Pydantic models

- `POST /api/admin/invitations` — spec-compliant stub, returns `not_implemented`
- `POST /api/auth/accept-invite` — spec-compliant stub, returns `not_implemented`
- All request/response shapes typed as Pydantic models in `backend/app/models/invitations.py`
- Added `email-validator` dep for `EmailStr` validation
- Verified all endpoints live before committing
- PR #8 open, pending merge — branch: `feat/backend-auth-stub`

---

## 2026-04-04 — PR 2: FastAPI backend scaffold

- `GET /health` endpoint returning `{"status": "ok", "service": "api"}`
- `backend/requirements.txt` with pinned deps (fastapi 0.115.12, uvicorn 0.34.0, pydantic 2.11.3)
- `backend/Dockerfile` using Python 3.12-slim
- `docker-compose.yml` with backend service on port 8000
- Verified working locally with docker compose before committing
- PR #6 open, pending merge — branch: `feat/backend-scaffold`

---

## 2026-04-03 — agentic coding system installed

- Installed project-level agentic coding system: CLAUDE.md, docs/, rules/, tasks/,
  memory/, prompts/, processes/, .claude/commands/, .claude/hooks/
- Global layer also set up: ~/.claude/CLAUDE.md merged with existing config,
  skills/ populated (refactor, write-tests, code-review, debug, explain)
- Stack confirmed: FastAPI (backend, port 8000), Next.js (frontend, port 3001),
  Anthropic Claude API as primary LLM with model-agnostic abstraction layer
- No application code written yet

## 2026-04-03 — repo scaffolded

- Repo initialised at github.com/laudtetteh/laudbot
- Branches landed to main:
  - chore/repo-init — Husky git hooks, .github issue/PR templates, scripts/
- feat/backend-scaffold branch open — backend/ and frontend/ dirs created, empty
- Worktree loving-pare active — current Claude Code session is running inside it
- No application code written yet