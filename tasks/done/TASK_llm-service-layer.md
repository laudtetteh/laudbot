# Task: llm-service-layer

**Status**: `done`
**Created**: 2026-04-04
**Updated**: 2026-04-04

## Goal
Add a model-agnostic LLM service abstraction layer with a Claude stub implementation — the architectural foundation for all AI calls in this system.

## Context
PR 4 of 7 in the v1 build plan. Branch: `feat/llm-service-layer`.
See `docs/ARCHITECTURE.md` — Key design decisions: "Model-agnostic LLM layer".
See `docs/PRD.md` — Features MVP: Abstract LLM service.
See `rules/security.md` — "No direct SDK calls from routes."

## Acceptance criteria
- [x] `LLMService` abstract base class defined with a single `complete()` method
- [x] `ClaudeService` subclasses `LLMService` and provides a stub implementation
- [x] `complete()` accepts a system prompt and a list of messages
- [x] `ClaudeService.complete()` returns a placeholder string in v1 (no live API call)
- [x] Neither class imports the `anthropic` SDK (not yet a dependency)
- [x] Service layer is importable but not yet wired into any route

## Approach
1. Create `backend/app/services/__init__.py`
2. Create `backend/app/services/llm/__init__.py`
3. Create `backend/app/services/llm/base.py` — abstract `LLMService` with typed `complete()` signature
4. Create `backend/app/services/llm/claude.py` — `ClaudeService` stub

## Files to be created
- `backend/app/services/__init__.py`
- `backend/app/services/llm/__init__.py`
- `backend/app/services/llm/base.py`
- `backend/app/services/llm/claude.py`

## Out of scope
- Wiring the service into any route (that's a later PR)
- Installing the `anthropic` SDK (deferred to when live calls are needed)
- Streaming responses
- Retry logic or error handling beyond the stub

## Risks / open questions
- What should the `complete()` signature look like? Proposing: `system: str`, `messages: list[Message]` where `Message` is a typed dataclass/model with `role` and `content`. This keeps it Claude-shaped but abstract enough for other providers.

## Prompt history

### 2026-04-04
**Prompt**: Starting PR 4 — LLM service abstraction layer
**Outcome**: Task file created, awaiting go-ahead

## Blockers
- None

## Done notes
All criteria met. Verified in-container: stub returns correct string, `LLMService` is abstract, `ClaudeService` is a proper subclass. No deviations from plan. `system + messages` signature confirmed as the right call.
