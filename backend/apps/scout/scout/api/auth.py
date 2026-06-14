from typing import Optional
import hashlib
import json
import os
import secrets

import frappe
from frappe import _
from frappe.auth import LoginManager
from frappe.utils import strip_html
from frappe.utils.password import check_password

# Roles that can sign in through the public registration form — keep in sync with `register()`.
REGISTER_SELECTABLE_ROLES = frozenset(
    {
        "Company",
        "Student",
        "Job Seeker",
        "Training & Placement Officer",
        "Freelancer",
    }
)

# Admin accounts use scout.api.admin_api.login — not public registration or main portal login.
ADMIN_ONLY_ROLES = frozenset({"Administrator", "System Manager", "Admin"})

TPO_ROLE_ALIASES = frozenset(
    {
        "Training & Placement Officer",
        "Training and Placement Officer",
        "TPO",
    }
)

PORTAL_ALLOWED_ROLES = frozenset(set(REGISTER_SELECTABLE_ROLES) | set(TPO_ROLE_ALIASES))
ROLE_CANONICAL_MAP = {
    "TPO": "Training & Placement Officer",
}


def _portal_user_payload(user_id: str) -> dict:
    """User object for portal login / me — includes sub-admin assignment when applicable."""
    user_data = {
        "id": user_id,
        "full_name": frappe.get_value("User", user_id, "full_name") or "",
        "email": frappe.get_value("User", user_id, "email") or "",
    }
    if "Company" not in frappe.get_roles(user_id):
        return user_data

    sub_row = frappe.db.get_value(
        "Scout Company Sub Admin",
        {"sub_admin_user": user_id, "is_active": 1},
        ["district", "state", "company_user"],
        as_dict=True,
    )
    if not sub_row:
        return user_data

    company_user = (sub_row.company_user or "").strip()
    user_data["isSubAdmin"] = True
    user_data["assignedDistrict"] = sub_row.district or ""
    user_data["assignedState"] = sub_row.state or ""
    user_data["companyUserId"] = company_user
    user_data["companyName"] = (
        frappe.get_cached_value("User", company_user, "full_name") if company_user else ""
    ) or ""
    return user_data

ACCESS_TOKEN_ENV_KEY = "SCOUT_ACCESS_TOKEN_TTL_SECONDS"
REFRESH_TOKEN_ENV_KEY = "SCOUT_REFRESH_TOKEN_TTL_SECONDS"
DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 24 * 60 * 60  # 1 day
DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 7 * 24 * 60 * 60


def _int_env(name: str, default_value: int) -> int:
    raw_value = (os.getenv(name) or "").strip()
    if not raw_value:
        return default_value
    try:
        parsed = int(raw_value)
    except ValueError:
        return default_value
    return parsed if parsed > 0 else default_value


def _access_ttl_seconds() -> int:
    return _int_env(ACCESS_TOKEN_ENV_KEY, DEFAULT_ACCESS_TOKEN_TTL_SECONDS)


def _refresh_ttl_seconds() -> int:
    return _int_env(REFRESH_TOKEN_ENV_KEY, DEFAULT_REFRESH_TOKEN_TTL_SECONDS)


_BRUTE_FORCE_MAX_ATTEMPTS = 10
_BRUTE_FORCE_WINDOW_SECONDS = 900  # 15 minutes


def _login_fail_key(email: str) -> str:
    return f"scout_login_fail:{email}"


def _is_login_rate_limited(email: str) -> bool:
    try:
        count = int(frappe.cache().get_value(_login_fail_key(email)) or 0)
        return count >= _BRUTE_FORCE_MAX_ATTEMPTS
    except Exception:
        return False


def _record_login_failure(email: str) -> None:
    try:
        key = _login_fail_key(email)
        count = int(frappe.cache().get_value(key) or 0)
        frappe.cache().set_value(key, count + 1, expires_in_sec=_BRUTE_FORCE_WINDOW_SECONDS)
    except Exception:
        pass


def _clear_login_failures(email: str) -> None:
    try:
        frappe.cache().delete_value(_login_fail_key(email))
    except Exception:
        pass


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _token_cache_key(kind: str, token_hash: str) -> str:
    return f"scout:{kind}:token:{token_hash}"


def _portal_token_table_ready() -> bool:
    return bool(frappe.db.exists("DocType", "Scout Portal Auth Token"))


def _portal_token_type(kind: str) -> str:
    return "Access" if kind == "access" else "Refresh"


def _sql_delete_portal_token_by_hash(token_hash: str, kind: str) -> None:
    """Delete token row without Document lock (safe on auth hot path)."""
    if not _portal_token_table_ready():
        return
    try:
        frappe.db.sql(
            """
            DELETE FROM `tabScout Portal Auth Token`
            WHERE token_hash = %s AND token_type = %s
            """,
            (token_hash, _portal_token_type(kind)),
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "scout.auth: sql delete portal token")


def _save_portal_token_db(kind: str, token_hash: str, user_id: str, roles: list[str], ttl_seconds: int) -> None:
    if not _portal_token_table_ready():
        return
    try:
        expires_at = frappe.utils.add_to_date(frappe.utils.now_datetime(), seconds=ttl_seconds)
        existing = frappe.db.get_value("Scout Portal Auth Token", {"token_hash": token_hash}, "name")
        payload = {
            "token_hash": token_hash,
            "user": user_id,
            "token_type": "Access" if kind == "access" else "Refresh",
            "roles_json": json.dumps(roles or []),
            "expires_at": expires_at,
        }
        if existing:
            doc = frappe.get_doc("Scout Portal Auth Token", existing)
            doc.update(payload)
            doc.save(ignore_permissions=True)
        else:
            frappe.get_doc({"doctype": "Scout Portal Auth Token", **payload}).insert(ignore_permissions=True)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "scout.auth: save portal token")


def _load_portal_token_db(kind: str, token_hash: str) -> dict | None:
    if not _portal_token_table_ready():
        return None
    row = frappe.db.get_value(
        "Scout Portal Auth Token",
        {"token_hash": token_hash, "token_type": "Access" if kind == "access" else "Refresh"},
        ["user", "roles_json", "expires_at"],
        as_dict=True,
    )
    if not row:
        return None
    if row.expires_at and frappe.utils.get_datetime(row.expires_at) < frappe.utils.now_datetime():
        frappe.cache().delete_value(_token_cache_key(kind, token_hash))
        _sql_delete_portal_token_by_hash(token_hash, kind)
        return None
    roles = []
    try:
        roles = json.loads(row.roles_json or "[]")
    except (TypeError, ValueError):
        roles = []
    return {"user": row.user, "roles": roles}


def _delete_portal_token_db(kind: str, token_hash: str) -> None:
    frappe.cache().delete_value(_token_cache_key(kind, token_hash))
    _sql_delete_portal_token_by_hash(token_hash, kind)


def _resolve_user_from_access_token(access_token: str):
    if not access_token:
        return None
    access_hash = _hash_token(access_token.strip())
    row = frappe.cache().get_value(_token_cache_key("access", access_hash))
    if not row:
        row = _load_portal_token_db("access", access_hash)
        if row:
            frappe.cache().set_value(
                _token_cache_key("access", access_hash),
                row,
                expires_in_sec=_access_ttl_seconds(),
            )
    if not row:
        return None
    user_id = (row or {}).get("user")
    if not user_id or not frappe.db.exists("User", user_id):
        return None
    return user_id


def _extract_bearer_token() -> str:
    auth_header = frappe.get_request_header("Authorization") or ""
    if auth_header.startswith("Bearer "):
        return auth_header[7:].strip()
    return (frappe.form_dict.get("access_token") or "").strip()


def authenticate_scout_bearer_token():
    """Set frappe.session.user from Scout access token (must run in auth_hooks before Guest+bearer rejection).

    When the portal sends Authorization: Bearer, always prefer the token user over an existing
    Frappe cookie session (e.g. Desk login as another user), so student/company APIs see the correct account.
    """
    token = _extract_bearer_token()
    if not token:
        return
    user_id = _resolve_user_from_access_token(token)
    if user_id:
        form_dict = frappe.local.form_dict
        frappe.set_user(user_id)
        frappe.local.form_dict = form_dict


def apply_bearer_auth():
    """before_request fallback — primary auth runs via hooks.auth_hooks."""
    authenticate_scout_bearer_token()


def _issue_token_pair(user_id: str, roles: list[str]):
    now_iso = frappe.utils.now_datetime().isoformat()

    access_token = secrets.token_urlsafe(32)
    access_hash = _hash_token(access_token)
    access_ttl = _access_ttl_seconds()
    access_row = {"user": user_id, "roles": roles, "issuedAt": now_iso}
    frappe.cache().set_value(_token_cache_key("access", access_hash), access_row, expires_in_sec=access_ttl)
    _save_portal_token_db("access", access_hash, user_id, roles, access_ttl)

    refresh_token = secrets.token_urlsafe(48)
    refresh_hash = _hash_token(refresh_token)
    refresh_ttl = _refresh_ttl_seconds()
    refresh_row = {"user": user_id, "roles": roles, "issuedAt": now_iso}
    frappe.cache().set_value(_token_cache_key("refresh", refresh_hash), refresh_row, expires_in_sec=refresh_ttl)
    _save_portal_token_db("refresh", refresh_hash, user_id, roles, refresh_ttl)

    try:
        frappe.db.commit()
    except Exception:
        pass

    return {
        "accessToken": access_token,
        "refreshToken": refresh_token,
        "accessTokenExpiresIn": access_ttl,
        "refreshTokenExpiresIn": refresh_ttl,
        "tokenType": "Bearer",
    }

def _extract_credentials(email: Optional[str] = None, password: Optional[str] = None):
    if email and password:
        return email, password
    payload = frappe.request.get_json(silent=True) or {}
    return payload.get("email"), payload.get("password")


@frappe.whitelist(allow_guest=True, methods=["POST"])
def login(email: Optional[str] = None, password: Optional[str] = None):
    email, password = _extract_credentials(email, password)
    if not email or not password:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Email and password are required.")}

    try:
        # Clear any stale authenticated session before logging in again.
        if frappe.session.user and frappe.session.user != "Guest":
            try:
                frappe.local.login_manager.logout()
            except Exception:
                pass

        login_manager = LoginManager()
        frappe.local.login_manager = login_manager
        login_manager.authenticate(user=email.strip().lower(), pwd=password)
        login_manager.post_login()

        user_id = frappe.session.user
        roles = frappe.get_roles(user_id)
        if not any(role in PORTAL_ALLOWED_ROLES for role in roles) and not any(role in ADMIN_ONLY_ROLES for role in roles):
            # Clear stale Redis role cache and retry from DB.
            try:
                frappe.cache().hdel("roles", user_id)
            except Exception:
                pass
            roles = frappe.get_roles(user_id)

        if any(role in ADMIN_ONLY_ROLES for role in roles) and not any(role in PORTAL_ALLOWED_ROLES for role in roles):
            frappe.local.login_manager.logout()
            frappe.local.response["http_status_code"] = 403
            return {
                "ok": False,
                "message": _("Use the admin portal at /admin/login for administrator accounts."),
            }
        if not any(role in PORTAL_ALLOWED_ROLES for role in roles):
            frappe.local.login_manager.logout()
            frappe.local.response["http_status_code"] = 403
            return {
                "ok": False,
                "message": _("This account is not allowed for this login. Use a role from sign up (Company, Student, etc.)."),
            }

        return {
            "ok": True,
            "message": _("Login successful."),
            "data": {
                "user": _portal_user_payload(user_id),
                "roles": roles,
            },
        }
    except frappe.AuthenticationError:
        frappe.local.response["http_status_code"] = 401
        return {"ok": False, "message": _("Invalid email or password.")}
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Scout API: auth.login")
        frappe.local.response["http_status_code"] = 500
        return {
            "ok": False,
            "message": _("Login could not be completed. If this continues, check Frappe error logs (Scout API: auth.login)."),
        }


def _create_student_profile_on_register(*, email: str, full_name: str, phone: str, college_name: str = "") -> None:
    if frappe.db.exists("Scout Student Profile", email):
        update_vals = {"full_name": full_name, "email": email, "phone": phone}
        if college_name:
            update_vals["college_name"] = college_name
        frappe.db.set_value("Scout Student Profile", email, update_vals, update_modified=True)
        return
    profile_data = {
        "doctype": "Scout Student Profile",
        "student_user": email,
        "full_name": full_name,
        "email": email,
        "phone": phone,
        "candidate_type": "Independent",
    }
    if college_name:
        profile_data["college_name"] = college_name
    profile = frappe.get_doc(profile_data)
    profile.db_insert()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def register():
    # Frappe parses JSON bodies into frappe.form_dict via make_form_dict().
    # frappe.request.get_json() is unreliable here because the WSGI stream
    # may already be consumed. Reading from form_dict is always safe.
    fd = frappe.form_dict
    email = (fd.get("email") or "").strip().lower()
    password = fd.get("password") or ""
    role = (fd.get("role") or "").strip()
    canonical_role = ROLE_CANONICAL_MAP.get(role, role)
    first_name = (fd.get("firstName") or "").strip()
    last_name = (fd.get("lastName") or "").strip()
    phone = (fd.get("phone") or "").strip()
    full_name = (fd.get("fullName") or "").strip()
    company_name = (fd.get("companyName") or "").strip()
    college_name = (fd.get("collegeName") or "").strip()

    if canonical_role == "Student":
        if not first_name or not last_name or not email or not password or not phone or not role:
            frappe.local.response["http_status_code"] = 400
            return {
                "ok": False,
                "message": _("First name, last name, email, phone, password and role are required."),
            }
        full_name = f"{first_name} {last_name}".strip()
    elif canonical_role == "Company":
        if not company_name or not full_name or not email or not password or not role:
            frappe.local.response["http_status_code"] = 400
            return {
                "ok": False,
                "message": _("Company name, contact name, email, password and role are required."),
            }
    elif canonical_role == "Training & Placement Officer":
        if not college_name or not full_name or not email or not password or not role:
            frappe.local.response["http_status_code"] = 400
            return {
                "ok": False,
                "message": _("College name, full name, email, password and role are required."),
            }
    elif not full_name or not email or not password or not role:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Full name, email, password and role are required.")}

    if role not in REGISTER_SELECTABLE_ROLES:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid role selected.")}

    if frappe.db.exists("User", email):
        frappe.local.response["http_status_code"] = 409
        return {"ok": False, "message": _("User already exists with this email.")}

    if not frappe.db.exists("Role", canonical_role):
        frappe.get_doc({"doctype": "Role", "role_name": canonical_role}).insert(ignore_permissions=True)

    if canonical_role == "Company":
        first_name, _separator, last_name = full_name.partition(" ")
        full_name = company_name
    elif canonical_role != "Student":
        first_name, _separator, last_name = full_name.partition(" ")

    try:
        # ── Step 1: Create User (send_welcome_email=0 suppresses insert hook email) ──
        user = frappe.get_doc({
            "doctype": "User",
            "email": email,
            "first_name": first_name or full_name,
            "last_name": last_name,
            "full_name": full_name,
            "enabled": 1,
            "send_welcome_email": 0,
            "user_type": "System User",
        })
        if phone:
            user.mobile_no = phone
        try:
            user.insert(ignore_permissions=True)
        except Exception as _ins_exc:
            # Frappe's on_update hook tries to enqueue a Redis background job.
            # If Redis is not running this raises ConnectionError. The user record
            # IS written to the DB before the hook runs, so we can safely continue.
            _is_redis = ("ConnectionError" in type(_ins_exc).__name__
                         or "redis" in str(_ins_exc).lower()
                         or "11000" in str(_ins_exc)
                         or "13000" in str(_ins_exc))
            if not _is_redis:
                raise

        # ── Step 2: Assign role via direct SQL ────────────────────────────────────
        # user.add_roles() calls user.save() internally which fires the
        # "User.on_update" hook that sends email notifications. That hook crashes
        # when Frappe outgoing email is not configured (raises OutgoingEmailError
        # → caught by except Exception → rollback → "Registration failed").
        # Direct SQL bypasses all ORM hooks.
        _now = frappe.utils.now_datetime()
        _role_name = frappe.generate_hash("Has Role", length=10)
        frappe.db.sql(
            """INSERT INTO `tabHas Role`
               (name, creation, modified, modified_by, owner, docstatus, idx,
                parent, parenttype, parentfield, role)
               VALUES (%s, %s, %s, %s, %s, 0, 1, %s, %s, %s, %s)""",
            (_role_name, _now, _now, "Administrator", "Administrator",
             email, "User", "roles", canonical_role),
        )

        # ── Step 3: Set password via utility (no email hook) ─────────────────────
        from frappe.utils.password import update_password as _set_password
        try:
            _set_password(email, password, logout_all_sessions=False)
        except TypeError:
            _set_password(email, password)

        # Commit user + role + password now so the account is usable even if
        # profile creation below fails. Profile is created in a separate transaction.
        frappe.db.commit()

        # Invalidate Frappe's Redis role cache for this user.
        # user.insert() may trigger hooks that call frappe.get_roles() before the
        # direct SQL role insert runs, caching an empty list []. The DB now has the
        # correct role but the cache is stale — login() / token_login() would return
        # "not allowed" until the cache expires. Clear it explicitly.
        try:
            frappe.cache().hdel("roles", email)
        except Exception:
            pass

    except frappe.ValidationError as exc:
        frappe.db.rollback()
        exc_str = str(exc).lower()
        if "mobile_no" in exc_str or ("duplicate entry" in exc_str and "mobile" in exc_str):
            frappe.local.response["http_status_code"] = 409
            return {"ok": False, "message": _("A user account already exists with this phone number. Please use a different phone number or sign in.")}
        frappe.local.response["http_status_code"] = 400
        cleaned = strip_html(str(exc)).strip()
        return {"ok": False, "message": cleaned or _("Password requirements not met.")}
    except frappe.DuplicateEntryError:
        frappe.db.rollback()
        frappe.local.response["http_status_code"] = 409
        return {"ok": False, "message": _("User already exists with this email.")}
    except Exception as _exc:
        frappe.db.rollback()
        _exc_str = str(_exc).lower()
        # Friendly messages for common constraint violations
        if "mobile_no" in _exc_str or "duplicate entry" in _exc_str and "mobile" in _exc_str:
            frappe.local.response["http_status_code"] = 409
            return {"ok": False, "message": _("A user account already exists with this phone number.")}
        frappe.log_error(frappe.get_traceback(), "Scout API: auth.register")
        frappe.local.response["http_status_code"] = 500
        return {"ok": False, "message": _("Registration failed. Please try again.")}

    # ── Step 4: Create role-specific profile records (separate transaction) ───
    # Failures here are logged but do NOT roll back the account — the user can
    # still sign in; the profile will be created on first dashboard load.
    try:
        if canonical_role == "Student":
            _create_student_profile_on_register(
                email=email, full_name=full_name, phone=phone, college_name=college_name
            )
        if canonical_role in ("Freelancer", "Job Seeker"):
            from scout.api.freelancer.profile import create_freelancer_profile_on_register
            create_freelancer_profile_on_register(email=email, full_name=full_name, phone=phone)
        if canonical_role == "Training & Placement Officer":
            from scout.api.tpo.profile import create_tpo_profile_on_signup
            create_tpo_profile_on_signup(email, full_name, college_name=college_name)
        frappe.db.commit()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Scout API: profile creation on register")
        frappe.db.rollback()

    if canonical_role == "Training & Placement Officer":
        from scout.api.tpo.profile import TPO_ADMIN_APPROVAL_REQUIRED

        if TPO_ADMIN_APPROVAL_REQUIRED:
            return {
                "ok": True,
                "message": _(
                    "Registration submitted. An administrator will review your request. "
                    "You can sign in at the TPO portal once approved."
                ),
            }
        return {
            "ok": True,
            "message": _("Registration successful. Sign in at the TPO portal to complete your college profile."),
        }
    if canonical_role == "Freelancer":
        return {
            "ok": True,
            "message": _(
                "Registration successful. Sign in to complete your freelancer interviewer profile, upload documents, and submit for admin approval."
            ),
        }
    if canonical_role == "Job Seeker":
        return {
            "ok": True,
            "message": _(
                "Registration successful. Sign in to complete your profile, upload documents, and submit for admin approval."
            ),
        }
    return {"ok": True, "message": _("Registration successful. Please login.")}


@frappe.whitelist(allow_guest=True, methods=["GET"])
def me():
    from scout.api.common import _portal_session_user

    user_id = _portal_session_user()
    if not user_id:
        frappe.local.response["http_status_code"] = 401
        return {"ok": False, "message": _("Not logged in.")}

    roles = frappe.get_roles(user_id)
    if not any(role in PORTAL_ALLOWED_ROLES for role in roles):
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("This user does not have a supported portal role.")}

    return {
        "ok": True,
        "data": {
            "user": _portal_user_payload(user_id),
            "roles": roles,
        },
    }


@frappe.whitelist(methods=["POST"])
def logout():
    frappe.local.login_manager.logout()
    return {"ok": True, "message": _("Logged out successfully.")}


@frappe.whitelist(allow_guest=True, methods=["POST"])
def token_login(email: Optional[str] = None, password: Optional[str] = None):
    email, password = _extract_credentials(email, password)
    email = (email or "").strip().lower()
    if not email or not password:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Email and password are required.")}

    if _is_login_rate_limited(email):
        frappe.local.response["http_status_code"] = 429
        return {"ok": False, "message": _("Too many failed login attempts. Please try again later.")}

    # Drop stale Frappe cookie session so later API calls use Bearer tokens for this user.
    if frappe.session.user and frappe.session.user != "Guest":
        try:
            frappe.local.login_manager.logout()
        except Exception:
            pass

    try:
        check_password(email, password)
    except frappe.AuthenticationError:
        _record_login_failure(email)
        frappe.local.response["http_status_code"] = 401
        return {"ok": False, "message": _("Invalid email or password.")}
    except Exception:
        _record_login_failure(email)
        frappe.local.response["http_status_code"] = 401
        return {"ok": False, "message": _("Invalid email or password.")}

    _clear_login_failures(email)

    roles = frappe.get_roles(email)
    if not any(role in PORTAL_ALLOWED_ROLES for role in roles):
        # Stale Redis role cache may have been populated before the role SQL insert
        # completed during registration. Clear it and retry once from the DB.
        try:
            frappe.cache().hdel("roles", email)
        except Exception:
            pass
        roles = frappe.get_roles(email)

    if not any(role in PORTAL_ALLOWED_ROLES for role in roles):
        frappe.local.response["http_status_code"] = 403
        return {
            "ok": False,
            "message": _("This account is not allowed for this login. Use a role from sign up (Company, Student, etc.)."),
        }

    token_data = _issue_token_pair(email, roles)
    return {
        "ok": True,
        "message": _("Token login successful."),
        "data": {
            "user": _portal_user_payload(email),
            "roles": roles,
            **token_data,
        },
    }


@frappe.whitelist(allow_guest=True, methods=["POST"])
def refresh_access_token():
    payload = frappe.request.get_json(silent=True) or {}
    refresh_token = (payload.get("refreshToken") or "").strip()
    if not refresh_token:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Refresh token is required.")}

    refresh_hash = _hash_token(refresh_token)
    refresh_key = _token_cache_key("refresh", refresh_hash)
    refresh_row = frappe.cache().get_value(refresh_key)
    if not refresh_row:
        refresh_row = _load_portal_token_db("refresh", refresh_hash)
    if not refresh_row:
        frappe.local.response["http_status_code"] = 401
        return {"ok": False, "message": _("Invalid or expired refresh token.")}

    user_id = (refresh_row or {}).get("user")
    roles = (refresh_row or {}).get("roles") or []
    if not user_id or not frappe.db.exists("User", user_id):
        frappe.cache().delete_value(refresh_key)
        _delete_portal_token_db("refresh", refresh_hash)
        frappe.local.response["http_status_code"] = 401
        return {"ok": False, "message": _("Invalid or expired refresh token.")}

    frappe.cache().delete_value(refresh_key)
    _delete_portal_token_db("refresh", refresh_hash)
    token_data = _issue_token_pair(user_id, roles)
    return {"ok": True, "message": _("Token refreshed successfully."), "data": token_data}


@frappe.whitelist(allow_guest=True, methods=["POST"])
def revoke_refresh_token():
    payload = frappe.request.get_json(silent=True) or {}
    refresh_token = (payload.get("refreshToken") or "").strip()
    if not refresh_token:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Refresh token is required.")}

    refresh_hash = _hash_token(refresh_token)
    frappe.cache().delete_value(_token_cache_key("refresh", refresh_hash))
    _delete_portal_token_db("refresh", refresh_hash)
    try:
        frappe.db.commit()
    except Exception:
        pass
    return {"ok": True, "message": _("Refresh token revoked successfully.")}


@frappe.whitelist(allow_guest=True, methods=["POST"])
def accept_student_invite():
    payload = frappe.request.get_json(silent=True) or {}
    token = (payload.get("token") or "").strip()
    full_name = (payload.get("fullName") or "").strip()
    password = payload.get("password")

    if not token or not full_name or not password:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Token, full name, and password are required.")}

    if len(str(password)) < 8:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Password must be at least 8 characters.")}

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    invite = frappe.get_value(
        "Scout Student Invite",
        {"token_hash": token_hash, "is_active": 1, "status": "Pending"},
        ["name", "email", "branch", "batch", "year", "expires_at"],
        as_dict=True,
    )
    if not invite:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Invalid or expired invite link.")}

    if not invite.get("expires_at") or invite.get("expires_at") < frappe.utils.now_datetime():
        frappe.db.set_value("Scout Student Invite", invite.get("name"), {"is_active": 0, "status": "Expired"}, update_modified=False)
        frappe.db.commit()
        frappe.local.response["http_status_code"] = 410
        return {"ok": False, "message": _("Invalid or expired invite link.")}

    email = (invite.get("email") or "").strip().lower()
    if frappe.db.exists("User", email):
        frappe.local.response["http_status_code"] = 409
        return {"ok": False, "message": _("Student account already exists. Please login directly.")}

    if not frappe.db.exists("Role", "Student"):
        frappe.get_doc({"doctype": "Role", "role_name": "Student"}).insert(ignore_permissions=True)

    first_name, _separator, last_name = full_name.partition(" ")
    user = frappe.get_doc(
        {
            "doctype": "User",
            "email": email,
            "first_name": first_name or full_name,
            "last_name": last_name,
            "enabled": 1,
            "send_welcome_email": 0,
            "user_type": "System User",
            "roles": [{"role": "Student"}],
        }
    )
    user.insert(ignore_permissions=True)
    user.new_password = password
    user.save(ignore_permissions=True)

    profile_doc = frappe.get_doc(
        {
            "doctype": "Scout Student Profile",
            "student_user": email,
            "full_name": full_name,
            "email": email,
            "candidate_type": "Independent",
            "pending_institutional_invite": invite.get("name"),
        }
    )
    profile_doc.insert(ignore_permissions=True)

    frappe.db.set_value(
        "Scout Student Invite",
        invite.get("name"),
        {"is_active": 1, "status": "Pending"},
        update_modified=False,
    )
    frappe.db.commit()
    return {"ok": True, "message": _("Account created. Log in and confirm your department, branch, and batch under Profile to finish college enrollment.")}
