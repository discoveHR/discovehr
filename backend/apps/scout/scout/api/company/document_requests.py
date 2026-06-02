import json

import frappe
from frappe import _
from frappe.exceptions import OutgoingEmailError

from scout.api.common import get_company_session_user
from scout.utils.email import scout_send_email

ALLOWED_DOC_TYPES = {
    "internship_certificate",
    "aadhar_card",
    "10th_certificate",
    "12th_certificate",
    "degree_certificate",
    "resume",
    "passport_photo",
    "experience_letter",
    "bank_passbook",
}

DOC_LABELS = {
    "internship_certificate": "Internship Certificate",
    "aadhar_card": "Aadhar Card",
    "10th_certificate": "10th Certificate (SSC / Matriculation)",
    "12th_certificate": "12th Certificate (+2 / HSC / Intermediate)",
    "degree_certificate": "Degree Certificate",
    "resume": "Resume / CV",
    "passport_photo": "Passport Size Photo",
    "experience_letter": "Experience Letter",
    "bank_passbook": "Bank Passbook / Cancelled Cheque",
}


@frappe.whitelist(methods=["POST"])
def request_documents():
    """Company sends a document request to a selected/shortlisted student."""
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    application_id = (payload.get("applicationId") or "").strip()
    required_docs = payload.get("requiredDocuments") or []
    note = (payload.get("note") or "").strip()

    if not application_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Application ID is required.")}

    if not isinstance(required_docs, list) or not required_docs:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Select at least one required document.")}

    # Validate doc types
    valid_docs = [d for d in required_docs if d in ALLOWED_DOC_TYPES]
    if not valid_docs:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("No valid document types provided.")}

    # Verify company owns the application's job
    app_doc = frappe.get_doc("Scout Application", application_id)
    job_owner = frappe.db.get_value("Scout Job", app_doc.job_id, "company_user")
    if job_owner != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("You are not allowed to request documents for this application.")}

    # Check if a document request already exists — update it instead of duplicate
    existing = frappe.get_all(
        "Scout Document Request",
        filters={"application_id": application_id, "company_user": user_id},
        fields=["name"],
        limit_page_length=1,
    )

    if existing:
        req_doc = frappe.get_doc("Scout Document Request", existing[0]["name"])
        req_doc.required_documents = json.dumps(valid_docs)
        req_doc.status = "Pending"
        req_doc.sent_at = frappe.utils.now_datetime()
        if note:
            req_doc.note = note
        req_doc.save(ignore_permissions=True)
        req_name = req_doc.name
    else:
        req_doc = frappe.get_doc({
            "doctype": "Scout Document Request",
            "application_id": application_id,
            "job_id": app_doc.job_id,
            "company_user": user_id,
            "student_user": app_doc.student_user,
            "required_documents": json.dumps(valid_docs),
            "uploaded_documents": "{}",
            "status": "Pending",
            "sent_at": frappe.utils.now_datetime(),
            "note": note,
        })
        req_doc.insert(ignore_permissions=True)
        req_name = req_doc.name

    frappe.db.commit()

    # Send email notification to student
    student_email = frappe.get_cached_value("User", app_doc.student_user, "email")
    student_name = frappe.get_cached_value("User", app_doc.student_user, "full_name") or "Candidate"
    company_name = frappe.get_cached_value("User", user_id, "full_name") or "Company"
    job_title = frappe.get_value("Scout Job", app_doc.job_id, "title") or "the position"
    frontend_base_url = (getattr(frappe.conf, "scout_frontend_base_url", "") or "http://localhost:3000").rstrip("/")
    portal_link = f"{frontend_base_url}/student/dashboard"

    doc_list_html = "".join(
        f"<li>{DOC_LABELS.get(d, d)}</li>" for d in valid_docs
    )

    subject = _("Document Upload Required — {0} at {1}").format(job_title, company_name)
    message = (
        f"Dear {student_name},<br><br>"
        f"Congratulations on progressing in your application for <b>{job_title}</b> at {company_name}!<br><br>"
        f"To proceed further, please upload the following documents in your student portal:<br>"
        f"<ul>{doc_list_html}</ul>"
        f"{f'<b>Note from {company_name}:</b> {note}<br><br>' if note else ''}"
        f"Please log in to your portal and navigate to <b>Documents</b> to upload:<br>"
        f"<a href='{portal_link}'>{portal_link}</a><br><br>"
        f"Regards,<br>{company_name}"
    )

    email_sent = False
    email_warning = ""
    if student_email:
        try:
            scout_send_email([student_email], subject, message)
            email_sent = True
        except OutgoingEmailError:
            email_warning = _("Document request saved, but email could not be sent.")
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Document Request Email Error")
            email_warning = _("Document request saved, but email delivery failed.")

    result_msg = _("Document request sent to student successfully.") if email_sent else (
        email_warning or _("Document request saved. Email notification could not be sent.")
    )
    return {"ok": True, "message": result_msg, "data": {"requestId": req_name}}


@frappe.whitelist(methods=["GET"])
def list_document_requests():
    """Company lists document requests for a specific application or all their applications."""
    user_id, err = get_company_session_user()
    if err:
        return err

    application_id = (frappe.form_dict.get("applicationId") or "").strip()
    filters = {"company_user": user_id}
    if application_id:
        filters["application_id"] = application_id

    rows = frappe.get_all(
        "Scout Document Request",
        filters=filters,
        fields=[
            "name", "application_id", "job_id", "student_user",
            "required_documents", "uploaded_documents", "status", "sent_at", "note",
        ],
        order_by="sent_at desc",
        limit_page_length=200,
    )

    items = []
    for row in rows:
        try:
            required = json.loads(row.get("required_documents") or "[]")
        except Exception:
            required = []
        try:
            uploaded = json.loads(row.get("uploaded_documents") or "{}")
        except Exception:
            uploaded = {}
        student_name = frappe.get_cached_value("User", row.get("student_user"), "full_name") or ""
        items.append({
            "requestId": row.get("name"),
            "applicationId": row.get("application_id"),
            "jobId": row.get("job_id"),
            "studentUser": row.get("student_user"),
            "studentName": student_name,
            "requiredDocuments": required,
            "uploadedDocuments": uploaded,
            "status": row.get("status"),
            "sentAt": str(row.get("sent_at") or ""),
            "note": row.get("note") or "",
        })

    return {"ok": True, "data": {"requests": items}}
