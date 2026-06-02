import json

import frappe
from frappe import _

from scout.api.common import get_student_session_user

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


@frappe.whitelist(methods=["GET"])
def list_my_document_requests():
    """Student lists all document requests addressed to them."""
    user_id, err = get_student_session_user()
    if err:
        return err

    rows = frappe.get_all(
        "Scout Document Request",
        filters={"student_user": user_id},
        fields=[
            "name", "application_id", "job_id", "company_user",
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

        company_name = frappe.get_cached_value("User", row.get("company_user"), "full_name") or "Company"
        job_title = frappe.get_cached_value("Scout Job", row.get("job_id"), "title") or ""

        # Build per-doc status
        doc_items = []
        for doc_type in required:
            doc_items.append({
                "docType": doc_type,
                "label": DOC_LABELS.get(doc_type, doc_type),
                "uploaded": bool(uploaded.get(doc_type)),
                "fileUrl": uploaded.get(doc_type) or "",
            })

        items.append({
            "requestId": row.get("name"),
            "applicationId": row.get("application_id"),
            "jobId": row.get("job_id"),
            "companyUser": row.get("company_user"),
            "companyName": company_name,
            "jobTitle": job_title,
            "documents": doc_items,
            "status": row.get("status"),
            "sentAt": str(row.get("sent_at") or ""),
            "note": row.get("note") or "",
        })

    pending_count = sum(1 for item in items if item["status"] in ("Pending", "Partial"))
    return {"ok": True, "data": {"requests": items, "pendingCount": pending_count}}


@frappe.whitelist(methods=["POST"])
def submit_document_upload():
    """Student marks a document as uploaded by providing the file URL."""
    user_id, err = get_student_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    request_id = (payload.get("requestId") or "").strip()
    doc_type = (payload.get("docType") or "").strip()
    file_url = (payload.get("fileUrl") or "").strip()

    if not request_id or not doc_type or not file_url:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("requestId, docType, and fileUrl are required.")}

    req_doc = frappe.get_doc("Scout Document Request", request_id)
    if req_doc.student_user != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("You are not allowed to update this document request.")}

    try:
        required = json.loads(req_doc.required_documents or "[]")
    except Exception:
        required = []

    if doc_type not in required:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("This document type is not in the required list.")}

    try:
        uploaded = json.loads(req_doc.uploaded_documents or "{}")
    except Exception:
        uploaded = {}

    uploaded[doc_type] = file_url
    req_doc.uploaded_documents = json.dumps(uploaded)

    # Update status
    if all(uploaded.get(d) for d in required):
        req_doc.status = "Complete"
    elif any(uploaded.get(d) for d in required):
        req_doc.status = "Partial"
    else:
        req_doc.status = "Pending"

    req_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "ok": True,
        "message": _("Document uploaded successfully."),
        "data": {"status": req_doc.status},
    }
