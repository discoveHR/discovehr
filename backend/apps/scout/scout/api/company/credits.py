"""Company coin wallet: ₹10/coin, Razorpay purchase, usage pricing."""

import json

import frappe
from frappe import _

from scout.api.common import get_company_session_user
from scout.api.payments.razorpay_util import create_payment_order, verify_razorpay_payment

COIN_PRICE_INR = 10

# Usage in coins (override via site_config scout_coin_rates JSON if needed)
DEFAULT_COIN_RATES = {
    "assessment": 1,
    "freelance_interview": 5,
    "full_proctoring": 3,
    "standard_proctoring": 1,
}


def _coin_rates() -> dict:
    raw = frappe.conf.get("scout_coin_rates")
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except (TypeError, ValueError):
            raw = None
    if isinstance(raw, dict):
        merged = dict(DEFAULT_COIN_RATES)
        merged.update({k: int(v) for k, v in raw.items() if v is not None})
        return merged
    return dict(DEFAULT_COIN_RATES)


def get_or_create_company_wallet(company_user: str):
    name = frappe.db.get_value("Scout Company Credit Wallet", {"company_user": company_user})
    if name:
        return frappe.get_doc("Scout Company Credit Wallet", name)
    doc = frappe.get_doc({"doctype": "Scout Company Credit Wallet", "company_user": company_user, "balance_credits": 0})
    doc.insert(ignore_permissions=True)
    return doc


def grant_company_credits(company_user: str, credits: int, note: str = "", amount_inr: float = 0):
    wallet = get_or_create_company_wallet(company_user)
    wallet.balance_credits = int(wallet.balance_credits or 0) + int(credits)
    wallet.save(ignore_permissions=True)
    frappe.get_doc(
        {
            "doctype": "Scout Credit Transaction",
            "company_user": company_user,
            "transaction_type": "Company Purchase",
            "credits": credits,
            "amount_inr": amount_inr,
            "note": note,
        }
    ).insert(ignore_permissions=True)


def spend_company_credits(company_user: str, credits: int, note: str = "", reference_doctype: str = "", reference_name: str = "") -> bool:
    wallet = get_or_create_company_wallet(company_user)
    bal = int(wallet.balance_credits or 0)
    if bal < credits:
        return False
    wallet.balance_credits = bal - credits
    wallet.save(ignore_permissions=True)
    frappe.get_doc(
        {
            "doctype": "Scout Credit Transaction",
            "company_user": company_user,
            "transaction_type": "Company Spend",
            "credits": -credits,
            "note": note,
            "reference_doctype": reference_doctype,
            "reference_name": reference_name,
        }
    ).insert(ignore_permissions=True)
    return True


def assessment_coin_cost(proctoring_level: str = "None", integration_mode: str = "Frappe Native") -> int:
    rates = _coin_rates()
    cost = int(rates.get("assessment") or 1)
    if proctoring_level == "Full":
        cost += int(rates.get("full_proctoring") or 3)
    elif proctoring_level == "Standard":
        cost += int(rates.get("standard_proctoring") or 1)
    if integration_mode in ("TAO", "Frappe + TAO"):
        pass  # TAO sync included in assessment base; scale via TAO infra
    return cost


def freelance_interview_coin_cost() -> int:
    return int(_coin_rates().get("freelance_interview") or 5)


@frappe.whitelist(methods=["GET"])
def get_company_credit_wallet():
    user_id, err = get_company_session_user()
    if err:
        return err
    wallet = get_or_create_company_wallet(user_id)
    txns = frappe.get_all(
        "Scout Credit Transaction",
        filters={"company_user": user_id},
        fields=["name", "transaction_type", "credits", "amount_inr", "note", "creation"],
        order_by="creation desc",
        limit_page_length=40,
    )
    rates = _coin_rates()
    return {
        "ok": True,
        "data": {
            "balanceCredits": int(wallet.balance_credits or 0),
            "coinPriceInr": COIN_PRICE_INR,
            "rates": {
                "assessment": rates["assessment"],
                "freelanceInterview": rates["freelance_interview"],
                "fullProctoring": rates["full_proctoring"],
                "standardProctoring": rates["standard_proctoring"],
            },
            "transactions": [
                {
                    "id": t.name,
                    "type": t.transaction_type,
                    "credits": t.credits,
                    "amountInr": float(t.amount_inr or 0),
                    "note": t.note or "",
                    "at": str(t.creation or ""),
                }
                for t in txns
            ],
        },
    }


COMPANY_COIN_PACKS = [
    {"id": "coins_10", "coins": 10, "priceInr": 100},
    {"id": "coins_50", "coins": 50, "priceInr": 500},
    {"id": "coins_100", "coins": 100, "priceInr": 1000},
    {"id": "coins_500", "coins": 500, "priceInr": 5000},
]


@frappe.whitelist(methods=["GET"])
def list_company_coin_packs():
    user_id, err = get_company_session_user()
    if err:
        return err
    return {
        "ok": True,
        "data": {
            "coinPriceInr": COIN_PRICE_INR,
            "packs": COMPANY_COIN_PACKS,
            "rates": _coin_rates(),
        },
    }


@frappe.whitelist(methods=["POST"])
def create_company_coin_purchase_order():
    user_id, err = get_company_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    pack_id = (p.get("packId") or "").strip()
    custom_coins = p.get("customCoins")
    pack = next((x for x in COMPANY_COIN_PACKS if x["id"] == pack_id), None)
    if pack:
        coins = int(pack["coins"])
        amount_inr = float(pack["priceInr"])
    elif custom_coins:
        try:
            coins = int(custom_coins)
        except (TypeError, ValueError):
            coins = 0
        if coins < 1 or coins > 10000:
            frappe.local.response["http_status_code"] = 400
            return {"ok": False, "message": _("Custom coins must be between 1 and 10000.")}
        amount_inr = coins * COIN_PRICE_INR
    else:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Select a pack or enter custom coin amount.")}

    meta = json.dumps({"coins": coins, "companyUser": user_id, "packId": pack_id or "custom"})
    order = create_payment_order(user_id, "Company Coin Purchase", amount_inr, "Scout Company Credit Wallet", user_id)
    frappe.db.set_value("Scout Payment Order", order["paymentOrderId"], "metadata_json", meta)
    frappe.db.commit()
    return {"ok": True, "data": {**order, "coins": coins}}


@frappe.whitelist(methods=["POST"])
def verify_company_coin_purchase():
    user_id, err = get_company_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    order_doc = verify_razorpay_payment(
        (p.get("paymentOrderId") or "").strip(),
        (p.get("razorpayPaymentId") or "").strip(),
        (p.get("razorpayOrderId") or "").strip(),
        (p.get("razorpaySignature") or "").strip(),
    )
    meta = {}
    try:
        meta = json.loads(order_doc.metadata_json or "{}")
    except (TypeError, ValueError):
        meta = {}
    coins = int(meta.get("coins") or 0)
    if coins <= 0:
        return {"ok": False, "message": _("Invalid purchase metadata.")}
    grant_company_credits(
        user_id,
        coins,
        note=f"Razorpay purchase {order_doc.name}",
        amount_inr=float(order_doc.amount_inr or 0),
    )
    frappe.db.commit()
    wallet = get_or_create_company_wallet(user_id)
    return {
        "ok": True,
        "message": _("{0} coins added to your wallet.").format(coins),
        "data": {"balanceCredits": int(wallet.balance_credits or 0)},
    }
