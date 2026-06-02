"""Dev smoke test: bench --site scout.localhost execute scout.api.smoke_psychometric.run"""

import os

import frappe

from scout.utils.env_config import load_scout_env_files


def run():
    load_scout_env_files()
    os.environ.setdefault("SCOUT_PSYCHOMETRIC_DEV_MODE", "1")

    from scout.api.admin.psychometric import _assign_students_to_assessment, _resolve_student_emails
    from scout.api.psychometric.tao_client import psychometric_dev_mode_enabled

    frappe.set_user("Administrator")
    print("dev_mode", psychometric_dev_mode_enabled())

    students = frappe.db.sql(
        """
        SELECT hr.parent AS name FROM `tabHas Role` hr
        INNER JOIN `tabUser` u ON u.name = hr.parent
        WHERE hr.role IN ('Student', 'Job Seeker') AND u.enabled = 1
        LIMIT 1
        """,
        as_dict=True,
    )
    if not students:
        print("SKIP: no student users")
        return
    student_id = students[0].name
    print("student", student_id)

    assessment_id = frappe.db.get_value(
        "Scout Psychometric Assessment",
        {"status": "Published"},
        "name",
        order_by="creation desc",
    )
    if not assessment_id:
        from frappe.model.naming import make_autoname

        doc = frappe.get_doc(
            {
                "doctype": "Scout Psychometric Assessment",
                "title": f"Smoke Psychometric {frappe.utils.now_datetime()}",
                "duration_minutes": 30,
                "status": "Published",
                "created_by_admin": frappe.session.user,
                "tao_sync_status": "Skipped",
                "tao_test_id": "dev-smoke",
            }
        )
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
        assessment_id = doc.name
    print("assessment", assessment_id)

    emails = _resolve_student_emails({"studentEmails": [student_id]})
    created, skipped = _assign_students_to_assessment(
        admin_user=frappe.session.user,
        assessment_id=assessment_id,
        student_emails=emails,
        parsed_due=None,
    )
    frappe.db.commit()
    print("assigned", len(created), "skipped", skipped)

    assignment_id = frappe.db.get_value(
        "Scout Psychometric Assignment",
        {"psychometric_assessment": assessment_id, "student_user": student_id},
        "name",
        order_by="creation desc",
    )
    if not assignment_id:
        print("SKIP: no assignment")
        return
    print("assignment", assignment_id)

    from scout.api.psychometric.results import apply_psychometric_result

    frappe.set_user(student_id)
    out = apply_psychometric_result(
        assignment_name=assignment_id,
        payload={
            "overallScore": 71.0,
            "scores": {"openness": 75, "conscientiousness": 70},
            "traits": {"primary": "Smoke Test"},
            "recommendations": "Smoke test result.",
            "completedAt": str(frappe.utils.now_datetime()),
        },
        source="dev",
    )
    print("result", out.get("message"), "duplicate", out.get("duplicate"))

    has_result = frappe.db.exists("Scout Psychometric Result", {"assignment": assignment_id})
    print("result_exists", bool(has_result))
    print("SMOKE_OK")
