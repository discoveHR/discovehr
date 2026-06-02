import json
import re
import secrets
import string
from typing import Optional
from urllib import parse, request

import frappe
from frappe import _

from scout.api.common import get_student_session_user


def _get_moodle_settings():
    base_url = (getattr(frappe.conf, "genvarsity_moodle_url", "") or "").strip().rstrip("/")
    token = (getattr(frappe.conf, "genvarsity_moodle_token", "") or "").strip()
    return {"base_url": base_url, "token": token, "enabled": bool(base_url and token)}


def _moodle_api_call(function_name: str, params: Optional[dict] = None):
    settings = _get_moodle_settings()
    if not settings["enabled"]:
        frappe.throw(_("LMS is not configured. Please set genvarsity_moodle_url and genvarsity_moodle_token."))

    payload = {"wstoken": settings["token"], "wsfunction": function_name, "moodlewsrestformat": "json"}
    if params:
        payload.update(params)

    url = f"{settings['base_url']}/webservice/rest/server.php"
    encoded = parse.urlencode(payload).encode("utf-8")
    req = request.Request(url, data=encoded, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    with request.urlopen(req, timeout=12) as response:
        body = response.read().decode("utf-8")

    parsed = json.loads(body or "{}")
    if isinstance(parsed, dict) and parsed.get("exception"):
        frappe.throw(_("LMS API error: {0}").format(parsed.get("message") or parsed.get("exception")))
    return parsed


def _secure_moodle_password() -> str:
    """Generate a unique, strong, Moodle-compliant password (min 8 chars, mixed types)."""
    alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
    while True:
        pwd = "".join(secrets.choice(alphabet) for _ in range(16))
        # Moodle requires at least: 1 upper, 1 lower, 1 digit, 1 special
        if (any(c.isupper() for c in pwd) and any(c.islower() for c in pwd)
                and any(c.isdigit() for c in pwd) and any(c in "!@#$%^&*" for c in pwd)):
            return pwd


def _get_or_create_moodle_user(platform_user_id: str) -> tuple[dict, bool]:
    """
    Returns (moodle_user_dict, is_new_account).
    is_new_account=True means the account was just created — student needs to check email.
    """
    email = frappe.get_value("User", platform_user_id, "email")
    full_name = frappe.get_value("User", platform_user_id, "full_name") or "Student User"
    first_name, _separator, last_name = full_name.partition(" ")

    found = _moodle_api_call("core_user_get_users_by_field", {"field": "email", "values[0]": email})
    if isinstance(found, list) and found:
        return found[0], False  # existing account

    # Build a unique username from the full email address.
    safe_email = re.sub(r"[^a-z0-9]", "_", (email or platform_user_id).lower())
    username = f"scout_{safe_email}"[:100]

    # Use a unique random password per student — never reuse across accounts.
    # Moodle will send a "new account" email with a password reset link if
    # email notifications are enabled in Site Administration → Messaging.
    new_password = _secure_moodle_password()

    try:
        created = _moodle_api_call(
            "core_user_create_users",
            {
                "users[0][username]": username,
                "users[0][firstname]": first_name or "Student",
                "users[0][lastname]": last_name or "User",
                "users[0][email]": email,
                "users[0][auth]": "manual",
                "users[0][password]": new_password,
                # Moodle forces the student to change password on first login.
                "users[0][preferences][0][type]": "auth_forcepasswordchange",
                "users[0][preferences][0][value]": "1",
            },
        )
    except Exception:
        # Username may already exist (e.g. from a previous partial setup).
        found_by_user = _moodle_api_call("core_user_get_users_by_field", {"field": "username", "values[0]": username})
        if isinstance(found_by_user, list) and found_by_user:
            return found_by_user[0], False
        raise

    if isinstance(created, list) and created:
        return created[0], True  # newly created

    frappe.throw(_("Unable to link student with LMS account."))


def _get_moodle_courses(moodle_user_id):
    courses = _moodle_api_call("core_enrol_get_users_courses", {"userid": moodle_user_id})
    if not isinstance(courses, list):
        return []
    return [
        {
            "id": row.get("id"),
            "shortname": row.get("shortname"),
            "fullname": row.get("fullname"),
            "categoryid": row.get("categoryid"),
        }
        for row in courses
    ]


def _moodle_login_url(base_url: str, email: str) -> str:
    """Moodle forgot-password URL pre-filled with the student's email."""
    qs = parse.urlencode({"email": email})
    return f"{base_url}/login/forgot_password.php?{qs}"


_LMS_CACHE_TTL = 300  # 5 minutes — courses don't change often


def _lms_cache_key(user_id: str) -> str:
    return f"scout:lms:context:{user_id}"


@frappe.whitelist(methods=["GET"])
def student_lms_context():
    user_id, err = get_student_session_user()
    if err:
        return err

    settings = _get_moodle_settings()
    if not settings["enabled"]:
        return {
            "ok": True,
            "data": {
                "enabled": False,
                "provider": "LMS",
                "launchUrl": "",
                "courses": [],
                "message": _("LMS is not configured yet."),
            },
        }

    # Serve from Redis cache — Moodle HTTP call takes ~200-500ms per request.
    cached = frappe.cache().get_value(_lms_cache_key(user_id))
    if cached:
        return {"ok": True, "data": cached}

    try:
        from scout.services.integration_client import fetch_student_lms_context

        remote = fetch_student_lms_context(user_id)
        if remote is not None:
            frappe.cache().set_value(_lms_cache_key(user_id), remote, expires_in_sec=_LMS_CACHE_TTL)
            return {"ok": True, "data": remote}

        moodle_user, is_new = _get_or_create_moodle_user(user_id)
        courses = _get_moodle_courses(moodle_user.get("id"))
    except Exception as exc:
        from scout.api.log import log_api_error

        log_api_error("Scout API: lms.student_lms_context", exc)
        frappe.local.response["http_status_code"] = 502
        return {"ok": False, "message": _("Unable to load LMS details: {0}").format(str(exc))}

    email = frappe.get_value("User", user_id, "email") or user_id

    # New accounts: direct to "forgot password" so Moodle emails them a set-password link.
    # Returning accounts: direct to their course dashboard.
    launch_url = (
        _moodle_login_url(settings["base_url"], email)
        if is_new
        else f"{settings['base_url']}/my/"
    )

    data = {
        "enabled": True,
        "provider": "LMS",
        "launchUrl": launch_url,
        "moodleUserId": moodle_user.get("id"),
        "courses": courses,
        # Tells the frontend to show a "check your email" message for first-time setup.
        "isNewAccount": is_new,
    }
    frappe.cache().set_value(_lms_cache_key(user_id), data, expires_in_sec=_LMS_CACHE_TTL)
    return {"ok": True, "data": data}
