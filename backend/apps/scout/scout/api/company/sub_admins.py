import json

import frappe
from frappe import _

from scout.api.common import get_company_owner_session_user, _portal_session_user, COMPANY_ROLE_NAMES
from scout.api.pagination_utils import pagination_from_request, pagination_meta


_SKIP_FORM_KEYS = frozenset({"cmd", "data", "args", "message", "sid", "csrf_token"})


def _form_dict_payload():
    """Portal POST uses form-urlencoded; read form_dict before consuming the raw body."""
    fd = frappe.local.form_dict
    if not fd:
        return {}
    out = {}
    for key in fd:
        if key in _SKIP_FORM_KEYS:
            continue
        val = fd.get(key)
        if val is None:
            continue
        out[key] = val
    return out


def _json_payload():
    """JSON body for API clients; never call get_data() before form_dict is read."""
    form_payload = _form_dict_payload()
    if form_payload:
        return form_payload

    payload = frappe.request.get_json(silent=True) or {}
    if payload:
        return payload

    ctype = (frappe.request.content_type or "").lower()
    if "application/json" in ctype:
        raw = frappe.request.get_data(as_text=True)
        if raw and raw.strip():
            try:
                parsed = json.loads(raw)
                if isinstance(parsed, dict):
                    return parsed
            except json.JSONDecodeError:
                pass
    return form_payload


def _as_dict(value):
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return {}
        try:
            parsed = json.loads(text)
            if isinstance(parsed, dict):
                return parsed
        except json.JSONDecodeError:
            return {}
    return {}


def _normalized_payload():
    """Support form_dict, JSON body, and nested wrappers (`data`/`args`)."""
    merged = {}
    merged.update(_form_dict_payload())

    raw_payload = _json_payload()
    payload = _as_dict(raw_payload)
    merged.update(payload)
    merged.update(_as_dict(payload.get("data")))
    merged.update(_as_dict(payload.get("args")))
    merged.update(_as_dict(payload.get("message")))
    return merged


def _payload_str(payload, *keys):
    for key in keys:
        val = payload.get(key)
        if val is None:
            continue
        if isinstance(val, (list, tuple)):
            val = val[0] if val else ""
        text = str(val).strip()
        if text:
            return text
    return ""


def _serialize_sub_admin(doc):
    return {
        "id": doc.name,
        "full_name": doc.full_name or "",
        "email": doc.email or "",
        "state": doc.state or "",
        "district": doc.district or "",
        "isActive": bool(doc.is_active),
        "createdAt": str(doc.creation or ""),
    }


def list_sub_admins():
    user_id, err = get_company_owner_session_user()
    if err:
        return err

    rows = frappe.get_all(
        "Scout Company Sub Admin",
        filters={"company_user": user_id},
        fields=["name", "full_name", "email", "state", "district", "is_active", "creation"],
        order_by="creation desc",
        limit_page_length=200,
    )

    result = []
    for row in rows:
        result.append({
            "id": row.name,
            "full_name": row.full_name or "",
            "email": row.email or "",
            "state": row.state or "",
            "district": row.district or "",
            "isActive": bool(row.is_active),
            "createdAt": str(row.creation or ""),
        })

    return {"ok": True, "data": {"subAdmins": result}}


def create_sub_admin():
    user_id, err = get_company_owner_session_user()
    if err:
        return err

    payload = _normalized_payload()
    name = _payload_str(payload, "fullName", "full_name", "name")
    email = _payload_str(payload, "email").lower()
    password = payload.get("password") or ""
    state = _payload_str(payload, "state")
    district = _payload_str(payload, "district")

    if not name and email:
        # Fallback for proxy/form edge-cases where display name may be dropped.
        local_part = email.split("@", 1)[0]
        name = local_part.replace(".", " ").replace("_", " ").strip().title()

    if not name:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Full name is required.")}
    if not email:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Email is required.")}
    if not state:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("State is required.")}
    if not district:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("District is required.")}
    if len(password) < 8:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Password must be at least 8 characters.")}

    if frappe.db.exists("User", email):
        frappe.local.response["http_status_code"] = 409
        return {"ok": False, "message": _("A user with this email already exists.")}

    # Create Frappe User
    first_name, _sep, last_name = name.partition(" ")
    user_doc = frappe.get_doc({
        "doctype": "User",
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "full_name": name,
        "send_welcome_email": 0,
        "enabled": 1,
        "roles": [{"role": "Company"}],
    })
    user_doc.insert(ignore_permissions=True)
    user_doc.reload()

    # Set password
    user_doc.new_password = password
    user_doc.save(ignore_permissions=True)

    # Create sub-admin record
    sub_doc = frappe.get_doc({
        "doctype": "Scout Company Sub Admin",
        "company_user": user_id,
        "sub_admin_user": email,
        "full_name": name,
        "email": email,
        "state": state,
        "district": district,
        "is_active": 1,
    })
    sub_doc.insert(ignore_permissions=True)
    frappe.db.commit()

    return {"ok": True, "data": {"subAdmin": _serialize_sub_admin(sub_doc)}}


def delete_sub_admin():
    user_id, err = get_company_owner_session_user()
    if err:
        return err

    payload = _normalized_payload()
    sub_admin_id = (payload.get("subAdminId") or payload.get("sub_admin_id") or "").strip()

    if not sub_admin_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("subAdminId is required.")}

    if not frappe.db.exists("Scout Company Sub Admin", sub_admin_id):
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Sub-admin not found.")}

    row = frappe.db.get_value(
        "Scout Company Sub Admin",
        sub_admin_id,
        ["company_user", "sub_admin_user"],
        as_dict=True,
    )
    if row.company_user != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("You do not have permission to remove this sub-admin.")}

    # Disable the Frappe user account
    if row.sub_admin_user and frappe.db.exists("User", row.sub_admin_user):
        frappe.db.set_value("User", row.sub_admin_user, "enabled", 0)

    frappe.delete_doc("Scout Company Sub Admin", sub_admin_id, ignore_permissions=True)
    frappe.db.commit()

    return {"ok": True, "message": _("Sub-admin removed.")}


def list_applicants_by_district():
    """Returns applicants whose student profile district matches the sub-admin's district."""
    sub_admin_user_id = _portal_session_user()
    if not sub_admin_user_id:
        frappe.local.response["http_status_code"] = 401
        return {"ok": False, "message": _("Not logged in.")}

    roles = frappe.get_roles(sub_admin_user_id)
    if not any(role in COMPANY_ROLE_NAMES for role in roles):
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Not a company account.")}

    sub_row = frappe.db.get_value(
        "Scout Company Sub Admin",
        {"sub_admin_user": sub_admin_user_id, "is_active": 1},
        ["district", "state", "company_user"],
        as_dict=True,
    )
    if not sub_row:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Sub-admin record not found.")}

    district = sub_row.district
    page, page_size, offset = pagination_from_request(default_page_size=50, max_page_size=200)

    student_profiles = frappe.get_all(
        "Scout Student Profile",
        filters={"district": district},
        fields=["student_user", "full_name", "email", "city", "state", "district",
                "academic_year", "skills", "resume_file"],
        limit_start=0,
        limit_page_length=2000,
    )
    student_users = [sp.student_user for sp in student_profiles if sp.student_user]
    profile_by_user = {sp.student_user: sp for sp in student_profiles}

    if not student_users:
        return {"ok": True, "data": {"applicants": [], "district": district,
                                      "state": sub_row.state,
                                      "pagination": pagination_meta(page, page_size, 0)}}

    total = frappe.db.count(
        "Scout Application",
        filters={"student_user": ["in", student_users]},
    )

    apps = frappe.get_all(
        "Scout Application",
        filters={"student_user": ["in", student_users]},
        fields=["name", "student_user", "job_id", "application_status", "applied_on"],
        order_by="applied_on desc",
        limit_start=offset,
        limit_page_length=page_size,
    )

    result = []
    for app in apps:
        profile = profile_by_user.get(app.student_user) or {}
        job_title = frappe.get_cached_value("Scout Job", app.job_id, "title") if app.job_id else ""
        result.append({
            "id": app.name,
            "studentUser": app.student_user,
            "fullName": profile.get("full_name") or "",
            "email": profile.get("email") or "",
            "city": profile.get("city") or "",
            "state": profile.get("state") or "",
            "district": profile.get("district") or district,
            "skills": profile.get("skills") or "",
            "academicYear": profile.get("academic_year") or "",
            "jobId": app.job_id or "",
            "jobTitle": job_title or "",
            "status": app.application_status or "",
            "appliedOn": str(app.applied_on or ""),
        })

    return {
        "ok": True,
        "data": {
            "district": district,
            "state": sub_row.state,
            "applicants": result,
            "pagination": pagination_meta(page, page_size, total),
        },
    }
