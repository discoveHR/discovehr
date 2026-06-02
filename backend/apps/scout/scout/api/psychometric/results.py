import json
from typing import Any

import frappe
from frappe import _
from frappe.utils import flt, now_datetime


def row_to_assignment(row: dict) -> dict:
    assessment_title = ""
    if row.get("psychometric_assessment"):
        assessment_title = frappe.get_value("Scout Psychometric Assessment", row["psychometric_assessment"], "title") or ""
    return {
        "id": row.get("name"),
        "assessmentId": row.get("psychometric_assessment"),
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
        "hasResult": bool(frappe.db.exists("Scout Psychometric Result", {"assignment": row.get("name")})),
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
        "assessmentId": row.get("psychometric_assessment"),
        "overallScore": flt(row.get("overall_score")),
        "scores": scores,
        "traits": traits,
        "recommendations": row.get("recommendations") or "",
        "completedAt": str(row.get("completed_at") or ""),
    }


def apply_psychometric_result(
    *,
    assignment_name: str,
    payload: dict[str, Any],
    source: str = "webhook",
) -> dict[str, Any]:
    assignment = frappe.get_doc("Scout Psychometric Assignment", assignment_name)
    if assignment.status == "Completed" and frappe.db.exists("Scout Psychometric Result", {"assignment": assignment_name}):
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
    existing = frappe.db.get_value("Scout Psychometric Result", {"assignment": assignment_name}, "name")
    if existing:
        doc = frappe.get_doc("Scout Psychometric Result", existing)
    else:
        doc = frappe.get_doc(
            {
                "doctype": "Scout Psychometric Result",
                "assignment": assignment_name,
                "student_user": assignment.student_user,
                "psychometric_assessment": assignment.psychometric_assessment,
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

    _maybe_update_pri_score(assignment.student_user, overall)
    frappe.db.commit()
    return {"ok": True, "message": _("Psychometric result saved."), "resultId": doc.name}


def _maybe_update_pri_score(student_user: str, overall_score: float) -> None:
    if not student_user or not frappe.db.exists("Scout Student Profile", student_user):
        return
    if not frappe.db.has_column("Scout Student Profile", "pri_score"):
        return
    current = flt(frappe.db.get_value("Scout Student Profile", student_user, "pri_score") or 0)
    if overall_score > current:
        frappe.db.set_value("Scout Student Profile", student_user, "pri_score", overall_score, update_modified=False)
