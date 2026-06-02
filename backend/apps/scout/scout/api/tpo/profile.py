import frappe
from frappe import _

from scout.api.common import get_tpo_session_user
from scout.api.tpo.helpers import norm

PENDING_COLLEGE_PLACEHOLDERS = frozenset({"Pending approval", "(Pending)", "To be confirmed"})

# RELEASE: set True to require admin approval before TPO dashboard / college setup.
TPO_ADMIN_APPROVAL_REQUIRED = False


def get_tpo_profile_row(user_id: str):
    return frappe.get_value(
        "Scout TPO Profile",
        {"tpo_user": user_id},
        [
            "name",
            "tpo_name",
            "college_name",
            "country",
            "state",
            "district",
            "college_location",
            "address",
            "pincode",
            "website_link",
            "linkedin_url",
            "social_media_link",
            "approval_status",
            "is_college_manager",
            "college_setup_complete",
            "rejection_reason",
        ],
        as_dict=True,
    )


def serialize_tpo_profile_api(row, user_id: str | None = None) -> dict:
    row = row or {}
    tpo_name = row.get("tpo_name") or ""
    if not tpo_name and user_id:
        tpo_name = frappe.get_cached_value("User", user_id, "full_name") or ""
    return {
        "tpoName": tpo_name,
        "collegeName": row.get("college_name") or "",
        "country": row.get("country") or "India",
        "state": row.get("state") or "",
        "district": row.get("district") or "",
        "collegeLocation": row.get("college_location") or "",
        "address": row.get("address") or "",
        "pincode": row.get("pincode") or "",
        "websiteLink": row.get("website_link") or "",
        "linkedinUrl": row.get("linkedin_url") or "",
        "socialMediaLink": row.get("social_media_link") or "",
    }


def _apply_profile_fields_to_doc(doc, fields: dict) -> None:
    doc.tpo_name = fields["tpo_name"]
    doc.college_name = fields["college_name"]
    doc.country = fields["country"]
    doc.state = fields["state"]
    doc.district = fields["district"]
    doc.college_location = fields["college_location"]
    doc.address = fields["address"]
    doc.pincode = fields["pincode"]
    doc.website_link = fields["website_link"]
    doc.linkedin_url = fields["linkedin_url"]
    doc.social_media_link = fields["social_media_link"]


def _resolve_approval_status(row) -> str:
    if not row:
        return "Pending"
    raw = (row.get("approval_status") or "").strip()
    if raw in ("Pending", "Approved", "Rejected"):
        return raw
    college_name = (row.get("college_name") or "").strip()
    if row.get("college_setup_complete") or (
        college_name and college_name not in PENDING_COLLEGE_PLACEHOLDERS
    ):
        return "Approved"
    return "Pending"


def _access_approval_status(approval_status: str) -> str:
    """Pending TPOs may use the dashboard when admin approval is disabled pre-release."""
    if not TPO_ADMIN_APPROVAL_REQUIRED and approval_status == "Pending":
        return "Approved"
    return approval_status


def _profile_status_payload(row):
    approval_status = _resolve_approval_status(row)
    access_approval = _access_approval_status(approval_status)
    is_manager = bool((row or {}).get("is_college_manager")) or access_approval == "Approved"
    setup_complete = bool((row or {}).get("college_setup_complete"))
    return {
        "approvalStatus": approval_status,
        "isCollegeManager": is_manager,
        "collegeSetupComplete": setup_complete,
        "managerCategory": "His College" if is_manager else "",
        "rejectionReason": (row or {}).get("rejection_reason") or "",
        "canAccessDashboard": access_approval == "Approved",
        "needsCollegeSetup": False,
    }


def resolve_tpo_profile_fields(user_id: str, profile: dict | None, row=None) -> dict:
    """Merge API profile payload with existing row / sensible defaults (fields optional)."""
    profile = profile or {}
    row = row if row is not None else get_tpo_profile_row(user_id)
    row = row or {}
    full_name = frappe.db.get_value("User", user_id, "full_name") or user_id

    tpo_name = norm(profile.get("tpoName")) or norm(row.get("tpo_name")) or full_name
    college_name = norm(profile.get("collegeName")) or norm(row.get("college_name")) or "To be confirmed"
    country = norm(profile.get("country")) or norm(row.get("country")) or "India"
    state = norm(profile.get("state")) if profile.get("state") is not None else norm(row.get("state")) or ""
    def _field(api_key: str, db_key: str, default: str = "") -> str:
        if profile.get(api_key) is not None:
            return norm(profile.get(api_key))
        return norm(row.get(db_key)) or default

    return {
        "tpo_name": tpo_name,
        "college_name": college_name,
        "country": country,
        "state": state,
        "district": _field("district", "district"),
        "college_location": _field("collegeLocation", "college_location"),
        "address": _field("address", "address"),
        "pincode": _field("pincode", "pincode"),
        "website_link": _field("websiteLink", "website_link"),
        "linkedin_url": _field("linkedinUrl", "linkedin_url"),
        "social_media_link": _field("socialMediaLink", "social_media_link"),
    }


def _ensure_tpo_profile(user_id: str):
    profile_name = frappe.db.exists("Scout TPO Profile", {"tpo_user": user_id})
    if profile_name:
        return frappe.get_doc("Scout TPO Profile", profile_name)
    full_name = frappe.get_cached_value("User", user_id, "full_name") or user_id
    doc = frappe.get_doc(
        {
            "doctype": "Scout TPO Profile",
            "tpo_user": user_id,
            "tpo_name": full_name,
            "college_name": "Pending approval",
            "country": "India",
            "state": "Maharashtra",
            "college_location": "To be confirmed",
            "approval_status": "Pending",
            "is_college_manager": 0,
            "college_setup_complete": 0,
        }
    )
    doc.insert(ignore_permissions=True)
    return doc


def create_tpo_profile_on_signup(user_id: str, full_name: str, college_name: str = ""):
    """Create TPO profile after public signup. Auto-approves when admin gate is off (pre-release)."""
    if frappe.db.exists("Scout TPO Profile", {"tpo_user": user_id}):
        return
    auto_approved = not TPO_ADMIN_APPROVAL_REQUIRED
    college = (college_name or "").strip() or ("To be confirmed" if auto_approved else "Pending approval")
    frappe.get_doc(
        {
            "doctype": "Scout TPO Profile",
            "tpo_user": user_id,
            "tpo_name": full_name or user_id,
            "college_name": college,
            "country": "India",
            "state": "Maharashtra",
            "college_location": "To be confirmed",
            "approval_status": "Approved" if auto_approved else "Pending",
            "is_college_manager": 1 if auto_approved else 0,
            "college_setup_complete": 1 if auto_approved else 0,
        }
    ).insert(ignore_permissions=True)


def create_pending_tpo_profile(user_id: str, full_name: str):
    create_tpo_profile_on_signup(user_id, full_name)


@frappe.whitelist(allow_guest=True, methods=["GET"])
def get_tpo_dashboard_rollup():
    """Fast home-dashboard metrics from Scout TPO Rollup Stats."""
    user_id, err = get_tpo_session_user()
    if err:
        return err

    try:
        from scout.api.rollup_stats import get_tpo_rollup_payload, schedule_tpo_rollup_refresh

        rollup = get_tpo_rollup_payload(user_id)
        return {"ok": True, "data": {"rollup": rollup}}
    except Exception:
        frappe.log_error(title="get_tpo_dashboard_rollup failed", message=frappe.get_traceback())
        from scout.api.tpo.student_scope import tpo_student_ids_count

        pending = 0
        try:
            pending = frappe.db.count(
                "Scout Student Invite",
                {"created_by_tpo": user_id, "status": "Pending"},
            )
        except Exception:
            pass
        return {
            "ok": True,
            "data": {
                "rollup": {
                    "studentCount": tpo_student_ids_count(user_id),
                    "applicationCount": 0,
                    "trainingAllCompletedCount": 0,
                    "pendingInviteCount": int(pending or 0),
                    "lastRefreshed": "",
                    "stale": True,
                }
            },
        }


@frappe.whitelist(allow_guest=True)
def get_tpo_profile():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    row = get_tpo_profile_row(user_id)
    status = _profile_status_payload(row)
    return {
        "ok": True,
        "data": {
            "profile": serialize_tpo_profile_api(row, user_id),
            "status": status,
        },
    }


@frappe.whitelist(allow_guest=True)
def get_tpo_account_status():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    row = get_tpo_profile_row(user_id)
    if not row:
        _ensure_tpo_profile(user_id)
        row = get_tpo_profile_row(user_id)
    return {"ok": True, "data": {"status": _profile_status_payload(row)}}


@frappe.whitelist(allow_guest=True, methods=["POST"])
def upsert_tpo_profile():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    row = get_tpo_profile_row(user_id)
    status = _profile_status_payload(row)
    # RELEASE: re-enable when TPO_ADMIN_APPROVAL_REQUIRED is True.
    if TPO_ADMIN_APPROVAL_REQUIRED and status["approvalStatus"] != "Approved":
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Profile can be updated after admin approval.")}

    payload = frappe.request.get_json(silent=True) or {}
    row = get_tpo_profile_row(user_id)
    fields = resolve_tpo_profile_fields(user_id, payload, row)

    doc = _ensure_tpo_profile(user_id)
    _apply_profile_fields_to_doc(doc, fields)
    doc.save(ignore_permissions=True)

    from scout.api.college_registry import ensure_scout_college_for_tpo

    ensure_scout_college_for_tpo(
        user_id,
        fields["college_name"],
        country=fields.get("country") or "",
        state=fields.get("state") or "",
        district=fields.get("district") or "",
    )

    frappe.db.commit()
    return {"ok": True, "message": _("TPO profile saved successfully.")}
