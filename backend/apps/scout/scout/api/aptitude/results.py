import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import flt, now_datetime


def row_to_assignment(row: dict) -> dict:
    assessment_title = ""
    if row.get("aptitude_assessment"):
        assessment_title = frappe.get_value("Scout Aptitude Assessment", row["aptitude_assessment"], "title") or ""
    return {
        "id": row.get("name"),
        "assessmentId": row.get("aptitude_assessment"),
        "assessmentTitle": assessment_title,
        "studentUser": row.get("student_user"),
        "studentEmail": frappe.get_value("User", row.get("student_user"), "email") if row.get("student_user") else "",
        "studentName": frappe.get_value("User", row.get("student_user"), "full_name") if row.get("student_user") else "",
        "status": row.get("status") or "Assigned",
        "dueAt": str(row.get("due_at") or ""),
        "scheduledFrom": str(row.get("scheduled_from") or ""),
        "startedAt": str(row.get("started_at") or ""),
        "completedAt": str(row.get("completed_at") or ""),
        "launchUrl": row.get("launch_url") or "",
        "hasResult": bool(frappe.db.exists("Scout Aptitude Result", {"assignment": row.get("name")})),
    }


def row_to_result(row: dict) -> dict:
    scores = {}
    traits = {}
    try:
        scores = json.loads(row.get("scores_json") or "{}")
    except json.JSONDecodeError:
        scores = {}
    try:
        traits = json.loads(row.get("traits_json") or "{}")
    except json.JSONDecodeError:
        traits = {}
    return {
        "id": row.get("name"),
        "assignmentId": row.get("assignment"),
        "assessmentId": row.get("aptitude_assessment"),
        "overallScore": flt(row.get("overall_score")),
        "scores": scores,
        "traits": traits,
        "recommendations": row.get("recommendations") or "",
        "completedAt": str(row.get("completed_at") or ""),
    }


def apply_aptitude_result(
    *,
    assignment_name: str,
    payload: dict[str, Any],
    source: str = "webhook",
) -> dict[str, Any]:
    assignment = frappe.get_doc("Scout Aptitude Assignment", assignment_name)
    if assignment.status == "Completed" and frappe.db.exists("Scout Aptitude Result", {"assignment": assignment_name}):
        return {"ok": True, "message": _("Result already recorded."), "duplicate": True}

    scores = payload.get("scores") if isinstance(payload.get("scores"), dict) else {}
    traits = payload.get("traits") if isinstance(payload.get("traits"), dict) else {}
    recommendations = (payload.get("recommendations") or "").strip()
    overall = payload.get("overallScore")
    if overall is None and scores:
        numeric = [flt(v) for v in scores.values() if isinstance(v, (int, float))]
        overall = sum(numeric) / len(numeric) if numeric else 0
    overall = flt(overall)

    completed_at = payload.get("completedAt") or now_datetime()
    existing = frappe.db.get_value("Scout Aptitude Result", {"assignment": assignment_name}, "name")
    if existing:
        doc = frappe.get_doc("Scout Aptitude Result", existing)
    else:
        doc = frappe.get_doc(
            {
                "doctype": "Scout Aptitude Result",
                "assignment": assignment_name,
                "student_user": assignment.student_user,
                "aptitude_assessment": assignment.aptitude_assessment,
            }
        )

    doc.overall_score = overall
    doc.scores_json = json.dumps(scores)
    doc.traits_json = json.dumps(traits)
    doc.recommendations = recommendations or _("No recommendations provided.")
    doc.raw_payload = json.dumps({"source": source, "payload": payload})
    doc.completed_at = completed_at
    if existing:
        doc.save(ignore_permissions=True)
    else:
        doc.insert(ignore_permissions=True)

    assignment.status = "Completed"
    assignment.completed_at = completed_at
    if not assignment.started_at:
        assignment.started_at = completed_at
    assignment.save(ignore_permissions=True)

    frappe.db.commit()
    return {"ok": True, "message": _("Aptitude result saved."), "resultId": doc.name}
