import json
import os
import secrets
from typing import Any
from urllib import request

import frappe

from scout.api.tao import get_tao_settings


def psychometric_dev_mode_enabled() -> bool:
    raw = (os.getenv("SCOUT_PSYCHOMETRIC_DEV_MODE") or getattr(frappe.conf, "scout_psychometric_dev_mode", "") or "").strip().lower()
    return raw in {"1", "true", "yes", "on"}


def aptitude_dev_mode_enabled() -> bool:
    raw = (os.getenv("SCOUT_APTITUDE_DEV_MODE") or getattr(frappe.conf, "scout_aptitude_dev_mode", "") or "").strip().lower()
    if raw in {"1", "true", "yes", "on"}:
        return True
    return psychometric_dev_mode_enabled()


def platform_test_dev_mode_enabled() -> bool:
    return psychometric_dev_mode_enabled() or aptitude_dev_mode_enabled()


def _tao_request(method: str, endpoint: str, payload: dict | None = None) -> dict[str, Any]:
    settings = get_tao_settings()
    if not settings["enabled"]:
        return {"ok": False, "message": "TAO not configured"}

    url = f"{settings['base_url']}{endpoint}"
    data = json.dumps(payload or {}).encode("utf-8") if payload is not None else None
    req = request.Request(url, data=data, method=method, headers={"Content-Type": "application/json", "Accept": "application/json"})
    if settings["api_key"]:
        req.add_header("Authorization", f"Bearer {settings['api_key']}")
    elif settings["client_id"] and settings["client_secret"]:
        req.add_header("X-Client-Id", settings["client_id"])
        req.add_header("X-Client-Secret", settings["client_secret"])

    with request.urlopen(req, timeout=settings["timeout_seconds"]) as response:
        body = response.read().decode("utf-8") or "{}"
    return json.loads(body)


def create_platform_test_in_tao(assessment_doc, test_type: str = "psychometric") -> dict[str, Any]:
    test_type = (test_type or "psychometric").strip().lower()
    label = "Psychometric" if test_type == "psychometric" else "Aptitude"
    settings = get_tao_settings()
    if not settings["enabled"]:
        if platform_test_dev_mode_enabled():
            fake_id = f"dev-{test_type}-{assessment_doc.name}"
            return {
                "ok": True,
                "status": "Skipped",
                "message": f"TAO not configured; using local dev test id ({test_type}).",
                "external_id": fake_id,
                "launch_url": "",
            }
        return {
            "ok": False,
            "status": "Skipped",
            "message": "TAO config is missing. Set SCOUT_TAO_* or enable SCOUT_PSYCHOMETRIC_DEV_MODE / SCOUT_APTITUDE_DEV_MODE.",
        }

    payload = {
        "title": assessment_doc.title,
        "description": assessment_doc.description or "",
        "durationMinutes": int(assessment_doc.duration_minutes or 45),
        "testType": test_type,
        "sourceAssessmentId": assessment_doc.name,
    }
    try:
        parsed = _tao_request("POST", "/api/tests", payload)
    except Exception as exc:
        return {"ok": False, "status": "Failed", "message": f"TAO sync failed: {exc}"}

    test_id = (parsed or {}).get("id") or (parsed or {}).get("testId") or ""
    if not test_id:
        return {"ok": False, "status": "Failed", "message": "TAO response missing test ID."}
    return {
        "ok": True,
        "status": "Synced",
        "message": f"{label} assessment synced to TAO.",
        "external_id": str(test_id),
        "launch_url": str((parsed or {}).get("launchUrl") or (parsed or {}).get("url") or ""),
    }


def create_psychometric_test_in_tao(assessment_doc) -> dict[str, Any]:
    return create_platform_test_in_tao(assessment_doc, test_type="psychometric")


def create_aptitude_test_in_tao(assessment_doc) -> dict[str, Any]:
    return create_platform_test_in_tao(assessment_doc, test_type="aptitude")


def create_student_delivery_session(*, test_id: str, student_user: str, assignment_name: str) -> dict[str, Any]:
    settings = get_tao_settings()
    email = frappe.get_value("User", student_user, "email") or student_user
    full_name = frappe.get_value("User", student_user, "full_name") or student_user

    if not settings["enabled"]:
        if platform_test_dev_mode_enabled():
            session_id = f"dev-session-{secrets.token_hex(8)}"
            return {
                "ok": True,
                "mode": "dev",
                "session_id": session_id,
                "launch_url": "",
                "message": "Local dev session (TAO not configured).",
            }
        return {"ok": False, "message": "TAO is not configured for test delivery."}

    payload = {
        "testId": test_id,
        "candidate": {"id": student_user, "email": email, "name": full_name},
        "externalAssignmentId": assignment_name,
    }
    try:
        parsed = _tao_request("POST", "/api/deliveries", payload)
    except Exception as exc:
        return {"ok": False, "message": f"TAO delivery session failed: {exc}"}

    session_id = (parsed or {}).get("sessionId") or (parsed or {}).get("id") or ""
    launch_url = (parsed or {}).get("launchUrl") or (parsed or {}).get("url") or ""
    if not launch_url and test_id:
        launch_url = f"{settings['base_url']}/delivery/{session_id or test_id}"
    if not session_id and not launch_url:
        return {"ok": False, "message": "TAO response missing session or launch URL."}
    return {
        "ok": True,
        "mode": "tao",
        "session_id": str(session_id),
        "launch_url": str(launch_url),
        "message": "TAO session created.",
    }
