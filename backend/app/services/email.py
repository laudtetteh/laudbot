from __future__ import annotations

import logging
import os

logger = logging.getLogger(__name__)

_DEFAULT_FROM = "LaudBot <hello@laudtetteh.io>"

_MODE_LABELS: dict[str, str] = {
    "recruiter": "Recruiter (professional)",
    "coworker": "Co-worker (fellow engineer)",
    "buddy": "Buddy (casual & playful)",
}


def _build_html(to_email: str, invite_url: str, mode: str, note: str | None) -> str:
    """Build the invite email HTML body.

    Args:
        to_email: Recipient email address.
        invite_url: The one-time invite URL.
        mode: The default mode slug for this invite.
        note: Optional note from the admin (e.g. company or role context).

    Returns:
        HTML string for the email body.
    """
    mode_label = _MODE_LABELS.get(mode, mode.capitalize())
    note_block = (
        f'<p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;">📝 {note}</p>'
        if note
        else ""
    )

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="background:#09090b;margin:0;padding:48px 24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="padding-bottom:32px;">
              <p style="color:#a1a1aa;font-size:13px;margin:0;">LaudBot</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#18181b;border-radius:12px;padding:40px;">
              <h1 style="color:#ffffff;font-size:20px;font-weight:600;margin:0 0 8px;">
                You&apos;ve been invited to chat with Laud&apos;s AI agent
              </h1>
              <p style="color:#a1a1aa;font-size:14px;margin:0 0 24px;">
                Laud Tetteh — Senior Software Engineer
              </p>

              {note_block}

              <p style="color:#71717a;font-size:13px;margin:0 0 6px;">Mode</p>
              <p style="color:#e4e4e7;font-size:14px;font-weight:500;margin:0 0 32px;">{mode_label}</p>

              <!-- CTA button -->
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#3f3f46;border-radius:8px;">
                    <a href="{invite_url}"
                       style="display:inline-block;padding:12px 28px;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">
                      Open chat →
                    </a>
                  </td>
                </tr>
              </table>

              <p style="color:#52525b;font-size:12px;margin:32px 0 0;">
                This link is single-use and expires after 7 days. If you have trouble,
                contact Laud directly at
                <a href="mailto:hello@laudtetteh.io" style="color:#71717a;">hello@laudtetteh.io</a>.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding-top:24px;">
              <p style="color:#3f3f46;font-size:12px;margin:0;text-align:center;">
                Sent via LaudBot · laudtetteh.io
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""


async def send_invite_email(
    to_email: str,
    invite_url: str,
    mode: str,
    note: str | None = None,
) -> None:
    """Send a recruiter invite email via Resend.

    No-ops silently if RESEND_API_KEY is not set, so local dev without
    email config still works — the invite URL is always returned in the API
    response regardless.

    Args:
        to_email: Recipient email address.
        invite_url: The one-time invite URL to embed as the CTA.
        mode: The default mode slug for this invite (drives subject + body context).
        note: Optional admin note (e.g. company name or role) shown in the email.
    """
    api_key = os.getenv("RESEND_API_KEY", "").strip()
    if not api_key:
        logger.info("RESEND_API_KEY not set — skipping invite email to %s", to_email)
        return

    try:
        import resend  # imported here so missing dep doesn't crash startup

        resend.api_key = api_key
        from_address = os.getenv("RESEND_FROM_EMAIL", _DEFAULT_FROM)

        resend.Emails.send({
            "from": from_address,
            "to": [to_email],
            "subject": "You've been invited to chat with Laud's AI agent",
            "html": _build_html(to_email, invite_url, mode, note),
        })
        logger.info("Invite email sent to %s (mode: %s)", to_email, mode)
    except Exception as exc:
        # Non-fatal — log and continue. The invite URL is still returned to the admin.
        logger.error("Failed to send invite email to %s: %s", to_email, exc)
