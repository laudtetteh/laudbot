# Command: /ship

Trigger this command when you're ready to commit and close out a task.

## What this does
Follows SHIP_WORKFLOW:
1. Runs the pre-ship checklist against the active task
2. Prompts you to confirm before committing
3. Writes the conventional commit message
4. Moves the task to `tasks/done/`
5. Updates `memory/PROGRESS.md`

## Usage
```
/ship
```

Claude will confirm:
- Which task is being shipped
- The commit message it will use
- Any checklist items that look incomplete

Then waits for your explicit "go ahead" before committing.
