# Task: admin-invite-ui

**Status**: `done`
**Created**: 2026-04-04
**Updated**: 2026-04-04

## Goal
Add an invite generation form to the admin UI so admins can generate invite URLs without using curl.

## Context
PR #29 landed JWT auth including `POST /api/admin/invitations`. The only way to generate an invite was a raw curl command. This is the highest-priority usability gap identified in the v2 context snapshot.

## Acceptance criteria
- [x] Admin page has an email input field and a "Generate Invite" button
- [x] Button calls `POST /api/admin/invitations` with the admin JWT in the Authorization header
- [x] On success, the generated invite URL is displayed and copyable (copy-to-clipboard button)
- [x] On error (expired session, bad response), a human-readable error message is shown
- [x] Form is disabled/loading state while the request is in-flight
- [x] No page reload required — full client-side interaction
- [x] Verified in-container: full flow works end-to-end

## Approach
1. Add `InviteSection` component to `frontend/app/admin/page.tsx`
2. Component handles: email + optional note inputs, in-flight loading state, success (URL + copy button), error (inline message), session-expired (delegate to `onSessionExpired` → `onLogout`)
3. Render `InviteSection` at the top of `AdminControls`, above LLM config
4. Single file — no new files needed

## Files affected
- `frontend/app/admin/page.tsx` — added `InviteSection` component and `InviteResult`/`InviteState` types

## Out of scope
- Invite modes (recruiter/friend/technical)
- Bulk invite generation
- Invite history/list view
- Backend changes

## Prompt history

### 2026-04-04
**Prompt**: Post-merge housekeeping + admin invite UI feature
**Outcome**: `InviteSection` added to `AdminControls`. All test paths passed in-container.
**Notes**: PR #29 had already implemented the login form and sessionStorage JWT — less work than anticipated. Component placed above LLM config so the primary admin action is front and centre.

## Done notes
- Single file change: `frontend/app/admin/page.tsx`
- Verified: admin login → generate invite (200 + URL returned) → copy button → 401 on bad token → 422 on invalid email
- `TASK_auth.md` moved to done/ as part of this PR (was left in active/ after PR #29 merged)
