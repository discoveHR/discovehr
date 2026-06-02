"""Student-facing placement & training calendars."""

import frappe
from frappe import _

from scout.api.common import get_student_session_user
from scout.api.student.inbound_suggestions import student_has_inbound_suggestion


@frappe.whitelist(methods=["GET"])
def list_student_placement_calendar():
    user_id, err = get_student_session_user()
    if err:
        return err

    prof = frappe.db.get_value(
        "Scout Student Profile",
        {"student_user": user_id},
        ["linked_tpo_user", "department_stream", "college"],
        as_dict=True,
    )
    tpo_user = (prof or {}).get("linked_tpo_user")
    if not tpo_user:
        return {"ok": True, "data": {"events": []}}

    rows = frappe.get_all(
        "Scout Placement Calendar Event",
        filters={"tpo_user": tpo_user, "status": "Published"},
        fields="*",
        order_by="start_datetime asc",
        limit_page_length=100,
    )
    events = []
    for row in rows:
        can_apply = True
        job_id = row.get("linked_job_id")
        if row.get("apply_only_if_suggested") and job_id:
            can_apply = student_has_inbound_suggestion(user_id, job_id)
        events.append(
            {
                "id": row.name,
                "title": row.title,
                "eventType": row.event_type,
                "startDatetime": str(row.start_datetime or ""),
                "endDatetime": str(row.end_datetime or ""),
                "location": row.location or "",
                "description": row.description or "",
                "linkedJobId": job_id or "",
                "canApply": can_apply,
                "applyOnlyIfSuggested": bool(row.get("apply_only_if_suggested")),
            }
        )
    return {"ok": True, "data": {"events": events}}


@frappe.whitelist(methods=["GET"])
def list_student_training_calendar():
    user_id, err = get_student_session_user()
    if err:
        return err
    prof = frappe.db.get_value(
        "Scout Student Profile",
        {"student_user": user_id},
        ["linked_tpo_user", "department_stream"],
        as_dict=True,
    )
    tpo_user = (prof or {}).get("linked_tpo_user")
    dept = (prof or {}).get("department_stream") or ""
    if not tpo_user:
        return {"ok": True, "data": {"sessions": []}}

    rows = frappe.get_all(
        "Scout Training Session",
        filters={"tpo_user": tpo_user, "status": "Published"},
        fields="*",
        order_by="start_datetime asc",
        limit_page_length=100,
    )
    sessions = []
    for row in rows:
        dep = (row.department or "").lower()
        if dep and dept and dep not in dept.lower() and dept.lower() not in dep:
            continue
        sessions.append(
            {
                "id": row.name,
                "title": row.title,
                "department": row.department,
                "startDatetime": str(row.start_datetime or ""),
                "endDatetime": str(row.end_datetime or ""),
                "location": row.location or "",
                "trainer": row.trainer or "",
                "description": row.description or "",
            }
        )
    return {"ok": True, "data": {"sessions": sessions}}


@frappe.whitelist(methods=["GET"])
def list_student_mock_exams():
    user_id, err = get_student_session_user()
    if err:
        return err
    prof = frappe.db.get_value("Scout Student Profile", {"student_user": user_id}, "linked_tpo_user")
    if not prof:
        return {"ok": True, "data": {"exams": []}}
    rows = frappe.get_all(
        "Scout Mock Exam",
        filters={"tpo_user": prof, "status": "Published"},
        fields="*",
        order_by="exam_datetime asc",
    )
    exams = []
    for row in rows:
        reg = frappe.db.get_value(
            "Scout Mock Exam Registration",
            {"mock_exam": row.name, "student_user": user_id},
            ["name", "payment_status", "score_percent", "passed", "pri_applied"],
            as_dict=True,
        )
        exams.append(
            {
                "id": row.name,
                "title": row.title,
                "examDatetime": str(row.exam_datetime or ""),
                "feeInr": float(row.fee_inr or 50),
                "durationMinutes": int(row.duration_minutes or 60),
                "instructions": row.instructions or "",
                "resultsPublished": bool(row.results_published),
                "registered": bool(reg),
                "registration": reg or None,
            }
        )
    return {"ok": True, "data": {"exams": exams}}


def _norm(v):
    return (v or "").strip()


@frappe.whitelist(methods=["POST"])
def create_mock_exam_payment_order():
    """Create pending registration + Razorpay order for mock exam fee."""
    from scout.api.payments.razorpay_util import create_payment_order

    user_id, err = get_student_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    exam_id = _norm(p.get("examId"))
    if not exam_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Exam ID is required.")}
    exam = frappe.get_doc("Scout Mock Exam", exam_id)
    if exam.status != "Published":
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Exam is not open for registration.")}

    existing = frappe.db.get_value(
        "Scout Mock Exam Registration",
        {"mock_exam": exam_id, "student_user": user_id},
        ["name", "payment_status"],
        as_dict=True,
    )
    if existing and existing.payment_status == "Paid":
        return {"ok": False, "message": _("Already registered.")}

    fee = float(exam.fee_inr or 50)
    if existing:
        reg = frappe.get_doc("Scout Mock Exam Registration", existing.name)
    else:
        reg = frappe.get_doc(
            {
                "doctype": "Scout Mock Exam Registration",
                "mock_exam": exam_id,
                "student_user": user_id,
                "fee_inr": fee,
                "payment_status": "Pending",
            }
        )
        reg.insert(ignore_permissions=True)

    order = create_payment_order(user_id, "Mock Exam", fee, "Scout Mock Exam Registration", reg.name)
    reg.payment_order_id = order["paymentOrderId"]
    reg.save(ignore_permissions=True)
    frappe.db.commit()
    return {
        "ok": True,
        "data": {
            **order,
            "registrationId": reg.name,
            "examId": exam_id,
        },
    }


@frappe.whitelist(methods=["POST"])
def verify_mock_exam_payment():
    from scout.api.payments.razorpay_util import verify_razorpay_payment

    user_id, err = get_student_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    payment_order_id = _norm(p.get("paymentOrderId"))
    reg_id = _norm(p.get("registrationId"))
    order_doc = verify_razorpay_payment(
        payment_order_id,
        _norm(p.get("razorpayPaymentId")),
        _norm(p.get("razorpayOrderId")),
        _norm(p.get("razorpaySignature")),
    )
    if order_doc.purpose != "Mock Exam":
        frappe.throw(_("Invalid payment purpose."))
    reg = frappe.get_doc("Scout Mock Exam Registration", reg_id or order_doc.reference_name)
    if reg.student_user != user_id:
        frappe.throw(_("Not allowed."))
    reg.payment_status = "Paid"
    reg.fee_inr = order_doc.amount_inr
    reg.payment_order_id = order_doc.name
    reg.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Registered for mock exam. Good luck!")}


@frappe.whitelist(methods=["POST"])
def register_student_mock_exam():
    """Legacy: dev bypass when Razorpay not configured (creates paid registration directly)."""
    from scout.api.payments.razorpay_util import razorpay_configured

    if razorpay_configured():
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Use payment checkout for this exam.")}
    user_id, err = get_student_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    exam_id = _norm(p.get("examId"))
    if not exam_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Exam ID is required.")}
    exam = frappe.get_doc("Scout Mock Exam", exam_id)
    if exam.status != "Published":
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Exam is not open for registration.")}
    if frappe.db.exists("Scout Mock Exam Registration", {"mock_exam": exam_id, "student_user": user_id, "payment_status": "Paid"}):
        return {"ok": False, "message": _("Already registered.")}
    doc = frappe.get_doc(
        {
            "doctype": "Scout Mock Exam Registration",
            "mock_exam": exam_id,
            "student_user": user_id,
            "fee_inr": exam.fee_inr,
            "payment_status": "Paid",
        }
    )
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Registered (dev mode — no payment gateway).")}
