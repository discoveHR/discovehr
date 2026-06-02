"""Admin referral management — view and update freelancer-referred candidates."""

from __future__ import annotations

import frappe
from frappe import _

from scout.api.common import get_admin_session_user

_ADMIN_REFERRAL_FIELDS = [
    "name", "job_id", "job_title", "referred_by_user", "referred_by_name",
    "candidate_name", "candidate_email", "candidate_phone",
    "status", "notes", "uploaded_at",
]


def _admin_referral_to_dict(r) -> dict:
    return {
        "referralId": r["name"],
        "jobId": r["job_id"],
        "jobTitle": r.get("job_title") or "",
        "referredByUser": r["referred_by_user"],
        "referredByName": r.get("referred_by_name") or "",
        "candidateName": r["candidate_name"],
        "candidateEmail": r["candidate_email"],
        "candidatePhone": r.get("candidate_phone") or "",
        "status": r["status"],
        "notes": r.get("notes") or "",
        "uploadedAt": str(r["uploaded_at"]) if r.get("uploaded_at") else "",
    }


def _build_filters() -> dict:
    job_filter = (frappe.form_dict.get("jobId") or "").strip()
    recruiter_filter = (frappe.form_dict.get("freelancerUser") or "").strip()
    status_filter = (frappe.form_dict.get("status") or "").strip()
    filters: dict = {}
    if job_filter:
        filters["job_id"] = job_filter
    if recruiter_filter:
        filters["referred_by_user"] = recruiter_filter
    if status_filter:
        filters["status"] = status_filter
    return filters


@frappe.whitelist(methods=["GET"])
def list_all_referrals():
    admin_id, err = get_admin_session_user()
    if err:
        return err

    page = int(frappe.form_dict.get("page") or 1)
    page_size = min(int(frappe.form_dict.get("pageSize") or 50), 200)
    offset = (page - 1) * page_size
    filters = _build_filters()
    total = frappe.db.count("Scout Freelancer Referral", filters)

    rows = frappe.get_all(
        "Scout Freelancer Referral",
        filters=filters,
        fields=_ADMIN_REFERRAL_FIELDS,
        order_by="uploaded_at desc",
        limit_start=offset,
        limit_page_length=page_size,
    )

    return {
        "ok": True,
        "data": {
            "referrals": [_admin_referral_to_dict(r) for r in rows],
            "pagination": {
                "total": total,
                "page": page,
                "pageSize": page_size,
                "totalPages": max(1, -(-total // page_size)),
            },
        },
    }


@frappe.whitelist(methods=["GET"])
def export_all_referrals():
    """Return all referrals (no pagination cap, up to 5000) for CSV download."""
    admin_id, err = get_admin_session_user()
    if err:
        return err

    filters = _build_filters()
    rows = frappe.get_all(
        "Scout Freelancer Referral",
        filters=filters,
        fields=_ADMIN_REFERRAL_FIELDS,
        order_by="uploaded_at desc",
        limit_page_length=5000,
    )

    return {"ok": True, "data": {"referrals": [_admin_referral_to_dict(r) for r in rows]}}


@frappe.whitelist(methods=["POST"])
def update_referral_status():
    admin_id, err = get_admin_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    referral_id = (payload.get("referralId") or "").strip()
    status = (payload.get("status") or "").strip()
    notes = (payload.get("notes") or "").strip()

    valid_statuses = {"Pending", "Contacted", "Applied", "Rejected"}
    if not referral_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Referral ID is required.")}
    if status not in valid_statuses:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid status.")}

    if not frappe.db.exists("Scout Freelancer Referral", referral_id):
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Referral not found.")}

    update = {"status": status}
    if notes:
        update["notes"] = notes

    frappe.db.set_value("Scout Freelancer Referral", referral_id, update)
    try:
        frappe.db.commit()
    except Exception:
        pass

    return {"ok": True, "message": _("Referral status updated.")}


@frappe.whitelist(methods=["GET"])
def list_referral_recruiters():
    """Return distinct freelancer users who have submitted referrals — for filter dropdown."""
    admin_id, err = get_admin_session_user()
    if err:
        return err

    rows = frappe.db.sql(
        """
        SELECT DISTINCT referred_by_user, referred_by_name
        FROM `tabScout Freelancer Referral`
        ORDER BY referred_by_name
        """,
        as_dict=True,
    )

    recruiters = [
        {"userId": r["referred_by_user"], "name": r.get("referred_by_name") or r["referred_by_user"]}
        for r in rows
    ]

    return {"ok": True, "data": {"recruiters": recruiters}}
