# Task: example-feature

**Status**: `backlog`
**Created**: 2026-04-04
**Updated**: 2026-04-04

## Goal
Show Claude exactly what a well-formed task file looks like before starting real work.

## Context
This is a reference example — copy it, rename it, and fill it in for your first real task.
Delete this file once you have a real task in flight.

## Acceptance criteria
- [ ] Feature does X under condition Y
- [ ] Error case Z is handled gracefully
- [ ] Existing tests still pass (when applicable)
- [ ] New tests cover the happy path and one edge case (when applicable)

## Approach
1. Read the relevant existing code in the affected module
2. Add the new function to the appropriate backend or frontend file
3. Wire it into the route or component
4. Write tests if a test framework is in place
5. Update PROGRESS.md

## Files likely affected
- `backend/app/api/[route].py` — add or modify the endpoint
- `backend/app/services/[service].py` — add the business logic
- `frontend/app/[page]/page.tsx` — update the UI if needed

## Out of scope
- UI changes — that's a separate task
- Database schema changes — create a separate migration task

## Prompt history

### 2026-04-04
**Prompt**: "Implement X following the approach above. Read the existing code in backend/app/ first."
**Outcome**: Function created, tests written, all passing
**Notes**: Discovered that Y behaves differently than expected — logged in ERRORS.md

## Blockers
- None

## Done notes
[Fill in when complete]
