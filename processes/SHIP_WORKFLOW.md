# SHIP_WORKFLOW

> Follow this process before merging or deploying anything.

## Steps

### 0. Create the GitHub issue first
Before writing any code or making any commits, create the issue and note the number.
All commits on this branch must reference it: `feat(scope): description [#N]`.
**Never commit first and create the issue after** — the issue number must be in the
commit message, not added retroactively.

### 1. Pre-ship checklist
- [ ] All acceptance criteria in the task file are met
- [ ] Tests pass locally
- [ ] No console.logs, debug code, or commented-out code
- [ ] No hardcoded secrets or env values
- [ ] Error cases are handled (not just happy path)
- [ ] If the PR touches Docker, requirements, or the service layer: in-container
      verification has been run per `rules/verification.md`
- [ ] `git status --short` checked after any Docker verification step (volume
      mounts can generate untracked files that must be committed)

### 2. Self-review
Read the full diff. Ask:
- Does this do what the task asked and nothing more?
- Is there anything that could break in production that didn't break in dev?
- Are there any side effects on other features?

### 3. Commit
Use conventional commit format:
```
feat(scope): description of what was built

References: [TASK_NAME]
```

### 4. Update memory
- Move task file from `tasks/active/` to `tasks/done/`
- Add entry to `memory/PROGRESS.md`
- If anything surprised you, add it to `memory/ERRORS.md`

### 5. Deploy (if applicable)
[Customise with your actual deploy commands]
```bash
# example
npm run build
# verify build passes before pushing
git push origin feat/your-branch
```
