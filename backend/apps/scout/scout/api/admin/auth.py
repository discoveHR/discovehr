from typing import Optional

import frappe
from frappe import _
from frappe.auth import LoginManager

from scout.api.common import ADMIN_ROLE_NAMES, get_admin_session_user


def _extract_credentials(email: Optional[str] = None, password: Optional[str] = None):
    if email and password:
        return email, password
    payload = frappe.request.get_json(silent=True) or {}
    return payload.get("email"), payload.get("password")


def _user_payload(user_id: str):
    return {
        "id": user_id,
        "full_name": frappe.get_value("User", user_id, "full_name"),
        "email": frappe.get_value("User", user_id, "email"),
    }


def _has_admin_role(roles: list[str]) -> bool:
    return any(role in ADMIN_ROLE_NAMES for role in roles)


@frappe.whitelist(allow_guest=True, methods=["POST"])
def login(email: Optional[str] = None, password: Optional[str] = None):
    email, password = _extract_credentials(email, password)
    if not email or not password:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Email and password are required.")}

    try:
        if frappe.session.user and frappe.session.user != "Guest":
            try:
                frappe.local.login_manager.logout()
            except Exception:
                pass

        login_manager = LoginManager()
        login_manager.authenticate(user=email.strip().lower(), pwd=password)
        login_manager.post_login()

        user_id = frappe.session.user
        roles = frappe.get_roles(user_id)
        if not _has_admin_role(roles):
            frappe.local.login_manager.logout()
            frappe.local.response["http_status_code"] = 403
            return {
                "ok": False,
                "message": _("This account cannot use the admin portal. Use the main login for Company, Student, or TPO."),
            }

        return {
            "ok": True,
            "message": _("Admin login successful."),
            "data": {"user": _user_payload(user_id), "roles": roles},
        }
    except frappe.AuthenticationError:
        frappe.local.response["http_status_code"] = 401
        return {"ok": False, "message": _("Invalid email or password.")}
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Scout API: admin.auth.login")
        frappe.local.response["http_status_code"] = 500
        return {"ok": False, "message": _("Admin login could not be completed.")}


@frappe.whitelist(methods=["GET"])
def me():
    user_id, err = get_admin_session_user()
    if err:
        return err

    roles = frappe.get_roles(user_id)
    return {"ok": True, "data": {"user": _user_payload(user_id), "roles": roles}}


@frappe.whitelist(methods=["POST"])
def logout():
    frappe.local.login_manager.logout()
    return {"ok": True, "message": _("Logged out successfully.")}


def ensure_admin_user():
    """Auto-create/update the admin user on bench startup using env credentials."""
    from scout.utils.env_config import scout_conf
    email = scout_conf("scout_admin_email", "SCOUT_ADMIN_EMAIL") or "admin@scout.com"
    password = scout_conf("scout_admin_password", "SCOUT_ADMIN_PASSWORD") or "Admin@123"
    try:
        _upsert_admin(email, password)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Scout: ensure_admin_user on startup")


@frappe.whitelist(allow_guest=True, methods=["POST"])
def ensure_demo_admin_user():
    """Create or reset the admin user (reads credentials from env / site config)."""
    from scout.utils.env_config import scout_conf
    email = scout_conf("scout_admin_email", "SCOUT_ADMIN_EMAIL") or "admin@scout.com"
    password = scout_conf("scout_admin_password", "SCOUT_ADMIN_PASSWORD") or "Admin@123"
    _upsert_admin(email, password)
    return {
        "ok": True,
        "message": frappe._("Admin ready."),
        "data": {"email": email, "password": password, "loginUrl": "/admin/login"},
    }


def _upsert_admin(email: str, password: str):
    """Create or update the admin Frappe user with the given credentials."""
    email = email.strip().lower()

    for role_name in ("Admin", "System Manager"):
        if not frappe.db.exists("Role", role_name):
            frappe.get_doc({"doctype": "Role", "role_name": role_name}).insert(ignore_permissions=True)

    if frappe.db.exists("User", email):
        user = frappe.get_doc("User", email)
    else:
        user = frappe.get_doc(
            {
                "doctype": "User",
                "email": email,
                "first_name": "Scout",
                "last_name": "Admin",
                "enabled": 1,
                "send_welcome_email": 0,
                "user_type": "System User",
            }
        ).insert(ignore_permissions=True)

    existing_roles = {role.role for role in user.roles}
    for role_name in ("Admin", "System Manager"):
        if role_name not in existing_roles:
            user.append("roles", {"role": role_name})

    user.new_password = password
    user.enabled = 1
    user.save(ignore_permissions=True)
    frappe.db.commit()
