"""
Backward-compatible Frappe method paths: ``scout.api.company_api.*``.

Implementation lives under ``scout.api.company``.
"""

import frappe
from frappe import _
from frappe.utils import cint

from scout.api.common import get_company_session_user

# Re-export company sub-module functions under the legacy scout.api.company_api.* path
from scout.api.company.assessments import (
    create_assessment,
    list_assessments,
    publish_assessment,
)
from scout.api.company.credits import (
    create_company_coin_purchase_order,
    get_company_credit_wallet,
    list_company_coin_packs,
    verify_company_coin_purchase,
)
from scout.api.company.interview_scheduler import (
    cancel_company_interview,
    download_interview_ics,
    get_interview_ics,
    list_company_interviews,
    schedule_company_interview,
)
from scout.api.company.jobs_applications import (
    create_job,
    ensure_demo_company_user,
    invite_college_for_job,
    list_applicants,
    list_college_invites,
    list_jobs,
    send_offer_letter,
    update_application_status,
    update_job_status,
)
from scout.api.company.document_requests import (
    list_document_requests,
    request_documents,
)
from scout.api.company.recruitment_journey import (
    get_job_recruitment_journey,
    update_college_invite_stage,
    update_job_recruitment_journey,
)

# --- Freelancer interviewer directory (registered first for reliable RPC resolution) ---


def _freelancer_serialize_list_row(row):
    return {
        "profileId": row.name,
        "freelancerUser": row.freelancer_user,
        "fullName": row.full_name or "",
        "email": row.email or "",
        "phone": row.phone or "",
        "primaryService": row.primary_service or "",
        "skills": row.skills or "",
        "yearsOfExperience": row.years_of_experience or "",
        "availability": row.availability or "",
        "professionalSummary": (row.professional_summary or "")[:280],
    }


def _freelancer_serialize_detail(doc):
    from scout.api.freelancer.documents import serialize_documents

    docs = serialize_documents(doc)
    return {
        "profileId": doc.name,
        "freelancerUser": doc.freelancer_user,
        "fullName": doc.full_name or "",
        "email": doc.email or "",
        "phone": doc.phone or "",
        "profilePhoto": doc.profile_photo or "",
        "gender": doc.gender or "",
        "city": doc.city or "",
        "state": doc.state or "",
        "country": doc.country or "",
        "professionalSummary": doc.professional_summary or "",
        "skills": doc.skills or "",
        "yearsOfExperience": doc.years_of_experience or "",
        "primaryService": doc.primary_service or "",
        "hourlyRate": doc.hourly_rate or "",
        "availability": doc.availability or "",
        "linkedinProfile": doc.linkedin_profile or "",
        "githubProfile": doc.github_profile or "",
        "portfolioWebsite": doc.portfolio_website or "",
        "workExperience": doc.work_experience or "",
        "resumeFile": doc.resume_file or "",
        "documents": docs,
        "approvalStatus": doc.approval_status,
    }


def _get_approved_freelancer_profile(freelancer_user: str):
    if not freelancer_user or not frappe.db.exists("Scout Freelancer Profile", freelancer_user):
        return None
    doc = frappe.get_doc("Scout Freelancer Profile", freelancer_user)
    if doc.approval_status != "Approved" or not cint(doc.profile_submitted):
        return None
    return doc


@frappe.whitelist(methods=["GET"])
def list_approved_freelancer_interviewers():
    user_id, err = get_company_session_user()
    if err:
        return err

    rows = frappe.get_all(
        "Scout Freelancer Profile",
        filters={"approval_status": "Approved", "profile_submitted": 1},
        fields=[
            "name",
            "freelancer_user",
            "full_name",
            "email",
            "phone",
            "primary_service",
            "skills",
            "years_of_experience",
            "availability",
            "professional_summary",
        ],
        order_by="full_name asc",
        limit_page_length=500,
    )
    return {"ok": True, "data": {"interviewers": [_freelancer_serialize_list_row(row) for row in rows]}}


@frappe.whitelist(methods=["GET"])
def get_freelancer_interviewer_detail():
    user_id, err = get_company_session_user()
    if err:
        return err

    profile_id = (frappe.form_dict.get("profileId") or "").strip()
    freelancer_user = (frappe.form_dict.get("freelancerUser") or "").strip()
    if not profile_id and not freelancer_user:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("profileId or freelancerUser is required.")}

    lookup = profile_id or freelancer_user
    doc = _get_approved_freelancer_profile(lookup)
    if not doc:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Approved freelancer interviewer not found.")}

    return {"ok": True, "data": {"interviewer": _freelancer_serialize_detail(doc)}}


# --- Other company portal endpoints ---

from scout.api.company.assessments import create_assessment, list_assessments, publish_assessment
from scout.api.company.credits import (
    create_company_coin_purchase_order,
    get_company_credit_wallet,
    list_company_coin_packs,
    verify_company_coin_purchase,
)
from scout.api.company.jobs_applications import (
    create_job,
    ensure_demo_company_user,
    invite_college_for_job,
    list_college_invites,
    list_applicants,
    list_jobs,
    send_offer_letter,
    update_application_status,
    update_job_status,
)
from scout.api.company.interview_scheduler import (
    cancel_company_interview,
    download_interview_ics,
    get_interview_ics,
    list_company_interviews,
    schedule_company_interview,
)
from scout.api.company.sub_admins import (
    create_sub_admin as _create_sub_admin_impl,
    delete_sub_admin as _delete_sub_admin_impl,
    list_sub_admins as _list_sub_admins_impl,
    list_applicants_by_district as _list_applicants_by_district_impl,
)
from scout.api.company.recruitment_journey import (
    get_job_recruitment_journey,
    update_college_invite_stage,
    update_job_recruitment_journey,
)


# --- Sub-Admin Dashboard Endpoints ---


@frappe.whitelist(methods=["GET"])
def list_sub_admins():
    return _list_sub_admins_impl()


@frappe.whitelist(methods=["POST"])
def create_sub_admin():
    return _create_sub_admin_impl()


@frappe.whitelist(methods=["POST"])
def delete_sub_admin():
    return _delete_sub_admin_impl()


@frappe.whitelist(methods=["GET"])
def list_applicants_by_district():
    return _list_applicants_by_district_impl()

def _sub_admin_district_student_users(district):
    profiles = frappe.get_all(
        "Scout Student Profile",
        filters={"district": district},
        fields=["student_user", "full_name", "email", "phone", "city",
                "state", "district", "academic_year", "skills", "resume_file"],
        limit_start=0,
        limit_page_length=3000,
    )
    users = [p.student_user for p in profiles if p.student_user]
    by_user = {p.student_user: p for p in profiles}
    return users, by_user


def _require_company_sub_admin():
    """Returns (user_id, ctx_row, error_dict). ctx_row has company_user, district, state."""
    from scout.api.common import _portal_session_user, COMPANY_ROLE_NAMES as _CRN
    user_id = _portal_session_user()
    if not user_id:
        frappe.local.response["http_status_code"] = 401
        return None, None, {"ok": False, "message": _("Not logged in.")}
    roles = frappe.get_roles(user_id)
    if not any(role in _CRN for role in roles):
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


@frappe.whitelist(methods=["GET"])
def list_sub_admin_company_jobs():
    user_id, ctx, err = _require_company_sub_admin()
    if err:
        return err
    company_user = ctx.company_user
    district = ctx.district
    company_name = frappe.get_cached_value("User", company_user, "full_name") or "Company"
    jobs = frappe.get_all(
        "Scout Job",
        filters={"company_user": company_user, "status": ["!=", "Archived"]},
        fields=["name", "title", "opportunity_type", "location_type", "work_type",
                "openings", "skills", "status", "applications", "creation"],
        order_by="creation desc",
        limit_page_length=200,
    )
    student_users, _ = _sub_admin_district_student_users(district)
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
    return {
        "ok": True,
        "data": {
            "jobs": result,
            "district": district,
            "state": ctx.state,
            "companyName": company_name,
        },
    }


@frappe.whitelist(methods=["GET"])
def list_sub_admin_district_applicants():
    from scout.api.pagination_utils import pagination_from_request, pagination_meta
    user_id, ctx, err = _require_company_sub_admin()
    if err:
        return err
    company_user = ctx.company_user
    district = ctx.district
    job_id_filter = (frappe.form_dict.get("jobId") or "").strip()
    page, page_size, offset = pagination_from_request(default_page_size=50, max_page_size=200)
    student_users, profile_by_user = _sub_admin_district_student_users(district)
    if not student_users:
        return {"ok": True, "data": {
            "applicants": [], "district": district, "state": ctx.state,
            "pagination": pagination_meta(page, page_size, 0),
        }}
    company_jobs = frappe.get_all(
        "Scout Job",
        filters={"company_user": company_user},
        fields=["name", "title"],
        limit_page_length=500,
    )
    company_job_ids = [j.name for j in company_jobs]
    company_job_title_map = {j.name: j.get("title") or "" for j in company_jobs}
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
        fields=["name", "student_user", "job_id", "application_status", "creation"],
        order_by="creation desc",
        limit_start=offset,
        limit_page_length=page_size,
    )
    result = []
    for app in apps:
        profile = profile_by_user.get(app.student_user) or {}
        job_title = company_job_title_map.get(app.job_id, "") if app.job_id else ""
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
            "appliedOn": str(app.creation or ""),
        })
    return {"ok": True, "data": {
        "district": district, "state": ctx.state, "applicants": result,
        "pagination": pagination_meta(page, page_size, total),
    }}


@frappe.whitelist(methods=["POST"])
def schedule_interview_as_sub_admin():
    from frappe.utils import get_datetime
    from scout.api.company.interview_scheduler import _serialize_interview
    user_id, ctx, err = _require_company_sub_admin()
    if err:
        return err
    company_user = ctx.company_user
    payload = frappe.request.get_json(silent=True) or {}
    application_id = (payload.get("applicationId") or "").strip()
    start_dt_raw = payload.get("startDatetime")
    end_dt_raw = payload.get("endDatetime") or start_dt_raw
    interview_type = (payload.get("interviewType") or "Video").strip()
    meeting_link = (payload.get("meetingLink") or "").strip()
    location_val = (payload.get("location") or "").strip()
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
    if interview_type == "In-person" and not location_val:
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
    title = (payload.get("title") or "").strip() or f"{interview_type} Interview - {student_name}"
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
        "location": location_val,
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
    row = frappe.db.get_value("Scout Company Interview", doc.name, "*", as_dict=True)
    return {
        "ok": True,
        "data": {"interview": _serialize_interview(row)},
        "message": _("Interview scheduled successfully."),
    }


@frappe.whitelist(methods=["GET"])
def list_sub_admin_interviews():
    user_id, ctx, err = _require_company_sub_admin()
    if err:
        return err
    from scout.api.company.interview_scheduler import _serialize_interview
    company_user = ctx.company_user
    district = ctx.district
    student_users, _ = _sub_admin_district_student_users(district)
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
    return {"ok": True, "data": {"interviews": [_serialize_interview(r) for r in rows]}}


__all__ = [
    "create_assessment",
    "publish_assessment",
    "get_freelancer_interviewer_detail",
    "get_company_credit_wallet",
    "list_company_coin_packs",
    "create_company_coin_purchase_order",
    "verify_company_coin_purchase",
    "create_job",
    "ensure_demo_company_user",
    "invite_college_for_job",
    "list_college_invites",
    "list_applicants",
    "list_assessments",
    "list_jobs",
    "list_approved_freelancer_interviewers",
    "list_company_interviews",
    "schedule_company_interview",
    "cancel_company_interview",
    "get_interview_ics",
    "download_interview_ics",
    "send_offer_letter",
    "update_application_status",
    "update_job_status",
    "get_job_recruitment_journey",
    "update_job_recruitment_journey",
    "update_college_invite_stage",
    "list_sub_admins",
    "create_sub_admin",
    "delete_sub_admin",
    "list_applicants_by_district",
    "list_sub_admin_company_jobs",
    "list_sub_admin_district_applicants",
    "schedule_interview_as_sub_admin",
    "list_sub_admin_interviews",
]
