import frappe
from frappe import _

from scout.api.common import _portal_session_user, COMPANY_ROLE_NAMES
from scout.api.pagination_utils import pagination_from_request, pagination_meta


def _require_sub_admin():
    """Returns (user_id, ctx_row, error). ctx_row has .company_user, .district, .state."""
    user_id = _portal_session_user()
    if not user_id:
        frappe.local.response["http_status_code"] = 401
        return None, None, {"ok": False, "message": _("Not logged in.")}
    roles = frappe.get_roles(user_id)
    if not any(role in COMPANY_ROLE_NAMES for role in roles):
        frappe.local.response["http_status_code"] = 403
        return None, None, {"ok": False, "message": _("Not authorized.")}
    ctx = frappe.db.get_value(
        "Scout Company Sub Admin",
        {"sub_admin_user": user_id, "is_active": 1},
        ["company_user", "district", "state"],
        as_dict=True,
    )
    if not ctx:
        frappe.local.response["http_status_code"] = 403
        return None, None, {"ok": False, "message": _("Sub-admin record not found.")}
    return user_id, ctx, None


def _district_student_users(district: str) -> tuple[list, dict]:
    profiles = frappe.get_all(
        "Scout Student Profile",
        filters={"district": district},
        fields=["student_user", "full_name", "email", "phone", "city", "state",
                "district", "academic_year", "skills", "resume_file"],
        limit_start=0,
        limit_page_length=3000,
    )
    users = [p.student_user for p in profiles if p.student_user]
    by_user = {p.student_user: p for p in profiles}
    return users, by_user


@frappe.whitelist(methods=["GET"])
def list_sub_admin_company_jobs():
    user_id, ctx, err = _require_sub_admin()
    if err:
        return err

    company_user = ctx.company_user
    district = ctx.district

    jobs = frappe.get_all(
        "Scout Job",
        filters={"company_user": company_user, "status": ["!=", "Archived"]},
        fields=["name", "title", "opportunity_type", "location_type", "work_type",
                "openings", "skills", "status", "applications", "creation"],
        order_by="creation desc",
        limit_page_length=200,
    )

    # Cache district student users once
    student_users, _ = _district_student_users(district)

    result = []
    for job in jobs:
        district_count = 0
        if student_users:
            district_count = frappe.db.count(
                "Scout Application",
                filters={"job_id": job.name, "student_user": ["in", student_users]},
            )
        result.append({
            "id": job.name,
            "title": job.title or "",
            "opportunityType": job.opportunity_type or "",
            "locationType": job.location_type or "",
            "workType": job.work_type or "",
            "openings": int(job.openings or 0),
            "skills": job.skills or "",
            "status": job.status or "",
            "totalApplications": int(job.applications or 0),
            "districtApplications": district_count,
            "createdAt": str(job.creation or ""),
        })

    return {"ok": True, "data": {"jobs": result, "district": district, "state": ctx.state}}


@frappe.whitelist(methods=["GET"])
def list_sub_admin_district_applicants():
    user_id, ctx, err = _require_sub_admin()
    if err:
        return err

    company_user = ctx.company_user
    district = ctx.district
    job_id_filter = (frappe.form_dict.get("jobId") or "").strip()
    page, page_size, offset = pagination_from_request(default_page_size=50, max_page_size=200)

    student_users, profile_by_user = _district_student_users(district)
    if not student_users:
        return {"ok": True, "data": {
            "applicants": [], "district": district, "state": ctx.state,
            "pagination": pagination_meta(page, page_size, 0),
        }}

    company_jobs = frappe.get_all(
        "Scout Job",
        filters={"company_user": company_user},
        fields=["name"],
        limit_page_length=500,
    )
    company_job_ids = [j.name for j in company_jobs]
    if not company_job_ids:
        return {"ok": True, "data": {
            "applicants": [], "district": district, "state": ctx.state,
            "pagination": pagination_meta(page, page_size, 0),
        }}

    app_filters = {
        "student_user": ["in", student_users],
        "job_id": ["in", company_job_ids],
    }
    if job_id_filter:
        app_filters["job_id"] = job_id_filter

    total = frappe.db.count("Scout Application", filters=app_filters)
    apps = frappe.get_all(
        "Scout Application",
        filters=app_filters,
        fields=["name", "student_user", "job_id", "application_status", "applied_on"],
        order_by="applied_on desc",
        limit_start=offset,
        limit_page_length=page_size,
    )

    result = []
    for app in apps:
        profile = profile_by_user.get(app.student_user) or {}
        job_title = frappe.get_cached_value("Scout Job", app.job_id, "title") if app.job_id else ""
        result.append({
            "applicationId": app.name,
            "studentUser": app.student_user,
            "fullName": str(profile.get("full_name") or ""),
            "email": str(profile.get("email") or ""),
            "phone": str(profile.get("phone") or ""),
            "city": str(profile.get("city") or ""),
            "state": str(profile.get("state") or ""),
            "district": str(profile.get("district") or district),
            "skills": str(profile.get("skills") or ""),
            "academicYear": str(profile.get("academic_year") or ""),
            "jobId": app.job_id or "",
            "jobTitle": job_title or "",
            "status": app.application_status or "",
            "appliedOn": str(app.applied_on or ""),
        })

    return {"ok": True, "data": {
        "district": district,
        "state": ctx.state,
        "applicants": result,
        "pagination": pagination_meta(page, page_size, total),
    }}


@frappe.whitelist(methods=["POST"])
def schedule_interview_as_sub_admin():
    from frappe.utils import get_datetime
    from scout.api.company.interview_scheduler import _serialize_interview

    user_id, ctx, err = _require_sub_admin()
    if err:
        return err

    company_user = ctx.company_user
    payload = frappe.request.get_json(silent=True) or {}

    application_id = (payload.get("applicationId") or "").strip()
    start_dt_raw = payload.get("startDatetime")
    end_dt_raw = payload.get("endDatetime") or start_dt_raw
    interview_type = (payload.get("interviewType") or "Video").strip()
    meeting_link = (payload.get("meetingLink") or "").strip()
    location = (payload.get("location") or "").strip()
    interviewer_name = (payload.get("interviewerName") or "").strip()
    interviewer_email = (payload.get("interviewerEmail") or "").strip().lower()
    hr_emails = (payload.get("hrNotifyEmails") or "").strip()
    notes = (payload.get("notes") or "").strip()

    if not application_id or not start_dt_raw:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Application and start date/time are required.")}
    if interview_type == "Video" and not meeting_link:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Meeting link is required for video interviews.")}
    if interview_type == "In-person" and not location:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Location is required for in-person interviews.")}

    if not frappe.db.exists("Scout Application", application_id):
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Application not found.")}

    app_doc = frappe.get_doc("Scout Application", application_id)
    job_owner = frappe.db.get_value("Scout Job", app_doc.job_id, "company_user")
    if job_owner != company_user:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("This application does not belong to your company.")}

    try:
        start_dt_obj = get_datetime(start_dt_raw)
        end_dt_obj = get_datetime(end_dt_raw) if end_dt_raw else start_dt_obj
    except Exception:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid date/time format.")}

    student_name = frappe.get_cached_value("User", app_doc.student_user, "full_name") or "Candidate"
    job_title = frappe.get_value("Scout Job", app_doc.job_id, "title") or "Position"
    title = (payload.get("title") or "").strip() or f"{interview_type} Interview — {student_name}"

    doc = frappe.get_doc({
        "doctype": "Scout Company Interview",
        "company_user": company_user,
        "student_user": app_doc.student_user,
        "application_id": application_id,
        "job_id": app_doc.job_id,
        "title": title,
        "interview_type": interview_type,
        "start_datetime": start_dt_obj,
        "end_datetime": end_dt_obj,
        "meeting_link": meeting_link,
        "location": location,
        "interviewer_name": interviewer_name,
        "interviewer_email": interviewer_email,
        "hr_notify_emails": hr_emails,
        "notes": notes,
        "status": "Scheduled",
    })
    doc.insert(ignore_permissions=True)

    if app_doc.application_status not in ("Shortlisted", "Selected"):
        frappe.db.set_value("Scout Application", application_id, "application_status", "Shortlisted")

    frappe.db.commit()

    row = frappe.db.get_value(
        "Scout Company Interview", doc.name, "*", as_dict=True,
    )
    return {
        "ok": True,
        "data": {"interview": _serialize_interview(row)},
        "message": _("Interview scheduled successfully."),
    }


@frappe.whitelist(methods=["GET"])
def list_sub_admin_interviews():
    user_id, ctx, err = _require_sub_admin()
    if err:
        return err

    company_user = ctx.company_user
    district = ctx.district

    student_users, _ = _district_student_users(district)

    filters = {"company_user": company_user, "status": ["!=", "Cancelled"]}
    if student_users:
        filters["student_user"] = ["in", student_users]

    rows = frappe.get_all(
        "Scout Company Interview",
        filters=filters,
        fields="*",
        order_by="start_datetime asc",
        limit_page_length=300,
    )

    from scout.api.company.interview_scheduler import _serialize_interview
    return {"ok": True, "data": {"interviews": [_serialize_interview(r) for r in rows]}}
