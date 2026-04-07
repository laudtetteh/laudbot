# Context snapshot — 2026-04-06

> Rolling state file. Overwrite at the end of every session. Never delete.

---

## Where we are

LaudBot is fully live and working end-to-end in production. Chat persistence confirmed working — messages survive page reloads, keyed per visitor_id. SSL connection to DO managed Postgres resolved. Agentic system hooks wired via `.claude/settings.json`.

**Live:** https://laudbot.laudtetteh.io ✅

---

## Merged PRs (all)

#2 repo-init · #4 agentic-system · #6 backend-scaffold · #8 auth-stub · #10 llm-service · #12 frontend-scaffold · #14 pages+nav · #16 docs · #18 real-llm-sdks · #22 chat-endpoint · #24 frontend-chat · #26 system-prompt · #28 admin-llm-toggle · #29 jwt-auth · #32 admin-invite-ui · #34 do-deploy · #36 invite-suspense · #38 public-gitkeep · #40 housekeeping · #42 invite-modes · #44 email-invites · #46 chat-ux · #47 housekeeping · #49 ui-polish-v4 · #51 mobile-header-fix · #52 housekeeping · #53 issue-filed · #54 nextjs-cve · #56 postgres-persistence · #58 secret-scanning · #60 chat-history-frontend · #61 alembic-ssl · #62 history-error-surfacing · #63 db-diagnostics · #64 ssl-cert-fix · #67 expandable-answers · #66 chat-ui-quickwins · #65 system-prompt-editor · #71 dark-mode-palette · #75 visitor-rename · #76 mode-slug-rename

---

## Naming conventions (locked in)

| Concept | Value |
|---------|-------|
| JWT role | `visitor` |
| DB identity column | `visitor_id` |
| localStorage keys | `visitor_token`, `visitor_id`, `active_mode`, `allowed_modes`, `can_switch_modes` |
| Mode slugs | `professional`, `peer`, `buddy` |
| Mode labels (UI) | Professional, Peer, Buddy |

---

## Active tasks

None. All PRs merged. Next: `feat/admin-invite-history` — see backlog below.

---

## Backlog (priority order)

### P0 — Next up
1. **Admin invite history** — `GET /api/admin/invitations` endpoint + table in admin UI showing email, mode config, accepted_at, visitor_id status. Data already in DB.

### P1 — UI/UX
2. Email template redesign — current template too dark; needs light/bright layout
3. Third theme option (dark/light/system or a colour accent)

### P2 — Content / Knowledge
4. Expand knowledge base: Laud's projects in depth, job history timeline, personal trivia, LaudBot build story
5. System prompt tuning — repetitive answers in long chats

### P3 — Features
6. Chat history list — user-facing browse of past conversations
7. Rate limiting (required before public deploy)
8. RAG / source ingestion pipeline (pgvector ready)

---

## DO App Platform

- `laudbot.laudtetteh.io` → frontend (Next.js) → proxies `/api/*` → `http://backend`
- Secrets in DO dashboard: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET_KEY`, `SYSTEM_PROMPT`, `FRONTEND_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `DATABASE_URL`
- DB cluster `laudbot-db`: Postgres 16, SFO — `DATABASE_URL` set manually as secret
- SSL: `ssl.SSLContext(check_hostname=False, CERT_NONE)` — DO uses private CA
- Alembic migrations auto-run at container startup via `_run_migrations()` in `main.py` lifespan

---

## Key decisions

- No direct SDK imports in routes — service layer only
- No `NEXT_PUBLIC_` vars — server-side proxy rewrite
- JWT role separation: `admin` vs `visitor`
- `MODES` in `base.py` = single source of truth for slug validation
- `app.state.llm_config` intentionally in-memory (resets on restart by design)
- Session stored in `localStorage` (not `sessionStorage`) — cross-tab persistence

---

## Agentic system status

- `.claude/settings.json` created — hooks wired
- `post-tool.sh` auto-stubs PROGRESS.md after git commits
- PR/issue workflow: create issue → branch → PR that closes it; use project templates
- Tasks: `active/` empty, `done/` has 17 completed tasks

---

## Known footguns

- asyncpg SSL: use `ssl.SSLContext` not `ssl=True` for DO managed Postgres
- `useSearchParams()` needs `<Suspense>` in standalone Next.js
- `gh` CLI: use `/usr/local/bin/gh` explicitly
- **Worktree**: all edits target `/Users/beaconavenue/code/laudbot/` — never the worktree path
- PR body with backticks: write to `/tmp/file.md`, pass via `--body-file`
- `gh pr edit` fails with GraphQL classic projects warning — use `gh api ... --method PATCH` instead
- Always create a GitHub issue before opening a PR; use project issue/PR templates
