# Command: /new-feature

Trigger this command to kick off a new feature task end-to-end.

## What this does
1. Prompts you for a feature name and one-sentence goal
2. Creates a new task file in `tasks/backlog/` using the NEW_TASK template
3. Opens the task file for you to fill in acceptance criteria
4. Switches the task to `active` and follows NEW_TASK_WORKFLOW

## Usage
```
/new-feature
```

Claude will ask:
- What's the feature name?
- What's the one-sentence goal?
- Any known constraints or files to avoid?

Then it scaffolds the task file and begins the workflow.
