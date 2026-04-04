# Template: plan request

Use this prompt to kick off planning before any implementation session.

---

**Paste this into Claude Code at the start of a new task:**

```
Before writing any code, read the following files:
- memory/PROGRESS.md
- memory/ERRORS.md
- tasks/active/[TASK_FILE].md

Then give me a numbered implementation plan for this task. Include:
1. What you'll build and in what order
2. Files you'll create or modify
3. Any risks or open questions I should decide before you start
4. Estimated number of steps

Do not write any code until I approve the plan.
```

---

**Variation — resuming a session:**

```
We're resuming work on [TASK_NAME]. Read:
- memory/PROGRESS.md
- tasks/active/[TASK_FILE].md

Summarise where we left off and what the next step is.
Wait for my confirmation before proceeding.
```
