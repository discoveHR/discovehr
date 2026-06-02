import frappe
from frappe import _
from frappe.utils import cint

from scout.api.common import get_tpo_session_user
from scout.api.student.profile import profile_row_complete


@frappe.whitelist(methods=["GET"])
def list_student_profile_edit_requests():
    _, err = get_tpo_session_user()
    if err:
        return err

    rows = frappe.get_all(
        "Scout Student Profile",
        filters={"profile_edit_requested": 1},
        fields=[
            "name",
            "student_user",
            "full_name",
            "email",
            "phone",
            "college",
            "school",
            "area_of_study",
            "academic_year",
            "state",
            "country",
            "date_of_birth",
            "gender",
            "address",
            "city",
            "pin_code",
            "course_class_grade",
            "department_stream",
            "resume_file",
            "profile_submitted",
            "profile_edit_approved",
        ],
        order_by="modified desc",
        limit_page_length=200,
        ignore_permissions=True,
    )
    out = []
    for r in rows:
        out.append(
            {
                "studentId": r.get("student_user"),
                "fullName": r.get("full_name") or "",
                "email": r.get("email") or "",
                "college": r.get("college") or "",
                "batch": r.get("academic_year") or "",
                "branch": r.get("department_stream") or "",
                "profileComplete": profile_row_complete(r),
            }
        )
    return {"ok": True, "data": {"requests": out}}


@frappe.whitelist(methods=["POST"])
def approve_student_profile_edit():
    _, err = get_tpo_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    student_user = (payload.get("studentUser") or payload.get("studentId") or "").strip()
    if not student_user:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Student user is required.")}

    row = frappe.db.get_value(
        "Scout Student Profile",
        student_user,
        ["name", "profile_edit_requested", "profile_submitted"],
        as_dict=True,
    )
    if not row:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Student profile not found.")}

    if not cint(row.get("profile_submitted")):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Profile is not in a locked state.")}

    frappe.db.set_value(
        "Scout Student Profile",
        student_user,
        {
            "profile_edit_approved": 1,
            "profile_edit_requested": 0,
        },
        update_modified=True,
    )
    frappe.db.commit()
    return {"ok": True, "message": _("Student may edit their profile again until they save.")}
