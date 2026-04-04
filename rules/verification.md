# Verification rules

> When and how to verify code before committing. These rules apply in addition
> to the pre-ship checklist in `processes/SHIP_WORKFLOW.md`.

---

## In-container verification

Run an in-container smoke test before committing whenever a PR touches any of:

- `docker-compose.yml` or any `Dockerfile`
- `backend/requirements.txt` or `frontend/package.json`
- Any file under `backend/app/services/` (service layer)
- Any new module that other code will import at startup

### Minimum smoke test

```bash
# 1. Confirm the image builds
docker-compose build [service]

# 2. Confirm the stack boots cleanly without secrets set
docker-compose up -d && sleep 4 && curl -s http://localhost:8000/health
docker-compose down

# 3. For logic changes: run an in-container assertion
docker-compose run --rm backend python -c "[assertions here]"
```

### What to assert in-container

- Correct types returned from factories or constructors
- Default values applied as expected
- Error cases raise the right exception type
- No import errors on the changed modules

### Document it in the commit message

The commit message body must include a line like:

```
- Verified in-container: [what was tested]
```

This keeps the git log self-sufficient — anyone reading the history should be
able to tell what was tested without checking CI.

---

## When in-container verification is NOT required

- Changes to docs, task files, memory files, or rules
- Frontend-only changes that don't touch `package.json` or `Dockerfile`
- Pure Pydantic model changes with no logic (type annotations only)

In these cases, a `git diff` review is sufficient.
