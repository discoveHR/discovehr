from __future__ import annotations

from scout.services.config import payment_service_url, use_payment_service
from scout.services.http_client import post_json


def create_razorpay_order_remote(*, amount_inr: float, receipt: str, purpose: str, reference: str) -> dict | None:
    if not use_payment_service():
        return None

    body = post_json(
        payment_service_url(),
        "/v1/orders/create",
        {
            "amountInr": amount_inr,
            "receipt": receipt,
            "purpose": purpose,
            "reference": reference,
        },
    )
    return body.get("data")


def verify_razorpay_signature_remote(
    *,
    razorpay_order_id: str,
    razorpay_payment_id: str,
    razorpay_signature: str,
    dev_bypass: bool = False,
) -> bool | None:
    if not use_payment_service():
        return None

    if dev_bypass:
        post_json(
            payment_service_url(),
            "/v1/payments/verify",
            {
                "razorpayOrderId": razorpay_order_id,
                "razorpayPaymentId": razorpay_payment_id,
                "razorpaySignature": razorpay_signature,
                "devBypass": True,
            },
        )
        return True

    body = post_json(
        payment_service_url(),
        "/v1/payments/verify",
        {
            "razorpayOrderId": razorpay_order_id,
            "razorpayPaymentId": razorpay_payment_id,
            "razorpaySignature": razorpay_signature,
            "devBypass": False,
        },
    )
    return bool(body.get("valid"))
