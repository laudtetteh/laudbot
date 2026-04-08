# Context snapshot — 2026-04-08

> Rolling state file. Overwrite at the end of every session. Never delete.

---

## Where we are

LaudBot is live and fully up to date. v1.1.0 just shipped. All UI polish, font/contrast improvements, mobile header fixes, rate limiting, and configurable visitor JWT expiry are in production.

**Live:** https://laudbot.laudtetteh.io ✅

---

## Merged PRs (all)

#2 repo-init · #4 agentic-system · #6 backend-scaffold · #8 auth-stub · #10 llm-service · #12 frontend-scaffold · #14 pages+nav · #16 docs · #18 real-llm-sdks · #22 chat-endpoint · #24 frontend-chat · #26 system-prompt · #28 admin-llm-toggle · #29 jwt-auth · #32 admin-invite-ui · #34 do-deploy · #36 invite-suspense · #38 public-gitkeep · #40 housekeeping · #42 invite-modes · #44 email-invites · #46 chat-ux · #47 housekeeping · #49 ui-polish-v4 · #51 mobile-header-fix · #52 housekeeping · #53 issue-filed · #54 nextjs-cve · #56 postgres-persistence · #58 secret-scanning · #60 chat-history-frontend · #61 alembic-ssl · #62 history-error-surfacing · #63 db-diagnostics · #64 ssl-cert-fix · #67 expandable-answers · #66 chat-ui-quickwins · #65 system-prompt-editor · #71 dark-mode-palette · #75 visitor-rename · #76 mode-slug-rename · #79 admin-invite-history · #81 fix-204-response-model · #83 fix-migration-004-table-name · #85 buddy-overlay-cleanup · #87 email-template-navy · #89 conversation-id-sidebar · #91 content-env-vars · #93 mobile-header-sidebar · #96 visitor-jwt-rate-limiting

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

None.

---

## Backlog (priority order)

### P1 — Infrastructure
1. Rate limiting already shipped (v1.1). Next: monitor in production.

### P2 — Content / Knowledge
2. Expand knowledge base: deeper project writeups, personal trivia, LaudBot build story detail
3. System prompt tuning — repetitive answers in long chats

### P3 — Infrastructure
4. RAG / source ingestion pipeline (pgvector ready)

### P4 — UI/UX
5. Third theme option (dark/light/system or colour accent)

---

## Content architecture (post-PR #91)

Resolution order for all three content types:

| Content | 1st | 2nd | 3rd |
|---|---|---|---|
| System prompt | `SYSTEM_PROMPT` env var | `data/approved/system_prompt.md` (volume mount) | inline stub |
| Overlays | `OVERLAY_{MODE}` env var | `data/approved/overlays/{mode}.md` (volume mount) | empty string |
| Suggested prompts | `SUGGESTED_PROMPTS_{MODE}` env var | `data/approved/prompts/{mode}.txt` (volume mount) | empty list |

`ON CONFLICT DO NOTHING` — admin UI edits persist across restarts.

DO env vars set: `SYSTEM_PROMPT`, `OVERLAY_PROFESSIONAL`, `OVERLAY_PEER`, `OVERLAY_BUDDY`, `SUGGESTED_PROMPTS_PROFESSIONAL`, `SUGGESTED_PROMPTS_PEER`, `SUGGESTED_PROMPTS_BUDDY`

---

## DO App Platform

- `laudbot.laudtetteh.io` → frontend (Next.js) → proxies `/api/*` → `http://backend`
- Secrets: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET_KEY`, `JWT_EXPIRE_HOURS`, `VISITOR_JWT_EXPIRE_HOURS`, `RATE_LIMIT_CHAT`, `SYSTEM_PROMPT`, `OVERLAY_PROFESSIONAL`, `OVERLAY_PEER`, `OVERLAY_BUDDY`, `SUGGESTED_PROMPTS_PROFESSIONAL`, `SUGGESTED_PROMPTS_PEER`, `SUGGESTED_PROMPTS_BUDDY`, `FRONTEND_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `DATABASE_URL`
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
- `conversation_id` generated client-side (crypto.randomUUID()); new UUID on page load, New Chat, and mode switch
- Rate limiter keyed by `visitor_id` from JWT, not IP — correct for corporate NAT

---

## Agentic system status

- `.claude/settings.json` created — hooks wired
- `post-tool.sh` auto-stubs PROGRESS.md after git commits
- PR/issue workflow: create issue → branch → PR that closes it; use project templates + labels
- Tasks: `active/` empty; `done/` has 17+ completed tasks

---

## Known footguns

- asyncpg SSL: use `ssl.SSLContext` not `ssl=True` for DO managed Postgres
- `useSearchParams()` needs `<Suspense>` in standalone Next.js
- `gh` CLI: use `/usr/local/Cellar/gh/2.69.0/bin/gh` explicitly (not in PATH)
- **Worktree**: all edits target `/Users/beaconavenue/code/laudbot/` — never the worktree path
- PR body with backticks: write to `/tmp/file.md`, pass via `--body-file`
- `gh pr edit` fails with GraphQL classic projects warning — use `gh api ... --method PATCH` instead
- Always create a GitHub issue before opening a PR; use project issue/PR templates + labels
- FastAPI `status_code=204` routes MUST also have `response_model=None` — omitting crashes backend at import
- Partial failed migrations on local leave DB in inconsistent state — `docker compose down -v && up` to reset
- `migrations/` is COPYed into Docker image (not bind-mounted) — always `docker compose build backend` after adding a migration
- `feat/content-env-vars` was branched before PR #89 merged — remember to merge main into long-lived branches early
- `git commit -m "$(cat <<'EOF' ... EOF)"` heredoc fails in bash — write message to `/tmp/file.txt`, use `git commit -F`
