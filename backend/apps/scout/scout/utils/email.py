"""Outbound email via Postmark HTTP API, with Frappe sendmail fallback."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.exceptions import OutgoingEmailError

from scout.utils.env_config import load_scout_env_files, scout_conf


def postmark_configured() -> bool:
    load_scout_env_files()
    return bool(postmark_server_token() and mail_from())


def postmark_server_token() -> str:
    return scout_conf("postmark_server_token", "SCOUT_POSTMARK_SERVER_TOKEN", "POSTMARK_SERVER_TOKEN")


def mail_from() -> str:
    return scout_conf(
        "mail_from",
        "SCOUT_MAIL_FROM",
        "MAIL_FROM",
    )


def get_mailer_status() -> dict:
    """Status for TPO/company UIs."""
    if postmark_configured():
        return {
            "provider": "postmark",
            "configured": True,
            "fromEmail": mail_from(),
        }
    frappe_ready = False
    try:
        frappe_ready = bool(frappe.db.get_default("default_outgoing"))
    except Exception:
        pass
    return {
        "provider": "frappe" if frappe_ready else "none",
        "configured": frappe_ready,
        "fromEmail": "",
        "hint": _(
            "Set SCOUT_POSTMARK_SERVER_TOKEN and SCOUT_MAIL_FROM in backend/.env, "
            "or configure a default outgoing Email Account in Frappe."
        ),
    }


def _normalize_recipients(recipients: str | list[str]) -> list[str]:
    if isinstance(recipients, str):
        parts = recipients.replace(";", ",").split(",")
        return [p.strip().lower() for p in parts if p.strip()]
    return [str(r).strip().lower() for r in recipients if str(r).strip()]


def _send_via_postmark(
    *,
    recipients: list[str],
    subject: str,
    message: str,
    sender: str | None = None,
    reply_to: str | None = None,
) -> None:
    import requests

    token = postmark_server_token()
    from_addr = sender or mail_from()
    url = "https://api.postmarkapp.com/email"

    payload: dict = {
        "From": from_addr,
        "To": ", ".join(recipients),
        "Subject": subject,
        "HtmlBody": message,
    }
    if reply_to:
        payload["ReplyTo"] = reply_to

    headers = {
        "Accept": "application/json",
        "Content-Type": "application/json",
        "X-Postmark-Server-Token": token,
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=25)
        resp.raise_for_status()
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "Scout Postmark send")
        raise OutgoingEmailError(
            _("Postmark delivery failed: {0}. Check SCOUT_POSTMARK_SERVER_TOKEN and sender signature.").format(str(exc))
        ) from exc


def scout_send_email(
    recipients: str | list[str],
    subject: str,
    message: str,
    *,
    sender: str | None = None,
    reply_to: str | None = None,
    delayed: bool = True,
) -> None:
    """
    Send HTML email. Uses Postmark when configured; otherwise Frappe outgoing email.
    Raises OutgoingEmailError when delivery cannot be completed.
    """
    load_scout_env_files()
    to_list = _normalize_recipients(recipients)
    if not to_list:
        raise OutgoingEmailError(_("No email recipients provided."))

    try:
        from scout.services.notification_client import enqueue_email

        if enqueue_email(recipients, subject, message, sender=sender, reply_to=reply_to):
            return
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Scout notification-service enqueue")

    if postmark_configured():
        _send_via_postmark(
            recipients=to_list,
            subject=subject,
            message=message,
            sender=sender,
            reply_to=reply_to,
        )
        return

    try:
        frappe.sendmail(
            recipients=to_list,
            subject=subject,
            message=message,
            delayed=delayed,
        )
    except OutgoingEmailError:
        raise
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "Scout sendmail fallback")
        raise OutgoingEmailError(
            _("Could not send email. Configure Postmark (SCOUT_POSTMARK_SERVER_TOKEN) or Frappe outgoing email.")
        ) from exc
