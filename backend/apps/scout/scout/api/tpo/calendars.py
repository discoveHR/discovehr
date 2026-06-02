"""TPO calendars: placement, training, internal mock exams."""

import frappe
from frappe import _
from frappe.utils import get_datetime, now_datetime

from scout.api.common import get_tpo_session_user
from scout.api.tpo.helpers import norm


def _parse_dt(value, label: str):
    if not value:
        frappe.throw(_("{0} is required.").format(label))
    try:
        return get_datetime(value)
    except Exception:
        frappe.throw(_("{0} is invalid.").format(label))


def _serialize_placement(row):
    return {
        "id": row.get("name"),
        "title": row.get("title") or "",
        "eventType": row.get("event_type") or "",
        "startDatetime": str(row.get("start_datetime") or ""),
        "endDatetime": str(row.get("end_datetime") or ""),
        "linkedJobId": row.get("linked_job_id") or "",
        "departmentFilter": row.get("department_filter") or "",
        "branchFilter": row.get("branch_filter") or "",
        "slotsAvailable": int(row.get("slots_available") or 0),
        "applyOnlyIfSuggested": bool(row.get("apply_only_if_suggested")),
        "location": row.get("location") or "",
        "description": row.get("description") or "",
        "status": row.get("status") or "Draft",
    }


def _serialize_training(row):
    return {
        "id": row.get("name"),
        "title": row.get("title") or "",
        "department": row.get("department") or "",
        "startDatetime": str(row.get("start_datetime") or ""),
        "endDatetime": str(row.get("end_datetime") or ""),
        "location": row.get("location") or "",
        "trainer": row.get("trainer") or "",
        "description": row.get("description") or "",
        "status": row.get("status") or "Draft",
    }


def _serialize_mock_exam(row):
    regs = frappe.db.count("Scout Mock Exam Registration", {"mock_exam": row.get("name")})
    return {
        "id": row.get("name"),
        "title": row.get("title") or "",
        "examDatetime": str(row.get("exam_datetime") or ""),
        "durationMinutes": int(row.get("duration_minutes") or 0),
        "feeInr": float(row.get("fee_inr") or 50),
        "priPointsOnPass": float(row.get("pri_points_on_pass") or 0),
        "instructions": row.get("instructions") or "",
        "resultsPublished": bool(row.get("results_published")),
        "status": row.get("status") or "Draft",
        "registrationCount": regs,
    }


@frappe.whitelist(methods=["GET"])
def list_placement_calendar_events():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    rows = frappe.get_all(
        "Scout Placement Calendar Event",
        filters={"tpo_user": user_id},
        fields="*",
        order_by="start_datetime desc",
        limit_page_length=200,
    )
    return {"ok": True, "data": {"events": [_serialize_placement(r) for r in rows]}}


@frappe.whitelist(methods=["POST"])
def create_placement_calendar_event():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    title = norm(p.get("title"))
    if not title:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Title is required.")}
    start_dt = _parse_dt(p.get("startDatetime"), _("Start date/time"))
    end_dt = _parse_dt(p.get("endDatetime"), _("End date/time"))
    if end_dt <= start_dt:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("End must be after start.")}
    doc = frappe.get_doc(
        {
            "doctype": "Scout Placement Calendar Event",
            "tpo_user": user_id,
            "title": title,
            "event_type": norm(p.get("eventType")) or "Recruitment Drive",
            "start_datetime": start_dt,
            "end_datetime": end_dt,
            "linked_job_id": norm(p.get("linkedJobId")) or None,
            "department_filter": norm(p.get("departmentFilter")),
            "branch_filter": norm(p.get("branchFilter")),
            "slots_available": int(p.get("slotsAvailable") or 0),
            "apply_only_if_suggested": 1 if p.get("applyOnlyIfSuggested", True) else 0,
            "location": norm(p.get("location")),
            "description": norm(p.get("description")),
            "status": norm(p.get("status")) or "Draft",
        }
    )
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Placement event created."), "data": {"event": _serialize_placement(doc.as_dict())}}


@frappe.whitelist(methods=["GET"])
def list_training_sessions():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    rows = frappe.get_all(
        "Scout Training Session",
        filters={"tpo_user": user_id},
        fields="*",
        order_by="start_datetime desc",
        limit_page_length=200,
    )
    return {"ok": True, "data": {"sessions": [_serialize_training(r) for r in rows]}}


@frappe.whitelist(methods=["POST"])
def create_training_session():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    title = norm(p.get("title"))
    department = norm(p.get("department"))
    if not title or not department:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Title and department are required.")}
    start_dt = _parse_dt(p.get("startDatetime"), _("Start date/time"))
    end_dt = _parse_dt(p.get("endDatetime"), _("End date/time"))
    if end_dt <= start_dt:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("End must be after start.")}
    doc = frappe.get_doc(
        {
            "doctype": "Scout Training Session",
            "tpo_user": user_id,
            "title": title,
            "department": department,
            "start_datetime": start_dt,
            "end_datetime": end_dt,
            "location": norm(p.get("location")),
            "trainer": norm(p.get("trainer")),
            "description": norm(p.get("description")),
            "status": norm(p.get("status")) or "Draft",
        }
    )
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Training session created."), "data": {"session": _serialize_training(doc.as_dict())}}


@frappe.whitelist(methods=["GET"])
def list_mock_exams():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    rows = frappe.get_all(
        "Scout Mock Exam",
        filters={"tpo_user": user_id},
        fields="*",
        order_by="exam_datetime desc",
        limit_page_length=200,
    )
    exams = [_serialize_mock_exam(r) for r in rows]
    for ex in exams:
        ex["registrations"] = frappe.get_all(
            "Scout Mock Exam Registration",
            filters={"mock_exam": ex["id"]},
            fields=["name", "student_user", "payment_status", "score_percent", "passed", "pri_applied"],
            limit_page_length=500,
        )
        for reg in ex["registrations"]:
            su = reg.get("student_user")
            reg["studentName"] = frappe.get_cached_value("User", su, "full_name") if su else ""
            reg["studentEmail"] = frappe.get_cached_value("User", su, "email") if su else ""
    return {"ok": True, "data": {"exams": exams}}


@frappe.whitelist(methods=["POST"])
def create_mock_exam():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    title = norm(p.get("title"))
    if not title:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Title is required.")}
    exam_dt = _parse_dt(p.get("examDatetime"), _("Exam date/time"))
    doc = frappe.get_doc(
        {
            "doctype": "Scout Mock Exam",
            "tpo_user": user_id,
            "title": title,
            "exam_datetime": exam_dt,
            "duration_minutes": int(p.get("durationMinutes") or 60),
            "fee_inr": float(p.get("feeInr") or 50),
            "pri_points_on_pass": float(p.get("priPointsOnPass") or 5),
            "instructions": norm(p.get("instructions")),
            "status": norm(p.get("status")) or "Draft",
        }
    )
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Mock exam created."), "data": {"exam": _serialize_mock_exam(doc.as_dict())}}


@frappe.whitelist(methods=["POST"])
def publish_mock_exam_results():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    exam_id = norm(p.get("examId"))
    results = p.get("results") or []
    if not exam_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Exam ID is required.")}

    exam = frappe.get_doc("Scout Mock Exam", exam_id)
    if exam.tpo_user != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Not allowed.")}

    updated = 0
    for item in results:
        reg_id = norm(item.get("registrationId"))
        if not reg_id:
            continue
        reg = frappe.get_doc("Scout Mock Exam Registration", reg_id)
        if reg.mock_exam != exam_id:
            continue
        score = float(item.get("scorePercent") or 0)
        passed = bool(item.get("passed"))
        reg.score_percent = score
        reg.passed = 1 if passed else 0
        reg.save(ignore_permissions=True)
        if passed and not reg.pri_applied and exam.pri_points_on_pass:
            prof_name = frappe.db.get_value("Scout Student Profile", {"student_user": reg.student_user})
            if prof_name:
                prof = frappe.get_doc("Scout Student Profile", prof_name)
                prof.pri_score = float(prof.pri_score or 0) + float(exam.pri_points_on_pass)
                prof.save(ignore_permissions=True)
            reg.pri_applied = 1
            reg.save(ignore_permissions=True)
        updated += 1

    exam.results_published = 1
    exam.status = "Closed"
    exam.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Results published. PRI updated for passing students.")}
