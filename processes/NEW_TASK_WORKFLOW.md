# Workflow: starting a new task

Follow this exactly at the start of every new task. Do not skip steps.

---

## Step 1 — read context

Before touching anything:

```
Read in order:
1. memory/PROGRESS.md
2. memory/ERRORS.md
3. tasks/active/ — check if there's already an active task
```

If there is already an active task, do not start a new one. Finish or explicitly park the active task first.

---

## Step 2 — identify the task

State the goal in one sentence. Confirm it maps to an item in:
- The v1 build plan (PRs 2–7 in README.md), or
- A file in `tasks/backlog/`, or
- An explicit user instruction in the current session

If it doesn't map to any of the above, pause and surface the question before proceeding.

---

## Step 3 — create the task file

Copy `prompts/templates/NEW_TASK.md` to `tasks/active/TASK_[short-name].md`.

Fill in:
- **Goal** — one sentence
- **Context** — which PR / backlog item / decision this relates to
- **Acceptance criteria** — specific and testable
- **Approach** — 3–5 bullet points, written before any code
- **Files likely affected** — list them

Do not start writing code until the task file is filled in.

---

## Step 4 — surface risks and open questions

Before proceeding, explicitly state:
- Any architectural decision this task requires
- Any files that are off-limits or require care (see CLAUDE.md)
- Any dependency on work not yet done

Wait for go-ahead if any of these are non-trivial.

---

## Step 5 — implement

Follow the approach in the task file. Commit after each logical unit of work — not at the end.

Commit format:
```
type(scope): short description

Optional body explaining why.
```

Reference the GitHub issue number if one exists: `feat(backend): add health endpoint [#3]`

---

## Step 6 — ship

When implementation is complete, run `/ship` or follow `processes/SHIP_WORKFLOW.md`.

---

## Step 7 — update memory

After shipping:
1. Update `memory/PROGRESS.md` with a dated entry
2. Move the task file from `tasks/active/` → `tasks/done/`
3. Log any new bugs or pitfalls discovered in `memory/ERRORS.md`
