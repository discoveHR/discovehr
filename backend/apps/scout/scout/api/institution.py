"""Institution dashboard API — college overview + multi-TPO view + batch-wise students."""

import frappe
from scout.api.common import get_tpo_session_user
from scout.api.tpo.student_scope import tpo_student_scope_sql
from scout.api.tpo.helpers import norm


def _err(msg, status=403):
    return {"ok": False, "message": msg, "http_status_code": status}


def _ok(data):
    return {"ok": True, "data": data}


def _get_institution_profile(user_id: str):
    return frappe.db.get_value(
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
            "scout_college",
            "approval_status",
        ],
        as_dict=True,
    )


def _tpos_for_college(scout_college: str, college_name: str) -> list[dict]:
    """Return all TPO profiles that belong to the same institution."""
    if scout_college:
        rows = frappe.db.sql(
            """
            SELECT p.tpo_user, p.tpo_name, p.college_name, p.state, p.country,
                   p.college_location, p.website_link, p.linkedin_url,
                   p.social_media_link, p.approval_status,
                   u.email
            FROM `tabScout TPO Profile` p
            LEFT JOIN `tabUser` u ON u.name = p.tpo_user
            WHERE p.scout_college = %s
            ORDER BY p.creation ASC
            """,
            [scout_college],
            as_dict=True,
        )
    elif college_name:
        rows = frappe.db.sql(
            """
            SELECT p.tpo_user, p.tpo_name, p.college_name, p.state, p.country,
                   p.college_location, p.website_link, p.linkedin_url,
                   p.social_media_link, p.approval_status,
                   u.email
            FROM `tabScout TPO Profile` p
            LEFT JOIN `tabUser` u ON u.name = p.tpo_user
            WHERE p.college_name = %s
            ORDER BY p.creation ASC
            """,
            [college_name],
            as_dict=True,
        )
    else:
        rows = []
    return rows


def _batch_stats(user_id: str) -> list[dict]:
    """Return distinct batches with student counts for this TPO's college."""
    scope_sql, params = tpo_student_scope_sql(user_id)
    rows = frappe.db.sql(
        f"""
        SELECT sp.academic_year AS batch,
               COUNT(DISTINCT sp.student_user) AS student_count
        FROM `tabScout Student Profile` sp
        WHERE sp.student_user IN (
            SELECT student_user FROM ({scope_sql}) AS _scope
        )
          AND sp.academic_year IS NOT NULL
          AND sp.academic_year != ''
        GROUP BY sp.academic_year
        ORDER BY sp.academic_year DESC
        """,
        params,
        as_dict=True,
    )
    return [{"batch": r["batch"], "studentCount": r["student_count"]} for r in rows]


def _branch_stats(user_id: str) -> list[dict]:
    """Return distinct branches with student counts for this TPO's college."""
    scope_sql, params = tpo_student_scope_sql(user_id)
    rows = frappe.db.sql(
        f"""
        SELECT sp.department_stream AS branch,
               COUNT(DISTINCT sp.student_user) AS student_count
        FROM `tabScout Student Profile` sp
        WHERE sp.student_user IN (
            SELECT student_user FROM ({scope_sql}) AS _scope
        )
          AND sp.department_stream IS NOT NULL
          AND sp.department_stream != ''
        GROUP BY sp.department_stream
        ORDER BY sp.department_stream ASC
        """,
        params,
        as_dict=True,
    )
    return [{"branch": r["branch"], "studentCount": r["student_count"]} for r in rows]


def _total_student_count(user_id: str) -> int:
    scope_sql, params = tpo_student_scope_sql(user_id)
    result = frappe.db.sql(
        f"SELECT COUNT(DISTINCT student_user) FROM ({scope_sql}) AS _scope",
        params,
    )
    return (result[0][0] if result else 0) or 0


@frappe.whitelist(allow_guest=True)
def get_institution_overview():
    user_id, error = get_tpo_session_user()
    if error:
        return error

    profile = _get_institution_profile(user_id)
    if not profile:
        return _err("TPO profile not found. Please complete your profile first.", 404)

    scout_college = profile.get("scout_college") or ""
    college_name = norm(profile.get("college_name") or "")

    tpos = _tpos_for_college(scout_college, college_name)

    serialized_tpos = [
        {
            "tpoUser": r.get("tpo_user") or "",
            "tpoName": r.get("tpo_name") or "",
            "email": r.get("email") or "",
            "collegeName": r.get("college_name") or "",
            "state": r.get("state") or "",
            "country": r.get("country") or "",
            "collegeLocation": r.get("college_location") or "",
            "websiteLink": r.get("website_link") or "",
            "linkedinUrl": r.get("linkedin_url") or "",
            "approvalStatus": r.get("approval_status") or "",
            "isCurrent": r.get("tpo_user") == user_id,
        }
        for r in tpos
    ]

    batches = _batch_stats(user_id)
    branches = _branch_stats(user_id)
    total_students = _total_student_count(user_id)

    college_info = {
        "collegeName": college_name,
        "country": profile.get("country") or "India",
        "state": profile.get("state") or "",
        "district": profile.get("district") or "",
        "collegeLocation": profile.get("college_location") or "",
        "address": profile.get("address") or "",
        "pincode": profile.get("pincode") or "",
        "websiteLink": profile.get("website_link") or "",
        "linkedinUrl": profile.get("linkedin_url") or "",
        "socialMediaLink": profile.get("social_media_link") or "",
        "approvalStatus": profile.get("approval_status") or "",
    }

    return _ok(
        {
            "college": college_info,
            "tpos": serialized_tpos,
            "batches": batches,
            "branches": branches,
            "totalStudents": total_students,
        }
    )
