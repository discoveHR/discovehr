import json

import frappe
from frappe import _
from frappe.utils import get_datetime

TPO_ROLE_NAMES = frozenset(
    {
        "Training & Placement Officer",
        "Training and Placement Officer",
        "TPO",
    }
)
COMPANY_ROLE_NAMES = frozenset({"Company"})
STUDENT_ROLE_NAMES = frozenset({"Student", "Job Seeker"})
FREELANCER_ROLE_NAMES = frozenset({"Freelancer", "Job Seeker"})
ADMIN_ROLE_NAMES = frozenset({"Administrator", "System Manager", "Admin"})


def _portal_session_user():
    """Scout Bearer token (portal) first, then Frappe cookie session."""
    from scout.api.auth import _extract_bearer_token, _resolve_user_from_access_token

    bearer = _extract_bearer_token()
    if bearer:
        user_id = _resolve_user_from_access_token(bearer)
        if user_id:
            form_dict = frappe.local.form_dict
            frappe.set_user(user_id)
            frappe.local.form_dict = form_dict
            return user_id

    user_id = frappe.session.user
    if not user_id or user_id == "Guest":
        from scout.api.auth import authenticate_scout_bearer_token

        authenticate_scout_bearer_token()
        user_id = frappe.session.user
    if not user_id or user_id == "Guest":
        return None
    return user_id


def get_company_session_user():
    user_id = _portal_session_user()
    if not user_id:
        frappe.local.response["http_status_code"] = 401
        return None, {"ok": False, "message": _("Not logged in.")}

    roles = frappe.get_roles(user_id)
    if not any(role in COMPANY_ROLE_NAMES for role in roles):
        frappe.local.response["http_status_code"] = 403
        return None, {"ok": False, "message": _("This user is not a company account.")}

    return user_id, None


def get_company_owner_session_user():
    """Company primary account only — blocks district sub-admins."""
    user_id, err = get_company_session_user()
    if err:
        return None, err

    if frappe.db.exists(
        "Scout Company Sub Admin",
        {"sub_admin_user": user_id, "is_active": 1},
    ):
        frappe.local.response["http_status_code"] = 403
        return None, {
            "ok": False,
            "message": _("Sub-admins cannot perform this action. Use your district dashboard."),
        }

    return user_id, None


def get_student_session_user():
    user_id = _portal_session_user()
    if not user_id:
        frappe.local.response["http_status_code"] = 401
        return None, {"ok": False, "message": _("Not logged in.")}

    roles = frappe.get_roles(user_id)
    if not any(role in STUDENT_ROLE_NAMES for role in roles):
        frappe.local.response["http_status_code"] = 403
        role_hint = ", ".join(roles[:6]) if roles else _("none")
        return None, {
            "ok": False,
            "message": _(
                "This user is not a student account. Sign in with a Student or Job Seeker account (current roles: {0})."
            ).format(role_hint),
        }

    return user_id, None


def get_freelancer_session_user():
    user_id = _portal_session_user()
    if not user_id:
        frappe.local.response["http_status_code"] = 401
        return None, {"ok": False, "message": _("Not logged in.")}

    roles = frappe.get_roles(user_id)
    if not any(role in FREELANCER_ROLE_NAMES for role in roles):
        frappe.local.response["http_status_code"] = 403
        role_hint = ", ".join(roles[:6]) if roles else _("none")
        return None, {
            "ok": False,
            "message": _(
                "This user is not a freelancer interviewer account. Sign in with a Freelancer Interviewer or Job Seeker account (current roles: {0})."
            ).format(role_hint),
        }

    return user_id, None


def get_tpo_session_user():
    user_id = _portal_session_user()
    if not user_id:
        frappe.local.response["http_status_code"] = 401
        return None, {"ok": False, "message": _("Not logged in.")}

    roles = frappe.get_roles(user_id)
    if not any(role in TPO_ROLE_NAMES for role in roles):
        frappe.local.response["http_status_code"] = 403
        return None, {"ok": False, "message": _("This user is not a TPO account.")}

    return user_id, None


def require_approved_tpo_with_setup(user_id: str):
    row = frappe.get_value(
        "Scout TPO Profile",
        {"tpo_user": user_id},
        ["approval_status", "college_setup_complete"],
        as_dict=True,
    )
    # RELEASE: re-enable TPO admin approval gate (see TPO_ADMIN_APPROVAL_REQUIRED in tpo.profile).
    from scout.api.tpo.profile import TPO_ADMIN_APPROVAL_REQUIRED

    approval = (row or {}).get("approval_status") or "Pending"
    if TPO_ADMIN_APPROVAL_REQUIRED and approval != "Approved":
        frappe.local.response["http_status_code"] = 403
        return {
            "ok": False,
            "message": _("Your TPO account is pending admin approval."),
        }
    return None


def get_admin_session_user():
    user_id = _portal_session_user()
    if not user_id:
        frappe.local.response["http_status_code"] = 401
        return None, {"ok": False, "message": _("Not logged in.")}

    roles = frappe.get_roles(user_id)
    if not any(role in ADMIN_ROLE_NAMES for role in roles):
        frappe.local.response["http_status_code"] = 403
        return None, {"ok": False, "message": _("This user is not an admin account.")}

    return user_id, None


def job_display_status(doc_status: str, expires_at, is_boosted: bool) -> str:
    """Compute the UI-facing display status for a job."""
    if doc_status in ("Draft", "Closed"):
        return doc_status
    if not expires_at:
        return "Boosted" if is_boosted else "Active"
    now = frappe.utils.now_datetime()
    from frappe.utils import get_datetime
    expires_dt = get_datetime(expires_at)
    days_left = (expires_dt - now).days
    if days_left < 0:
        return "Expired"
    if is_boosted:
        return "Boosted"
    if days_left <= 3:
        return "Expiring Soon"
    return "Active"


def company_info_map(rows: list[dict]) -> dict[str, dict]:
    """Batch-fetch full_name and bio for all unique company_user IDs in a list of job rows.

    Pass the result as ``cinfo`` to :func:`row_to_job` to avoid one cache/DB
    round-trip per job when serialising a list.
    """
    users = list({r.get("company_user") for r in rows if r.get("company_user")})
    if not users:
        return {}
    fetched = frappe.get_all("User", filters={"name": ["in", users]}, fields=["name", "full_name", "bio"])
    return {r["name"]: {"full_name": r.get("full_name") or "", "bio": r.get("bio") or ""} for r in fetched}


def row_to_job(row, cinfo: dict | None = None):
    from scout.api.recruitment_journey import parse_journey_stage_defs, parse_journey_stages

    company_user = row.get("company_user")
    ci = (cinfo or {}).get(company_user or "") or {}
    now = frappe.utils.now_datetime()

    created_at = row.get("creation")
    created_at = frappe.utils.formatdate(created_at, "dd MMM yyyy") if created_at else ""

    doc_status = row.get("status") or "Draft"
    is_boosted = bool(row.get("is_boosted"))
    expires_at = row.get("expires_at")
    boost_expires_at = row.get("boost_expires_at")

    if is_boosted and boost_expires_at and get_datetime(boost_expires_at) < now:
        is_boosted = False

    display_status = job_display_status(doc_status, expires_at, is_boosted)

    remaining_days = None
    if expires_at:
        remaining_days = max((get_datetime(expires_at) - now).days, -1)

    return {
        "id": row.get("name"),
        "title": row.get("title"),
        "opportunityType": row.get("opportunity_type"),
        "locationType": row.get("location_type"),
        "openings": int(row.get("openings") or 0),
        "skills": row.get("skills") or "",
        "minExperience": row.get("min_experience") or "0 year",
        "status": doc_status,
        "displayStatus": display_status,
        "totalViews": int(row.get("total_views") or 0),
        "applications": int(row.get("applications") or 0),
        "createdAt": created_at,
        "postedAt": frappe.utils.formatdate(row.get("posted_at"), "dd MMM yyyy") if row.get("posted_at") else "",
        "expiresAt": frappe.utils.formatdate(expires_at, "dd MMM yyyy") if expires_at else "",
        "remainingDays": remaining_days,
        "isFirstPost": bool(row.get("is_first_post")),
        "isBoosted": is_boosted,
        "boostExpiresAt": frappe.utils.formatdate(boost_expires_at, "dd MMM yyyy") if boost_expires_at else "",
        "description": row.get("description") or "",
        "companyName": ci.get("full_name") or (frappe.get_cached_value("User", company_user, "full_name") if company_user else ""),
        "companyAbout": ci.get("bio") or (frappe.get_cached_value("User", company_user, "bio") if company_user else ""),
        "journeyStages": parse_journey_stages(row.get("journey_stages")),
        "journeyStageDefs": parse_journey_stage_defs(row.get("journey_stages")),
        "targetStates": row.get("target_states") or "",
    }


def row_to_assessment(row):
    questions_raw = row.get("questions_json") or ""
    questions = []
    if questions_raw:
        try:
            parsed = json.loads(questions_raw) if isinstance(questions_raw, str) else questions_raw
            questions = parsed if isinstance(parsed, list) else [parsed]
        except (TypeError, ValueError):
            questions = []

    return {
        "id": row.get("name"),
        "title": row.get("title"),
        "description": row.get("description") or "",
        "scheduleMode": row.get("schedule_mode") or "Scheduled",
        "questionClass": row.get("question_class") or "MCQ Single",
        "mcqScoringMode": row.get("mcq_scoring_mode") or "Single Correct",
        "durationMinutes": int(row.get("duration_minutes") or 0),
        "totalQuestions": int(row.get("total_questions") or 0),
        "passingScore": float(row.get("passing_score") or 0),
        "windowStart": str(row.get("window_start") or ""),
        "windowEnd": str(row.get("window_end") or ""),
        "proctoringLevel": row.get("proctoring_level") or "None",
        "integrationMode": row.get("integration_mode") or "Frappe Native",
        "questionsJson": questions,
        "coinsSpent": int(row.get("coins_spent") or 0),
        "status": row.get("status") or "Draft",
        "taoSyncStatus": row.get("tao_sync_status") or "Pending",
        "taoExternalId": row.get("tao_external_id") or "",
        "taoLaunchUrl": row.get("tao_launch_url") or "",
        "taoSyncMessage": row.get("tao_sync_message") or "",
    }
