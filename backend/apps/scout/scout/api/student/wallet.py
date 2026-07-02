"""Student coin wallet: purchase coins via Razorpay and upgrade to Pro."""

import json

import frappe
from frappe import _

from scout.api.common import get_student_session_user
from scout.api.payments.credits import get_or_create_wallet, grant_credits, spend_credits
from scout.api.payments.razorpay_util import create_payment_order, verify_razorpay_payment

COIN_PACKAGES = [
    {"id": "coins_10", "coins": 10, "priceInr": 100, "label": "Starter Pack"},
    {"id": "coins_50", "coins": 50, "priceInr": 500, "label": "Value Pack"},
    {"id": "coins_120", "coins": 120, "priceInr": 1200, "label": "Pro Upgrade Pack"},
]
PRO_UPGRADE_COST = 120


def _get_pro_status(student_user: str) -> tuple[str, bool]:
    """Return (profile_name, is_pro). profile_name is empty if no profile."""
    row = frappe.db.get_value(
        "Scout Student Profile",
        {"student_user": student_user},
        ["name", "is_pro"],
        as_dict=True,
    )
    if not row:
        return "", False
    return row["name"], bool(row.get("is_pro"))


@frappe.whitelist(methods=["GET"])
def get_wallet():
    user_id, err = get_student_session_user()
    if err:
        return err
    wallet = get_or_create_wallet(user_id)
    _, is_pro = _get_pro_status(user_id)
    txns = frappe.get_all(
        "Scout Credit Transaction",
        filters={"student_user": user_id},
        fields=["name", "transaction_type", "credits", "amount_inr", "note", "creation"],
        order_by="creation desc",
        limit_page_length=50,
    )
    return {
        "ok": True,
        "data": {
            "coinBalance": int(wallet.balance_credits or 0),
            "isPro": is_pro,
            "packages": COIN_PACKAGES,
            "transactions": [
                {
                    "id": t.name,
                    "type": t.transaction_type,
                    "coins": int(t.credits or 0),
                    "amountInr": float(t.amount_inr or 0),
                    "note": t.note or "",
                    "at": str(t.creation or ""),
                }
                for t in txns
            ],
        },
    }


@frappe.whitelist(methods=["POST"])
def create_coin_purchase_order():
    user_id, err = get_student_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    pack_id = (p.get("packId") or "").strip()
    pack = next((x for x in COIN_PACKAGES if x["id"] == pack_id), None)
    if not pack:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid coin package.")}
    meta = json.dumps({"packId": pack_id, "coins": pack["coins"], "studentUser": user_id})
    order = create_payment_order(user_id, "Student Coin Purchase", pack["priceInr"], "Student Coin Purchase", meta)
    return {"ok": True, "data": order}


@frappe.whitelist(methods=["POST"])
def verify_coin_purchase():
    user_id, err = get_student_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    payment_order_id = (p.get("paymentOrderId") or "").strip()
    order_doc = verify_razorpay_payment(
        payment_order_id,
        (p.get("razorpayPaymentId") or "").strip(),
        (p.get("razorpayOrderId") or "").strip(),
        (p.get("razorpaySignature") or "").strip(),
    )
    if order_doc.purpose != "Student Coin Purchase":
        frappe.throw(_("Invalid payment purpose."))
    if frappe.db.exists("Scout Credit Transaction", {"note": order_doc.name, "transaction_type": "Student Purchase"}):
        wallet = get_or_create_wallet(user_id)
        return {"ok": True, "message": _("Coins already credited."), "data": {"coinBalance": int(wallet.balance_credits or 0)}}
    meta = json.loads(order_doc.reference_name or "{}")
    if meta.get("studentUser") != user_id:
        frappe.throw(_("Not allowed."))
    coins = int(meta.get("coins") or 0)
    grant_credits(user_id, coins, note=order_doc.name, txn_type="Student Purchase")
    frappe.db.commit()
    wallet = get_or_create_wallet(user_id)
    return {
        "ok": True,
        "message": _("{0} coins added to your wallet!").format(coins),
        "data": {"coinBalance": int(wallet.balance_credits or 0)},
    }


@frappe.whitelist(methods=["POST"])
def upgrade_to_pro():
    user_id, err = get_student_session_user()
    if err:
        return err
    profile_name, is_pro = _get_pro_status(user_id)
    if not profile_name:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Student profile not found. Please complete your profile first.")}
    if is_pro:
        return {"ok": True, "message": _("Your account is already Pro!"), "data": {"isPro": True}}

    wallet = get_or_create_wallet(user_id)
    balance = int(wallet.balance_credits or 0)
    if balance < PRO_UPGRADE_COST:
        frappe.local.response["http_status_code"] = 400
        return {
            "ok": False,
            "message": _("Insufficient coins. You need {0} coins but have {1}. Please recharge your wallet.").format(PRO_UPGRADE_COST, balance),
            "data": {"insufficientCoins": True, "required": PRO_UPGRADE_COST, "balance": balance},
        }

    ok = spend_credits(user_id, PRO_UPGRADE_COST, note="Pro membership upgrade", txn_type="Pro Upgrade")
    if not ok:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Insufficient coins. Please recharge your wallet."), "data": {"insufficientCoins": True}}

    frappe.db.set_value(
        "Scout Student Profile",
        profile_name,
        {"is_pro": 1, "pro_activated_at": frappe.utils.now_datetime()},
        update_modified=False,
    )
    frappe.db.commit()
    return {
        "ok": True,
        "message": _("Congratulations! Your account has been upgraded to Pro."),
        "data": {"isPro": True},
    }


__all__ = [
    "create_coin_purchase_order",
    "get_wallet",
    "upgrade_to_pro",
    "verify_coin_purchase",
]
