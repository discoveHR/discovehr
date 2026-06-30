"""
Frappe paths: ``scout.api.psychometric_api.*``
"""

import hashlib
import hmac
import os

import frappe
from frappe import _

from scout.api.admin.psychometric import (
    assign_psychometric_to_students,
    create_psychometric_assessment,
    list_psychometric_assessments,
    list_psychometric_assignments as admin_list_assignments,
)
from scout.api.common import get_admin_session_user
from scout.api.psychometric.results import apply_psychometric_result
from scout.api.psychometric.tao_client import psychometric_dev_mode_enabled
from scout.api.tao import get_tao_settings
from scout.api.student.psychometric import (
    get_psychometric_result,
    launch_psychometric_assignment,
    list_psychometric_assignments as student_list_assignments,
    submit_psychometric_dev_result,
)


def _webhook_secret() -> str:
    return (os.getenv("SCOUT_TAO_WEBHOOK_SECRET") or getattr(frappe.conf, "scout_tao_webhook_secret", "") or "").strip()


@frappe.whitelist(methods=["GET"])
def get_psychometric_config():
    """Module flags for admin/student UIs (requires auth)."""
    settings = get_tao_settings()
    return {
        "ok": True,
        "data": {
            "devMode": psychometric_dev_mode_enabled(),
            "taoConfigured": bool(settings.get("enabled")),
            "webhookConfigured": bool(_webhook_secret()),
        },
    }


@frappe.whitelist(methods=["POST"])
def simulate_psychometric_webhook():
    """Record a sample result (dev/demo) without TAO — admin only."""
    _user_id, err = get_admin_session_user()
    if err:
        return err
    if not psychometric_dev_mode_enabled():
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Psychometric dev mode is disabled on the server.")}

    payload = frappe.request.get_json(silent=True) or {}
    assignment_id = (payload.get("assignmentId") or "").strip()
    if not assignment_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("assignmentId is required.")}

    sample = {
        "overallScore": 74.0,
        "scores": {"openness": 80, "conscientiousness": 72, "extraversion": 68, "agreeableness": 78, "stability": 71},
        "traits": {"primary": "Analytical Collaborator", "secondary": "Structured Learner"},
        "recommendations": _("Simulated result for testing dashboards and PRI."),
        "completedAt": frappe.utils.now_datetime(),
    }
    outcome = apply_psychometric_result(assignment_name=assignment_id, payload=sample, source="admin_simulate")
    return {"ok": True, "message": outcome.get("message")}


@frappe.whitelist(allow_guest=True, methods=["POST"])
def tao_results_webhook():
    raw_body = frappe.request.get_data() or b""
    payload = frappe.request.get_json(silent=True) or {}
    secret = _webhook_secret()

    if not secret:
        frappe.local.response["http_status_code"] = 503
        return {"ok": False, "message": _("Webhook signature not configured. Set SCOUT_TAO_WEBHOOK_SECRET.")}

    signature = frappe.get_request_header("X-Tao-Signature") or frappe.get_request_header("X-Scout-Signature") or ""
    expected = hmac.new(secret.encode("utf-8"), raw_body, hashlib.sha256).hexdigest()
    if not signature or not hmac.compare_digest(signature.strip(), expected):
        frappe.local.response["http_status_code"] = 401
        return {"ok": False, "message": _("Invalid webhook signature.")}

    assignment_id = (payload.get("externalAssignmentId") or payload.get("assignmentId") or "").strip()
    if not assignment_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("assignmentId is required.")}
    if not frappe.db.exists("Scout Psychometric Assignment", assignment_id):
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Assignment not found.")}

    result_payload = {
        "overallScore": payload.get("overallScore"),
        "scores": payload.get("scores") if isinstance(payload.get("scores"), dict) else {},
        "traits": payload.get("traits") if isinstance(payload.get("traits"), dict) else {},
        "recommendations": payload.get("recommendations") or "",
        "completedAt": payload.get("completedAt"),
    }
    if not result_payload["scores"] and isinstance(payload.get("results"), dict):
        result_payload["scores"] = payload.get("results")

    try:
        outcome = apply_psychometric_result(assignment_name=assignment_id, payload=result_payload, source="tao_webhook")
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Scout: tao_results_webhook")
        frappe.local.response["http_status_code"] = 500
        return {"ok": False, "message": _("Failed to store result.")}

    return {"ok": True, "message": outcome.get("message"), "duplicate": bool(outcome.get("duplicate"))}


__all__ = [
    "admin_list_assignments",
    "assign_psychometric_to_students",
    "create_psychometric_assessment",
    "get_psychometric_config",
    "get_psychometric_result",
    "launch_psychometric_assignment",
    "list_psychometric_assessments",
    "simulate_psychometric_webhook",
    "student_list_assignments",
    "submit_psychometric_dev_result",
    "tao_results_webhook",
]
