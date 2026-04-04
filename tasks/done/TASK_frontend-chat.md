# Task: frontend-chat

**Status**: `done`
**Created**: 2026-04-04
**Updated**: 2026-04-04

## Goal
Wire the /chat page to POST /api/chat — turn the non-functional scaffold into a working chat UI.

## Done notes
All criteria met. Key architectural decision during this PR: used Next.js server-side proxy
rewrite instead of NEXT_PUBLIC_API_URL to avoid build-time URL baking. This gives full
local/CI/prod parity with a single image per service. BACKEND_URL is a server-side runtime
env var set per environment. Decision logged in ARCHITECTURE.md and PRD.md.
Verified end-to-end: POST to localhost:3001/api/chat proxied through Next.js to backend,
live Claude response returned.
