import hashlib

import frappe
from frappe import _

from scout.api.tpo.helpers import collect_posting_applicants, norm as _norm


@frappe.whitelist(allow_guest=True, methods=["GET"])
def dashboard_by_token(token=None):
    token = _norm(token or frappe.form_dict.get("token"))
    if not token:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid or expired link.")}

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    token_row = frappe.get_value(
        "Scout Company Access Token",
        {"token_hash": token_hash, "is_active": 1},
        ["name", "company_email", "posting_id", "expires_at", "used_at"],
        as_dict=True,
    )
    if not token_row:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Invalid or expired link.")}

    now_dt = frappe.utils.now_datetime()
    expires_at = token_row.get("expires_at")
    if not expires_at or expires_at < now_dt:
        frappe.db.set_value("Scout Company Access Token", token_row.get("name"), "is_active", 0, update_modified=False)
        frappe.db.commit()
        frappe.local.response["http_status_code"] = 410
        return {"ok": False, "message": _("Invalid or expired link.")}

    posting = frappe.get_value(
        "Scout TPO Posting",
        token_row.get("posting_id"),
        [
            "name",
            "title",
            "description",
            "branch",
            "batch",
            "eligibility_criteria",
            "poster_file",
            "application_link",
            "company_email",
            "status",
            "valid_till",
            "created_by_tpo",
            "is_internal_job",
            "batch_audience",
            "target_batches",
        ],
        as_dict=True,
    )
    if not posting:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Invalid or expired link.")}

    if not token_row.get("used_at"):
        frappe.db.set_value("Scout Company Access Token", token_row.get("name"), "used_at", now_dt, update_modified=False)
        frappe.db.commit()

    applicants = collect_posting_applicants(posting)
    return {
        "ok": True,
        "data": {
            "companyEmail": token_row.get("company_email") or posting.get("company_email") or "",
            "posting": {
                "id": posting.get("name"),
                "title": posting.get("title") or "",
                "description": posting.get("description") or "",
                "branch": posting.get("branch") or "",
                "batch": posting.get("batch") or "",
                "eligibilityCriteria": posting.get("eligibility_criteria") or "",
                "posterFile": posting.get("poster_file") or "",
                "applicationLink": posting.get("application_link") or "",
                "status": posting.get("status") or "",
                "validTill": posting.get("valid_till") or "",
            },
            "applicants": applicants,
        },
    }


@frappe.whitelist(allow_guest=True, methods=["POST"])
def replicate_posting_from_magic():
    """Company uses magic link to create a Scout Job from TPO posting and invite colleges."""
    p = frappe.request.get_json(silent=True) or {}
    token = _norm(p.get("token") or frappe.form_dict.get("token"))
    college_emails = p.get("collegeEmails") or []
    if isinstance(college_emails, str):
        college_emails = [e.strip() for e in college_emails.split(",") if e.strip()]
    college_emails = [e.lower().strip() for e in college_emails if e and str(e).strip()]
    if not token or not college_emails:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Token and at least one college email are required.")}

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    token_row = frappe.get_value(
        "Scout Company Access Token",
        {"token_hash": token_hash, "is_active": 1},
        ["name", "company_email", "posting_id"],
        as_dict=True,
    )
    if not token_row:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Invalid or expired link.")}

    posting = frappe.get_value(
        "Scout TPO Posting",
        token_row.posting_id,
        ["title", "description", "branch", "batch", "eligibility_criteria", "company_email"],
        as_dict=True,
    )
    if not posting:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Posting not found.")}

    company_user = frappe.db.get_value("User", {"email": token_row.company_email}, "name")
    if not company_user:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Company account not found. Sign up with the same email first.")}

    job = frappe.get_doc(
        {
            "doctype": "Scout Job",
            "title": posting.title or _("Role from TPO posting"),
            "description": posting.description or "",
            "company_user": company_user,
            "status": "Active",
            "skills": posting.branch or "",
            "location_type": "On-site",
            "openings": 1,
        }
    )
    job.insert(ignore_permissions=True)

    from scout.api.company.jobs_applications import _log_college_invite

    invite_extra = {
        "eligibility_branch": posting.branch or "",
        "eligibility_batch": posting.batch or "",
        "eligibility_note": posting.eligibility_criteria or "",
    }
    sent = 0
    for email in college_emails:
        try:
            _log_college_invite(company_user, job.name, email, _("Replicated from TPO posting"), "Sent", extra=invite_extra)
            sent += 1
        except Exception:
            frappe.log_error(frappe.get_traceback(), "replicate_posting_from_magic invite")

    frappe.db.commit()
    return {
        "ok": True,
        "message": _("Job replicated. {0} college invite(s) sent.").format(sent),
        "data": {"jobId": job.name, "invitesSent": sent},
    }
