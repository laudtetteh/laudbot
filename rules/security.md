# Security rules

---

## LaudBot privacy model — non-negotiable

These rules are specific to this project and override general best practices where they conflict.

- **Approved sources only.** The LLM must only answer from content in the source registry. Never infer, hallucinate, or use unapproved data.
- **Never write to `data/approved/`.** Source files are owner-managed. Claude must never create, edit, or delete files in this directory (enforced by `pre-tool.sh`).
- **Never surface off-limits data**, even if it appears in context: exact location, financial info, health data, credentials, private family details.
- **Refuse gracefully.** When a question probes for off-limits information, redirect — do not expose the reason in detail.
- See `SOURCES.md` for the full approved source list and off-limits policy.

---

## Non-negotiables — Claude must never do these

- Never log secrets, tokens, passwords, or PII.
- Never hardcode credentials — always use environment variables.
- Never expose internal error details to API responses.
- Never trust client-supplied data without validation.
- Never build raw SQL strings — always use parameterised queries or the ORM.

---

## Auth

- Always verify session/token server-side on protected routes.
- Never store sensitive data in localStorage — use httpOnly cookies.
- Implement rate limiting on all auth endpoints before any public-facing deployment.
- Invite tokens must be stored as hashes — never plaintext.

---

## API

- Validate and sanitise all inputs at the boundary.
- Return 404 (not 403) when a resource exists but the user can't access it — don't leak existence.
- Always check ownership before allowing read/write on user-scoped resources.

---

## Dependencies

- Flag any new dependency before adding it — discuss first.
- No packages with known high/critical CVEs without explicit sign-off.

---

## Environment

- `.env` files must be in `.gitignore` — verify before every commit.
- Separate env vars for dev/staging/prod — never reuse secrets across environments.
- `ANTHROPIC_API_KEY` must never appear in logs, error messages, or API responses.
