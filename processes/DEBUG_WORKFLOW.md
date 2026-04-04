# Workflow: debugging

Run this when something is broken. Do not jump straight to code changes.

---

## Step 1 — describe the symptom

State clearly:
- What you are seeing (exact error message, unexpected behaviour, or wrong output)
- What you expected to happen
- Whether it is consistently reproducible

Do not form a hypothesis yet. Just describe what you observe.

---

## Step 2 — establish what you already know

Before investigating:
- Check `memory/ERRORS.md` — has this happened before?
- Check recent commits — did anything change that could cause this?
- Check the relevant task file — were there known risks flagged?

---

## Step 3 — form a hypothesis

State your hypothesis in one sentence:
> "I think X is happening because Y."

If you have more than one hypothesis, rank them by likelihood before testing any.

---

## Step 4 — isolate

Narrow down the failure to the smallest possible scope:
- Which layer? (frontend / backend / service layer / infra)
- Which file or function?
- Can you reproduce it with a minimal test case?

Do not modify production code during isolation. Read and inspect only.

---

## Step 5 — fix

Once isolated:
- Make the smallest change that fixes the root cause
- Do not refactor surrounding code as part of the fix
- Do not fix unrelated issues discovered during debugging — log them in `memory/ERRORS.md` instead

---

## Step 6 — verify

After fixing:
- Confirm the original symptom is gone
- Confirm no regressions in related areas
- If tests exist, run them

---

## Step 7 — log it

Add an entry to `memory/ERRORS.md`:

```markdown
## YYYY-MM-DD [Short title]

**Symptom**: What was observed
**Root cause**: What was actually wrong
**Fix**: What change resolved it
**Watch for**: Related areas that could have the same issue
```

Even if the fix was simple, log it. Patterns emerge over time.
