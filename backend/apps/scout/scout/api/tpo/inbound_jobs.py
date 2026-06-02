"""TPO inbound recruitment requests from companies."""

import frappe
from frappe import _
from frappe.utils import now_datetime

from scout.api.common import get_tpo_session_user, row_to_job
from scout.api.recruitment_journey import college_applicants_for_job_invite, parse_journey_stages
from scout.api.tpo.helpers import norm
from scout.api.query_utils import get_all_chunked
from scout.api.tpo.student_scope import tpo_student_ids

TPO_ROLE_NAMES = frozenset({"Training & Placement Officer", "Training and Placement Officer", "TPO"})


def _resolve_tpo_user_for_college_email(college_email: str) -> str | None:
    email = norm(college_email).lower()
    if not email or "@" not in email:
        return None
    if frappe.db.exists("User", email):
        roles = frappe.get_roles(email)
        if any(r in TPO_ROLE_NAMES for r in roles):
            return email
    return None


def _serialize_invite_row(row: dict, job_row: dict | None = None) -> dict:
    job = job_row or {}
    company_user = row.get("company_user") or job.get("company_user")
    return {
        "id": row.get("name"),
        "jobId": row.get("job_id"),
        "jobTitle": job.get("title") or frappe.get_cached_value("Scout Job", row.get("job_id"), "title") or "",
        "companyName": frappe.get_cached_value("User", company_user, "full_name") if company_user else "",
        "companyUser": company_user or "",
        "collegeEmail": row.get("college_email") or "",
        "emailStatus": row.get("status") or "",
        "tpoResponse": row.get("tpo_response") or "Pending",
        "recruitmentStage": row.get("recruitment_stage") or "Request Received",
        "applicationDeadline": str(row.get("application_deadline") or ""),
        "eligibilityBranch": row.get("eligibility_branch") or "",
        "eligibilityBatch": row.get("eligibility_batch") or "",
        "eligibilityNote": row.get("eligibility_note") or "",
        "companyNote": row.get("note") or "",
        "declineReason": row.get("decline_reason") or "",
        "sentAt": str(row.get("sent_at") or row.get("creation") or ""),
        "tpoRespondedAt": str(row.get("tpo_responded_at") or ""),
        "job": row_to_job(job) if job.get("name") else None,
    }


def _eligible_students_for_invite(invite_row: dict, tpo_user_id: str) -> list[dict]:
    student_ids = tpo_student_ids(tpo_user_id)
    branch_filter = norm(invite_row.get("eligibility_branch")).lower()
    batch_filter = norm(invite_row.get("eligibility_batch")).lower()

    rows = (
        get_all_chunked(
            "Scout Student Profile",
            list(student_ids),
            fields=["student_user", "full_name", "email", "department_stream", "academic_year", "course_class_grade", "resume_file"],
        )
        if student_ids
        else []
    )
    out = []
    for row in rows:
        if branch_filter:
            if branch_filter not in norm(row.get("department_stream")).lower():
                continue
        if batch_filter:
            hay = f"{norm(row.get('academic_year'))} {norm(row.get('course_class_grade'))}".lower()
            if batch_filter not in hay:
                continue
        out.append(
            {
                "studentId": row.get("student_user"),
                "fullName": row.get("full_name") or "",
                "email": row.get("email") or "",
                "branch": row.get("department_stream") or "",
                "batch": row.get("academic_year") or "",
                "courseClassGrade": row.get("course_class_grade") or "",
                "resumeFile": row.get("resume_file") or "",
            }
        )
    return out


def _suggested_students_for_invite(invite_id: str) -> list[dict]:
    rows = frappe.get_all(
        "Scout Inbound Job Suggestion",
        filters={"college_invite_id": invite_id},
        fields=["student_user", "job_id", "bypass_pri", "creation"],
        order_by="creation desc",
        limit_page_length=500,
    )
    out = []
    for row in rows:
        uid = row.get("student_user")
        prof = frappe.db.get_value(
            "Scout Student Profile",
            {"student_user": uid},
            ["full_name", "email", "department_stream", "academic_year"],
            as_dict=True,
        )
        out.append(
            {
                "studentId": uid,
                "fullName": (prof or {}).get("full_name") or frappe.get_cached_value("User", uid, "full_name") or "",
                "email": (prof or {}).get("email") or frappe.get_cached_value("User", uid, "email") or "",
                "branch": (prof or {}).get("department_stream") or "",
                "batch": (prof or {}).get("academic_year") or "",
                "bypassPri": bool(row.get("bypass_pri")),
            }
        )
    return out


@frappe.whitelist(methods=["GET"])
def list_inbound_jobs():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    filter_response = norm(frappe.form_dict.get("tpoResponse"))
    invite_fields = [
        "name",
        "company_user",
        "job_id",
        "college_email",
        "tpo_user",
        "status",
        "tpo_response",
        "recruitment_stage",
        "application_deadline",
        "eligibility_branch",
        "eligibility_batch",
        "eligibility_note",
        "sent_at",
        "tpo_responded_at",
        "note",
        "decline_reason",
        "creation",
    ]

    or_filters = [
        ["tpo_user", "=", user_id],
        ["college_email", "=", user_id],
    ]
    filters = {"status": "Sent"}
    if filter_response:
        filters["tpo_response"] = filter_response

    rows = frappe.get_all(
        "Scout Company College Invite",
        filters=filters,
        or_filters=or_filters,
        fields=invite_fields,
        order_by="creation desc",
        limit_page_length=200,
    )

    job_ids = {r.get("job_id") for r in rows if r.get("job_id")}
    jobs_map = {}
    if job_ids:
        for j in frappe.get_all(
            "Scout Job",
            filters={"name": ["in", list(job_ids)]},
            fields=[
                "name",
                "company_user",
                "title",
                "opportunity_type",
                "location_type",
                "openings",
                "skills",
                "min_experience",
                "status",
                "total_views",
                "applications",
                "description",
                "creation",
            ],
        ):
            jobs_map[j["name"]] = j

    items = [_serialize_invite_row(r, jobs_map.get(r.get("job_id"))) for r in rows]
    pending = sum(1 for i in items if i.get("tpoResponse") == "Pending")
    return {"ok": True, "data": {"inboundJobs": items, "summary": {"pending": pending, "total": len(items)}}}


@frappe.whitelist(methods=["GET"])
def get_inbound_job_detail():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    invite_id = norm(frappe.form_dict.get("inviteId"))
    if not invite_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invite ID is required.")}

    row = frappe.db.get_value(
        "Scout Company College Invite",
        invite_id,
        [
            "name",
            "company_user",
            "job_id",
            "college_email",
            "tpo_user",
            "status",
            "tpo_response",
            "recruitment_stage",
            "application_deadline",
            "eligibility_branch",
            "eligibility_batch",
            "eligibility_note",
            "sent_at",
            "tpo_responded_at",
            "note",
            "decline_reason",
        ],
        as_dict=True,
    )
    if not row or row.get("status") != "Sent":
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Inbound request not found.")}
    if row.get("tpo_user") and row.get("tpo_user") != user_id and row.get("college_email") != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("You are not allowed to view this request.")}

    job_row = frappe.db.get_value(
        "Scout Job",
        row.get("job_id"),
        [
            "name",
            "company_user",
            "title",
            "opportunity_type",
            "location_type",
            "openings",
            "skills",
            "min_experience",
            "status",
            "total_views",
            "applications",
            "description",
            "creation",
            "journey_stages",
        ],
        as_dict=True,
    )

    invite_payload = _serialize_invite_row(row, job_row or {})
    stages = parse_journey_stages((job_row or {}).get("journey_stages"))
    student_ids = tpo_student_ids(user_id)
    return {
        "ok": True,
        "data": {
            "invite": invite_payload,
            "eligibleStudents": _eligible_students_for_invite(row, user_id),
            "suggestedStudents": _suggested_students_for_invite(invite_id),
            "collegeApplicants": college_applicants_for_job_invite(row.get("job_id"), row, student_ids),
            "stages": stages,
            "journeyStages": stages,
        },
    }


@frappe.whitelist(methods=["POST"])
def respond_inbound_job():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    invite_id = norm(payload.get("inviteId"))
    decision = norm(payload.get("decision")).lower()
    reason = norm(payload.get("reason"))
    recruitment_stage = norm(payload.get("recruitmentStage"))

    if not invite_id or decision not in ("accept", "decline"):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invite ID and decision (accept/decline) are required.")}
    if decision == "decline" and not reason:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Please provide a reason when declining.")}

    doc = frappe.get_doc("Scout Company College Invite", invite_id)
    if doc.status != "Sent":
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("This request cannot be updated.")}
    if doc.tpo_user and doc.tpo_user != user_id and doc.college_email != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("You are not allowed to respond to this request.")}

    if not doc.tpo_user:
        doc.tpo_user = user_id

    now = now_datetime()
    if decision == "accept":
        doc.tpo_response = "Accepted"
        doc.recruitment_stage = recruitment_stage or "Accepted - Open"
        doc.decline_reason = ""
    else:
        doc.tpo_response = "Declined"
        doc.recruitment_stage = "Declined"
        doc.decline_reason = reason

    doc.tpo_responded_at = now
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    msg = _("Request accepted. Eligible students will see this job under Suggested jobs.") if decision == "accept" else _("Request declined. The company will see your reason.")
    return {"ok": True, "message": msg, "data": {"invite": _serialize_invite_row(doc.as_dict())}}


@frappe.whitelist(methods=["POST"])
def suggest_students_for_inbound_job():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    invite_id = norm(payload.get("inviteId"))
    student_ids = payload.get("studentIds") or []
    if isinstance(student_ids, str):
        student_ids = [s.strip() for s in student_ids.split(",") if s.strip()]

    if not invite_id or not student_ids:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invite ID and at least one student are required.")}

    invite = frappe.db.get_value(
        "Scout Company College Invite",
        invite_id,
        ["name", "job_id", "tpo_response", "tpo_user", "college_email", "status"],
        as_dict=True,
    )
    if not invite or invite.get("status") != "Sent":
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Inbound request not found.")}
    if invite.get("tpo_user") and invite.get("tpo_user") != user_id and invite.get("college_email") != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("You are not allowed to suggest students for this request.")}
    if invite.get("tpo_response") != "Accepted":
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Accept the inbound job before suggesting students.")}

    college_students = tpo_student_ids(user_id)
    created = 0
    for sid in student_ids:
        sid = norm(sid)
        if not sid or sid not in college_students:
            continue
        if frappe.db.exists(
            "Scout Inbound Job Suggestion",
            {"college_invite_id": invite_id, "student_user": sid, "job_id": invite.get("job_id")},
        ):
            continue
        frappe.get_doc(
            {
                "doctype": "Scout Inbound Job Suggestion",
                "college_invite_id": invite_id,
                "job_id": invite.get("job_id"),
                "student_user": sid,
                "suggested_by_tpo": user_id,
                "bypass_pri": 1,
            }
        ).insert(ignore_permissions=True)
        created += 1

    frappe.db.commit()
    return {
        "ok": True,
        "message": _("Suggested {0} student(s). They can apply without PRI limits.").format(created),
        "data": {"suggestedStudents": _suggested_students_for_invite(invite_id)},
    }


@frappe.whitelist(methods=["POST"])
def update_inbound_recruitment_stage():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    invite_id = norm(payload.get("inviteId"))
    stage = norm(payload.get("recruitmentStage"))
    if not invite_id or not stage:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invite ID and recruitment stage are required.")}

    doc = frappe.get_doc("Scout Company College Invite", invite_id)
    if doc.tpo_user and doc.tpo_user != user_id and doc.college_email != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Not allowed.")}
    if doc.tpo_response != "Accepted":
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Only accepted inbound jobs can update stages.")}

    doc.recruitment_stage = stage
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Recruitment stage updated.")}
