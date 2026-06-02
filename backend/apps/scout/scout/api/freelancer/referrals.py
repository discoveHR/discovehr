"""Freelancer candidate referral API — CSV upload and referral management."""

from __future__ import annotations

import json

import frappe
from frappe import _
from frappe.utils import now_datetime

from scout.api.common import get_freelancer_session_user


def _referral_to_dict(r) -> dict:
    return {
        "referralId": r["name"],
        "jobId": r["job_id"],
        "jobTitle": r.get("job_title") or "",
        "candidateName": r["candidate_name"],
        "candidateEmail": r["candidate_email"],
        "candidatePhone": r.get("candidate_phone") or "",
        "status": r["status"],
        "notes": r.get("notes") or "",
        "uploadedAt": str(r["uploaded_at"]) if r.get("uploaded_at") else "",
    }


def _get_open_jobs() -> list[dict]:
    rows = frappe.db.sql(
        """
        SELECT j.name, j.title, COALESCE(u.full_name, '') AS company_name
        FROM `tabScout Job` j
        LEFT JOIN `tabUser` u ON u.name = j.company_user
        WHERE j.status = 'Active'
        ORDER BY j.creation DESC
        LIMIT 200
        """,
        as_dict=True,
    )
    return [
        {
            "jobId": r["name"],
            "title": r.get("title") or "",
            "companyName": r.get("company_name") or "",
        }
        for r in rows
    ]


@frappe.whitelist(methods=["GET"])
def list_open_jobs_for_referral():
    user_id, err = get_freelancer_session_user()
    if err:
        return err
    try:
        jobs = _get_open_jobs()
        return {"ok": True, "data": {"jobs": jobs}}
    except Exception:
        frappe.log_error(frappe.get_traceback(), "list_open_jobs_for_referral")
        frappe.local.response["http_status_code"] = 500
        return {"ok": False, "message": _("Failed to load jobs.")}


@frappe.whitelist(methods=["POST"])
def submit_csv_referrals():
    user_id, err = get_freelancer_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    job_id = (payload.get("jobId") or "").strip()
    candidates = payload.get("candidates") or []

    if not job_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Job is required.")}

    if not frappe.db.exists("Scout Job", job_id):
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Job not found.")}

    if not isinstance(candidates, list) or len(candidates) == 0:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("No candidates provided.")}

    if len(candidates) > 500:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Maximum 500 candidates per upload.")}

    job_title = frappe.db.get_value("Scout Job", job_id, "title") or ""
    recruiter_name = frappe.get_cached_value("User", user_id, "full_name") or user_id
    uploaded_at = now_datetime()

    created = 0
    skipped = 0
    errors: list[str] = []

    for i, candidate in enumerate(candidates):
        if not isinstance(candidate, dict):
            skipped += 1
            continue

        name = (candidate.get("name") or candidate.get("candidateName") or "").strip()
        email = (candidate.get("email") or candidate.get("candidateEmail") or "").strip().lower()
        phone = (candidate.get("phone") or candidate.get("candidatePhone") or "").strip()

        if not name or not email:
            skipped += 1
            errors.append(f"Row {i + 1}: name and email are required.")
            continue

        if frappe.db.exists(
            "Scout Freelancer Referral",
            {"job_id": job_id, "candidate_email": email},
        ):
            skipped += 1
            errors.append(f"Row {i + 1}: {email} already referred for this job.")
            continue

        try:
            frappe.get_doc({
                "doctype": "Scout Freelancer Referral",
                "job_id": job_id,
                "job_title": job_title,
                "referred_by_user": user_id,
                "referred_by_name": recruiter_name,
                "candidate_name": name,
                "candidate_email": email,
                "candidate_phone": phone,
                "status": "Pending",
                "uploaded_at": uploaded_at,
            }).insert(ignore_permissions=True)
            created += 1
        except Exception:
            frappe.log_error(frappe.get_traceback(), "submit_csv_referrals: row insert")
            skipped += 1
            errors.append(f"Row {i + 1}: failed to save.")

    try:
        frappe.db.commit()
    except Exception:
        pass

    return {
        "ok": True,
        "data": {
            "created": created,
            "skipped": skipped,
            "errors": errors[:10],
        },
        "message": _(f"{created} candidate(s) referred successfully."),
    }


_REFERRAL_FIELDS = [
    "name", "job_id", "job_title", "candidate_name",
    "candidate_email", "candidate_phone", "status",
    "notes", "uploaded_at",
]


@frappe.whitelist(methods=["GET"])
def list_my_referrals():
    user_id, err = get_freelancer_session_user()
    if err:
        return err

    page = int(frappe.form_dict.get("page") or 1)
    page_size = min(int(frappe.form_dict.get("pageSize") or 50), 200)
    offset = (page - 1) * page_size

    total = frappe.db.count("Scout Freelancer Referral", {"referred_by_user": user_id})

    rows = frappe.get_all(
        "Scout Freelancer Referral",
        filters={"referred_by_user": user_id},
        fields=_REFERRAL_FIELDS,
        order_by="uploaded_at desc",
        limit_start=offset,
        limit_page_length=page_size,
    )

    return {
        "ok": True,
        "data": {
            "referrals": [_referral_to_dict(r) for r in rows],
            "pagination": {
                "total": total,
                "page": page,
                "pageSize": page_size,
                "totalPages": max(1, -(-total // page_size)),
            },
        },
    }


@frappe.whitelist(methods=["GET"])
def export_my_referrals():
    """Return all referrals for this freelancer (no pagination cap) for CSV download."""
    user_id, err = get_freelancer_session_user()
    if err:
        return err

    job_filter = (frappe.form_dict.get("jobId") or "").strip()
    filters: dict = {"referred_by_user": user_id}
    if job_filter:
        filters["job_id"] = job_filter

    rows = frappe.get_all(
        "Scout Freelancer Referral",
        filters=filters,
        fields=_REFERRAL_FIELDS,
        order_by="uploaded_at desc",
        limit_page_length=5000,
    )

    return {"ok": True, "data": {"referrals": [_referral_to_dict(r) for r in rows]}}
