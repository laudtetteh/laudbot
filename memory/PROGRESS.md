# Progress log

> Updated at the end of every work session. Most recent entry at the top.
> Format: ## [YYYY-MM-DD] — [one-line summary]

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