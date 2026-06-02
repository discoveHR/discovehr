import frappe
from frappe import _

from scout.api.common import ADMIN_ROLE_NAMES, get_admin_session_user


def _count_users_with_role(role_names: frozenset) -> int:
    rows = frappe.get_all("Has Role", filters={"role": ["in", list(role_names)]}, fields=["parent"], distinct=True)
    return len(rows)


def _count_colleges() -> int:
    if frappe.db.table_exists("tabScout College"):
        return frappe.db.count("Scout College")
    result = frappe.db.sql(
        """
        SELECT COUNT(DISTINCT college_name)
        FROM `tabScout TPO Profile`
        WHERE college_name IS NOT NULL AND college_name != ''
        """
    )
    return int(result[0][0] if result else 0)


@frappe.whitelist(methods=["GET"])
def overview():
    user_id, err = get_admin_session_user()
    if err:
        return err

    roles = frappe.get_roles(user_id)
    primary_role = next((role for role in roles if role in ADMIN_ROLE_NAMES), "Admin")

    return {
        "ok": True,
        "data": {
            "admin": {
                "id": user_id,
                "full_name": frappe.get_value("User", user_id, "full_name"),
                "email": frappe.get_value("User", user_id, "email"),
                "primaryRole": primary_role,
            },
            "stats": {
                "students": _count_users_with_role(frozenset({"Student", "Job Seeker"})),
                "companies": _count_users_with_role(frozenset({"Company"})),
                "colleges": _count_colleges(),
                "tpos": _count_users_with_role(
                    frozenset({"Training & Placement Officer", "Training and Placement Officer", "TPO"})
                ),
                "jobs": frappe.db.count("Scout Job"),
                "applications": frappe.db.count("Scout Application"),
                "tpoPostings": frappe.db.count("Scout TPO Posting"),
                "studentInvites": frappe.db.count("Scout Student Invite"),
                "assessments": frappe.db.count("Scout Assessment"),
                "psychometricAssessments": frappe.db.count("Scout Psychometric Assessment"),
                "psychometricAssignments": frappe.db.count("Scout Psychometric Assignment"),
                "psychometricCompleted": frappe.db.count("Scout Psychometric Assignment", {"status": "Completed"}),
                "aptitudeAssessments": frappe.db.count("Scout Aptitude Assessment"),
                "aptitudeAssignments": frappe.db.count("Scout Aptitude Assignment"),
                "aptitudeCompleted": frappe.db.count("Scout Aptitude Assignment", {"status": "Completed"}),
            },
        },
    }
