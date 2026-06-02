import hashlib
import secrets

import frappe
from frappe import _
from frappe.exceptions import OutgoingEmailError
from frappe.model.naming import make_autoname

from scout.api.common import get_tpo_session_user
from scout.api.tpo.helpers import norm
from scout.utils.email import scout_send_email


@frappe.whitelist(methods=["POST"])
def invite_student_minimal():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    email = norm(payload.get("email")).lower()
    branch = norm(payload.get("branch"))
    batch = norm(payload.get("batch"))
    year = norm(payload.get("year"))

    if not email or not branch or not batch or not year:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Email, branch, batch, and year are required.")}

    dup = frappe.db.exists(
        "Scout Student Invite",
        {"email": email, "status": "Pending", "is_active": 1, "created_by_tpo": user_id},
    )
    if dup:
        frappe.local.response["http_status_code"] = 409
        return {"ok": False, "message": _("An active invite is already pending for this email.")}

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = frappe.utils.add_to_date(frappe.utils.now_datetime(), hours=48, as_datetime=True)
    invite_doc = None
    for _attempt in range(3):
        candidate_name = make_autoname("STU-INV-.#####")
        try:
            invite_doc = frappe.get_doc(
                {
                    "doctype": "Scout Student Invite",
                    "email": email,
                    "branch": branch,
                    "batch": batch,
                    "year": year,
                    "token_hash": token_hash,
                    "expires_at": expires_at,
                    "status": "Pending",
                    "is_active": 1,
                    "created_by_tpo": user_id,
                }
            )
            invite_doc.insert(ignore_permissions=True, set_name=candidate_name)
            break
        except frappe.DuplicateEntryError:
            invite_doc = None
            continue

    if not invite_doc:
        frappe.local.response["http_status_code"] = 409
        return {"ok": False, "message": _("Unable to generate unique invite ID. Please try again.")}

    frontend_base_url = (getattr(frappe.conf, "scout_frontend_base_url", "") or "http://localhost:3000").rstrip("/")
    invite_link = f"{frontend_base_url}/student/accept-invite/{raw_token}"
    tpo_name = frappe.get_cached_value("User", user_id, "full_name") or "TPO"
    user_exists = frappe.db.exists("User", email)
    subject = _("Student Invite: Complete your Scout profile")
    if user_exists:
        message = (
            f"Hello,<br><br>"
            f"{tpo_name} linked your account to their college roster on Scout Express.<br><br>"
            f"Log in to the student dashboard, open <strong>Profile</strong>, and confirm your department, branch, and batch under "
            f"<strong>College placement</strong>.<br><br>"
            f"If you prefer not to join under this college, choose <strong>Independent candidate</strong> in the same section.<br><br>"
            "Regards,<br>Scout Express"
        )
    else:
        message = (
            f"Hello,<br><br>"
            f"{tpo_name} invited you to join Scout Express as a student.<br><br>"
            f"Click to create your account and set a password: <a href='{invite_link}'>{invite_link}</a><br>"
            f"After signing in, finish college placement (department, branch, batch) under <strong>Profile</strong>.<br>"
            f"This link expires in 48 hours.<br><br>"
            "Regards,<br>Scout Express"
        )
    frappe.db.commit()
    from scout.api.tpo.student_scope import invalidate_tpo_student_ids_cache

    invalidate_tpo_student_ids_cache(user_id)
    try:
        scout_send_email([email], subject, message)
    except OutgoingEmailError:
        if user_exists:
            return {
                "ok": True,
                "message": _("Email is not configured. Ask the student to log in and confirm placement under Profile → College placement."),
            }
        return {
            "ok": True,
            "message": _("Email is not configured. Share this invite link manually: {0}").format(invite_link),
        }
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Scout API: tpo.invite_student_minimal")
        if user_exists:
            return {
                "ok": True,
                "message": _("Email failed. Ask the student to log in and confirm placement under Profile → College placement."),
            }
        return {"ok": True, "message": _("Email failed due to server issue. Share this invite link manually: {0}").format(invite_link)}
    if user_exists:
        return {"ok": True, "message": _("Invite recorded. The student can confirm placement under Profile after logging in.")}
    return {"ok": True, "message": _("Student invite sent successfully.")}


@frappe.whitelist(methods=["GET"])
def list_student_invites():
    from scout.api.pagination_utils import pagination_from_request, pagination_meta

    user_id, err = get_tpo_session_user()
    if err:
        return err

    page, page_size, offset = pagination_from_request(default_page_size=50, max_page_size=200)
    filters = {"created_by_tpo": user_id}
    total = int(frappe.db.count("Scout Student Invite", filters=filters))
    rows = frappe.get_all(
        "Scout Student Invite",
        filters=filters,
        fields=["name", "email", "branch", "batch", "year", "status", "expires_at", "accepted_at", "creation"],
        order_by="creation desc",
        limit_start=offset,
        limit_page_length=page_size,
    )
    invites = [
        {
            "id": row.get("name"),
            "email": row.get("email") or "",
            "branch": row.get("branch") or "",
            "batch": row.get("batch") or "",
            "year": row.get("year") or "",
            "status": row.get("status") or "Pending",
            "expiresAt": row.get("expires_at") or "",
            "acceptedAt": row.get("accepted_at") or "",
        }
        for row in rows
    ]
    return {
        "ok": True,
        "data": {
            "invites": invites,
            "pagination": pagination_meta(page, page_size, total),
        },
    }
