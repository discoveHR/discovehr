"""Payment service: Razorpay order + verify only."""

from __future__ import annotations

import sys
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException
from pydantic import BaseModel, Field

_root = Path(__file__).resolve().parent
for _candidate in (_root, _root.parent):
    if (_candidate / "shared").is_dir():
        sys.path.insert(0, str(_candidate))
        break
from shared.auth import require_internal  # noqa: E402

from razorpay_core import create_razorpay_order, razorpay_configured, verify_signature  # noqa: E402

app = FastAPI(title="Scout Payment Service", version="1.0.0")


class CreateOrderRequest(BaseModel):
    amountInr: float = Field(gt=0)
    receipt: str
    purpose: str = ""
    reference: str = ""


class VerifyPaymentRequest(BaseModel):
    razorpayOrderId: str
    razorpayPaymentId: str
    razorpaySignature: str
    devBypass: bool = False


@app.get("/health")
def health():
    return {"ok": True, "service": "payment", "razorpay": razorpay_configured()}


@app.post("/v1/orders/create")
def create_order(body: CreateOrderRequest, _: None = Depends(require_internal)):
    try:
        data = create_razorpay_order(
            amount_inr=body.amountInr,
            receipt=body.receipt,
            purpose=body.purpose,
            reference=body.reference,
        )
        return {"ok": True, "data": data}
    except Exception as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.post("/v1/payments/verify")
def verify_payment(body: VerifyPaymentRequest, _: None = Depends(require_internal)):
    if body.devBypass:
        return {"ok": True, "valid": True, "devBypass": True}
    valid = verify_signature(
        razorpay_order_id=body.razorpayOrderId,
        razorpay_payment_id=body.razorpayPaymentId,
        razorpay_signature=body.razorpaySignature,
    )
    if not valid:
        raise HTTPException(status_code=400, detail="Payment verification failed")
    return {"ok": True, "valid": True}
