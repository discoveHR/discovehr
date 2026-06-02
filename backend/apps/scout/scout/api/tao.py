import json
import os
from typing import Any
from urllib import request

import frappe


def _cfg(key: str, default: str = "") -> str:
    env_value = (os.getenv(key) or "").strip()
    if env_value:
        return env_value
    return (getattr(frappe.conf, key.lower(), "") or default).strip()


def get_tao_settings() -> dict[str, Any]:
    base_url = _cfg("SCOUT_TAO_BASE_URL", "").rstrip("/")
    api_key = _cfg("SCOUT_TAO_API_KEY", "")
    client_id = _cfg("SCOUT_TAO_CLIENT_ID", "")
    client_secret = _cfg("SCOUT_TAO_CLIENT_SECRET", "")
    timeout_raw = _cfg("SCOUT_TAO_TIMEOUT_SECONDS", "12")
    try:
        timeout_seconds = max(3, int(timeout_raw))
    except ValueError:
        timeout_seconds = 12

    enabled = bool(base_url and (api_key or (client_id and client_secret)))
    return {
        "enabled": enabled,
        "base_url": base_url,
        "api_key": api_key,
        "client_id": client_id,
        "client_secret": client_secret,
        "timeout_seconds": timeout_seconds,
    }


def create_test_for_assessment(assessment_doc) -> dict[str, Any]:
    settings = get_tao_settings()
    if not settings["enabled"]:
        return {
            "ok": False,
            "status": "Skipped",
            "message": "TAO config is missing. Set SCOUT_TAO_* values to enable sync.",
        }

    payload = {
        "title": assessment_doc.title,
        "description": assessment_doc.description or "",
        "durationMinutes": int(assessment_doc.duration_minutes or 0),
        "totalQuestions": int(assessment_doc.total_questions or 0),
        "passingScore": float(assessment_doc.passing_score or 0),
        "sourceAssessmentId": assessment_doc.name,
        "scheduleMode": getattr(assessment_doc, "schedule_mode", None) or "Scheduled",
        "questionClass": getattr(assessment_doc, "question_class", None) or "MCQ Single",
        "proctoringLevel": getattr(assessment_doc, "proctoring_level", None) or "None",
    }

    endpoint = f"{settings['base_url']}/api/tests"
    req = request.Request(
        endpoint,
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
        headers={"Content-Type": "application/json", "Accept": "application/json"},
    )
    if settings["api_key"]:
        req.add_header("Authorization", f"Bearer {settings['api_key']}")
    elif settings["client_id"] and settings["client_secret"]:
        req.add_header("X-Client-Id", settings["client_id"])
        req.add_header("X-Client-Secret", settings["client_secret"])

    try:
        with request.urlopen(req, timeout=settings["timeout_seconds"]) as response:
            body = response.read().decode("utf-8") or "{}"
        parsed = json.loads(body)
    except Exception as exc:
        return {"ok": False, "status": "Failed", "message": f"TAO sync failed: {exc}"}

    test_id = (parsed or {}).get("id") or (parsed or {}).get("testId") or ""
    launch_url = (parsed or {}).get("launchUrl") or (parsed or {}).get("url") or ""
    if not test_id:
        return {"ok": False, "status": "Failed", "message": "TAO response missing test ID."}

    return {
        "ok": True,
        "status": "Synced",
        "message": "Assessment synced to TAO.",
        "external_id": str(test_id),
        "launch_url": str(launch_url or ""),
    }
