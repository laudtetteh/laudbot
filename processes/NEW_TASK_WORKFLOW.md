# NEW_TASK_WORKFLOW

> This file is named explicitly so Claude knows to use it only when starting a new task,
> not during general work.

## When to follow this workflow
- When I say "start a new task" or "let's work on [feature]"
- When picking up a task from `tasks/backlog/`

## Steps

### 0. Confirm working directory
Before touching any file, identify the main repo root and confirm all edits will go there.

Claude Code sessions run inside `.claude/worktrees/<name>/`. Edits written there are
**invisible** to the user's git client. Always target the main repo explicitly:
- Main repo root: `/Users/beaconavenue/code/laudbot/`
- All Write/Edit tool calls must use absolute paths under the main repo root
- All `git` commands must use `git -C /Users/beaconavenue/code/laudbot/`
- Never create branches or write files inside the `.claude/worktrees/` path

### 1. Orient
Read these files before anything else:
- `memory/CONTEXT_SNAPSHOT.md` — rolling state; written at end of every session
- `memory/PROGRESS.md`
- `memory/ERRORS.md`
- The task file in `tasks/active/` or `tasks/backlog/`

If no task file exists, stop and ask me to create one using `prompts/templates/NEW_TASK.md`.

### 2. Confirm understanding
State back to me in 2-3 sentences:
- What the task is asking for
- What files you expect to touch
- Any risks or ambiguities you see

Wait for my confirmation.

### 3. Plan
Write a numbered implementation plan directly into the task file under `## Approach`.
Include file-level changes, not just feature-level intent.
Wait for my approval on the plan before writing code.

### 4. Implement
Work through the plan one step at a time.
After each meaningful step, briefly confirm what was done before moving to the next.
If you hit something unexpected, pause and surface it — don't silently work around it.

### 5. Verify
Run tests if available. Fix failures before declaring done.
Do a quick self-review: does the output match the acceptance criteria?

### 6. Wrap up
- Update `tasks/active/[TASK].md` status to `done`, move file to `tasks/done/`
- Update `memory/PROGRESS.md` with a one-line summary of what was built
- Log any new pitfalls in `memory/ERRORS.md`
- Commit with a conventional commit message referencing the task name
