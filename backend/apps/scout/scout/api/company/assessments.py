import json

import frappe
from frappe import _
from frappe.utils import get_datetime

from scout.api.common import get_company_session_user, row_to_assessment
from scout.api.company.credits import assessment_coin_cost, spend_company_credits
from scout.api.tao import create_test_for_assessment

ASSESSMENT_FIELDS = [
    "name",
    "title",
    "description",
    "schedule_mode",
    "question_class",
    "mcq_scoring_mode",
    "duration_minutes",
    "total_questions",
    "passing_score",
    "window_start",
    "window_end",
    "proctoring_level",
    "integration_mode",
    "questions_json",
    "coins_spent",
    "status",
    "tao_sync_status",
    "tao_external_id",
    "tao_launch_url",
    "tao_sync_message",
]

SCHEDULE_MODES = ("Scheduled", "Floating")
QUESTION_CLASSES = ("MCQ Single", "MCQ Multi", "MCQ Weighted", "Descriptive", "Coding")
PROCTORING_LEVELS = ("None", "Standard", "Full")
INTEGRATION_MODES = ("Frappe Native", "TAO", "Frappe + TAO")


def _parse_questions_json(raw) -> str:
    if raw is None or raw == "":
        return ""
    if isinstance(raw, (list, dict)):
        return json.dumps(raw)
    if isinstance(raw, str):
        text = raw.strip()
        if not text:
            return ""
        try:
            json.loads(text)
        except (TypeError, ValueError):
            frappe.throw(_("Questions JSON must be valid JSON."))
        return text
    frappe.throw(_("Questions JSON must be valid JSON."))


def _default_mcq_scoring(question_class: str) -> str:
    if question_class == "MCQ Multi":
        return "Multiple Correct"
    if question_class == "MCQ Weighted":
        return "Weighted Options"
    return "Single Correct"


def _tao_enabled(integration_mode: str) -> bool:
    return integration_mode in ("TAO", "Frappe + TAO")


def _sync_tao_if_needed(doc) -> None:
    if not _tao_enabled(doc.integration_mode or ""):
        doc.tao_sync_status = "Skipped"
        doc.tao_sync_message = "TAO not selected for this assessment."
        return
    tao_sync = create_test_for_assessment(doc)
    doc.tao_sync_status = tao_sync.get("status") or "Pending"
    doc.tao_sync_message = tao_sync.get("message") or ""
    if tao_sync.get("ok"):
        doc.tao_external_id = tao_sync.get("external_id") or ""
        doc.tao_launch_url = tao_sync.get("launch_url") or ""


def _list_for_user(user_id: str):
    rows = frappe.get_all(
        "Scout Assessment",
        filters={"company_user": user_id},
        fields=ASSESSMENT_FIELDS,
        order_by="creation desc",
    )
    return [row_to_assessment(row) for row in rows]


@frappe.whitelist(methods=["GET"])
def list_assessments():
    user_id, err = get_company_session_user()
    if err:
        return err
    return {
        "ok": True,
        "data": {
            "assessments": _list_for_user(user_id),
            "catalog": {
                "scheduleModes": list(SCHEDULE_MODES),
                "questionClasses": list(QUESTION_CLASSES),
                "proctoringLevels": list(PROCTORING_LEVELS),
                "integrationModes": list(INTEGRATION_MODES),
            },
        },
    }


@frappe.whitelist(methods=["POST"])
def create_assessment():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    description = (payload.get("description") or "").strip()
    schedule_mode = (payload.get("scheduleMode") or "Scheduled").strip()
    question_class = (payload.get("questionClass") or "MCQ Single").strip()
    mcq_scoring_mode = (payload.get("mcqScoringMode") or "").strip() or _default_mcq_scoring(question_class)
    duration_minutes = payload.get("durationMinutes")
    total_questions = payload.get("totalQuestions")
    passing_score = payload.get("passingScore")
    window_start = payload.get("windowStart")
    window_end = payload.get("windowEnd")
    proctoring_level = (payload.get("proctoringLevel") or "None").strip()
    integration_mode = (payload.get("integrationMode") or "Frappe Native").strip()
    questions_json = _parse_questions_json(payload.get("questionsJson"))

    if not title or duration_minutes is None or total_questions is None or passing_score is None:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Title, duration, total questions and passing score are required.")}

    if schedule_mode not in SCHEDULE_MODES:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid schedule mode.")}
    if question_class not in QUESTION_CLASSES:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid question class.")}
    if proctoring_level not in PROCTORING_LEVELS:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid proctoring level.")}
    if integration_mode not in INTEGRATION_MODES:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid integration mode.")}

    if schedule_mode == "Scheduled" and (not window_start or not window_end):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Scheduled assessments require window start and end.")}

    try:
        duration_minutes = int(duration_minutes)
        total_questions = int(total_questions)
        passing_score = float(passing_score)
    except (TypeError, ValueError):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Duration, total questions and passing score must be numeric values.")}
    if duration_minutes <= 0 or total_questions <= 0:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Duration and total questions must be greater than zero.")}
    if passing_score < 0 or passing_score > 100:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Passing score must be between 0 and 100.")}

    doc = frappe.get_doc(
        {
            "doctype": "Scout Assessment",
            "company_user": user_id,
            "title": title,
            "description": description,
            "schedule_mode": schedule_mode,
            "question_class": question_class,
            "mcq_scoring_mode": mcq_scoring_mode,
            "duration_minutes": duration_minutes,
            "total_questions": total_questions,
            "passing_score": passing_score,
            "window_start": get_datetime(window_start) if window_start else None,
            "window_end": get_datetime(window_end) if window_end else None,
            "proctoring_level": proctoring_level,
            "integration_mode": integration_mode,
            "questions_json": questions_json,
            "status": "Draft",
            "tao_sync_status": "Pending",
            "coins_spent": 0,
        }
    )
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    assessments = _list_for_user(user_id)
    assessment = next((item for item in assessments if item["id"] == doc.name), None)
    est = assessment_coin_cost(proctoring_level, integration_mode)
    return {
        "ok": True,
        "message": _("Assessment saved as draft. Publish to spend {0} coin(s).").format(est),
        "data": {"assessment": assessment, "assessments": assessments, "estimatedCoins": est},
    }


@frappe.whitelist(methods=["POST"])
def publish_assessment():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    assessment_id = (payload.get("assessmentId") or "").strip()
    if not assessment_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Assessment ID is required.")}

    doc = frappe.get_doc("Scout Assessment", assessment_id)
    if doc.company_user != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Not allowed.")}

    if doc.status == "Published":
        return {"ok": False, "message": _("Assessment is already published.")}

    cost = assessment_coin_cost(doc.proctoring_level or "None", doc.integration_mode or "Frappe Native")
    if not spend_company_credits(
        user_id,
        cost,
        note=f"Publish assessment {doc.title}",
        reference_doctype="Scout Assessment",
        reference_name=doc.name,
    ):
        frappe.local.response["http_status_code"] = 402
        return {
            "ok": False,
            "message": _("Insufficient coins. Need {0} coin(s); purchase credits first.").format(cost),
            "data": {"coinsRequired": cost},
        }

    doc.status = "Published"
    doc.coins_spent = cost
    _sync_tao_if_needed(doc)
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    assessments = _list_for_user(user_id)
    assessment = next((item for item in assessments if item["id"] == doc.name), None)
    return {
        "ok": True,
        "message": _("Assessment published ({0} coin(s) spent).").format(cost),
        "data": {"assessment": assessment, "assessments": assessments},
    }
