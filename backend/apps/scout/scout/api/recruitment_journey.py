"""Shared recruitment journey stages and college-scoped applicant views."""

import json
import uuid
from typing import Optional

import frappe

DEFAULT_JOURNEY_STAGES = [
    "Request Received",
    "Under TPO Review",
    "Accepted - Open",
    "Declined",
    "Sourcing Candidates",
    "Interview Stage",
    "Offer / Closed",
]

STAGE_TYPE_LABELS = {
    "application_received": "Application received",
    "psychometric": "Psychometric test",
    "technical": "Technical test",
    "aptitude": "Aptitude test",
    "floating_test": "Floating test (no schedule)",
    "interview": "Interview",
    "freelance_interview": "Freelance interview",
    "custom": "Custom stage",
}

COMPANY_DEFAULT_STAGE_DEFS = [
    {"type": "application_received", "label": STAGE_TYPE_LABELS["application_received"]},
]


def norm(value):
    return (value or "").strip()


def default_label_for_type(stage_type: str, custom_label: str = "") -> str:
    if stage_type == "custom":
        return norm(custom_label) or STAGE_TYPE_LABELS["custom"]
    return STAGE_TYPE_LABELS.get(stage_type, norm(custom_label) or "Stage")


def normalize_stage_def(item) -> Optional[dict]:
    if isinstance(item, str):
        text = norm(item)
        if not text:
            return None
        return {"type": "custom", "label": text, "id": str(uuid.uuid4())[:8]}
    if not isinstance(item, dict):
        return None
    stage_type = norm(item.get("type")) or "custom"
    label = norm(item.get("label")) or default_label_for_type(stage_type, item.get("customLabel"))
    if not label:
        return None
    stage_id = norm(item.get("id")) or str(uuid.uuid4())[:8]
    return {"id": stage_id, "type": stage_type, "label": label}


def parse_journey_stage_defs(raw) -> list[dict]:
    text = norm(raw)
    if not text:
        return [dict(s) for s in COMPANY_DEFAULT_STAGE_DEFS]
    try:
        parsed = json.loads(text)
        if isinstance(parsed, list):
            defs = []
            for item in parsed:
                stage = normalize_stage_def(item)
                if stage:
                    defs.append(stage)
            if defs:
                return defs
    except (TypeError, ValueError):
        pass
    stages = []
    for line in text.replace(",", "\n").split("\n"):
        s = norm(line)
        if s:
            stage = normalize_stage_def(s)
            if stage:
                stages.append(stage)
    return stages or [dict(s) for s in COMPANY_DEFAULT_STAGE_DEFS]


def journey_stage_labels(defs: list[dict]) -> list[str]:
    labels = []
    seen = set()
    for stage in defs:
        label = norm(stage.get("label"))
        if not label or label in seen:
            continue
        seen.add(label)
        labels.append(label)
    return labels or journey_stage_labels(COMPANY_DEFAULT_STAGE_DEFS)


def parse_journey_stages(raw) -> list[str]:
    return journey_stage_labels(parse_journey_stage_defs(raw))


def dump_journey_stages(stages) -> str:
    if not stages:
        return json.dumps(COMPANY_DEFAULT_STAGE_DEFS)
    cleaned = []
    seen_labels = set()
    for item in stages:
        stage = normalize_stage_def(item)
        if not stage:
            continue
        label = stage["label"]
        if label in seen_labels:
            continue
        seen_labels.add(label)
        cleaned.append(stage)
    return json.dumps(cleaned or COMPANY_DEFAULT_STAGE_DEFS)


def student_matches_invite_eligibility(profile: dict, invite_row: dict) -> bool:
    branch_filter = norm(invite_row.get("eligibility_branch")).lower()
    batch_filter = norm(invite_row.get("eligibility_batch")).lower()
    if branch_filter:
        if branch_filter not in norm(profile.get("department_stream")).lower():
            return False
    if batch_filter:
        hay = f"{norm(profile.get('academic_year'))} {norm(profile.get('course_class_grade'))}".lower()
        if batch_filter not in hay:
            return False
    return True


def college_applicants_for_job_invite(job_id: str, invite_row: dict, student_user_ids: set[str]) -> list[dict]:
    """Students in scope with eligibility flag and Scout Application status."""
    if not student_user_ids:
        return []

    from scout.api.query_utils import get_all_chunked

    profiles = get_all_chunked(
        "Scout Student Profile",
        list(student_user_ids),
        fields=[
            "student_user",
            "full_name",
            "email",
            "department_stream",
            "academic_year",
            "course_class_grade",
            "resume_file",
            "pri_score",
        ],
    )

    applications = {
        row["student_user"]: row
        for row in frappe.get_all(
            "Scout Application",
            filters={"job_id": job_id, "student_user": ["in", list(student_user_ids)]},
            fields=["student_user", "application_status", "applied_on", "name", "company_feedback"],
        )
    }

    suggested = {
        row["student_user"]: row
        for row in frappe.get_all(
            "Scout Inbound Job Suggestion",
            filters={"job_id": job_id, "college_invite_id": invite_row.get("name")},
            fields=["student_user", "bypass_pri"],
        )
    }

    student_id_list = [prof.get("student_user") for prof in profiles if prof.get("student_user")]
    psycho_map = {}
    if student_id_list:
        from scout.api.company.jobs_applications import _psychometric_summary_for_students

        psycho_map = _psychometric_summary_for_students(student_id_list)

    out = []
    for prof in profiles:
        uid = prof.get("student_user")
        eligible = student_matches_invite_eligibility(prof, invite_row)
        app = applications.get(uid)
        sug = suggested.get(uid)
        psycho = psycho_map.get(uid) or {}
        out.append(
            {
                "studentId": uid,
                "fullName": prof.get("full_name") or "",
                "email": prof.get("email") or "",
                "branch": prof.get("department_stream") or "",
                "batch": prof.get("academic_year") or "",
                "courseClassGrade": prof.get("course_class_grade") or "",
                "resumeFile": prof.get("resume_file") or "",
                "priScore": float(prof.get("pri_score") or 0),
                "psychometricScore": psycho.get("overallScore"),
                "psychometricTitle": psycho.get("assessmentTitle") or "",
                "eligible": eligible,
                "suggestedByTpo": bool(sug),
                "bypassPri": bool(sug and sug.get("bypass_pri")),
                "applicationStatus": (app.get("application_status") if app else "") or "Not applied",
                "applicationId": (app.get("name") if app else "") or "",
                "appliedOn": str(app.get("applied_on") or "") if app else "",
                "companyFeedback": (app.get("company_feedback") if app else "") or "",
            }
        )
    out.sort(key=lambda r: (0 if r["applicationStatus"] != "Not applied" else 1, -r["priScore"], r["fullName"].lower()))
    return out
