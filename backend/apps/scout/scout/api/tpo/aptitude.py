import json
import os

import frappe
from frappe import _
from frappe.utils import get_datetime, now_datetime

from scout.api.admin.directory import college_student_user_ids
from scout.api.aptitude.results import row_to_assignment
from scout.api.common import get_tpo_session_user
from scout.api.payments.razorpay_util import create_payment_order, verify_razorpay_payment
from scout.api.psychometric.tao_client import create_aptitude_test_in_tao
from scout.api.tpo.profile import get_tpo_profile_row


def tpo_aptitude_create_fee_inr() -> float:
    raw = (os.getenv("SCOUT_TPO_APTITUDE_FEE_INR") or getattr(frappe.conf, "scout_tpo_aptitude_fee_inr", "") or "30").strip()
    try:
        fee = float(raw)
    except (TypeError, ValueError):
        fee = 30.0
    return max(fee, 1.0)


def _row_to_assessment(row: dict) -> dict:
    return {
        "id": row.get("name"),
        "title": row.get("title"),
        "description": row.get("description") or "",
        "durationMinutes": int(row.get("duration_minutes") or 0),
        "status": row.get("status") or "Draft",
        "taoTestId": row.get("tao_test_id") or "",
        "taoSyncStatus": row.get("tao_sync_status") or "",
        "taoSyncMessage": row.get("tao_sync_message") or "",
        "assignmentCount": frappe.db.count("Scout Aptitude Assignment", {"aptitude_assessment": row.get("name")}),
    }


def _tpo_college_context(tpo_user: str) -> dict:
    profile = get_tpo_profile_row(tpo_user) or {}
    college_name = (profile.get("college_name") or "").strip()
    college_id = ""
    if college_name and frappe.db.table_exists("tabScout College"):
        college_id = frappe.db.get_value("Scout College", {"college_name": college_name}, "name") or ""
    return {"college_name": college_name, "scout_college": college_id}


@frappe.whitelist(methods=["POST"])
def create_tpo_aptitude_payment_order():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    description = (payload.get("description") or "").strip()
    duration_minutes = payload.get("durationMinutes")
    due_at = payload.get("dueAt")

    if not title:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Title is required.")}
    try:
        duration_minutes = int(duration_minutes)
    except (TypeError, ValueError):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Duration must be a number.")}
    if duration_minutes <= 0:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Duration must be greater than zero.")}

    fee = tpo_aptitude_create_fee_inr()
    college_ctx = _tpo_college_context(user_id)
    draft = {
        "title": title,
        "description": description,
        "durationMinutes": duration_minutes,
        "dueAt": due_at or "",
        "tpoUser": user_id,
        "collegeName": college_ctx["college_name"],
        "scoutCollege": college_ctx["scout_college"],
    }

    order = create_payment_order(user_id, "TPO Aptitude Test", fee, "Scout Aptitude Assessment", "pending")
    frappe.db.set_value(
        "Scout Payment Order",
        order["paymentOrderId"],
        "metadata_json",
        json.dumps(draft),
        update_modified=False,
    )
    frappe.db.commit()
    return {
        "ok": True,
        "data": {
            **order,
            "feeInr": fee,
            "draft": draft,
        },
    }


@frappe.whitelist(methods=["POST"])
def verify_tpo_aptitude_payment():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    payment_order_id = (payload.get("paymentOrderId") or "").strip()
    if not payment_order_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Payment order id is required.")}

    order_doc = verify_razorpay_payment(
        payment_order_id,
        (payload.get("razorpayPaymentId") or "").strip(),
        (payload.get("razorpayOrderId") or "").strip(),
        (payload.get("razorpaySignature") or "").strip(),
    )
    if order_doc.purpose != "TPO Aptitude Test":
        frappe.throw(_("Invalid payment purpose."))
    if order_doc.payer_user != user_id:
        frappe.throw(_("Not allowed."))

    if frappe.db.exists("Scout Aptitude Assessment", {"payment_order_id": order_doc.name}):
        existing_id = frappe.db.get_value("Scout Aptitude Assessment", {"payment_order_id": order_doc.name}, "name")
        assessment = frappe.get_doc("Scout Aptitude Assessment", existing_id)
        return {
            "ok": True,
            "message": _("Aptitude test already created for this payment."),
            "data": {"assessment": _row_to_assessment(assessment.as_dict())},
        }

    try:
        draft = json.loads(order_doc.metadata_json or "{}")
    except json.JSONDecodeError:
        draft = {}

    title = (draft.get("title") or "").strip()
    if not title:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Payment draft is missing title.")}

    doc = frappe.get_doc(
        {
            "doctype": "Scout Aptitude Assessment",
            "title": title,
            "description": (draft.get("description") or "").strip(),
            "duration_minutes": int(draft.get("durationMinutes") or 45),
            "status": "Published",
            "created_by_tpo": 1,
            "tpo_user": user_id,
            "college_name": draft.get("collegeName") or "",
            "scout_college": draft.get("scoutCollege") or "",
            "payment_order_id": order_doc.name,
            "tao_sync_status": "Pending",
        }
    )
    doc.insert(ignore_permissions=True)

    tao_sync = create_aptitude_test_in_tao(doc)
    doc.tao_sync_status = tao_sync.get("status") or "Pending"
    doc.tao_sync_message = tao_sync.get("message") or ""
    if tao_sync.get("ok"):
        doc.tao_test_id = tao_sync.get("external_id") or ""
    doc.save(ignore_permissions=True)

    order_doc.reference_name = doc.name
    order_doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "ok": True,
        "message": _("Aptitude test created and synced to TAO."),
        "data": {"assessment": _row_to_assessment(doc.as_dict())},
    }


@frappe.whitelist(methods=["GET"])
def list_tpo_aptitude_assessments():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    rows = frappe.get_all(
        "Scout Aptitude Assessment",
        filters={"tpo_user": user_id},
        fields=[
            "name",
            "title",
            "description",
            "duration_minutes",
            "status",
            "tao_test_id",
            "tao_sync_status",
            "tao_sync_message",
        ],
        order_by="modified desc",
    )
    return {"ok": True, "data": {"assessments": [_row_to_assessment(row) for row in rows]}}


def _tpo_college_student_ids(tpo_user: str) -> list[str]:
    ctx = _tpo_college_context(tpo_user)
    if not ctx["college_name"] and not ctx["scout_college"]:
        return []
    return college_student_user_ids(ctx["scout_college"], ctx["college_name"])


@frappe.whitelist(methods=["POST"])
def assign_tpo_aptitude_to_students():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    assessment_id = (payload.get("assessmentId") or "").strip()
    due_at = payload.get("dueAt")
    student_ids = payload.get("studentIds") or []
    assign_all = bool(payload.get("assignAllCollegeStudents"))

    if not assessment_id or not frappe.db.exists("Scout Aptitude Assessment", assessment_id):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Valid assessment is required.")}

    assessment = frappe.get_doc("Scout Aptitude Assessment", assessment_id)
    if assessment.tpo_user != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("You can only assign your own aptitude tests.")}
    if assessment.status != "Published":
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Assessment must be Published before assigning students.")}

    allowed = set(_tpo_college_student_ids(user_id))
    emails: list[str] = []
    if assign_all:
        emails = sorted(allowed)
    elif isinstance(student_ids, list):
        for raw in student_ids:
            sid = (raw or "").strip().lower()
            if sid and sid in allowed:
                emails.append(sid)

    if not emails:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Select at least one student from your college.")}

    parsed_due = None
    if due_at:
        try:
            parsed_due = get_datetime(due_at)
        except Exception:
            frappe.local.response["http_status_code"] = 400
            return {"ok": False, "message": _("Invalid due date.")}

    created = []
    skipped = []
    for email in emails:
        if not frappe.db.exists("User", email):
            skipped.append({"email": email, "reason": "User not found"})
            continue
        existing = frappe.db.exists(
            "Scout Aptitude Assignment",
            {
                "aptitude_assessment": assessment_id,
                "student_user": email,
                "status": ["in", ["Assigned", "In Progress"]],
            },
        )
        if existing:
            skipped.append({"email": email, "reason": "Already assigned"})
            continue
        doc = frappe.get_doc(
            {
                "doctype": "Scout Aptitude Assignment",
                "aptitude_assessment": assessment_id,
                "student_user": email,
                "assigned_by": user_id,
                "status": "Assigned",
                "scheduled_from": now_datetime(),
                "due_at": parsed_due,
            }
        )
        doc.insert(ignore_permissions=True)
        created.append(row_to_assignment(doc.as_dict()))

    frappe.db.commit()
    return {
        "ok": True,
        "message": _("Assigned {0} student(s).").format(len(created)),
        "data": {"created": created, "skipped": skipped},
    }


@frappe.whitelist(methods=["GET"])
def list_tpo_aptitude_assignments():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    assessment_id = (frappe.form_dict.get("assessmentId") or "").strip()
    assessment_ids = frappe.get_all("Scout Aptitude Assessment", filters={"tpo_user": user_id}, pluck="name")
    if not assessment_ids:
        return {"ok": True, "data": {"assignments": []}}

    filters = {"aptitude_assessment": ["in", assessment_ids]}
    if assessment_id:
        if assessment_id not in assessment_ids:
            return {"ok": True, "data": {"assignments": []}}
        filters["aptitude_assessment"] = assessment_id

    rows = frappe.get_all(
        "Scout Aptitude Assignment",
        filters=filters,
        fields=[
            "name",
            "aptitude_assessment",
            "student_user",
            "status",
            "due_at",
            "scheduled_from",
            "started_at",
            "completed_at",
            "launch_url",
        ],
        order_by="modified desc",
        limit=500,
    )
    return {"ok": True, "data": {"assignments": [row_to_assignment(row) for row in rows]}}
