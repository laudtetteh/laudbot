# Git conventions

## Branch naming
```
feat/short-description        # new feature
fix/short-description         # bug fix
chore/short-description       # tooling, deps, config
refactor/short-description    # code change with no behaviour change
docs/short-description        # documentation only
devops/short-description      # CI/CD, Docker, infra, agentic system
```

## Commit message format (Conventional Commits)
```
type(scope): short description

Optional longer body explaining why, not what.
```

Types: `feat` | `fix` | `chore` | `refactor` | `docs` | `test` | `perf` | `devops`

Examples:
```
feat(auth): add magic link login flow
fix(api): handle null user on profile fetch
chore(deps): upgrade next to 14.2.1
```

## Rules
- Commit after each meaningful unit of work — not at end of day.
- Never commit directly to `main` or `develop`.
- Each commit must pass linting and tests (enforced by pre-commit hook).
- Reference GitHub issue numbers in commits when relevant: `feat(search): add full-text search [#12]`
- Never force-push to shared branches.

## PR checklist
- [ ] Tests added or updated *(skip during v1 scaffold — no test framework yet; note in PR)*
- [ ] PROGRESS.md updated if completing a task
- [ ] No console.logs, print() statements, or debug code left in
- [ ] Self-reviewed diff before requesting review
- [ ] No secrets or credentials in staged files
