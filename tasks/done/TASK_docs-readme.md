# Task: docs-readme

**Status**: `done`
**Created**: 2026-04-04
**Updated**: 2026-04-04

## Goal
Write the full README with setup and run instructions, reframe the milestone as scaffold-complete (not v1), and update PRD + ARCHITECTURE with the multi-provider decision.

## Context
PR 7 of 7 in the scaffold build plan. Branch: `docs/readme`.
Key reframe: "v1" → "scaffold-complete". Honest about what's built and what's next.
Architectural decision made today: multi-provider LLM support (Claude + OpenAI), admin UI toggle.

## Acceptance criteria
- [x] README has full Docker setup and run instructions — clone to running in one read
- [x] README accurately describes what's built (scaffold) and what's coming (v2)
- [x] Build plan checklist updated to reflect scaffold-complete + v2 roadmap
- [x] docs/PRD.md decisions log updated with multi-provider decision
- [x] docs/ARCHITECTURE.md updated with multi-provider design direction

## Files to be modified
- `README.md`
- `docs/PRD.md` — decisions log + open questions
- `docs/ARCHITECTURE.md` — multi-provider section

## Out of scope
- Implementing anything new
- Changing any application code

## Prompt history

### 2026-04-04
**Prompt**: Starting PR 7 — docs and README
**Outcome**: Task file created, proceeding

## Blockers
- None

## Done notes
All criteria met. README fully rewritten — clone to running in one read. "v1" replaced with "scaffold-complete" throughout all three files. Multi-provider design documented in ARCHITECTURE.md including component map, provider factory, and dual external-deps table. PRD updated with decisions log entries and two new open questions for v2 planning.
