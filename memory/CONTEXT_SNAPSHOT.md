# Context snapshot — 2026-04-06

> Rolling state file. Overwrite at the end of every session. Never delete.

---

## Where we are

LaudBot is fully live and working end-to-end in production. Chat persistence confirmed working — messages survive page reloads, keyed per recruiter_id. SSL connection to DO managed Postgres resolved (private CA cert issue). Agentic system hooks now wired via `.claude/settings.json`.

**Live:** https://laudbot.laudtetteh.io ✅

---

## Merged PRs (all)

#2 repo-init · #4 agentic-system · #6 backend-scaffold · #8 auth-stub · #10 llm-service · #12 frontend-scaffold · #14 pages+nav · #16 docs · #18 real-llm-sdks · #22 chat-endpoint · #24 frontend-chat · #26 system-prompt · #28 admin-llm-toggle · #29 jwt-auth · #32 admin-invite-ui · #34 do-deploy · #36 invite-suspense · #38 public-gitkeep · #40 housekeeping · #42 invite-modes · #44 email-invites · #46 chat-ux · #47 housekeeping · #49 ui-polish-v4 · #51 mobile-header-fix · #52 housekeeping · #53 issue-filed · #54 nextjs-cve · #56 postgres-persistence · #58 secret-scanning · #60 chat-history-frontend · #61 alembic-ssl · #62 history-error-surfacing · #63 db-diagnostics · #64 ssl-cert-fix

---

## Active tasks
None. All PRs merged.

---

## Backlog (priority order — 2026-04-06 feedback session)

### P0 — Content / Knowledge (do first — highest ROI on LaudBot quality)
1. Expand knowledge base: Laud's projects in depth (MethodistCRM, Tableau/Salesforce work, Beacon Essentials website, Blog CMS), job history timeline, personal trivia, LaudBot build story, agentic coding system explainer
2. Fix repetitive answers in long chats — system prompt directive to build on conversation, not repeat
3. Add hyperlinks when assistant mentions attributable web resources (MethodistCRM, Tableau, etc.)

### P1 — UI/UX
4. Theme switching — dark / light / one other; persist to localStorage
5. Email template redesign — too dark; needs light/bright layout
6. Short + expandable answers — TL;DR / "Read more" for long responses
7. Mobile pill wrap fix — last pill wraps when "New conversation" appears
8. Mode pills canonical ordering — always Recruiter → Co-worker → Buddy
9. Rename "New conversation" → "+ New Chat"

### P2 — Features
10. Chat history list — user can browse all past conversations
11. Rename "Co-worker" mode (too close to "Cowork" in Claude) — candidate: "Brainstorm"
12. Admin enhancements — invite list (sortable/filterable), chats dashboard

### P3 — Later
13. Rate limiting (required before public deploy)
14. RAG / source ingestion pipeline (pgvector ready)

---

## DO App Platform

- `laudbot.laudtetteh.io` → frontend (Next.js) → proxies `/api/*` → `http://backend`
- Secrets in DO dashboard: `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET_KEY`, `SYSTEM_PROMPT`, `FRONTEND_URL`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `DATABASE_URL`
- DB cluster `laudbot-db`: Postgres 16, SFO, $15.15/mo — `DATABASE_URL` set manually as secret
- SSL: `ssl.SSLContext(check_hostname=False, CERT_NONE)` — DO uses private CA

---

## Key decisions

- No direct SDK imports in routes — service layer only
- No `NEXT_PUBLIC_` vars — server-side proxy rewrite
- JWT role separation: admin vs recruiter
- `MODES` in `base.py` = single source of truth
- `app.state.llm_config` intentionally in-memory

## Agentic system status

- `.claude/settings.json` created — hooks now wired
- `post-tool.sh` auto-stubs PROGRESS.md after git commits
- Still requires manual "post-merge" or "housekeeping" trigger for full POST_MERGE_WORKFLOW
- Tasks: `active/` empty (no current work), `done/` has 17 completed tasks

## Known footguns

- asyncpg SSL: use `ssl.SSLContext` not `ssl=True` for DO managed Postgres
- `useSearchParams()` needs `<Suspense>` in standalone Next.js
- `gh` CLI: `/usr/local/bin/gh` explicitly
- **Worktree**: all edits target `/Users/beaconavenue/code/laudbot/` not the worktree path
- PR body backticks: write to `/tmp`, pass via `$(cat /tmp/file.md)`
