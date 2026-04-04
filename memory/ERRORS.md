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

## 2026-04-04 — Task file committed in tasks/active/ before being moved

**Symptom**: `tasks/active/TASK_backend-auth-stub.md` landed in `main` alongside `tasks/done/TASK_backend-auth-stub.md`
**Root cause**: Task file was staged as part of the implementation commit (while still in `active/`), then moved to `done/` in a separate housekeeping commit. Both states landed in the PR.
**Fix**: Don't stage the task file in the implementation commit. Only stage it (from `tasks/done/`) in the housekeeping commit after it's been moved.
**Watch for**: Every PR — check that `tasks/active/` is clean before pushing.
