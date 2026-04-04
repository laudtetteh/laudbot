# Task: frontend-scaffold

**Status**: `done`
**Created**: 2026-04-04
**Updated**: 2026-04-04

## Goal
Scaffold the Next.js frontend with all config files and a shell layout — the frontend runs via Docker Compose alongside the backend.

## Context
PR 5 of 7 in the v1 build plan. Branch: `feat/frontend-scaffold`.
See `docs/PRD.md` — Features MVP: Frontend scaffold.
Stack: Next.js 15, React 19, TypeScript, Tailwind CSS, port 3001.

## Acceptance criteria
- [x] `frontend/` contains a complete, runnable Next.js 15 app
- [x] TypeScript, Tailwind CSS, PostCSS configured correctly
- [x] `frontend/app/layout.tsx` — shell layout only (no page content yet)
- [x] `frontend/Dockerfile` runs `next dev` on port 3001
- [x] `docker-compose.yml` updated — frontend service added on port 3001
- [x] `docker-compose up` brings up both backend and frontend cleanly

## Approach
1. Write `frontend/package.json` — next 15, react 19, tailwind, typescript deps
2. Write `frontend/next.config.ts`
3. Write `frontend/tsconfig.json`
4. Write `frontend/postcss.config.js`
5. Write `frontend/tailwind.config.ts`
6. Write `frontend/app/layout.tsx` — html/body shell, imports global CSS
7. Write `frontend/app/globals.css` — Tailwind directives only
8. Write `frontend/Dockerfile` — node:20-alpine, npm install, next dev -p 3001
9. Update `docker-compose.yml` — add frontend service

## Files to be created/modified
- `frontend/package.json`
- `frontend/next.config.ts`
- `frontend/tsconfig.json`
- `frontend/postcss.config.js`
- `frontend/tailwind.config.ts`
- `frontend/app/layout.tsx`
- `frontend/app/globals.css`
- `frontend/Dockerfile`
- `docker-compose.yml` — modified

## Out of scope
- Page content (PR 6)
- Nav component (PR 6)
- Any API calls to the backend

## Risks / open questions
- None — stack and ports are decided

## Prompt history

### 2026-04-04
**Prompt**: Starting PR 5 — Next.js scaffold
**Outcome**: Task file created, proceeding

## Blockers
- None

## Done notes
All criteria met. Both services verified running simultaneously via docker-compose. Frontend returns 404 on `/` — expected, no page.tsx yet (PR 6). No deviations from plan.
