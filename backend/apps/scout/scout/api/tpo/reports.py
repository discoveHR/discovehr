import csv
import io

import frappe
from frappe import _
from frappe.utils import cint, flt

from scout.api.common import get_tpo_session_user
from scout.api.psychometric.results import row_to_result
from scout.api.query_utils import chunk_list, get_all_chunked, pluck_distinct_chunked
from scout.api.tpo.helpers import norm, profile_matches_internal_audience, student_rows_by_filters
from scout.api.tpo.student_scope import (
    DEFAULT_REPORT_PAGE_SIZE,
    report_pagination_from_request,
    tpo_student_ids,
    tpo_student_ids_count,
    tpo_student_ids_for_report,
    tpo_student_scope_sql,
)

_PROFILE_FIELDS = [
    "student_user",
    "full_name",
    "email",
    "department_stream",
    "academic_year",
    "course_class_grade",
    "college",
    "phone",
    "state",
    "country",
    "area_of_study",
    "resume_file",
]


def _student_profile_map(student_ids: set[str]) -> dict[str, dict]:
    if not student_ids:
        return {}
    rows = get_all_chunked(
        "Scout Student Profile",
        student_ids,
        fields=_PROFILE_FIELDS,
        limit_per_chunk=5000,
    )
    out = {}
    for row in rows:
        uid = row.get("student_user")
        if uid:
            out[uid] = row
    for uid in student_ids:
        if uid not in out:
            out[uid] = {
                "student_user": uid,
                "full_name": frappe.get_cached_value("User", uid, "full_name") or uid,
                "email": frappe.get_cached_value("User", uid, "email") or uid,
            }
    return out


def _serialize_student(uid: str, prof: dict) -> dict:
    return {
        "studentId": uid,
        "fullName": prof.get("full_name") or "",
        "email": prof.get("email") or "",
        "branch": prof.get("department_stream") or "",
        "batch": prof.get("academic_year") or "",
        "courseClassGrade": prof.get("course_class_grade") or "",
        "college": prof.get("college") or "",
        "phone": prof.get("phone") or "",
        "state": prof.get("state") or "",
        "country": prof.get("country") or "",
        "areaOfStudy": prof.get("area_of_study") or "",
        "resumeFile": prof.get("resume_file") or "",
    }


@frappe.whitelist(methods=["GET"])
def get_tpo_report():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    report_key = norm(frappe.form_dict.get("reportKey") or frappe.form_dict.get("reportType")).lower()
    page, page_size = report_pagination_from_request()
    if page is None:
        page, page_size = 1, DEFAULT_REPORT_PAGE_SIZE

    student_ids, report_truncated, pagination = tpo_student_ids_for_report(user_id, page=page, page_size=page_size)
    profiles = _student_profile_map(student_ids)

    if report_key == "applications":
        return _attach_report_meta(_report_applications(student_ids, profiles), report_truncated, pagination)
    if report_key == "training-attendance":
        return _attach_report_meta(
            _report_training_attendance(student_ids, profiles, user_id),
            report_truncated,
            pagination,
        )
    if report_key == "test-scores":
        return _attach_report_meta(_report_test_scores(student_ids, profiles), report_truncated, pagination)
    if report_key == "recruitment-status":
        return _attach_report_meta(_report_recruitment_status(student_ids, profiles), report_truncated, pagination)
    if report_key == "job-selections":
        job_id = norm(frappe.form_dict.get("jobId"))
        return _attach_report_meta(_report_job_selections(student_ids, profiles, job_id), report_truncated, pagination)
    if report_key == "eligibility-students":
        return _attach_report_meta(
            _report_eligibility_students(user_id, student_ids, profiles, pagination),
            report_truncated,
            pagination,
        )

    frappe.local.response["http_status_code"] = 400
    return {"ok": False, "message": _("Unknown report type.")}


def _attach_report_meta(payload: dict, truncated: bool, pagination: dict) -> dict:
    if payload.get("ok") and isinstance(payload.get("data"), dict):
        payload["data"]["reportTruncated"] = truncated
        payload["data"].update(pagination)
    return payload


def _assessment_title_map(assessment_ids: set[str]) -> dict[str, str]:
    titles: dict[str, str] = {}
    for chunk in chunk_list([a for a in assessment_ids if a], 200):
        for row in frappe.get_all(
            "Scout Psychometric Assessment",
            filters={"name": ["in", chunk]},
            fields=["name", "title"],
            limit_page_length=500,
        ):
            titles[row["name"]] = row.get("title") or row["name"]
    return titles


def _report_applications(student_ids: set[str], profiles: dict[str, dict]):
    if not student_ids:
        return {"ok": True, "data": {"rows": [], "summary": {"total": 0}}}

    apps = get_all_chunked(
        "Scout Application",
        student_ids,
        fields=["name", "job_id", "student_user", "application_status", "applied_on"],
        order_by="applied_on desc",
        limit_per_chunk=5000,
    )
    job_ids = {a.get("job_id") for a in apps if a.get("job_id")}
    job_titles = {}
    if job_ids:
        for row in frappe.get_all("Scout Job", filters={"name": ["in", list(job_ids)]}, fields=["name", "title", "company_user"], limit_page_length=500):
            job_titles[row["name"]] = row

    company_user_ids = list({row.get("company_user") for row in job_titles.values() if row.get("company_user")})
    company_name_map: dict = {}
    if company_user_ids:
        cu_rows = frappe.get_all(
            "User",
            filters={"name": ["in", company_user_ids]},
            fields=["name", "full_name"],
            limit_page_length=len(company_user_ids),
        )
        company_name_map = {u["name"]: u.get("full_name") or u["name"] for u in cu_rows}

    rows = []
    for app in apps:
        uid = app.get("student_user")
        prof = profiles.get(uid) or {}
        job = job_titles.get(app.get("job_id")) or {}
        company_name = company_name_map.get(job.get("company_user") or "", "") or job.get("company_user") or ""
        rows.append(
            {
                **_serialize_student(uid, prof),
                "applicationId": app.get("name"),
                "jobId": app.get("job_id"),
                "jobTitle": job.get("title") or app.get("job_id"),
                "companyName": company_name,
                "applicationStatus": app.get("application_status") or "",
                "appliedOn": str(app.get("applied_on") or ""),
            }
        )

    return {
        "ok": True,
        "data": {
            "rows": rows,
            "summary": {"total": len(rows), "uniqueStudents": len({r["studentId"] for r in rows})},
        },
    }


def _report_training_attendance(student_ids: set[str], profiles: dict[str, dict], tpo_user_id: str):
    """Placement readiness: psychometric assignments (proxy for placement training completion)."""
    if not student_ids:
        total = tpo_student_ids_count(tpo_user_id)
        return {"ok": True, "data": {"rows": [], "summary": {"totalStudents": total, "fullyCompleted": 0}}}

    assignments = get_all_chunked(
        "Scout Psychometric Assignment",
        student_ids,
        fields=[
            "name",
            "psychometric_assessment",
            "student_user",
            "status",
            "scheduled_from",
            "due_at",
            "started_at",
            "completed_at",
        ],
        limit_per_chunk=10000,
    )

    assessment_ids = {a.get("psychometric_assessment") for a in assignments if a.get("psychometric_assessment")}
    title_map = _assessment_title_map(assessment_ids)

    by_student: dict[str, list] = {}
    for row in assignments:
        by_student.setdefault(row.get("student_user"), []).append(row)

    rows = []
    fully_completed = 0
    for uid in student_ids:
        prof = profiles.get(uid) or {}
        student_assignments = by_student.get(uid) or []
        total = len(student_assignments)
        completed = sum(1 for a in student_assignments if (a.get("status") or "") == "Completed")
        attended_all = total > 0 and completed == total
        if attended_all:
            fully_completed += 1
        assessment_titles = [
            title_map.get(a.get("psychometric_assessment") or "", a.get("psychometric_assessment") or "")
            for a in student_assignments
        ]
        rows.append(
            {
                **_serialize_student(uid, prof),
                "assignmentsTotal": total,
                "assignmentsCompleted": completed,
                "attendedAllTrainings": attended_all,
                "assessmentTitles": "; ".join(filter(None, assessment_titles)),
                "lastCompletedAt": max((str(a.get("completed_at") or "") for a in student_assignments), default=""),
            }
        )

    rows.sort(key=lambda r: (not r["attendedAllTrainings"], r["fullName"]))
    scope_total = tpo_student_ids_count(tpo_user_id)
    return {
        "ok": True,
        "data": {
            "rows": rows,
            "summary": {
                "totalStudents": scope_total,
                "fullyCompletedOnPage": fully_completed,
                "note": _("Based on assigned psychometric / placement readiness assessments."),
            },
        },
    }


def _report_test_scores(student_ids: set[str], profiles: dict[str, dict]):
    if not student_ids:
        return {"ok": True, "data": {"rows": []}}

    results = get_all_chunked(
        "Scout Psychometric Result",
        student_ids,
        fields=[
            "name",
            "assignment",
            "student_user",
            "psychometric_assessment",
            "overall_score",
            "scores_json",
            "traits_json",
            "completed_at",
        ],
        order_by="completed_at desc",
        limit_per_chunk=10000,
    )

    title_map = _assessment_title_map({r.get("psychometric_assessment") for r in results if r.get("psychometric_assessment")})

    rows = []
    for res in results:
        uid = res.get("student_user")
        prof = profiles.get(uid) or {}
        assessment_title = title_map.get(res.get("psychometric_assessment") or "", "") or ""
        parsed = row_to_result(res)
        score_parts = []
        for key, val in (parsed.get("scores") or {}).items():
            score_parts.append(f"{key}: {val}")
        rows.append(
            {
                **_serialize_student(uid, prof),
                "resultId": res.get("name"),
                "assignmentId": res.get("assignment"),
                "assessmentTitle": assessment_title,
                "overallScore": flt(parsed.get("overallScore")),
                "scoresSummary": "; ".join(score_parts) if score_parts else str(flt(res.get("overall_score"))),
                "scores": parsed.get("scores") or {},
                "completedAt": parsed.get("completedAt") or "",
            }
        )

    return {"ok": True, "data": {"rows": rows, "summary": {"total": len(rows)}}}


def _report_recruitment_status(student_ids: set[str], profiles: dict[str, dict]):
    if not student_ids:
        return {"ok": True, "data": {"rows": [], "byStatus": {}, "byJob": []}}

    apps = get_all_chunked(
        "Scout Application",
        student_ids,
        fields=["name", "job_id", "student_user", "application_status"],
        limit_per_chunk=10000,
    )
    by_status: dict[str, int] = {}
    by_job: dict[str, dict] = {}
    detail_rows = []

    job_ids = {a.get("job_id") for a in apps if a.get("job_id")}
    job_meta = {}
    if job_ids:
        for j in frappe.get_all("Scout Job", filters={"name": ["in", list(job_ids)]}, fields=["name", "title", "status"], limit_page_length=500):
            job_meta[j["name"]] = j

    for app in apps:
        status = app.get("application_status") or "Unknown"
        by_status[status] = by_status.get(status, 0) + 1
        jid = app.get("job_id") or ""
        if jid not in by_job:
            job = job_meta.get(jid) or {}
            by_job[jid] = {
                "jobId": jid,
                "jobTitle": job.get("title") or jid,
                "jobStatus": job.get("status") or "",
                "submitted": 0,
                "inReview": 0,
                "shortlisted": 0,
                "rejected": 0,
                "selected": 0,
                "total": 0,
            }
        bucket = by_job[jid]
        bucket["total"] += 1
        key_map = {
            "Submitted": "submitted",
            "In Review": "inReview",
            "Shortlisted": "shortlisted",
            "Rejected": "rejected",
            "Selected": "selected",
        }
        field = key_map.get(status)
        if field:
            bucket[field] += 1

        uid = app.get("student_user")
        prof = profiles.get(uid) or {}
        detail_rows.append(
            {
                **_serialize_student(uid, prof),
                "applicationId": app.get("name"),
                "jobId": jid,
                "jobTitle": bucket.get("jobTitle") or jid,
                "recruitmentStatus": status,
            }
        )

    return {
        "ok": True,
        "data": {
            "rows": detail_rows,
            "byStatus": by_status,
            "byJob": list(by_job.values()),
            "summary": {"totalApplications": len(apps)},
        },
    }


def _report_job_selections(student_ids: set[str], profiles: dict[str, dict], job_id: str):
    if not job_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Job ID is required for this report.")}

    job = frappe.db.get_value("Scout Job", job_id, ["name", "title", "status", "company_user"], as_dict=True)
    if not job:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Job not found.")}

    from scout.api.query_utils import chunk_list

    app_fields = ["name", "student_user", "application_status", "applied_on"]
    apps: list[dict] = []
    base_filters = {"job_id": job_id, "application_status": "Selected"}
    if student_ids:
        for chunk in chunk_list(list(student_ids), 200):
            apps.extend(
                frappe.get_all(
                    "Scout Application",
                    filters={**base_filters, "student_user": ["in", chunk]},
                    fields=app_fields,
                    order_by="applied_on desc",
                    limit_page_length=500,
                )
            )
    else:
        apps = frappe.get_all(
            "Scout Application",
            filters=base_filters,
            fields=app_fields,
            order_by="applied_on desc",
            limit_page_length=500,
        )

    rows = []
    for app in apps:
        uid = app.get("student_user")
        prof = profiles.get(uid) or {}
        rows.append(
            {
                **_serialize_student(uid, prof),
                "applicationId": app.get("name"),
                "jobId": job_id,
                "jobTitle": job.get("title") or job_id,
                "applicationStatus": app.get("application_status"),
                "appliedOn": str(app.get("applied_on") or ""),
            }
        )

    company_name = ""
    if job.get("company_user"):
        company_name = frappe.get_cached_value("User", job["company_user"], "full_name") or ""

    return {
        "ok": True,
        "data": {
            "rows": rows,
            "job": {
                "jobId": job_id,
                "jobTitle": job.get("title") or job_id,
                "jobStatus": job.get("status") or "",
                "companyName": company_name,
            },
            "summary": {"selectedCount": len(rows)},
        },
    }


def _report_eligibility_students(
    tpo_user_id: str,
    student_ids: set[str],
    profiles: dict[str, dict],
    pagination: dict,
):
    branch = norm(frappe.form_dict.get("branch"))
    batch = norm(frappe.form_dict.get("batch"))
    state = norm(frappe.form_dict.get("state"))
    country = norm(frappe.form_dict.get("country"))
    area_of_study = norm(frappe.form_dict.get("areaOfStudy"))
    posting_id = norm(frappe.form_dict.get("postingId"))

    posting = None
    if posting_id:
        posting = frappe.db.get_value(
            "Scout TPO Posting",
            posting_id,
            [
                "name",
                "title",
                "created_by_tpo",
                "is_internal_job",
                "branch",
                "batch",
                "batch_audience",
                "target_batches",
            ],
            as_dict=True,
        )
        if not posting or posting.get("created_by_tpo") != tpo_user_id:
            frappe.local.response["http_status_code"] = 404
            return {"ok": False, "message": _("Posting not found.")}

    filtered_rows = student_rows_by_filters(
        branch=branch,
        batch=batch,
        state=state,
        country=country,
        area_of_study=area_of_study,
    )

    rows = []
    for row in filtered_rows:
        uid = row.get("student_user")
        if student_ids and uid not in student_ids:
            continue
        if posting and not profile_matches_internal_audience(row, posting):
            continue
        rows.append(_serialize_student(uid, row))

    return {
        "ok": True,
        "data": {
            "rows": rows,
            "summary": {"total": len(rows), "scopeTotal": pagination.get("total") or len(rows)},
            "filters": {
                "branch": branch,
                "batch": batch,
                "state": state,
                "country": country,
                "areaOfStudy": area_of_study,
                "postingId": posting_id,
                "postingTitle": (posting or {}).get("title") or "",
            },
        },
    }


@frappe.whitelist(methods=["GET"])
def download_tpo_report():
    """CSV export for TPO reports (same keys as get_tpo_report). Large scopes use async export."""
    user_id, err = get_tpo_session_user()
    if err:
        return err

    from scout.api.tpo.report_export import enqueue_tpo_report_export, should_async_export

    report_key = norm(frappe.form_dict.get("reportKey") or frappe.form_dict.get("reportType")).lower()
    if should_async_export(user_id) and not cint(frappe.form_dict.get("sync")):
        frappe.form_dict["page"] = 1
        frappe.form_dict["pageSize"] = 5000
        return enqueue_tpo_report_export()

    payload = get_tpo_report()
    if not isinstance(payload, dict) or not payload.get("ok"):
        return payload

    data = payload.get("data") or {}
    rows = data.get("rows") or []

    stream = io.StringIO()
    writer = csv.writer(stream)

    if report_key == "applications":
        writer.writerow(["Student", "Email", "Branch", "Batch", "Job", "Company", "Status", "Applied On"])
        for r in rows:
            writer.writerow(
                [
                    r.get("fullName"),
                    r.get("email"),
                    r.get("branch"),
                    r.get("batch"),
                    r.get("jobTitle"),
                    r.get("companyName"),
                    r.get("applicationStatus"),
                    r.get("appliedOn"),
                ]
            )
        filename = "applications_report.csv"
    elif report_key == "training-attendance":
        writer.writerow(["Student", "Email", "Branch", "Batch", "Assessments", "Completed", "Attended All", "Titles", "Last Completed"])
        for r in rows:
            writer.writerow(
                [
                    r.get("fullName"),
                    r.get("email"),
                    r.get("branch"),
                    r.get("batch"),
                    r.get("assignmentsTotal"),
                    r.get("assignmentsCompleted"),
                    "Yes" if r.get("attendedAllTrainings") else "No",
                    r.get("assessmentTitles"),
                    r.get("lastCompletedAt"),
                ]
            )
        filename = "training_attendance_report.csv"
    elif report_key == "test-scores":
        writer.writerow(["Student", "Email", "Assessment", "Overall Score", "Scores", "Completed At"])
        for r in rows:
            writer.writerow(
                [
                    r.get("fullName"),
                    r.get("email"),
                    r.get("assessmentTitle"),
                    r.get("overallScore"),
                    r.get("scoresSummary"),
                    r.get("completedAt"),
                ]
            )
        filename = "test_scores_report.csv"
    elif report_key == "recruitment-status":
        writer.writerow(["Student", "Email", "Job", "Recruitment Status"])
        for r in rows:
            writer.writerow([r.get("fullName"), r.get("email"), r.get("jobTitle"), r.get("recruitmentStatus")])
        filename = "recruitment_status_report.csv"
    elif report_key == "job-selections":
        writer.writerow(["Student", "Email", "Branch", "Batch", "Job", "Status", "Applied On"])
        for r in rows:
            writer.writerow(
                [
                    r.get("fullName"),
                    r.get("email"),
                    r.get("branch"),
                    r.get("batch"),
                    r.get("jobTitle"),
                    r.get("applicationStatus"),
                    r.get("appliedOn"),
                ]
            )
        filename = "job_selections_report.csv"
    elif report_key == "eligibility-students":
        writer.writerow(["Student ID", "Name", "Email", "Phone", "College", "Area Of Study", "Batch", "Branch", "State", "Country"])
        for r in rows:
            writer.writerow(
                [
                    r.get("studentId"),
                    r.get("fullName"),
                    r.get("email"),
                    r.get("phone"),
                    r.get("college"),
                    r.get("areaOfStudy"),
                    r.get("batch"),
                    r.get("branch"),
                    r.get("state"),
                    r.get("country"),
                ]
            )
        filename = "eligible_students.csv"
    else:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Unknown report type.")}

    frappe.local.response.filename = filename
    frappe.local.response.filecontent = stream.getvalue()
    frappe.local.response.type = "download"
    return None


@frappe.whitelist(methods=["GET"])
def list_tpo_report_jobs():
    """Jobs that TPO students have applied to (for job-selection filter)."""
    user_id, err = get_tpo_session_user()
    if err:
        return err

    scope_sql, params = tpo_student_scope_sql(user_id)
    job_ids = frappe.db.sql(
        f"""
        SELECT DISTINCT a.job_id
        FROM `tabScout Application` a
        INNER JOIN ({scope_sql}) sc ON sc.student_user = a.student_user
        WHERE IFNULL(a.job_id, '') != ''
        LIMIT 500
        """,
        params,
        as_list=True,
    )
    job_ids = [row[0] for row in job_ids if row and row[0]]
    if not job_ids:
        return {"ok": True, "data": {"jobs": [], "postings": _list_tpo_postings(user_id)}}
    return _finish_list_tpo_report_jobs(user_id, job_ids)


def _list_tpo_postings(user_id: str) -> list:
    posting_rows = frappe.get_all(
        "Scout TPO Posting",
        filters={"created_by_tpo": user_id},
        fields=["name", "title", "status"],
        order_by="modified desc",
        limit_page_length=200,
    )
    return [{"postingId": r["name"], "title": r.get("title") or r["name"], "status": r.get("status") or ""} for r in posting_rows]


def _finish_list_tpo_report_jobs(user_id: str, job_ids: list) -> dict:
    jobs = []
    if job_ids:
        for row in frappe.get_all(
            "Scout Job",
            filters={"name": ["in", job_ids]},
            fields=["name", "title", "status"],
            order_by="modified desc",
            limit_page_length=500,
        ):
            jobs.append({"jobId": row["name"], "title": row.get("title") or row["name"], "status": row.get("status") or ""})

    postings = _list_tpo_postings(user_id)

    return {"ok": True, "data": {"jobs": jobs, "postings": postings}}
