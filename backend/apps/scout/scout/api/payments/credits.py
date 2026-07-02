"""Student credit wallet and TPO credit purchases."""

import frappe
from frappe import _

from scout.api.common import get_student_session_user, get_tpo_session_user
from scout.api.payments.razorpay_util import create_payment_order, verify_razorpay_payment


def _norm(v):
    return (v or "").strip()


def get_or_create_wallet(student_user: str):
    name = frappe.db.get_value("Scout Student Credit Wallet", {"student_user": student_user})
    if name:
        return frappe.get_doc("Scout Student Credit Wallet", name)
    doc = frappe.get_doc({"doctype": "Scout Student Credit Wallet", "student_user": student_user, "balance_credits": 0})
    doc.insert(ignore_permissions=True)
    return doc


def grant_credits(student_user: str, credits: int, tpo_user: str = "", note: str = "", txn_type: str = "Grant"):
    wallet = get_or_create_wallet(student_user)
    wallet.balance_credits = int(wallet.balance_credits or 0) + int(credits)
    wallet.save(ignore_permissions=True)
    frappe.get_doc(
        {
            "doctype": "Scout Credit Transaction",
            "student_user": student_user,
            "tpo_user": tpo_user,
            "transaction_type": txn_type,
            "credits": credits,
            "note": note,
        }
    ).insert(ignore_permissions=True)


def spend_credits(student_user: str, credits: int, note: str = "", txn_type: str = "Student Spend") -> bool:
    wallet = get_or_create_wallet(student_user)
    bal = int(wallet.balance_credits or 0)
    if bal < credits:
        return False
    wallet.balance_credits = bal - credits
    wallet.save(ignore_permissions=True)
    frappe.get_doc(
        {
            "doctype": "Scout Credit Transaction",
            "student_user": student_user,
            "transaction_type": txn_type,
            "credits": -credits,
            "note": note,
        }
    ).insert(ignore_permissions=True)
    return True


@frappe.whitelist(methods=["GET"])
def get_student_credit_wallet():
    user_id, err = get_student_session_user()
    if err:
        return err
    wallet = get_or_create_wallet(user_id)
    txns = frappe.get_all(
        "Scout Credit Transaction",
        filters={"student_user": user_id},
        fields=["name", "transaction_type", "credits", "note", "creation"],
        order_by="creation desc",
        limit_page_length=30,
    )
    return {
        "ok": True,
        "data": {
            "balanceCredits": int(wallet.balance_credits or 0),
            "transactions": [
                {
                    "id": t.name,
                    "type": t.transaction_type,
                    "credits": t.credits,
                    "note": t.note or "",
                    "at": str(t.creation or ""),
                }
                for t in txns
            ],
        },
    }


CREDIT_PACKS = [
    {"id": "pack_50", "credits": 50, "priceInr": 500},
    {"id": "pack_100", "credits": 100, "priceInr": 900},
    {"id": "pack_250", "credits": 250, "priceInr": 2000},
]


@frappe.whitelist(methods=["GET"])
def list_credit_packs():
    return {"ok": True, "data": {"packs": CREDIT_PACKS}}


@frappe.whitelist(methods=["POST"])
def create_tpo_credit_purchase_order():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    pack_id = _norm(p.get("packId"))
    student_email = _norm(p.get("studentEmail")).lower()
    pack = next((x for x in CREDIT_PACKS if x["id"] == pack_id), None)
    if not pack:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid credit pack.")}
    if not student_email:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Student email is required.")}
    if not frappe.db.exists("User", student_email):
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Student not found.")}

    meta = json_dumps({"packId": pack_id, "studentEmail": student_email, "credits": pack["credits"], "tpoUser": user_id})
    order = create_payment_order(user_id, "TPO Credit Pack", pack["priceInr"], "TPO Credit Purchase", meta)
    frappe.db.set_value(
        "Scout Payment Order",
        order["paymentOrderId"],
        {"reference_name": meta},
        update_modified=False,
    )
    frappe.db.commit()
    return {"ok": True, "data": order}


@frappe.whitelist(methods=["POST"])
def verify_tpo_credit_purchase():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    payment_order_id = _norm(p.get("paymentOrderId"))
    order_doc = verify_razorpay_payment(
        payment_order_id,
        _norm(p.get("razorpayPaymentId")),
        _norm(p.get("razorpayOrderId")),
        _norm(p.get("razorpaySignature")),
    )
    if order_doc.purpose != "TPO Credit Pack":
        frappe.throw(_("Invalid payment purpose."))
    if frappe.db.exists("Scout Credit Transaction", {"note": order_doc.name, "transaction_type": "TPO Purchase"}):
        return {"ok": True, "message": _("Credits already granted for this payment.")}
    meta = json_loads(order_doc.reference_name or "{}")
    if meta.get("tpoUser") != user_id:
        frappe.throw(_("Not allowed."))
    student_email = meta.get("studentEmail")
    credits = int(meta.get("credits") or 0)
    grant_credits(
        student_email,
        credits,
        tpo_user=user_id,
        note=order_doc.name,
        txn_type="TPO Purchase",
    )
    frappe.db.commit()
    return {"ok": True, "message": _("{0} credits added to {1}.").format(credits, student_email)}


def json_dumps(obj):
    import json

    return json.dumps(obj)


def json_loads(raw):
    import json

    try:
        return json.loads(raw or "{}")
    except Exception:
        return {}
