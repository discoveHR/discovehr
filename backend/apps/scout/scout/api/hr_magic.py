"""Guest HR dashboard via magic token."""

import hashlib

import frappe
from frappe import _

from scout.api.tpo.helpers import collect_posting_applicants


def _norm(value):
    return (value or "").strip()


def _resolve_hr_token(token):
    token = _norm(token)
    if not token:
        return None, _("Invalid or expired link.")
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    row = frappe.get_value(
        "Scout HR Access Token",
        {"token_hash": token_hash, "is_active": 1},
        ["name", "hr_email", "hr_name", "tpo_user", "campus_drive_title", "posting_id", "expires_at", "used_at"],
        as_dict=True,
    )
    if not row:
        return None, _("Invalid or expired link.")
    now_dt = frappe.utils.now_datetime()
    if not row.expires_at or row.expires_at < now_dt:
        frappe.db.set_value("Scout HR Access Token", row.name, "is_active", 0, update_modified=False)
        frappe.db.commit()
        return None, _("Invalid or expired link.")
    if not row.used_at:
        frappe.db.set_value("Scout HR Access Token", row.name, "used_at", now_dt, update_modified=False)
        frappe.db.commit()
    return row, None


@frappe.whitelist(allow_guest=True, methods=["GET"])
def hr_dashboard_by_token(token=None):
    token_row, err_msg = _resolve_hr_token(token or frappe.form_dict.get("token"))
    if not token_row:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": err_msg}

    tpo_profile = frappe.db.get_value(
        "Scout TPO Profile",
        {"tpo_user": token_row.tpo_user},
        ["college_name", "full_name"],
        as_dict=True,
    )
    posting = None
    applicants = []
    if token_row.posting_id:
        posting = frappe.get_value(
            "Scout TPO Posting",
            token_row.posting_id,
            ["name", "title", "description", "branch", "batch", "eligibility_criteria", "status", "valid_till"],
            as_dict=True,
        )
        if posting:
            applicants = collect_posting_applicants(posting)

    return {
        "ok": True,
        "data": {
            "hrEmail": token_row.hr_email,
            "hrName": token_row.hr_name or "",
            "campusDriveTitle": token_row.campus_drive_title or "",
            "tpoName": (tpo_profile or {}).get("full_name") or "",
            "collegeName": (tpo_profile or {}).get("college_name") or "",
            "posting": (
                {
                    "id": posting.name,
                    "title": posting.title or "",
                    "description": posting.description or "",
                    "branch": posting.branch or "",
                    "batch": posting.batch or "",
                    "eligibilityCriteria": posting.eligibility_criteria or "",
                    "status": posting.status or "",
                    "validTill": str(posting.valid_till or ""),
                }
                if posting
                else None
            ),
            "applicants": applicants,
        },
    }
