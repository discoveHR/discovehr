import frappe
from frappe import _
from frappe.utils import cint

from scout.api.common import FREELANCER_ROLE_NAMES, get_student_session_user
from scout.api.freelancer.profile import freelancer_apply_gate
from scout.api.student.pri import can_apply_to_public_job
from scout.api.student.profile import profile_row_complete


def _uses_freelancer_apply_gate(user_id: str) -> bool:
    roles = frappe.get_roles(user_id)
    if "Student" in roles and frappe.db.exists("Scout Student Profile", user_id):
        submitted = cint(frappe.db.get_value("Scout Student Profile", user_id, "profile_submitted"))
        if submitted:
            return False
    return any(role in FREELANCER_ROLE_NAMES for role in roles)


@frappe.whitelist(methods=["POST"])
def apply_to_job():
    user_id, err = get_student_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    job_id = payload.get("jobId")
    if not job_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Job ID is required.")}

    job_row = frappe.db.get_value("Scout Job", job_id, ["name", "status"], as_dict=True)
    if not job_row or job_row.get("status") != "Active":
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Job not found or not active.")}

    if _uses_freelancer_apply_gate(user_id):
        gate_err = freelancer_apply_gate(user_id)
        if gate_err:
            frappe.local.response["http_status_code"] = 400
            return gate_err
        profile = frappe.db.get_value(
            "Scout Freelancer Profile",
            user_id,
            ["full_name", "phone", "resume_file"],
            as_dict=True,
        )
    else:
        profile = frappe.db.get_value(
            "Scout Student Profile",
            user_id,
            [
                "full_name",
                "phone",
                "college",
                "area_of_study",
                "academic_year",
                "course_class_grade",
                "department_stream",
                "state",
                "country",
                "gender",
                "date_of_birth",
                "address",
                "city",
                "pin_code",
                "resume_file",
                "profile_submitted",
            ],
            as_dict=True,
        )

        if not profile or not cint(profile.get("profile_submitted")):
            frappe.local.response["http_status_code"] = 400
            return {
                "ok": False,
                "message": _("Complete and submit your profile before applying to jobs."),
            }

    if not can_apply_to_public_job(user_id, job_id=job_id, include_moodle=True):
        frappe.local.response["http_status_code"] = 400
        return {
            "ok": False,
            "message": _(
                "You have used your allowed public job applications without Placement Readiness Index (PRI). "
                "Build PRI through the LMS, challenges, or your internship track, then apply again."
            ),
        }

    if frappe.db.exists("Scout Application", {"job_id": job_id, "student_user": user_id}):
        frappe.local.response["http_status_code"] = 409
        return {"ok": False, "message": _("You have already applied to this job.")}

    doc = frappe.get_doc(
        {
            "doctype": "Scout Application",
            "job_id": job_id,
            "student_user": user_id,
            "application_status": "Submitted",
            "applied_on": frappe.utils.now_datetime(),
        }
    )
    doc.insert(ignore_permissions=True)

    current_applications = int(frappe.db.get_value("Scout Job", job_id, "applications") or 0)
    frappe.db.set_value("Scout Job", job_id, "applications", current_applications + 1, update_modified=False)
    frappe.db.commit()
    return {"ok": True, "message": _("Application submitted successfully.")}
