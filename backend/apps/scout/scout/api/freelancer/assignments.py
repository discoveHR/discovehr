import frappe
from frappe import _

from scout.api.common import get_freelancer_session_user


def _serialize_assignment(row):
    company_name = frappe.get_cached_value("User", row.get("company_user"), "full_name") or "Company"
    student_name = frappe.get_cached_value("User", row.get("student_user"), "full_name") or "Candidate"
    job_title = frappe.get_value("Scout Job", row.get("job_id"), "title") or ""
    return {
        "id": row.get("name"),
        "applicationId": row.get("application_id"),
        "jobId": row.get("job_id"),
        "jobTitle": job_title,
        "companyName": company_name,
        "candidateId": row.get("student_user"),
        "candidateName": student_name,
        "title": row.get("title") or "",
        "interviewType": row.get("interview_type") or "Freelancer",
        "startDatetime": str(row.get("start_datetime") or ""),
        "endDatetime": str(row.get("end_datetime") or ""),
        "meetingLink": row.get("meeting_link") or "",
        "location": row.get("location") or "",
        "notes": row.get("notes") or "",
        "status": row.get("status") or "Scheduled",
    }


@frappe.whitelist(methods=["GET"])
def list_freelancer_interview_assignments():
    user_id, err = get_freelancer_session_user()
    if err:
        return err

    rows = frappe.get_all(
        "Scout Company Interview",
        filters={
            "freelancer_interviewer_user": user_id,
            "status": ["!=", "Cancelled"],
            "interview_type": "Freelancer",
        },
        fields="*",
        order_by="start_datetime desc",
        limit_page_length=200,
    )
    return {"ok": True, "data": {"assignments": [_serialize_assignment(r) for r in rows]}}
