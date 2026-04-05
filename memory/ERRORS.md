# Errors and pitfalls log

> Every time Claude (or you) hits a non-obvious bug, wrong assumption, or footgun —
> log it here so it never happens twice.
> Format: ## [YYYY-MM-DD] [Short title]

---

## Template entry

**Symptom**: What was observed / what broke
**Root cause**: What was actually wrong
**Fix**: What change resolved it
**Watch for**: Related areas that could have the same issue

---

## 2026-04-04 — useSearchParams() breaks next build in standalone output mode

**Symptom**: `next build` fails with "useSearchParams() should be wrapped in a suspense boundary" on `/invite` page. Build exits with code 1.
**Root cause**: Enabling `output: "standalone"` in `next.config.ts` causes Next.js to attempt static prerendering of all pages. `useSearchParams()` is dynamic and requires a `<Suspense>` boundary to opt the page out of static generation.
**Fix**: Split the component using `useSearchParams()` into an inner component, wrap it with `<Suspense>` in the page export.
**Watch for**: Any future page that uses `useSearchParams()`, `usePathname()` with dynamic params, or other CSR-only hooks. Pattern: inner component uses the hook, outer page exports `<Suspense><Inner /></Suspense>`.

---

## 2026-04-04 — Next.js critical vulnerabilities in next@15.3.0

**Symptom**: `npm audit` reports 1 critical severity vulnerability (multiple CVEs) in next@15.3.0 — cache poisoning, SSRF via middleware, RCE in React flight protocol, and others.
**Root cause**: Pinned to Next.js 15.3.0; fixes available in 15.5.14+.
**Fix**: Run `npm install next@latest` in the frontend and rebuild. Deferred to avoid scope creep mid-PR — must be done before any public deployment.
**Watch for**: Run `npm audit` as part of the pre-deploy checklist. Add to SHIP_WORKFLOW.

---

## 2026-04-04 — system_prompt.md not gitignored — would have committed personal content

**Symptom**: `data/approved/system_prompt.md` appeared as an unstaged file in Git client after being created, meaning it could have been accidentally committed and pushed to GitHub with personal content.
**Root cause**: `.gitignore` only covered subdirectory contents (`resume/*`, `exports/*`, `writeups/*`) — files sitting directly in `data/approved/` were not ignored.
**Fix**: Added explicit `data/approved/system_prompt.md` rule to `.gitignore`.
**Watch for**: Any new file added directly to `data/approved/` (not in a subdirectory). Review `.gitignore` whenever adding new approved content files or categories.

---

## 2026-04-05 — All code edits went into the worktree, not the main working tree

**Symptom**: File changes were invisible in Sourcetree and `git status` on the main repo showed nothing. User could not review diffs before committing.
**Root cause**: Claude Code sessions run inside `.claude/worktrees/<name>/`. File edits made via the Write/Edit tools write to that worktree's working directory, NOT to `/Users/beaconavenue/code/laudbot/`. Branches created in the worktree are also locked there and cannot be checked out in the main tree simultaneously.
**Fix**: Always work on files under the main repo root (`/Users/beaconavenue/code/laudbot/`). Create branches with `git -C /Users/beaconavenue/code/laudbot checkout -b feat/...`. Never use the worktree path for file edits intended to be reviewed and committed by the user.
**Watch for**: At session start, confirm which working tree is the "real" one. If `pwd` or the env shows a `.claude/worktrees/` path, all file writes must target the main repo root explicitly.

---

## 2026-04-04 — Task file committed in tasks/active/ before being moved

**Symptom**: `tasks/active/TASK_backend-auth-stub.md` landed in `main` alongside `tasks/done/TASK_backend-auth-stub.md`
**Root cause**: Task file was staged as part of the implementation commit (while still in `active/`), then moved to `done/` in a separate housekeeping commit. Both states landed in the PR.
**Fix**: Don't stage the task file in the implementation commit. Only stage it (from `tasks/done/`) in the housekeeping commit after it's been moved.
**Watch for**: Every PR — check that `tasks/active/` is clean before pushing.
