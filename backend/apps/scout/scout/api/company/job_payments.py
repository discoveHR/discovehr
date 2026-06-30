"""Job extension (₹500 / 90 days) and job boost (₹1 000 / 30 days) via Razorpay."""

import datetime

import frappe
from frappe import _

from scout.api.common import get_company_session_user
from scout.api.payments.razorpay_util import create_payment_order, verify_razorpay_payment

JOB_EXTENSION_PRICE_INR = 500
JOB_EXTENSION_DAYS = 90

JOB_BOOST_PRICE_INR = 1000
JOB_BOOST_DAYS = 30


def _get_owned_active_job(job_id: str, user_id: str):
    doc = frappe.get_doc("Scout Job", job_id)
    if doc.company_user != user_id:
        frappe.local.response["http_status_code"] = 403
        return None, {"ok": False, "message": _("You are not allowed to modify this job.")}
    return doc, None


# ── Extension ────────────────────────────────────────────────────────────────

@frappe.whitelist(methods=["POST"])
def create_job_extension_order():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    job_id = (payload.get("jobId") or "").strip()
    if not job_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("jobId is required.")}

    doc, err = _get_owned_active_job(job_id, user_id)
    if err:
        return err

    from scout.api.common import job_display_status
    display = job_display_status(doc.status, doc.get("expires_at"), bool(doc.get("is_boosted")))
    if display not in ("Expired", "Expiring Soon", "Active"):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("This job cannot be extended in its current state.")}

    order = create_payment_order(
        payer_user=user_id,
        purpose="Job Extension",
        amount_inr=JOB_EXTENSION_PRICE_INR,
        reference_doctype="Scout Job",
        reference_name=job_id,
    )
    return {"ok": True, "data": order}


@frappe.whitelist(methods=["POST"])
def verify_job_extension():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    payment_order_id = (payload.get("paymentOrderId") or "").strip()
    job_id = (payload.get("jobId") or "").strip()
    if not payment_order_id or not job_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("paymentOrderId and jobId are required.")}

    doc, err = _get_owned_active_job(job_id, user_id)
    if err:
        return err

    verify_razorpay_payment(
        payment_order_id=payment_order_id,
        razorpay_payment_id=payload.get("razorpayPaymentId") or "",
        razorpay_order_id=payload.get("razorpayOrderId") or "",
        razorpay_signature=payload.get("razorpaySignature") or "",
    )

    now = frappe.utils.now_datetime()
    # Extend from today if expired; from current expiry if still active
    if doc.get("expires_at"):
        from frappe.utils import get_datetime
        base = max(get_datetime(doc.expires_at), now)
    else:
        base = now

    doc.expires_at = base + datetime.timedelta(days=JOB_EXTENSION_DAYS)
    if doc.status != "Active":
        doc.status = "Active"
    if not doc.get("posted_at"):
        doc.posted_at = now
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    from scout.api.common import row_to_job
    return {
        "ok": True,
        "message": _("Job extended by 90 days."),
        "data": {"job": row_to_job(doc.as_dict())},
    }


# ── Boost ─────────────────────────────────────────────────────────────────────

@frappe.whitelist(methods=["POST"])
def create_job_boost_order():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    job_id = (payload.get("jobId") or "").strip()
    if not job_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("jobId is required.")}

    doc, err = _get_owned_active_job(job_id, user_id)
    if err:
        return err

    if doc.status != "Active":
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Only active jobs can be boosted.")}

    order = create_payment_order(
        payer_user=user_id,
        purpose="Job Boost",
        amount_inr=JOB_BOOST_PRICE_INR,
        reference_doctype="Scout Job",
        reference_name=job_id,
    )
    return {"ok": True, "data": order}


@frappe.whitelist(methods=["POST"])
def verify_job_boost():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    payment_order_id = (payload.get("paymentOrderId") or "").strip()
    job_id = (payload.get("jobId") or "").strip()
    if not payment_order_id or not job_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("paymentOrderId and jobId are required.")}

    doc, err = _get_owned_active_job(job_id, user_id)
    if err:
        return err

    verify_razorpay_payment(
        payment_order_id=payment_order_id,
        razorpay_payment_id=payload.get("razorpayPaymentId") or "",
        razorpay_order_id=payload.get("razorpayOrderId") or "",
        razorpay_signature=payload.get("razorpaySignature") or "",
    )

    now = frappe.utils.now_datetime()
    doc.is_boosted = 1
    doc.boost_expires_at = now + datetime.timedelta(days=JOB_BOOST_DAYS)
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    from scout.api.common import row_to_job
    return {
        "ok": True,
        "message": _("Job boosted for 30 days."),
        "data": {"job": row_to_job(doc.as_dict())},
    }
