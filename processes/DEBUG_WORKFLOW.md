# DEBUG_WORKFLOW

> Follow this when something is broken and the cause isn't obvious.

## Steps

### 1. Reproduce first
Before touching any code, confirm you can reproduce the bug reliably.
If you can't reproduce it, stop and describe what you tried to me.

### 2. Isolate
Narrow down where the problem is:
- Which layer: UI / API / database / external service?
- Which function or module?
- Does it happen always or only under specific conditions?

State your hypothesis before looking at code.

### 3. Inspect — don't guess
Read the relevant code. Check:
- What inputs are actually arriving (log them if needed)
- What the code is actually doing vs what you assumed
- Whether the bug is in this code or something it calls

### 4. Fix
Make the smallest possible change that fixes the problem.
If the fix requires a larger refactor, fix the bug first with a minimal patch,
then create a separate task for the refactor.

### 5. Verify the fix
- Reproduce the original bug scenario — confirm it's gone
- Run related tests
- Check for regressions in adjacent functionality

### 6. Log it
Add the bug and root cause to `memory/ERRORS.md` so we don't hit it again.
Format:
```
## [YYYY-MM-DD] [Short description]
**Symptom**: What the user/system saw
**Root cause**: What was actually wrong
**Fix**: What was changed
**Watch for**: Any related areas that could have the same issue
```
