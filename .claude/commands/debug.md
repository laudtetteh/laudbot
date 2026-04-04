# Command: /debug

Trigger this command when something is broken.

## What this does
Follows DEBUG_WORKFLOW:
1. Asks you to describe the symptom
2. Asks where you've already looked
3. Forms a hypothesis before touching code
4. Works through isolation → inspect → fix → verify
5. Logs the bug and fix in `memory/ERRORS.md`

## Usage
```
/debug
```

Claude will ask:
- What are you seeing?
- What did you expect to happen?
- Can you reproduce it consistently?

Then follows the debug workflow systematically.
