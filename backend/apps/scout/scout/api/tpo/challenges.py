"""TPO challenges hub."""

import frappe
from frappe import _
from frappe.utils import now_datetime

from scout.api.common import get_tpo_session_user
from scout.api.tpo.helpers import norm


@frappe.whitelist(methods=["GET"])
def list_tpo_challenges():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    challenges = frappe.get_all(
        "Scout Challenge",
        filters={"tpo_user": user_id},
        fields=["name", "title", "description", "deadline", "status", "creation"],
        order_by="creation desc",
        limit_page_length=100,
    )
    if not challenges:
        return {"ok": True, "data": {"challenges": []}}

    challenge_names = [c["name"] for c in challenges]

    # Batch-load all applications in one query
    all_apps = frappe.get_all(
        "Scout Challenge Application",
        filters={"challenge": ["in", challenge_names]},
        fields=["name", "challenge", "student_user", "status", "submitted_at"],
        order_by="creation desc",
    )

    # Batch-load student profiles in one query
    student_users = list({a["student_user"] for a in all_apps if a.get("student_user")})
    profiles_map: dict = {}
    if student_users:
        profile_rows = frappe.get_all(
            "Scout Student Profile",
            filters={"student_user": ["in", student_users]},
            fields=["student_user", "full_name", "email", "department_stream"],
        )
        profiles_map = {r["student_user"]: r for r in profile_rows}

    # Group applications by challenge
    apps_by_challenge: dict = {c["name"]: [] for c in challenges}
    for a in all_apps:
        prof = profiles_map.get(a["student_user"] or "") or {}
        a["studentName"] = prof.get("full_name") or ""
        a["studentEmail"] = prof.get("email") or ""
        a["branch"] = prof.get("department_stream") or ""
        apps_by_challenge.setdefault(a["challenge"], []).append(a)

    out = []
    for ch in challenges:
        apps = apps_by_challenge.get(ch["name"], [])
        out.append(
            {
                "id": ch["name"],
                "title": ch["title"],
                "description": ch["description"] or "",
                "deadline": str(ch["deadline"] or ""),
                "status": ch["status"],
                "applicantCount": len(apps),
                "applicants": apps,
            }
        )
    return {"ok": True, "data": {"challenges": out}}


@frappe.whitelist(methods=["POST"])
def create_tpo_challenge():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    title = norm(p.get("title"))
    if not title:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Title is required.")}
    doc = frappe.get_doc(
        {
            "doctype": "Scout Challenge",
            "tpo_user": user_id,
            "title": title,
            "description": norm(p.get("description")),
            "deadline": p.get("deadline") or None,
            "status": norm(p.get("status")) or "Draft",
        }
    )
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Challenge created.")}


@frappe.whitelist(methods=["POST"])
def update_challenge_application_status():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    app_id = norm(p.get("applicationId"))
    status = norm(p.get("status"))
    if not app_id or status not in ("Submitted", "In Review", "Shortlisted", "Rejected", "Selected"):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid request.")}
    app = frappe.get_doc("Scout Challenge Application", app_id)
    ch = frappe.get_doc("Scout Challenge", app.challenge)
    if ch.tpo_user != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Not allowed.")}
    app.status = status
    app.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Application status updated.")}
