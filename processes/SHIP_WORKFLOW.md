# Workflow: shipping a task

Run this when a task is complete and ready to commit, push, and PR.

---

## Pre-ship checklist

Before committing, verify each item:

- [ ] All acceptance criteria in the task file are met
- [ ] No `console.log`, `print()`, or debug statements left in
- [ ] No hardcoded secrets, tokens, or credentials
- [ ] `memory/PROGRESS.md` entry written for this task
- [ ] Linter passes (when applicable)
- [ ] Self-reviewed the diff — nothing unexpected in `git diff`
- [ ] Task file is NOT staged from `tasks/active/` — only commit it after moving to `tasks/done/`

Do not proceed if any item is unchecked. Fix it first.

---

## Step 1 — confirm what's being shipped

State explicitly:
- Which task file is being closed
- The commit message you will use
- Which files are staged

Wait for explicit "go ahead" before committing.

---

## Step 2 — commit

```bash
git add [specific files — never git add -A blindly]
git commit -m "type(scope): short description"
```

Commit message rules (from `rules/git-conventions.md`):
- Type: `feat` | `fix` | `chore` | `refactor` | `docs` | `test` | `perf`
- Scope: the affected layer — `backend`, `frontend`, `infra`, `ai`, `data`
- Subject: imperative, lowercase, no period
- Reference GitHub issue if one exists: `[#N]`

---

## Step 3 — push

```bash
git push origin [branch-name]
```

---

## Step 4 — create the GitHub issue (if not already open)

```bash
gh issue create \
  --title "type: description" \
  --label "type: X,area: Y" \
  --body "..."
```

Issue body should follow the appropriate issue template in `.github/ISSUE_TEMPLATE/`.

---

## Step 5 — create the PR

```bash
gh pr create \
  --title "type(scope): description" \
  --label "type: X,area: Y" \
  --body "..."
```

PR body must follow `.github/PULL_REQUEST_TEMPLATE.md`:
- Summary (1–3 sentences)
- Changes (bullet list)
- Closes #N
- Test plan
- Notes

---

## Step 6 — move task to done

```bash
mv tasks/active/TASK_[name].md tasks/done/TASK_[name].md
```

Fill in the **Done notes** section of the task file before moving it.

---

## Step 7 — update memory

Add an entry to `memory/PROGRESS.md`:

```markdown
## YYYY-MM-DD — [one-line summary]

- [What was built]
- [Any deviations from the plan]
- [Follow-up tasks created]
```
