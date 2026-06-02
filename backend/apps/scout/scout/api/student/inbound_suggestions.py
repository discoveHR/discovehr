"""Student visibility for TPO-accepted company inbound jobs."""

import frappe

from scout.api.tpo.helpers import norm


def _student_profile(user_id: str) -> dict | None:
    return frappe.db.get_value(
        "Scout Student Profile",
        {"student_user": user_id},
        ["student_user", "linked_tpo_user", "department_stream", "academic_year", "course_class_grade", "college"],
        as_dict=True,
    )


def inbound_suggested_job_ids_for_student(user_id: str) -> set[str]:
    """Jobs from accepted college invites (eligible) plus explicit TPO suggestions."""
    profile = _student_profile(user_id)
    if not profile:
        return set()

    job_ids: set[str] = set()

    explicit = frappe.get_all(
        "Scout Inbound Job Suggestion",
        filters={"student_user": user_id},
        pluck="job_id",
        limit_page_length=500,
    )
    for jid in explicit:
        if jid:
            job_ids.add(jid)

    linked_tpo = profile.get("linked_tpo_user")
    user_email = norm(user_id).lower()
    or_filters = []
    if linked_tpo:
        or_filters.append(["tpo_user", "=", linked_tpo])
    or_filters.append(["college_email", "=", user_email])

    if not or_filters:
        return job_ids

    invites = frappe.get_all(
        "Scout Company College Invite",
        filters={"status": "Sent", "tpo_response": "Accepted"},
        or_filters=or_filters,
        fields=["name", "job_id", "eligibility_branch", "eligibility_batch"],
        limit_page_length=200,
    )

    branch = norm(profile.get("department_stream")).lower()
    batch_hay = f"{norm(profile.get('academic_year'))} {norm(profile.get('course_class_grade'))}".lower()

    for inv in invites:
        jid = inv.get("job_id")
        if not jid:
            continue
        eb = norm(inv.get("eligibility_branch")).lower()
        ebatch = norm(inv.get("eligibility_batch")).lower()
        if eb and eb not in branch:
            continue
        if ebatch and ebatch not in batch_hay:
            continue
        job_ids.add(jid)

    return job_ids


def student_has_inbound_suggestion(user_id: str, job_id: str) -> bool:
    if frappe.db.exists("Scout Inbound Job Suggestion", {"student_user": user_id, "job_id": job_id}):
        return True
    return job_id in inbound_suggested_job_ids_for_student(user_id)
