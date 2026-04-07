# Progress log

> Updated at the end of every work session. Most recent entry at the top.
> Format: ## [YYYY-MM-DD] — [one-line summary]

---

## 2026-04-06 — fix: visitor session persistence + chat ordering + UI polish (PRs #71, #73)

- feat(theme): dark/light toggle (sun/moon), anti-flash inline script, Tailwind `darkMode: "class"`,
  full dark pass on all pages (chat, admin, home, invite, invite-required) — PR #71 merged
- style(dark): softened dark mode palette — card surfaces zinc-900→zinc-800, borders zinc-800→zinc-700,
  secondary text one step lighter; typing dot + scrollbar tokens updated in globals.css — PR #71
- fix(session): `sessionStorage` → `localStorage` for visitor token + mode config; session now persists
  across tabs; Exit button is the only logout path (explicit key removal) — PR #73
- fix(chat): user + assistant messages were saved with identical `created_at`; assistant now offset +1ms
  so ORDER BY created_at is always deterministic — fixes scrambled history on refresh — PR #73
- style(chat): renamed "Read more ↓" toggle to "TL;DR ↓" — PR #73
- content: Buddy overlay rewritten — humor weights (50% self-dep / 20% absurdist / 20% wordplay / 10%
  deadpan), comedian anchors (Chappelle/Gervais/Jeffries/Normand), mild expletives allowed, fabricated
  takes allowed with flag, explicit "pick one thing and commit" anti-comprehensiveness rule
- content: system_prompt.md — added "lead with the point on long answers" conversation discipline rule
- PRs #66, #67 merged (from previous session entries below)

---

## 2026-04-06 — feat: UI quick wins + expandable answers (PRs #66, #67 open)

- feat(chat): rename "New conversation" → "+ New Chat", canonical pill order, mobile flex-col layout — PR #66, issue #68
- feat(chat): collapse long assistant messages (>600 chars) with CSS max-h clip, gradient fade, "Read more / Show less" toggle — PR #67, issue #69
- Fixed PR template compliance: both PRs updated with proper Summary/Changes/Closes/Test plan/Notes format, labels added (type: feat, area: frontend)
- Fixed "The Rig" naming in memory/PROGRESS.md (was "agentic coding system" in two historical entries)
- Confirmed system_prompt.md already uses "The Rig" correctly; .example files have no references to either name

---

## 2026-04-06 — feat: admin system prompt panel (PR #65 merged)

- New `system_config` DB table (Alembic migration 002) — key/value store with updated_at
- GET/POST `/api/admin/system-prompt` — source-labelled read + DB upsert
- `compose_system_prompt()` accepts `base_override: str | None` — DB value takes precedence
- `app.state.system_prompt` loaded from DB at startup, updated in-memory on admin save
- Admin UI: SystemPromptSection with monospace textarea, source badge, char count, last-saved timestamp
- Both SystemPromptSection and OverlayEditorSection collapsed by default — Edit/Lock toggle to prevent accidental changes

---

## 2026-04-06 — fix: SSL cert verification for DO managed Postgres (PR #64)

- `ssl=True` in asyncpg uses Python default SSL which verifies the server cert chain
- DO managed Postgres uses a private CA not in the system trust store → `SSLCertVerificationError`
- Fix: build `ssl.SSLContext` with `check_hostname=False` and `CERT_NONE` in both `base.py` and `migrations/env.py`
- Connection remains TLS-encrypted; only chain verification is skipped (standard pattern for managed cloud DBs)
- PR #64 merged — branch: fix/ssl-cert-verification

---

## 2026-04-06 — feat: chat persist logging + admin db-status endpoint (PR #63)

- `logger.info` after `db.commit()` in chat endpoint — confirms writes in DO Runtime Logs
- `GET /api/admin/db-status` returns row counts for all 3 tables + Alembic version (admin-protected)
- Diagnostic tool to confirm schema state and whether chat messages are landing
- PR #63 merged — branch: feat/backend-db-diagnostics

---

## 2026-04-06 — fix: surface history fetch errors + empty-mode filter (PR #62)

- Silent `.catch(() => {})` was masking all server errors on `GET /api/chat/history`
- Added `historyError` state + dismissible amber warning banner in message area
- Mode filter fallback: if `active_mode` is empty string, show all history instead of filtering to nothing
- Root cause of "no history on reload" was cross-browser testing (Chrome vs Firefox have separate sessionStorage)
- PR #62 merged — branch: fix/history-not-loading

---

## 2026-04-06 — feat: chat history displayed on page load (PR #60)

- `GET /api/chat/history` fetched on mount, pre-populates message thread keyed to recruiter JWT
- `allHistory` state stores full cross-mode history; `messages` filtered by `activeMode`
- Mode switch restores persisted history for the new mode instead of clearing to empty
- `historyLoading` gates empty state and suggested prompts during fetch
- PR #60 merged — branch: feat/chat-history-frontend

---

## 2026-04-06 — fix: strip sslmode from Alembic migrations env (PR #61)

- `migrations/env.py` built its own SQLAlchemy engine independently — was not inheriting the SSL fix from `base.py`
- `_get_url()` updated to return `(url, connect_args)` tuple; strips `sslmode=require` and passes `ssl=True`
- Alembic migrations now connect successfully to DO managed Postgres
- PR #61 merged — branch: fix/alembic-ssl

---

## 2026-04-06 — chore: gitleaks secret scanning + authoritative .env.example (PR #58)

- `.gitleaks.toml` created — extends default ruleset, allowlists placeholder patterns
- `.husky/pre-commit` rewritten to run `gitleaks protect --staged` with explicit binary path checks
- `.env.example` rewritten as authoritative reference with all credential-shaped values as `xxxx`
- `docker-compose.yml` cleaned — no inline credential defaults
- Full history squash to purge any prior commits with real-looking secrets
- PR #58 merged — branch: fix/secret-scanning

---

## 2026-04-06 — feat: PostgreSQL + pgvector persistence (PR #56, closes #55)

- Replaced all in-memory `app.state` stores with async SQLAlchemy + asyncpg + Alembic
- `backend/app/db/` — async engine, session factory, Base, ORM models (Invitation, ModeConfig, ChatMessage)
- `backend/migrations/` — Alembic async env + initial migration (3 tables + pgvector extension)
- lifespan handler runs `alembic upgrade head` + seeds mode_config via `ON CONFLICT DO NOTHING`
- Invite create/accept fully DB-backed; accept is idempotent (reuses existing recruiter_id)
- Mode config reads/writes to DB; both chat turns persisted; new `GET /api/chat/history` endpoint
- `docker-compose.yml` — pgvector/pgvector:pg16 service with healthcheck + depends_on: service_healthy
- `.do/app.yaml` — managed Postgres 16 cluster, region `sfo`, `DATABASE_URL: ${db.DATABASE_URL}`
- `docs/DEPLOYMENT.md` — managed Postgres setup steps, updated env table, updated limitations
- `.env.example` — DATABASE_URL documented with scheme notes
- Verified in-container: migrations clean, all 3 tables present, full invite + chat flow persists

---

## 2026-04-06 — chore: post-merge housekeeping + Next.js CVE patch (PRs #52, #53, #54)

- PR #52: post-merge docs after PR #51 (PROGRESS.md, CONTEXT_SNAPSHOT.md)
- PR #53: GitHub issue #55 filed for PostgreSQL persistence
- PR #54: Next.js patched from 15.3.0 → 15.3.2 (CVE fix, stable 15.x)

---

## 2026-04-05 — fix: chat header pill and CTA alignment on mobile (PR #51)

- Mode pills, "I am a…" label, and Exit CTA were wrapping to a right-aligned second line on narrow viewports
- Fixed by replacing `flex-wrap justify-between` header with `flex-col` on mobile / `sm:flex-row sm:justify-between` on desktop
- Controls row uses `flex-row items-center justify-between` on mobile — pills left, Exit right on one line
- 6-line CSS-only change, no logic touched — confirmed no regressions
- Issue #50, PR #51, merged same session

---

## 2026-04-05 — feat: v4 UI polish — animations, responsive layout, styled chat, admin improvements (PR #49)

- Custom Tailwind keyframes: `fadeIn`, `fadeInUp`, `slideDown`, `scaleIn`, `typingDot`
- `html`/`body` `h-full` + `flex-col` scaffold → chat page fills full viewport, no fixed height
- Glassmorphism nav: `backdrop-blur-md bg-zinc-950/80`, `usePathname` active link highlight, mobile hamburger with `animate-slide-down` dropdown
- Hero: radial glow gradient (indigo + violet), staggered `animate-fade-in-up` entrance, responsive `text-4xl sm:text-5xl lg:text-6xl`
- Chat: user bubbles `bg-zinc-100 text-zinc-900` / assistant `bg-zinc-800/80` with border, animated three-dot typing indicator, per-mode suggested prompts, message area + input dim/lock behind mode-switch dialog
- Admin: `SectionHeader` + `Card` shared primitives; allowed modes auto-check and lock when only one globally enabled; default mode auto-set and disabled when ≤1 mode; per-mode `PROMPT_PLACEHOLDERS`
- Invite + invite-required: centered card layout, CSS spinner, error icon
- Worktree footgun caught and fixed mid-PR — logged in ERRORS.md, NEW_TASK_WORKFLOW.md step 0, `~/.claude/CLAUDE.md` hard rule #11
- Issue #48, PR #49, merged

---

---

## 2026-04-04 — feat: chat UX improvements — exit, suggested prompts, mode descriptions (PR #46)

- Exit button in chat header: sessionStorage.clear() → redirect to /
- Suggested prompt chips in chat empty state (admin-configurable per mode)
- "I am a…" label above mode pill selector
- Mode description in switch confirmation dialog
- New GET /api/chat/prompts endpoint (filtered to recruiter allowed_modes)
- Admin overlay editor extended with per-mode prompts textarea

---

## 2026-04-04 — feat: invite modes with per-mode overlays, admin controls, chat UI (PR #42)

- 3 modes: recruiter, coworker, buddy
- JWT carries allowed_modes, default_mode, can_switch_modes
- Backend composes base prompt + mode overlay + mode lock on every /api/chat request
- Admin: invite form with mode config, global toggles, overlay editor
- Chat: mode badge, pill selector, switching starts new conversation
- Fix: modesConfig lifted to AdminControls so invite form reflects global toggles in real-time

---

## 2026-04-04 — fix: frontend/public missing in CI (PR #38)

- frontend/public/.gitkeep added — empty dir not tracked by git, causing Dockerfile.prod COPY to fail
- Logged in ERRORS.md

## 2026-04-04 — fix: useSearchParams Suspense on /invite page (PR #36)

- next build fails in standalone mode without Suspense boundary on useSearchParams
- Split InviteFlow into inner component, wrapped in Suspense in page export
- Logged in ERRORS.md

## 2026-04-04 — v3-PR2: DO App Platform deployment pipeline (PR #34)

- GitHub Actions: push to main → build prod images → push to GHCR → trigger DO deploy
- backend/Dockerfile.prod, frontend/Dockerfile.prod (multi-stage, standalone)
- .do/app.yaml app spec, next.config.ts output: standalone
- load_system_prompt() checks SYSTEM_PROMPT env var first (production path)
- docs/DEPLOYMENT.md created, ARCHITECTURE.md updated
- LaudBot live at laudbot-ij4cd.ondigitalocean.app + laudbot.laudtetteh.io (DNS pending)

---

## 2026-04-04 — agentic system: POST_MERGE_WORKFLOW + CONTEXT_SNAPSHOT fixes

- processes/POST_MERGE_WORKFLOW.md created — 7-step post-merge checklist
- NEW_TASK_WORKFLOW + SHIP_WORKFLOW updated to include snapshot reads/writes
- CLAUDE.md session-start reads corrected; stale TBD run instructions replaced
- PR #32 also carried these changes alongside the invite UI
- PR #32 merged — branch: feat/admin-invite-ui

---

## 2026-04-04 — v3-PR1: admin invite UI

- InviteSection component added to frontend/app/admin/page.tsx
- Email + optional note input → POST /api/admin/invitations with admin JWT
- Success: invite URL displayed with copy-to-clipboard button
- Error paths: expired session → logout, bad email → inline message, network error → inline message
- Verified in-container: 200 happy path, 401 bad token, 422 invalid email all clean
- PR open — branch: feat/admin-invite-ui

---

## 2026-04-04 — v2-PR6: JWT auth for admin and recruiter invite flow

- backend/app/core/security.py: create_token, decode_token, hash_password, verify_password (PyJWT + passlib/bcrypt)
- backend/app/core/dependencies.py: get_current_admin, get_current_recruiter FastAPI deps
- Admin login: POST /api/auth/admin/login → JWT (role: admin)
- Invite flow: POST /api/admin/invitations (admin-JWT-guarded) → invite URL; POST /api/auth/accept-invite → recruiter JWT with recruiter_id
- Role separation: admin JWT rejected on /api/chat (403); recruiter JWT rejected on /api/admin/* (403)
- Recruiter JWT carries recruiter_id for future chat history keying — no refactor needed when persistence lands
- Frontend: /admin shows login gate; /invite exchanges token param → recruiter JWT → redirect /chat; /chat requires Bearer token, redirects to /invite-required if missing
- All 8 test paths passed manually
- PR #29 open — branch: feat/auth

---

## 2026-04-04 — v2-PR5+: admin UI provider toggle + markdown rendering + model expansion

- GET /api/admin/llm-config + PUT /api/admin/llm-config wired to app.state.llm_config
- Admin page: provider pills, model dropdown, save with inline feedback
- AVAILABLE_MODELS expanded: 3 Claude models, 4 OpenAI models
- react-markdown + remark-gfm: assistant bubbles render bold, lists, code, links
- Root cause logged: docker anon volume shadowing node_modules on rebuild
- PR #28 merged — branch: feat/admin-llm-toggle

---

## 2026-04-04 — v2-PR5: admin UI provider toggle

- AVAILABLE_MODELS added to base.py — single source of truth for validation + frontend
- GET /api/admin/llm-config + PUT /api/admin/llm-config in admin_config.py
- Admin page rewritten: provider pills, model dropdown, save with feedback
- System prompt editor noted for future admin feature
- Verified: GET/PUT/400 clean, state persists within session
- PR #28 open, pending merge -- branch: feat/admin-llm-toggle

---

## 2026-04-04 — v2-PR4: system prompt from data/approved/

- prompt.py: load_system_prompt() reads /data/approved/system_prompt.md, falls back to stub
- chat.py: calls load_system_prompt() per request instead of inline constant
- docker-compose: ./data:/data mounted on backend service
- system_prompt.md.example committed as template; copy + fill in to activate LaudBot
- SOURCES.md + .env.example updated with convention and override docs
- Verified in-container: fallback and file-load both clean
- PR #26 open, pending merge -- branch: feat/system-prompt

---

## 2026-04-04 — v2-PR3: frontend chat UI wired to live backend

- next.config.ts: proxy rewrite /api/* -> backend (server-side, not baked into bundle)
- BACKEND_URL env var: http://backend:8000 in Docker, http://localhost:8000 for bare dev
- chat/page.tsx: full client component — messages, loading, error, provider badge
- Decision: Next.js proxy rewrite over NEXT_PUBLIC_API_URL for parity + DO compatibility
- Verified: POST localhost:3001/api/chat -> Next.js -> backend -> live LLM response
- docs/ARCHITECTURE.md + PRD.md updated with proxy rewrite and DO deployment decisions
- PR #24 open, pending merge -- branch: feat/frontend-chat

---

## 2026-04-04 — v2-PR2: POST /api/chat with live LLM call

- `POST /api/chat` routes messages through provider_factory -> LLMService.complete()
- Request accepts optional provider/model override; falls back to app.state.llm_config
- App state defaults to Claude + claude-opus-4-6 at startup (in-memory, resets on restart)
- Unknown provider -> 400; SDK errors -> 502 with descriptive message
- Placeholder system prompt inline; data/approved/ wiring is v2-PR4
- Verified in-container: 400 + 502 error paths, full stack boots
- PR #22 open, pending merge -- branch: feat/chat-endpoint

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

## 2026-04-03 — The Rig installed

- Installed project-level agentic coding system (The Rig): CLAUDE.md, docs/, rules/, tasks/,
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