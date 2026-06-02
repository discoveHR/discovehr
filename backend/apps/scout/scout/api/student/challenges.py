"""Student challenge hub."""

import frappe
from frappe import _

from scout.api.common import get_student_session_user


def _norm(v):
    return (v or "").strip()


@frappe.whitelist(methods=["GET"])
def list_student_challenges():
    user_id, err = get_student_session_user()
    if err:
        return err
    prof = frappe.db.get_value("Scout Student Profile", {"student_user": user_id}, "linked_tpo_user")
    if not prof:
        return {"ok": True, "data": {"challenges": []}}

    rows = frappe.get_all(
        "Scout Challenge",
        filters={"tpo_user": prof, "status": "Published"},
        fields=["name", "title", "description", "deadline"],
        order_by="deadline asc",
        limit_page_length=50,
    )
    out = []
    for ch in rows:
        app = frappe.db.get_value(
            "Scout Challenge Application",
            {"challenge": ch.name, "student_user": user_id},
            ["name", "status"],
            as_dict=True,
        )
        out.append(
            {
                "id": ch.name,
                "title": ch.title,
                "description": ch.description or "",
                "deadline": str(ch.deadline or ""),
                "applied": bool(app),
                "applicationStatus": (app or {}).get("status") or "",
            }
        )
    return {"ok": True, "data": {"challenges": out}}


@frappe.whitelist(methods=["POST"])
def apply_student_challenge():
    user_id, err = get_student_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    challenge_id = _norm(p.get("challengeId"))
    if not challenge_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Challenge ID is required.")}
    ch = frappe.get_doc("Scout Challenge", challenge_id)
    if ch.status != "Published":
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Challenge is not open.")}
    if frappe.db.exists("Scout Challenge Application", {"challenge": challenge_id, "student_user": user_id}):
        return {"ok": False, "message": _("Already applied.")}
    frappe.get_doc(
        {
            "doctype": "Scout Challenge Application",
            "challenge": challenge_id,
            "student_user": user_id,
            "status": "Submitted",
        }
    ).insert(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Application submitted.")}
