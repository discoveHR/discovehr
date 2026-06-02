import frappe
from frappe import _
from frappe.utils import cint, now_datetime

from scout.api.common import get_admin_session_user
from scout.api.freelancer.profile import serialize_freelancer_profile_doc


def _serialize_pending(row):
    return {
        "profileId": row.name,
        "freelancerUser": row.freelancer_user,
        "fullName": row.full_name or "",
        "phone": row.phone or "",
        "primaryService": row.primary_service or "",
        "skills": row.skills or "",
        "yearsOfExperience": row.years_of_experience or "",
        "approvalStatus": row.approval_status or "Pending",
        "profileSubmitted": bool(cint(row.profile_submitted)),
        "submittedAt": row.submitted_at,
        "registeredAt": row.creation,
        "email": frappe.get_value("User", row.freelancer_user, "email") or row.freelancer_user,
        "resumeFile": row.resume_file or "",
        "idProofFile": row.id_proof_file or "",
    }


@frappe.whitelist(methods=["GET"])
def list_pending_freelancers():
    user_id, err = get_admin_session_user()
    if err:
        return err

    rows = frappe.get_all(
        "Scout Freelancer Profile",
        filters={"approval_status": "Pending", "profile_submitted": 1},
        fields=[
            "name",
            "freelancer_user",
            "full_name",
            "phone",
            "primary_service",
            "skills",
            "years_of_experience",
            "approval_status",
            "profile_submitted",
            "submitted_at",
            "creation",
            "resume_file",
            "id_proof_file",
        ],
        order_by="submitted_at desc, creation desc",
    )
    return {"ok": True, "data": {"pending": [_serialize_pending(row) for row in rows]}}


@frappe.whitelist(methods=["GET"])
def get_freelancer_profile_for_admin():
    admin_id, err = get_admin_session_user()
    if err:
        return err

    profile_id = (frappe.form_dict.get("profileId") or "").strip()
    freelancer_user = (frappe.form_dict.get("freelancerUser") or "").strip()
    if not profile_id and not freelancer_user:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("profileId or freelancerUser is required.")}

    name = profile_id or frappe.db.exists("Scout Freelancer Profile", {"freelancer_user": freelancer_user})
    if not name:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Freelancer interviewer profile not found.")}

    doc = frappe.get_doc("Scout Freelancer Profile", name)
    return {"ok": True, "data": {"profile": serialize_freelancer_profile_doc(doc)}}


@frappe.whitelist(methods=["POST"])
def approve_freelancer():
    admin_id, err = get_admin_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    profile_id = (payload.get("profileId") or "").strip()
    freelancer_user = (payload.get("freelancerUser") or "").strip()
    if not profile_id and not freelancer_user:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("profileId or freelancerUser is required.")}

    if profile_id:
        if not frappe.db.exists("Scout Freelancer Profile", profile_id):
            frappe.local.response["http_status_code"] = 404
            return {"ok": False, "message": _("Freelancer interviewer profile not found.")}
        doc = frappe.get_doc("Scout Freelancer Profile", profile_id)
    else:
        profile_name = frappe.db.exists("Scout Freelancer Profile", {"freelancer_user": freelancer_user})
        if not profile_name:
            frappe.local.response["http_status_code"] = 404
            return {"ok": False, "message": _("Freelancer interviewer profile not found.")}
        doc = frappe.get_doc("Scout Freelancer Profile", profile_name)

    if not cint(doc.profile_submitted):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Freelancer interviewer has not submitted their profile yet.")}

    doc.approval_status = "Approved"
    doc.approved_at = now_datetime()
    doc.approved_by = admin_id
    doc.rejection_reason = ""
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Freelancer interviewer approved. They can now apply to jobs.")}


@frappe.whitelist(methods=["POST"])
def reject_freelancer():
    admin_id, err = get_admin_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    profile_id = (payload.get("profileId") or "").strip()
    freelancer_user = (payload.get("freelancerUser") or "").strip()
    reason = (payload.get("reason") or "").strip()
    if not profile_id and not freelancer_user:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("profileId or freelancerUser is required.")}

    if profile_id:
        if not frappe.db.exists("Scout Freelancer Profile", profile_id):
            frappe.local.response["http_status_code"] = 404
            return {"ok": False, "message": _("Freelancer interviewer profile not found.")}
        doc = frappe.get_doc("Scout Freelancer Profile", profile_id)
    else:
        profile_name = frappe.db.exists("Scout Freelancer Profile", {"freelancer_user": freelancer_user})
        if not profile_name:
            frappe.local.response["http_status_code"] = 404
            return {"ok": False, "message": _("Freelancer interviewer profile not found.")}
        doc = frappe.get_doc("Scout Freelancer Profile", profile_name)

    doc.approval_status = "Rejected"
    doc.rejection_reason = reason or _("Registration rejected by administrator.")
    doc.approved_at = None
    doc.approved_by = admin_id
    doc.profile_submitted = 0
    doc.submitted_at = None
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Freelancer interviewer registration rejected.")}
