"""Razorpay order create and verify. Dev bypass when keys unset."""

import hashlib
import hmac

import frappe
from frappe import _

from scout.utils.env_config import razorpay_key_id, razorpay_key_secret

PAISE_PER_INR = 100


def razorpay_configured() -> bool:
    return bool(razorpay_key_id() and razorpay_key_secret())


def get_razorpay_key_id() -> str:
    return razorpay_key_id()


def create_payment_order(payer_user: str, purpose: str, amount_inr: float, reference_doctype: str, reference_name: str):
    amount_inr = float(amount_inr or 0)
    if amount_inr <= 0:
        frappe.throw(_("Amount must be greater than zero."))

    order_doc = frappe.get_doc(
        {
            "doctype": "Scout Payment Order",
            "payer_user": payer_user or "",
            "purpose": purpose,
            "amount_inr": amount_inr,
            "status": "Created",
            "reference_doctype": reference_doctype,
            "reference_name": reference_name,
        }
    )
    order_doc.insert(ignore_permissions=True)

    try:
        from scout.services.payment_client import create_razorpay_order_remote

        remote = create_razorpay_order_remote(
            amount_inr=amount_inr,
            receipt=order_doc.name,
            purpose=purpose,
            reference=reference_name,
        )
        if remote is not None:
            if remote.get("devBypass"):
                order_doc.status = "Dev Bypass"
            order_doc.razorpay_order_id = remote.get("razorpayOrderId") or ""
            order_doc.save(ignore_permissions=True)
            frappe.db.commit()
            return {
                "paymentOrderId": order_doc.name,
                "razorpayOrderId": order_doc.razorpay_order_id,
                "amountInr": amount_inr,
                "amountPaise": remote.get("amountPaise") or int(amount_inr * PAISE_PER_INR),
                "currency": "INR",
                "keyId": remote.get("keyId") or "",
                "devBypass": bool(remote.get("devBypass")),
            }
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Scout payment-service create order")

    if not razorpay_configured():
        order_doc.status = "Dev Bypass"
        order_doc.razorpay_order_id = f"dev_{order_doc.name}"
        order_doc.save(ignore_permissions=True)
        frappe.db.commit()
        return {
            "paymentOrderId": order_doc.name,
            "razorpayOrderId": order_doc.razorpay_order_id,
            "amountInr": amount_inr,
            "amountPaise": int(amount_inr * PAISE_PER_INR),
            "currency": "INR",
            "keyId": "",
            "devBypass": True,
        }

    import requests

    key_id = razorpay_key_id()
    key_secret = razorpay_key_secret()
    amount_paise = int(round(amount_inr * PAISE_PER_INR))
    payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": order_doc.name,
        "notes": {"purpose": purpose, "reference": reference_name},
    }
    try:
        resp = requests.post(
            "https://api.razorpay.com/v1/orders",
            auth=(key_id, key_secret),
            json=payload,
            timeout=20,
        )
        resp.raise_for_status()
        data = resp.json()
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), "Scout Razorpay create order")
        frappe.throw(_("Could not create payment order: {0}").format(str(exc)))

    order_doc.razorpay_order_id = data.get("id") or ""
    order_doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {
        "paymentOrderId": order_doc.name,
        "razorpayOrderId": order_doc.razorpay_order_id,
        "amountInr": amount_inr,
        "amountPaise": amount_paise,
        "currency": "INR",
        "keyId": key_id,
        "devBypass": False,
    }


def verify_razorpay_payment(payment_order_id: str, razorpay_payment_id: str, razorpay_order_id: str, razorpay_signature: str):
    order_doc = frappe.get_doc("Scout Payment Order", payment_order_id)
    if order_doc.status == "Paid":
        return order_doc

    if order_doc.status == "Dev Bypass":
        order_doc.status = "Paid"
        order_doc.save(ignore_permissions=True)
        frappe.db.commit()
        return order_doc

    try:
        from scout.services.payment_client import verify_razorpay_signature_remote

        remote_valid = verify_razorpay_signature_remote(
            razorpay_order_id=razorpay_order_id,
            razorpay_payment_id=razorpay_payment_id,
            razorpay_signature=razorpay_signature,
            dev_bypass=False,
        )
        if remote_valid is False:
            order_doc.status = "Failed"
            order_doc.save(ignore_permissions=True)
            frappe.db.commit()
            frappe.throw(_("Payment verification failed."))
        if remote_valid is True:
            order_doc.razorpay_payment_id = razorpay_payment_id
            order_doc.razorpay_signature = razorpay_signature
            order_doc.status = "Paid"
            order_doc.save(ignore_permissions=True)
            frappe.db.commit()
            return order_doc
    except Exception as exc:
        if "Payment verification failed" in str(exc):
            raise
        frappe.log_error(frappe.get_traceback(), "Scout payment-service verify")

    key_secret = razorpay_key_secret()
    body = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected = hmac.new(key_secret.encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, (razorpay_signature or "").strip()):
        order_doc.status = "Failed"
        order_doc.save(ignore_permissions=True)
        frappe.db.commit()
        frappe.throw(_("Payment verification failed."))

    order_doc.razorpay_payment_id = razorpay_payment_id
    order_doc.razorpay_signature = razorpay_signature
    order_doc.status = "Paid"
    order_doc.save(ignore_permissions=True)
    frappe.db.commit()
    return order_doc
