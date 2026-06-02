"""TPO single-student 360° profile and analytics."""

import frappe
from frappe import _
from frappe.utils import cint, flt

from scout.api.common import get_tpo_session_user
from scout.api.psychometric.results import row_to_result
from scout.api.student.profile import (
    PROFILE_API_FIELD_MAP,
    PROFILE_REQUIRED_TEXT_FIELDS,
    _required_field_ok,
    _serialize_profile_values,
    _student_profile_select_fields,
    profile_row_complete,
)
from scout.api.tpo.helpers import norm
from scout.api.tpo.student_scope import tpo_student_ids


def _profile_completion_breakdown(profile_row: dict) -> list[dict]:
    row = profile_row or {}
    sections = [
        ("Personal", ["full_name", "phone", "gender", "date_of_birth", "parent_guardian_name", "parent_contact_number"]),
        ("Address", ["address", "city", "district", "state", "country", "pin_code"]),
        ("Academic", [
            "college",
            "university_name",
            "course_class_grade",
            "department_stream",
            "academic_year",
            "semester",
            "roll_number",
            "admission_year",
            "expected_graduation_year",
            "current_cgpa",
        ]),
        ("Career", ["skills", "preferred_job_role", "resume_file", "student_id_card_number"]),
    ]
    out = []
    for label, fields in sections:
        total = len(fields)
        filled = sum(1 for f in fields if _required_field_ok(row, f))
        percent = int(round((filled / total) * 100)) if total else 0
        out.append({"section": label, "percent": percent, "filled": filled, "total": total})
    consent_ok = _required_field_ok(row, "profile_consent")
    out.append(
        {
            "section": "Declaration",
            "percent": 100 if consent_ok else 0,
            "filled": 1 if consent_ok else 0,
            "total": 1,
        }
    )
    return out


def _profile_completion_percent(profile_row: dict) -> int:
    row = profile_row or {}
    fields = list(PROFILE_REQUIRED_TEXT_FIELDS) + ["profile_consent"]
    total = len(fields)
    if not total:
        return 0
    filled = sum(1 for f in fields if _required_field_ok(row, f))
    return int(round((filled / total) * 100))


def _load_student_profile_row(student_id: str) -> dict | None:
    profile_fields = _student_profile_select_fields(
        ["student_user", "profile_submitted", "profile_edit_requested", "profile_edit_approved", "pri_score"]
        + [db for db, _api in PROFILE_API_FIELD_MAP]
    )
    if not profile_fields:
        return None
    return frappe.db.get_value("Scout Student Profile", student_id, profile_fields, as_dict=True)


@frappe.whitelist(methods=["GET"])
def get_student_360():
    tpo_user, err = get_tpo_session_user()
    if err:
        return err

    student_id = norm(frappe.form_dict.get("studentId")).lower()
    if not student_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Student ID is required.")}

    allowed = tpo_student_ids(tpo_user)
    if student_id not in allowed:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("You do not have access to this student.")}

    user_row = frappe.db.get_value("User", student_id, ["full_name", "email", "mobile_no"], as_dict=True) or {}
    profile_row = _load_student_profile_row(student_id) or {}
    profile = _serialize_profile_values(profile_row, user_row)
    profile["profileSubmitted"] = bool(cint(profile_row.get("profile_submitted")))
    profile["profileComplete"] = profile_row_complete(profile_row)
    profile["priScore"] = flt(profile_row.get("pri_score") or 0)

    apps = frappe.get_all(
        "Scout Application",
        filters={"student_user": student_id},
        fields=["name", "job_id", "application_status", "applied_on"],
        order_by="applied_on desc",
        limit_page_length=500,
    )
    job_ids = {a.get("job_id") for a in apps if a.get("job_id")}
    job_meta: dict[str, dict] = {}
    if job_ids:
        for j in frappe.get_all(
            "Scout Job",
            filters={"name": ["in", list(job_ids)]},
            fields=["name", "title", "company_user", "status"],
            limit_page_length=500,
        ):
            job_meta[j["name"]] = j

    applications = []
    status_counts: dict[str, int] = {}
    for app in apps:
        status = app.get("application_status") or "Unknown"
        status_counts[status] = status_counts.get(status, 0) + 1
        job = job_meta.get(app.get("job_id")) or {}
        company_name = ""
        if job.get("company_user"):
            company_name = frappe.get_cached_value("User", job["company_user"], "full_name") or job["company_user"]
        applications.append(
            {
                "applicationId": app.get("name"),
                "jobId": app.get("job_id"),
                "jobTitle": job.get("title") or app.get("job_id"),
                "companyName": company_name,
                "jobStatus": job.get("status") or "",
                "applicationStatus": status,
                "appliedOn": str(app.get("applied_on") or "")[:10],
            }
        )

    assignments = frappe.get_all(
        "Scout Psychometric Assignment",
        filters={"student_user": student_id},
        fields=["name", "psychometric_assessment", "status", "due_at", "completed_at"],
        order_by="modified desc",
        limit_page_length=200,
    )
    assessments_assigned = len(assignments)
    assessments_completed = sum(1 for a in assignments if (a.get("status") or "") == "Completed")

    results = frappe.get_all(
        "Scout Psychometric Result",
        filters={"student_user": student_id},
        fields=[
            "name",
            "assignment",
            "psychometric_assessment",
            "overall_score",
            "scores_json",
            "traits_json",
            "completed_at",
        ],
        order_by="completed_at desc",
        limit_page_length=100,
    )
    psychometric_scores = []
    for res in results:
        parsed = row_to_result(res)
        title = frappe.get_value("Scout Psychometric Assessment", res.get("psychometric_assessment"), "title") or ""
        psychometric_scores.append(
            {
                "resultId": res.get("name"),
                "assessmentTitle": title or res.get("psychometric_assessment") or "",
                "overallScore": flt(parsed.get("overallScore")),
                "completedAt": (parsed.get("completedAt") or "")[:10],
                "scores": parsed.get("scores") or {},
            }
        )

    mock_exams = []
    if frappe.db.exists("DocType", "Scout Mock Exam Registration"):
        regs = frappe.get_all(
            "Scout Mock Exam Registration",
            filters={"student_user": student_id},
            fields=["name", "mock_exam", "status", "score", "modified"],
            order_by="modified desc",
            limit_page_length=50,
        )
        for reg in regs:
            exam_title = frappe.get_value("Scout Mock Exam", reg.get("mock_exam"), "title") or reg.get("mock_exam") or ""
            mock_exams.append(
                {
                    "registrationId": reg.get("name"),
                    "examTitle": exam_title,
                    "status": reg.get("status") or "",
                    "score": flt(reg.get("score")),
                }
            )

    shortlisted = sum(
        1
        for a in applications
        if "shortlist" in (a.get("applicationStatus") or "").lower() or "select" in (a.get("applicationStatus") or "").lower()
    )
    placed = sum(1 for a in applications if "placed" in (a.get("applicationStatus") or "").lower() or "hired" in (a.get("applicationStatus") or "").lower())

    completion_pct = _profile_completion_percent(profile_row)
    breakdown = _profile_completion_breakdown(profile_row)

    return {
        "ok": True,
        "data": {
            "studentId": student_id,
            "profile": profile,
            "kpis": {
                "priScore": flt(profile_row.get("pri_score") or 0),
                "profileCompletionPercent": completion_pct,
                "profileComplete": profile_row_complete(profile_row),
                "applicationsTotal": len(applications),
                "applicationsShortlisted": shortlisted,
                "applicationsPlaced": placed,
                "assessmentsAssigned": assessments_assigned,
                "assessmentsCompleted": assessments_completed,
                "psychometricResultsCount": len(psychometric_scores),
                "mockExamsCount": len(mock_exams),
            },
            "charts": {
                "applicationsByStatus": [{"status": k, "count": v} for k, v in sorted(status_counts.items())],
                "psychometricScores": [
                    {"title": p["assessmentTitle"], "score": p["overallScore"], "date": p["completedAt"]}
                    for p in psychometric_scores
                ],
                "profileSections": breakdown,
            },
            "tables": {
                "applications": applications,
                "psychometricResults": psychometric_scores,
                "trainingAssignments": [
                    {
                        "assignmentId": a.get("name"),
                        "assessmentTitle": frappe.get_value("Scout Psychometric Assessment", a.get("psychometric_assessment"), "title")
                        or a.get("psychometric_assessment")
                        or "",
                        "status": a.get("status") or "",
                        "dueAt": str(a.get("due_at") or "")[:10],
                        "completedAt": str(a.get("completed_at") or "")[:10],
                    }
                    for a in assignments
                ],
                "mockExams": mock_exams,
            },
        },
    }
