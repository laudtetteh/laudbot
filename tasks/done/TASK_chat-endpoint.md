# Task: chat-endpoint

**Status**: `done`
**Created**: 2026-04-04
**Updated**: 2026-04-04

## Goal
Add `POST /api/chat` — the first endpoint that routes a real user message through the LLM service layer and returns a live response.

## Context
v2 PR 2 of 6. Branch: `feat/chat-endpoint`.
The LLM service layer (v2-PR1) is now wired and real. This PR connects it to an HTTP endpoint.
System prompt is a hardcoded placeholder — data/approved/ wiring comes in v2-PR4.
Active provider config lives in app state (in-memory) for now — admin toggle UI comes in v2-PR5.

## Acceptance criteria
- [x] `POST /api/chat` accepts a list of messages and an optional provider config
- [x] Calls `provider_factory(config)` -> `service.complete(system, messages)` -> returns response
- [x] Provider defaults to `"claude"` if not specified in the request
- [x] Unknown provider returns HTTP 400 with a clear error message
- [x] Missing API key returns HTTP 502 (bad gateway) - not a raw 500 traceback
- [x] Pydantic request and response models defined in `backend/app/models/chat.py`
- [x] Active provider config held in app state, defaulting to Claude + default model
- [x] Verified in-container with error handling paths (400 + 502)

## Done notes
All criteria met. Live API call verification deferred — requires ANTHROPIC_API_KEY at test time; error handling paths (400 + 502) verified in-container instead. Response includes `provider` and `model` fields so the frontend can display which provider answered.
