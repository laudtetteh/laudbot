# Task: email-invites

**Status**: `active`
**Created**: 2026-04-04
**Updated**: 2026-04-04
**GitHub issue**: #43

## Goal

Send a transactional invite email via Resend when an admin generates an invite. Falls back to URL-only silently if RESEND_API_KEY is unset.

## Acceptance criteria

- [ ] Invite email sent to invitee when RESEND_API_KEY is set
- [ ] Email contains: invitee address context, active mode name, CTA button linking to invite URL, short expiry note
- [ ] Silent no-op (no crash, no error response) when RESEND_API_KEY is unset
- [ ] RESEND_FROM_EMAIL env var controls the From address
- [ ] Existing invite flow (URL returned + shown in admin UI) unchanged
- [ ] `resend` added to requirements.txt

## Approach

1. Add `resend` to `backend/requirements.txt`
2. Create `backend/app/services/email.py` — `send_invite_email()` async function; reads RESEND_API_KEY; no-ops if missing; sends via Resend SDK
3. Update `POST /api/admin/invitations` in `backend/app/api/auth.py` to call `send_invite_email()` after the invite URL is generated
4. Add `RESEND_FROM_EMAIL` to `.env.example`

## Files likely affected

- `backend/requirements.txt` — add resend
- `backend/app/services/email.py` — new file
- `backend/app/api/auth.py` — call email service post-invite
- `.env.example` — document RESEND_FROM_EMAIL

## Out of scope

- HTML email templating beyond inline HTML string
- Email open/click tracking
- Frontend changes

## Done notes
[Fill in when moving to done/]
