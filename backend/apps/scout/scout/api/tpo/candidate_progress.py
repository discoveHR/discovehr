"""TPO candidate progress kanban for company jobs."""

import frappe
from frappe import _

from scout.api.common import get_tpo_session_user, row_to_job
from scout.api.recruitment_journey import college_applicants_for_job_invite, parse_journey_stages
from scout.api.tpo.helpers import norm
from scout.api.tpo.inbound_jobs import _eligible_students_for_invite
from scout.api.tpo.student_scope import tpo_student_ids


KANBAN_STAGES = ["Submitted", "In Review", "Shortlisted", "Rejected", "Selected", "Not applied", "Eligible (no application)"]


@frappe.whitelist(methods=["GET"])
def get_candidate_progress_kanban():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    job_id = norm(frappe.form_dict.get("jobId"))
    invite_id = norm(frappe.form_dict.get("inviteId"))
    if not job_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Job ID is required.")}

    job_row = frappe.db.get_value("Scout Job", job_id, "*", as_dict=True)
    if not job_row:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Job not found.")}

    invite_row = None
    if invite_id:
        invite_row = frappe.db.get_value("Scout Company College Invite", invite_id, "*", as_dict=True)
    else:
        invite_row = frappe.db.get_value(
            "Scout Company College Invite",
            {"job_id": job_id, "tpo_user": user_id, "status": "Sent"},
            "*",
            as_dict=True,
        )

    stages = parse_journey_stages(job_row.get("journey_stages"))
    columns = {s: [] for s in KANBAN_STAGES}

    if invite_row and invite_row.get("tpo_user") == user_id:
        applicants = college_applicants_for_job_invite(job_id, invite_row, tpo_student_ids(user_id))
        for row in applicants:
            status = row.get("applicationStatus") or "Not applied"
            if status == "Not applied" and row.get("eligible"):
                status = "Eligible (no application)"
            if status not in columns:
                columns[status] = []
            columns[status].append(
                {
                    "studentId": row.get("studentId"),
                    "fullName": row.get("fullName"),
                    "email": row.get("email"),
                    "branch": row.get("branch"),
                    "eligible": row.get("eligible"),
                    "suggestedByTpo": row.get("suggestedByTpo"),
                    "applicationStatus": row.get("applicationStatus"),
                    "applicationId": row.get("applicationId"),
                }
            )
    else:
        for row in _eligible_students_for_invite({"eligibility_branch": "", "eligibility_batch": ""}, user_id):
            columns["Eligible (no application)"].append(
                {
                    "studentId": row.get("studentId"),
                    "fullName": row.get("fullName"),
                    "email": row.get("email"),
                    "branch": row.get("branch"),
                    "eligible": True,
                    "applicationStatus": "Not applied",
                }
            )

    return {
        "ok": True,
        "data": {
            "job": row_to_job(job_row),
            "inviteId": (invite_row or {}).get("name") or "",
            "journeyStages": stages,
            "columns": [{"stage": k, "candidates": v} for k, v in columns.items() if v or k in KANBAN_STAGES[:5]],
        },
    }


@frappe.whitelist(methods=["GET"])
def list_kanban_jobs():
    """Jobs with college invites for this TPO."""
    user_id, err = get_tpo_session_user()
    if err:
        return err
    invites = frappe.get_all(
        "Scout Company College Invite",
        filters={"tpo_user": user_id, "status": "Sent", "tpo_response": "Accepted"},
        fields=["name", "job_id", "college_email", "recruitment_stage"],
        order_by="modified desc",
        limit_page_length=100,
    )
    job_ids = list({i.get("job_id") for i in invites if i.get("job_id")})
    jobs_map = {}
    if job_ids:
        for j in frappe.get_all("Scout Job", filters={"name": ["in", job_ids]}, fields=["name", "title", "company_user", "status"]):
            jobs_map[j["name"]] = j
    items = []
    for inv in invites:
        job = jobs_map.get(inv.get("job_id")) or {}
        items.append(
            {
                "inviteId": inv.get("name"),
                "jobId": inv.get("job_id"),
                "jobTitle": job.get("title") or inv.get("job_id"),
                "collegeEmail": inv.get("college_email"),
                "recruitmentStage": inv.get("recruitment_stage"),
            }
        )
    return {"ok": True, "data": {"items": items}}
