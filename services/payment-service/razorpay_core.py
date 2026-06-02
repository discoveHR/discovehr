"""Razorpay API only — no Frappe DocTypes."""

from __future__ import annotations

import hashlib
import hmac
import os

PAISE_PER_INR = 100


def razorpay_configured() -> bool:
    return bool((os.getenv("RAZORPAY_KEY_ID") or "").strip() and (os.getenv("RAZORPAY_KEY_SECRET") or "").strip())


def key_id() -> str:
    return (os.getenv("RAZORPAY_KEY_ID") or "").strip()


def key_secret() -> str:
    return (os.getenv("RAZORPAY_KEY_SECRET") or "").strip()


def create_razorpay_order(*, amount_inr: float, receipt: str, purpose: str, reference: str) -> dict:
    amount_inr = float(amount_inr or 0)
    if amount_inr <= 0:
        raise ValueError("Amount must be greater than zero")

    if not razorpay_configured():
        return {
            "razorpayOrderId": f"dev_{receipt}",
            "amountInr": amount_inr,
            "amountPaise": int(amount_inr * PAISE_PER_INR),
            "currency": "INR",
            "keyId": "",
            "devBypass": True,
        }

    import httpx

    amount_paise = int(round(amount_inr * PAISE_PER_INR))
    payload = {
        "amount": amount_paise,
        "currency": "INR",
        "receipt": receipt,
        "notes": {"purpose": purpose, "reference": reference},
    }
    resp = httpx.post(
        "https://api.razorpay.com/v1/orders",
        auth=(key_id(), key_secret()),
        json=payload,
        timeout=20.0,
    )
    resp.raise_for_status()
    data = resp.json()
    return {
        "razorpayOrderId": data.get("id") or "",
        "amountInr": amount_inr,
        "amountPaise": amount_paise,
        "currency": "INR",
        "keyId": key_id(),
        "devBypass": False,
    }


def verify_signature(*, razorpay_order_id: str, razorpay_payment_id: str, razorpay_signature: str) -> bool:
    if not razorpay_configured():
        return True
    body = f"{razorpay_order_id}|{razorpay_payment_id}"
    expected = hmac.new(key_secret().encode("utf-8"), body.encode("utf-8"), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, (razorpay_signature or "").strip())
