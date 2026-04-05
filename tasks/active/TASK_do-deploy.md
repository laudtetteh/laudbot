# Task: do-deploy

**Status**: `active`
**Created**: 2026-04-04
**Updated**: 2026-04-04

## Goal
Ship a CI/CD pipeline that builds production Docker images on every merge to main, pushes them to GHCR, and triggers an automatic deploy to DigitalOcean App Platform.

## Context
v3-PR2. App is fully functional locally. This PR makes it publicly accessible and establishes the deployment story as a portfolio artifact. DO App Platform chosen for managed infra / zero ops distraction.

## Acceptance criteria
- [ ] Production Dockerfiles for backend (uvicorn, no --reload) and frontend (next build + next start)
- [ ] GitHub Actions workflow: merge to main → build images → push to GHCR → trigger DO deploy
- [ ] `.do/app.yaml` app spec defining both services, env var wiring, and internal routing
- [ ] `system_prompt.md` accessible in production (approach TBD — see open questions)
- [ ] `BACKEND_URL` correctly wired for DO internal service routing (`http://backend`)
- [ ] All secrets (API keys, JWT secret, admin credentials) set via DO dashboard — none hardcoded
- [ ] Health check passes on live DO URL after deploy
- [ ] ARCHITECTURE.md updated with production topology

## Approach
[To be filled in — awaiting plan approval]

## Files likely affected
- `backend/Dockerfile` — production-ready (no --reload)
- `frontend/Dockerfile` — production-ready (next build + next start)
- `.do/app.yaml` — new: DO App Platform app spec
- `.github/workflows/deploy.yml` — new: CI/CD pipeline
- `docs/ARCHITECTURE.md` — update with production topology
- `.env.example` — confirm all required production env vars documented

## Out of scope
- PostgreSQL provisioning (no DB yet)
- Custom domain / TLS (DO App Platform handles TLS; custom domain is a separate step)
- Staging environment

## Open questions
1. **system_prompt.md in production** — locally mounted as a Docker volume. DO App Platform has no local volume mounts. Two options:
   - **Env var**: store content as `SYSTEM_PROMPT` in DO dashboard; `load_system_prompt()` checks env var first
   - **DO Spaces**: store file in S3-compatible object storage; read at startup
   Recommendation: env var — simpler, no new infra dependency, content stays out of the image
2. **DO App Platform account** — do you have one set up? Do you have a DO API token ready?

## Prompt history

### 2026-04-04
**Prompt**: Plan DO App Platform deployment pipeline
**Outcome**: Task file created, awaiting answers to open questions + plan approval

## Blockers
- [ ] Answer to system_prompt.md question
- [ ] DO account / API token confirmation
