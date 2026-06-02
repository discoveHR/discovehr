"""Company-facing approved freelancer interviewer directory."""

import frappe
from frappe import _
from frappe.utils import cint

from scout.api.common import get_company_session_user
from scout.api.freelancer.documents import serialize_documents


def _approved_profile_filters():
    return {"approval_status": "Approved", "profile_submitted": 1}


def _serialize_list_row(row):
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


def _serialize_detail(doc):
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


def get_approved_freelancer_profile(freelancer_user: str):
    """Return profile doc if approved and submitted, else None."""
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
        filters=_approved_profile_filters(),
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
    return {"ok": True, "data": {"interviewers": [_serialize_list_row(row) for row in rows]}}


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
    doc = get_approved_freelancer_profile(lookup)
    if not doc:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Approved freelancer interviewer not found.")}

    return {"ok": True, "data": {"interviewer": _serialize_detail(doc)}}
