"""
Frappe paths: ``scout.api.email_api.*``
"""

import frappe
from frappe import _
from frappe.exceptions import OutgoingEmailError
from frappe.utils import validate_email_address

from scout.api.common import get_admin_session_user, get_company_session_user, get_tpo_session_user
from scout.utils.email import get_mailer_status, scout_send_email


def _portal_email_operator():
    """TPO, company, or admin may inspect mail config and send test messages."""
    tpo_user, tpo_err = get_tpo_session_user()
    if tpo_user:
        return tpo_user, None
    company_user, company_err = get_company_session_user()
    if company_user:
        # Earlier role checks (e.g. TPO) may have written a 403 to the response object.
        # Clear it so the successful company auth is not shadowed by the prior failure.
        frappe.local.response["http_status_code"] = 200
        return company_user, None
    admin_user, admin_err = get_admin_session_user()
    if admin_user:
        frappe.local.response["http_status_code"] = 200
        return admin_user, None
    return None, tpo_err or company_err or admin_err


@frappe.whitelist(methods=["GET"])
def get_mailer_config():
    """Mail delivery status for TPO and company portals."""
    _user, err = _portal_email_operator()
    if err:
        return err

    status = get_mailer_status()
    return {"ok": True, "data": status}


@frappe.whitelist(methods=["POST"])
def send_test_email():
    """
    Send a one-off HTML test message (Postmark or Frappe fallback).
    Optional JSON body: ``{ "toEmail": "you@example.com" }`` (defaults to logged-in user).
    """
    user_id, err = _portal_email_operator()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    to_email = (payload.get("toEmail") or payload.get("to") or "").strip().lower()
    if not to_email:
        to_email = (frappe.db.get_value("User", user_id, "email") or user_id or "").strip().lower()
    if not to_email:
        return {"ok": False, "message": _("No recipient email available.")}
    try:
        validate_email_address(to_email, throw=True)
    except frappe.ValidationError:
        return {"ok": False, "message": _("Invalid email address.")}

    status = get_mailer_status()
    if not status.get("configured"):
        return {
            "ok": False,
            "message": status.get("hint")
            or _("Email is not configured. Set SCOUT_POSTMARK_SERVER_TOKEN and SCOUT_MAIL_FROM in backend/.env, or configure a Frappe outgoing Email Account."),
        }

    subject = _("DiscoveHR test email")
    message = _(
        "<p>This is a test message from DiscoveHR.</p>"
        "<p>If you received this, outbound mail is working.</p>"
        "<p><small>Sent to {0} by {1}</small></p>"
    ).format(to_email, frappe.utils.escape_html(user_id))

    try:
        scout_send_email(to_email, subject, message, delayed=False)
    except OutgoingEmailError as exc:
        return {"ok": False, "message": str(exc)}

    return {
        "ok": True,
        "message": _("Test email sent to {0}.").format(to_email),
        "data": {
            "sentTo": to_email,
            "provider": status.get("provider"),
        },
    }


__all__ = ["get_mailer_config", "send_test_email"]
