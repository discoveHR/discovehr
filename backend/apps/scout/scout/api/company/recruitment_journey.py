"""Company: setup job recruitment journey and view per-college pipeline."""

import frappe
from frappe import _

from scout.api.common import get_company_session_user, row_to_job
from scout.api.recruitment_journey import (
    college_applicants_for_job_invite,
    dump_journey_stages,
    journey_stage_labels,
    norm,
    parse_journey_stage_defs,
    parse_journey_stages,
)
from scout.api.tpo.inbound_jobs import _serialize_invite_row
from scout.api.tpo.student_scope import tpo_student_ids


@frappe.whitelist(methods=["GET"])
def get_job_recruitment_journey(jobId=None, inviteId=None):
    user_id, err = get_company_session_user()
    if err:
        return err

    job_id = (
        norm(jobId)
        or norm(frappe.form_dict.get("jobId"))
        or norm(frappe.local.request.args.get("jobId") if frappe.local.request else None)
    )
    invite_id = (
        norm(inviteId)
        or norm(frappe.form_dict.get("inviteId"))
        or norm(frappe.local.request.args.get("inviteId") if frappe.local.request else None)
    )
    if not job_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Job ID is required.")}

    job_row = frappe.db.get_value(
        "Scout Job",
        job_id,
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
    if not job_row or job_row.get("company_user") != user_id:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Job not found.")}

    stage_defs = parse_journey_stage_defs(job_row.get("journey_stages"))
    journey_stages = journey_stage_labels(stage_defs)

    invite_rows = frappe.get_all(
        "Scout Company College Invite",
        filters={"job_id": job_id, "company_user": user_id, "status": "Sent"},
        fields=[
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
        ],
        order_by="creation desc",
        limit_page_length=100,
    )
    colleges = [_serialize_invite_row(r, job_row) for r in invite_rows]

    selected = None
    college_applicants = []
    if invite_id:
        inv_row = next((r for r in invite_rows if r.get("name") == invite_id), None)
        if not inv_row:
            frappe.local.response["http_status_code"] = 404
            return {"ok": False, "message": _("College invite not found for this job.")}
        selected = _serialize_invite_row(inv_row, job_row)
        tpo_user = inv_row.get("tpo_user")
        student_ids = tpo_student_ids(tpo_user) if tpo_user else set()
        college_applicants = college_applicants_for_job_invite(job_id, inv_row, student_ids)
    elif invite_rows:
        first = invite_rows[0]
        selected = _serialize_invite_row(first, job_row)
        tpo_user = first.get("tpo_user")
        student_ids = tpo_student_ids(tpo_user) if tpo_user else set()
        college_applicants = college_applicants_for_job_invite(job_id, first, student_ids)

    return {
        "ok": True,
        "data": {
            "job": row_to_job(job_row),
            "journeyStages": journey_stages,
            "journeyStageDefs": stage_defs,
            "colleges": colleges,
            "selectedCollege": selected,
            "collegeApplicants": college_applicants,
        },
    }


@frappe.whitelist(methods=["POST"])
def update_job_recruitment_journey():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    job_id = norm(payload.get("jobId"))
    stages = payload.get("stages")
    stage_defs = payload.get("stageDefs")
    if not job_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Job ID is required.")}
    if not isinstance(stage_defs, list) and (not isinstance(stages, list) or not stages):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("At least one journey stage is required.")}

    job_row = frappe.db.get_value("Scout Job", job_id, ["company_user"], as_dict=True)
    if not job_row or job_row.get("company_user") != user_id:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Job not found.")}

    to_dump = stage_defs if isinstance(stage_defs, list) and stage_defs else stages
    dumped = dump_journey_stages(to_dump)
    frappe.db.set_value("Scout Job", job_id, "journey_stages", dumped)
    frappe.db.commit()

    defs = parse_journey_stage_defs(dumped)
    return {
        "ok": True,
        "message": _("Recruitment journey updated."),
        "data": {
            "journeyStages": journey_stage_labels(defs),
            "journeyStageDefs": defs,
        },
    }


@frappe.whitelist(methods=["POST"])
def update_college_invite_stage():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    invite_id = norm(payload.get("inviteId"))
    stage = norm(payload.get("recruitmentStage"))
    if not invite_id or not stage:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invite ID and recruitment stage are required.")}

    doc = frappe.get_doc("Scout Company College Invite", invite_id)
    if doc.company_user != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Not allowed.")}

    job_stages = journey_stage_labels(parse_journey_stage_defs(frappe.db.get_value("Scout Job", doc.job_id, "journey_stages")))
    if stage not in job_stages:
        job_stages.append(stage)

    doc.recruitment_stage = stage
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    job_row = frappe.db.get_value(
        "Scout Job",
        doc.job_id,
        ["name", "company_user", "title", "opportunity_type", "location_type", "openings", "skills", "min_experience", "status", "total_views", "applications", "description", "creation"],
        as_dict=True,
    )
    return {
        "ok": True,
        "message": _("College recruitment stage updated."),
        "data": {"invite": _serialize_invite_row(doc.as_dict(), job_row or {})},
    }
