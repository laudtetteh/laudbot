# Task: llm-multi-provider

**Status**: `done`
**Created**: 2026-04-04
**Updated**: 2026-04-04

## Goal
Wire both LLM providers (Claude + OpenAI) to real SDKs and add a provider factory — completing the multi-provider service layer so `POST /api/chat` (v2-PR2) has something real to call.

## Context
v2 PR 1 of 6. Branch: `feat/llm-multi-provider`.
Both `ClaudeService` and `OpenAIService` should make real API calls after this PR.
The factory maps a provider string (`"claude"` / `"openai"`) to the correct `LLMService` subclass.
API keys come from env vars — no hardcoding, no `.env` file in the repo.

## Acceptance criteria
- [x] `anthropic` and `openai` packages added to `requirements.txt`
- [x] `ClaudeService.complete()` makes a real Anthropic API call (not a stub)
- [x] `OpenAIService` implemented in `backend/app/services/llm/openai.py` — real OpenAI API call
- [x] `provider_factory(LLMConfig) -> LLMService` in `backend/app/services/llm/factory.py`
  - `"claude"` → `ClaudeService()`
  - `"openai"` → `OpenAIService()`
  - Unknown provider raises `ValueError`
- [x] Both services read API keys from env vars (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`)
- [x] App still starts cleanly via `docker-compose up` with no API keys set (keys only needed at call time)
- [x] Verified in-container: factory resolves both providers correctly

## Done notes
All criteria met. One deviation from the original plan: `provider_factory` accepts `LLMConfig` (not bare `str`) — decided during planning to support model override and future admin UI config as a single unit. Both services use lazy client init so the SDK never raises at boot without a key. OpenAI SDK is stricter than Anthropic (raises at init, not at call time) — lazy init was the fix. Verified in-container with 5 assertions + full docker-compose up check.
