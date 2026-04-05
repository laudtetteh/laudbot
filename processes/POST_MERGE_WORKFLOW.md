# POST_MERGE_WORKFLOW

> Run this immediately after a PR is merged to main.
> Takes ~2 minutes. Keeps the agentic system clean for the next session.

## When to follow this workflow
- After any PR merges to main
- After the user confirms a merge in conversation

## Steps

### 1. Pull latest main
```bash
git checkout main && git pull origin main
```

### 2. Update PROGRESS.md
Add an entry at the top (below the header) summarising what was built.
Format:
```
## [YYYY-MM-DD] — [PR title or one-line summary]
- bullet: what was built
- bullet: what was verified
- PR #N merged — branch: feat/...
```

### 3. Move task file
Move the completed task file from `tasks/active/` → `tasks/done/`.
Update its `**Status**` field to `done`.
Check that `tasks/active/` is clean (only `.gitkeep` should remain if all tasks are done).

### 4. Overwrite CONTEXT_SNAPSHOT.md
Rewrite `memory/CONTEXT_SNAPSHOT.md` with the current state.
**Never delete this file — always overwrite it.**
The snapshot must include:
- Full list of merged PRs (add the just-merged PR)
- Any open PRs
- What comes next (in priority order)
- Key decisions and preferences to carry forward
- Tech debt log
- Environment notes

### 5. Check ERRORS.md
If anything unexpected happened during the task or merge, log it in `memory/ERRORS.md`.

### 6. Commit housekeeping (if not already in the PR)
If PROGRESS.md / task file moves weren't part of the PR commit:
```bash
git add memory/PROGRESS.md tasks/done/TASK_[name].md tasks/active/TASK_[name].md
git commit -m "chore: post-merge housekeeping for PR #N"
```

### 7. Confirm next task
Surface the next priority from CONTEXT_SNAPSHOT.md and ask the user: "What's next?"
