import csv
import hashlib
import io
import secrets

import frappe
from frappe import _
from frappe.exceptions import OutgoingEmailError
from frappe.utils import cint

from scout.api.common import get_tpo_session_user
from scout.api.tpo.helpers import collect_posting_applicants, norm, serialize_posting
from scout.utils.email import scout_send_email


def _notify_students_internal_posting(posting_row, tpo_user_id):
    """Send email to students matching posting audience (internal jobs only)."""
    if not cint(posting_row.get("is_internal_job")):
        return 0, 0
    if norm(posting_row.get("status")) != "Active":
        return 0, 0
    link = norm(posting_row.get("application_link"))
    if not link:
        return 0, 0

    applicants = collect_posting_applicants(posting_row)
    tpo_name = frappe.get_cached_value("User", tpo_user_id, "full_name") or "Training & Placement Office"
    title = norm(posting_row.get("title")) or _("Placement opportunity")
    subject = _("New internal posting: {0}").format(title)
    sent = 0
    failed = 0
    for row in applicants:
        email = norm(row.get("studentEmail")).lower()
        if not email or "@" not in email:
            failed += 1
            continue
        message = (
            f"Hello {norm(row.get('studentName')) or ''},<br><br>"
            f"{tpo_name} has published a new internal placement opportunity:<br>"
            f"<b>{title}</b><br><br>"
            f"{norm(posting_row.get('description')) or ''}<br><br>"
            f"<a href='{link}'>View details and apply</a><br><br>"
            "Regards,<br>DiscoveHR"
        )
        try:
            scout_send_email([email], subject, message)
            sent += 1
        except OutgoingEmailError:
            failed += 1
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Scout API: internal posting notify")
            failed += 1
    return sent, failed


@frappe.whitelist(methods=["POST"])
def create_tpo_posting():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    title = norm(payload.get("title"))
    branch = norm(payload.get("branch")) or "All"
    batch = norm(payload.get("batch"))
    company_email = norm(payload.get("companyEmail")).lower()
    is_internal = cint(payload.get("isInternalJob"))
    batch_audience = norm(payload.get("batchAudience")) or ("All Students" if is_internal else "Specific Batches")
    if batch_audience not in ("All Students", "Specific Batches"):
        batch_audience = "Specific Batches"
    target_batches = norm(payload.get("targetBatches"))
    notify_students = cint(payload.get("notifyStudents", 1))

    if not title:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Title is required.")}

    if is_internal:
        if batch_audience == "Specific Batches" and not (target_batches or batch):
            frappe.local.response["http_status_code"] = 400
            return {"ok": False, "message": _("Target batches (or Batch) is required for batch-wise postings.")}
        if not norm(payload.get("applicationLink")):
            frappe.local.response["http_status_code"] = 400
            return {"ok": False, "message": _("Application link is required for internal job postings.")}
    else:
        if not branch or not batch or not company_email:
            frappe.local.response["http_status_code"] = 400
            return {"ok": False, "message": _("Title, branch, batch and company email are required.")}

    doc = frappe.get_doc(
        {
            "doctype": "Scout TPO Posting",
            "title": title,
            "description": norm(payload.get("description")),
            "branch": branch,
            "batch": batch,
            "eligibility_criteria": norm(payload.get("eligibilityCriteria")),
            "poster_file": norm(payload.get("posterFile")),
            "application_link": norm(payload.get("applicationLink")),
            "company_email": company_email,
            "status": norm(payload.get("status")) or "Draft",
            "created_by_tpo": user_id,
            "valid_till": norm(payload.get("validTill")) or None,
            "is_internal_job": 1 if is_internal else 0,
            "batch_audience": batch_audience,
            "target_batches": target_batches,
            "posting_type": norm(payload.get("postingType")) or "Other",
            "audience_description": norm(payload.get("audienceDescription")),
        }
    )
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    row = doc.as_dict()
    notify_msg = ""
    if is_internal and notify_students and norm(doc.status) == "Active":
        sent, failed = _notify_students_internal_posting(row, user_id)
        notify_msg = " " + _("Notifications sent to {0} student(s).").format(sent)
        if failed:
            notify_msg += " " + _("{0} could not be emailed (check Mailgun or Frappe email configuration).").format(failed)

    return {
        "ok": True,
        "message": _("TPO posting created successfully.") + notify_msg,
        "data": {"posting": serialize_posting(row)},
    }


@frappe.whitelist(methods=["GET"])
def list_tpo_postings():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    kind = norm(frappe.form_dict.get("postingKind")).lower()
    filters = {"created_by_tpo": user_id}
    if kind == "internal":
        filters["is_internal_job"] = 1
    elif kind == "company":
        filters["is_internal_job"] = 0

    rows = frappe.get_all(
        "Scout TPO Posting",
        filters=filters,
        fields=[
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
            "created_by_tpo",
            "valid_till",
            "creation",
            "is_internal_job",
            "batch_audience",
            "target_batches",
            "posting_type",
            "audience_description",
        ],
        order_by="creation desc",
        ignore_permissions=True,
    )
    postings = [serialize_posting(row) for row in rows]
    return {"ok": True, "data": {"postings": postings}}


@frappe.whitelist(methods=["GET"])
def get_tpo_posting_applicants():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    posting_id = norm(frappe.form_dict.get("postingId"))
    if not posting_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Posting ID is required.")}

    posting = frappe.get_value(
        "Scout TPO Posting",
        posting_id,
        [
            "name",
            "title",
            "branch",
            "batch",
            "eligibility_criteria",
            "company_email",
            "created_by_tpo",
            "is_internal_job",
            "batch_audience",
            "target_batches",
            "application_link",
            "description",
            "status",
        ],
        as_dict=True,
        ignore_permissions=True,
    )
    if not posting or posting.get("created_by_tpo") != user_id:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Posting not found.")}

    applicants = collect_posting_applicants(posting)
    return {"ok": True, "data": {"applicants": applicants, "posting": serialize_posting(posting)}}


@frappe.whitelist(methods=["GET"])
def download_tpo_applicants():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    posting_id = norm(frappe.form_dict.get("postingId"))
    if not posting_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Posting ID is required.")}

    posting = frappe.get_value(
        "Scout TPO Posting",
        posting_id,
        [
            "name",
            "title",
            "branch",
            "batch",
            "eligibility_criteria",
            "company_email",
            "created_by_tpo",
            "is_internal_job",
            "batch_audience",
            "target_batches",
            "application_link",
            "description",
            "status",
        ],
        as_dict=True,
        ignore_permissions=True,
    )
    if not posting or posting.get("created_by_tpo") != user_id:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Posting not found.")}

    applicants = collect_posting_applicants(posting)
    stream = io.StringIO()
    writer = csv.writer(stream)
    writer.writerow(["Student ID", "Name", "Email", "Branch", "Batch", "Course/Class/Grade", "Resume File"])
    for row in applicants:
        writer.writerow(
            [
                row.get("studentId") or "",
                row.get("studentName") or "",
                row.get("studentEmail") or "",
                row.get("branch") or "",
                row.get("batch") or "",
                row.get("courseClassGrade") or "",
                row.get("resumeFile") or "",
            ]
        )

    file_name = f"tpo_applicants_{posting_id}.csv"
    frappe.local.response.filename = file_name
    frappe.local.response.filecontent = stream.getvalue()
    frappe.local.response.type = "download"


@frappe.whitelist(methods=["POST"])
def send_company_dashboard_link():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    posting_id = norm(payload.get("postingId"))
    if not posting_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Posting ID is required.")}

    posting = frappe.get_value(
        "Scout TPO Posting",
        posting_id,
        ["name", "title", "company_email", "created_by_tpo", "is_internal_job"],
        as_dict=True,
        ignore_permissions=True,
    )
    if not posting or posting.get("created_by_tpo") != user_id:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Posting not found.")}

    if cint(posting.get("is_internal_job")):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Special company dashboard link is only for company placement postings.")}

    company_email = norm(posting.get("company_email")).lower()
    if not company_email:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Company email is missing on this posting.")}

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = frappe.utils.add_to_date(frappe.utils.now_datetime(), hours=24, as_datetime=True)
    token_doc = frappe.get_doc(
        {
            "doctype": "Scout Company Access Token",
            "token_hash": token_hash,
            "company_email": company_email,
            "posting_id": posting_id,
            "expires_at": expires_at,
            "is_active": 1,
        }
    )
    token_doc.insert(ignore_permissions=True)

    from scout.utils.env_config import get_frontend_base_url
    frontend_base_url = get_frontend_base_url()
    magic_link = f"{frontend_base_url}/company/special/{raw_token}"
    tpo_name = frappe.get_cached_value("User", user_id, "full_name") or "TPO"
    subject = _("Special Access Dashboard for {0}").format(posting.get("title") or "TPO posting")
    message = (
        f"Hello,<br><br>"
        f"{tpo_name} has shared a special access dashboard for the posting "
        f"<b>{posting.get('title') or 'TPO Posting'}</b>.<br><br>"
        f"Open dashboard (no login required): <a href='{magic_link}'>{magic_link}</a><br>"
        f"This link expires in 24 hours.<br><br>"
        "Regards,<br>DiscoveHR"
    )

    try:
        scout_send_email([company_email], subject, message)
    except OutgoingEmailError:
        frappe.local.response["http_status_code"] = 500
        return {"ok": False, "message": _("Could not send email. Configure Postmark (SCOUT_POSTMARK_SERVER_TOKEN) or Frappe outgoing email.")}
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Scout API: tpo.send_company_dashboard_link")
        frappe.local.response["http_status_code"] = 500
        return {"ok": False, "message": _("Email delivery failed due to a server issue.")}

    frappe.db.commit()
    return {"ok": True, "message": _("Special dashboard link sent successfully.")}
