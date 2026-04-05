# Deployment — LaudBot

> Production target: DigitalOcean App Platform
> Custom domain: laudbot.laudtetteh.io
> CI/CD: GitHub Actions → GHCR → DO App Platform

---

## How deploys work

Every merge to `main` triggers the GitHub Actions `deploy.yml` workflow:

1. **Build** — backend and frontend production images built from `Dockerfile.prod`
2. **Push** — images pushed to GHCR as `ghcr.io/laudtetteh/laudbot-backend:latest` and `ghcr.io/laudtetteh/laudbot-frontend:latest`
3. **Deploy** — `doctl apps create-deployment` triggers DO App Platform to pull the new images and roll out

Total deploy time: ~3–5 minutes from merge to live.

---

## First-time setup

### 1. Generate the DO API token

In the DO dashboard → API → Tokens → Generate New Token:
- Name: `laudbot-github-actions`
- Scopes: Custom — `app`: **Read + Create**
- Expiry: No expire (or set a rotation reminder)

Copy the token immediately — it's only shown once.

### 2. Add GitHub Actions secrets

In the GitHub repo → Settings → Secrets and variables → Actions, add:

| Secret | Value |
|--------|-------|
| `DO_API_TOKEN` | The DO API token from step 1 |
| `DO_APP_ID` | The DO App Platform app ID (get after step 3) |

`GITHUB_TOKEN` is provided automatically by Actions — no setup needed.

### 3. Create the DO App Platform app

In the DO dashboard → App Platform → Create App:
- Choose **Docker Hub / Registry** as the source type, then switch to **GHCR**
- Alternatively, create via the app spec: in the DO dashboard, use the spec in `.do/app.yaml`
- After creation, find the App ID in the URL: `cloud.digitalocean.com/apps/<APP_ID>` or via `doctl apps list`
- Add `DO_APP_ID` to GitHub Actions secrets (step 2)

### 4. Set production env vars in DO

In the App Platform dashboard → your app → Settings → App-Level Environment Variables, add these as **encrypted** (secret) values:

| Variable | Notes |
|----------|-------|
| `ANTHROPIC_API_KEY` | From console.anthropic.com |
| `OPENAI_API_KEY` | From platform.openai.com |
| `ADMIN_USERNAME` | Choose a strong username |
| `ADMIN_PASSWORD` | Choose a strong password |
| `JWT_SECRET_KEY` | Generate: `openssl rand -hex 32` |
| `SYSTEM_PROMPT` | Full content of your system prompt (paste from `data/approved/system_prompt.md`) |
| `FRONTEND_URL` | `https://laudbot.laudtetteh.io` |

`BACKEND_URL` and `NODE_ENV` are set in `.do/app.yaml` (non-secret, version-controlled).

### 5. Configure the custom domain

In DO App Platform → your app → Settings → Domains:
- Add `laudbot.laudtetteh.io`
- DO provides a CNAME target (e.g., `laudbot-xxxxx.ondigitalocean.app`)

In Cloudflare DNS for `laudtetteh.io`:
- Type: **CNAME**
- Name: `laudbot`
- Target: the CNAME value from DO
- Proxy: **DNS only (grey cloud)** — DO App Platform manages TLS; Cloudflare proxy causes cert conflicts

### 6. Trigger first deploy

Push any commit to `main`, or manually trigger the workflow in GitHub Actions → `Build and deploy` → `Run workflow`.

---

## Internal service routing

DO App Platform routes traffic between services using internal service names. The frontend reaches the backend at `http://backend` (set as `BACKEND_URL`). No port needed — DO handles it.

---

## Environment reference

| Variable | Backend | Frontend | Set in |
|----------|---------|----------|--------|
| `ANTHROPIC_API_KEY` | ✅ | — | DO dashboard (secret) |
| `OPENAI_API_KEY` | ✅ | — | DO dashboard (secret) |
| `ADMIN_USERNAME` | ✅ | — | DO dashboard (secret) |
| `ADMIN_PASSWORD` | ✅ | — | DO dashboard (secret) |
| `JWT_SECRET_KEY` | ✅ | — | DO dashboard (secret) |
| `SYSTEM_PROMPT` | ✅ | — | DO dashboard (secret) |
| `FRONTEND_URL` | ✅ | — | `.do/app.yaml` |
| `BACKEND_URL` | — | ✅ | `.do/app.yaml` |
| `NODE_ENV` | — | ✅ | `.do/app.yaml` |

---

## Scaling

Current config: 1 instance × 512 MB RAM per service (~$12/month total).

To scale: increase `instance_count` in `.do/app.yaml`, or upgrade `instance_size_slug`.
No code changes needed.

---

## Known limitations

- **In-memory state resets on deploy** — `app.state.invite_tokens` and `app.state.llm_config` reset on every deploy. Invite tokens generated before a deploy are invalid after. Mitigated when PostgreSQL is added.
- **No zero-downtime guarantee** at 1 instance — DO App Platform does rolling deploys, but with 1 instance there's a brief gap. Increase `instance_count` to 2 for true zero-downtime.
