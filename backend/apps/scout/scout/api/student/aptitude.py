import frappe
from frappe import _
from frappe.utils import now_datetime

from scout.api.aptitude.results import apply_aptitude_result, row_to_assignment, row_to_result
from scout.api.common import get_student_session_user
from scout.api.psychometric.tao_client import aptitude_dev_mode_enabled, create_student_delivery_session, platform_test_dev_mode_enabled


@frappe.whitelist(methods=["GET"])
def list_aptitude_assignments():
    user_id, err = get_student_session_user()
    if err:
        return err

    rows = frappe.get_all(
        "Scout Aptitude Assignment",
        filters={"student_user": user_id},
        fields=["name", "aptitude_assessment", "student_user", "status",
                "due_at", "scheduled_from", "started_at", "completed_at", "launch_url"],
        order_by="modified desc",
    )
    if not rows:
        return {"ok": True, "data": {"assignments": []}}

    # --- Batch load: 3 queries total instead of 5N+1 ---
    assignment_names = [r["name"] for r in rows]
    assessment_ids = list({r["aptitude_assessment"] for r in rows if r.get("aptitude_assessment")})

    assessments_map = {
        r["name"]: r
        for r in frappe.get_all(
            "Scout Aptitude Assessment",
            filters={"name": ["in", assessment_ids]},
            fields=["name", "title", "description", "duration_minutes", "status"],
        )
    } if assessment_ids else {}

    results_map = {
        r["assignment"]: r
        for r in frappe.get_all(
            "Scout Aptitude Result",
            filters={"assignment": ["in", assignment_names]},
            fields=["name", "assignment", "overall_score", "scores_json",
                    "traits_json", "recommendations", "completed_at", "aptitude_assessment"],
        )
    }

    assignments = []
    for row in rows:
        assessment = assessments_map.get(row.get("aptitude_assessment") or "")
        result_row = results_map.get(row["name"])
        item = {
            "id": row["name"],
            "assessmentId": row.get("aptitude_assessment"),
            "assessmentTitle": (assessment or {}).get("title") or "",
            "assessmentDescription": (assessment or {}).get("description") or "",
            "durationMinutes": int((assessment or {}).get("duration_minutes") or 0),
            "assessmentStatus": (assessment or {}).get("status") or "",
            "studentUser": row.get("student_user"),
            "studentEmail": "",
            "studentName": "",
            "status": row.get("status") or "Assigned",
            "dueAt": str(row.get("due_at") or ""),
            "scheduledFrom": str(row.get("scheduled_from") or ""),
            "startedAt": str(row.get("started_at") or ""),
            "completedAt": str(row.get("completed_at") or ""),
            "launchUrl": row.get("launch_url") or "",
            "hasResult": row["name"] in results_map,
            "result": row_to_result(result_row) if result_row else None,
        }
        assignments.append(item)

    return {"ok": True, "data": {"assignments": assignments}}


@frappe.whitelist(methods=["POST"])
def launch_aptitude_assignment():
    user_id, err = get_student_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    assignment_id = (payload.get("assignmentId") or "").strip()
    if not assignment_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Assignment id is required.")}

    assignment = frappe.get_doc("Scout Aptitude Assignment", assignment_id)
    if assignment.student_user != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("You cannot open this assignment.")}
    if assignment.status in {"Completed", "Cancelled", "Expired"}:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("This assignment is not available.")}

    assessment = frappe.get_doc("Scout Aptitude Assessment", assignment.aptitude_assessment)
    if assessment.status != "Published":
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("This assessment is not published.")}

    if assignment.status == "In Progress" and (assignment.launch_url or "").strip():
        return {
            "ok": True,
            "message": _("Resuming existing session."),
            "data": {
                "assignmentId": assignment.name,
                "mode": "resume",
                "launchUrl": assignment.launch_url,
                "devMode": platform_test_dev_mode_enabled(),
            },
        }

    if not assessment.tao_test_id:
        if platform_test_dev_mode_enabled():
            assessment.tao_test_id = f"dev-aptitude-{assessment.name}"
            assessment.tao_sync_status = "Skipped"
            assessment.save(ignore_permissions=True)
        else:
            frappe.local.response["http_status_code"] = 400
            return {"ok": False, "message": _("Assessment is not linked to TAO yet.")}

    session = create_student_delivery_session(
        test_id=assessment.tao_test_id,
        student_user=user_id,
        assignment_name=assignment.name,
    )
    if not session.get("ok"):
        frappe.local.response["http_status_code"] = 502
        return {"ok": False, "message": session.get("message") or _("Unable to start test session.")}

    assignment.status = "In Progress"
    assignment.started_at = assignment.started_at or now_datetime()
    assignment.tao_session_id = session.get("session_id") or ""
    assignment.launch_url = session.get("launch_url") or ""
    assignment.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "ok": True,
        "message": _("Session ready."),
        "data": {
            "assignmentId": assignment.name,
            "mode": session.get("mode") or "tao",
            "launchUrl": assignment.launch_url,
            "devMode": session.get("mode") == "dev" or platform_test_dev_mode_enabled(),
        },
    }


@frappe.whitelist(methods=["POST"])
def submit_aptitude_dev_result():
    user_id, err = get_student_session_user()
    if err:
        return err
    if not aptitude_dev_mode_enabled() and not platform_test_dev_mode_enabled():
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Dev aptitude mode is disabled.")}

    payload = frappe.request.get_json(silent=True) or {}
    assignment_id = (payload.get("assignmentId") or "").strip()
    if not assignment_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Assignment id is required.")}

    assignment = frappe.get_doc("Scout Aptitude Assignment", assignment_id)
    if assignment.student_user != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Not allowed.")}

    sample = {
        "overallScore": 68.0,
        "scores": {"quantitative": 72, "logical": 65, "verbal": 67},
        "traits": {"primary": "Analytical", "secondary": "Structured"},
        "recommendations": _("Sample aptitude result for dev/demo."),
        "completedAt": now_datetime(),
    }
    result = apply_aptitude_result(assignment_name=assignment_id, payload=sample, source="dev")
    return {"ok": True, "message": result.get("message"), "data": {"assignmentId": assignment_id}}


@frappe.whitelist(methods=["GET"])
def get_aptitude_result():
    user_id, err = get_student_session_user()
    if err:
        return err

    assignment_id = (frappe.form_dict.get("assignmentId") or "").strip()
    if not assignment_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Assignment id is required.")}

    assignment = frappe.get_doc("Scout Aptitude Assignment", assignment_id)
    if assignment.student_user != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Not allowed.")}

    result_name = frappe.db.get_value("Scout Aptitude Result", {"assignment": assignment_id}, "name")
    if not result_name:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("No result yet.")}

    row = frappe.get_doc("Scout Aptitude Result", result_name).as_dict()
    return {
        "ok": True,
        "data": {
            "assignment": row_to_assignment(assignment.as_dict()),
            "result": row_to_result(row),
        },
    }
