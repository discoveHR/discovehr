import frappe
from frappe import _

from scout.api.common import get_admin_session_user


def _serialize_pending(row):
    return {
        "profileId": row.name,
        "tpoUser": row.tpo_user,
        "tpoName": row.tpo_name or "",
        "collegeName": row.college_name or "",
        "country": row.country or "",
        "state": row.state or "",
        "collegeLocation": row.college_location or "",
        "approvalStatus": row.approval_status or "Pending",
        "registeredAt": row.creation,
        "email": frappe.get_value("User", row.tpo_user, "email") or row.tpo_user,
    }


@frappe.whitelist(methods=["GET"])
def list_pending_tpos():
    user_id, err = get_admin_session_user()
    if err:
        return err

    rows = frappe.get_all(
        "Scout TPO Profile",
        filters={"approval_status": "Pending"},
        fields=[
            "name",
            "tpo_user",
            "tpo_name",
            "college_name",
            "country",
            "state",
            "college_location",
            "approval_status",
            "creation",
        ],
        order_by="creation desc",
    )
    return {"ok": True, "data": {"pending": [_serialize_pending(row) for row in rows]}}


@frappe.whitelist(methods=["POST"])
def approve_tpo():
    admin_id, err = get_admin_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    profile_id = (payload.get("profileId") or "").strip()
    tpo_user = (payload.get("tpoUser") or "").strip()
    if not profile_id and not tpo_user:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("profileId or tpoUser is required.")}

    if profile_id:
        if not frappe.db.exists("Scout TPO Profile", profile_id):
            frappe.local.response["http_status_code"] = 404
            return {"ok": False, "message": _("TPO profile not found.")}
        doc = frappe.get_doc("Scout TPO Profile", profile_id)
    else:
        profile_name = frappe.db.exists("Scout TPO Profile", {"tpo_user": tpo_user})
        if not profile_name:
            frappe.local.response["http_status_code"] = 404
            return {"ok": False, "message": _("TPO profile not found.")}
        doc = frappe.get_doc("Scout TPO Profile", profile_name)

    doc.approval_status = "Approved"
    doc.is_college_manager = 1
    doc.approved_at = frappe.utils.now_datetime()
    doc.approved_by = admin_id
    doc.rejection_reason = ""
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "ok": True,
        "message": _(
            "TPO approved. They are now a college manager (category: His College) and can complete college profile setup."
        ),
    }


@frappe.whitelist(methods=["POST"])
def reject_tpo():
    admin_id, err = get_admin_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    profile_id = (payload.get("profileId") or "").strip()
    tpo_user = (payload.get("tpoUser") or "").strip()
    reason = (payload.get("reason") or "").strip()
    if not profile_id and not tpo_user:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("profileId or tpoUser is required.")}

    if profile_id:
        if not frappe.db.exists("Scout TPO Profile", profile_id):
            frappe.local.response["http_status_code"] = 404
            return {"ok": False, "message": _("TPO profile not found.")}
        doc = frappe.get_doc("Scout TPO Profile", profile_id)
    else:
        profile_name = frappe.db.exists("Scout TPO Profile", {"tpo_user": tpo_user})
        if not profile_name:
            frappe.local.response["http_status_code"] = 404
            return {"ok": False, "message": _("TPO profile not found.")}
        doc = frappe.get_doc("Scout TPO Profile", profile_name)

    doc.approval_status = "Rejected"
    doc.is_college_manager = 0
    doc.college_setup_complete = 0
    doc.rejection_reason = reason or _("Registration rejected by administrator.")
    doc.approved_at = None
    doc.approved_by = admin_id
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {"ok": True, "message": _("TPO registration rejected.")}
