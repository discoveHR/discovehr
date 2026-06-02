"""TPO engagement: HR invites, community posts, credit pack helpers."""

import hashlib
import secrets

import frappe
from frappe import _
from frappe.exceptions import OutgoingEmailError
from frappe.utils import add_days, now_datetime

from scout.api.common import get_tpo_session_user
from scout.api.payments.credits import CREDIT_PACKS, create_tpo_credit_purchase_order, verify_tpo_credit_purchase
from scout.api.tpo.helpers import norm
from scout.utils.email import scout_send_email


@frappe.whitelist(methods=["GET"])
def list_credit_packs_tpo():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    return {"ok": True, "data": {"packs": CREDIT_PACKS}}


@frappe.whitelist(methods=["POST"])
def purchase_student_credits_order():
    return create_tpo_credit_purchase_order()


@frappe.whitelist(methods=["POST"])
def purchase_student_credits_verify():
    return verify_tpo_credit_purchase()


@frappe.whitelist(methods=["POST"])
def invite_hr_partner():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    hr_email = norm(p.get("hrEmail")).lower()
    hr_name = norm(p.get("hrName"))
    drive_title = norm(p.get("campusDriveTitle")) or _("Campus recruitment drive")
    posting_id = norm(p.get("postingId")) or None
    if not hr_email:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("HR email is required.")}

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
    expires_at = add_days(now_datetime(), 14)
    doc = frappe.get_doc(
        {
            "doctype": "Scout HR Access Token",
            "token_hash": token_hash,
            "hr_email": hr_email,
            "hr_name": hr_name,
            "tpo_user": user_id,
            "campus_drive_title": drive_title,
            "posting_id": posting_id,
            "expires_at": expires_at,
            "is_active": 1,
        }
    )
    doc.insert(ignore_permissions=True)
    frappe.db.commit()

    frontend_base = (getattr(frappe.conf, "scout_frontend_base_url", None) or "http://localhost:3000").rstrip("/")
    link = f"{frontend_base}/hr/special/{raw_token}"
    tpo_name = frappe.get_cached_value("User", user_id, "full_name") or "Training & Placement Office"
    greeting = hr_name or _("HR partner")
    subject = _("Campus drive invite: {0}").format(drive_title)
    message = (
        f"Hello {greeting},<br><br>"
        f"{tpo_name} invited you to collaborate on Scout Express for <b>{drive_title}</b>.<br><br>"
        f"Open your HR dashboard (no login required): <a href='{link}'>{link}</a><br>"
        f"This link expires in 14 days.<br><br>"
        "Regards,<br>Scout Express"
    )
    email_note = _("HR invite email sent.")
    try:
        scout_send_email([hr_email], subject, message)
    except OutgoingEmailError:
        email_note = _("HR invite created. Email is not configured — share this link manually: {0}").format(link)
    except Exception:
        frappe.log_error(frappe.get_traceback(), "Scout API: invite_hr_partner email")
        email_note = _("HR invite created. Email failed — share this link manually: {0}").format(link)

    return {
        "ok": True,
        "message": email_note,
        "data": {
            "inviteId": doc.name,
            "hrEmail": hr_email,
            "expiresAt": str(expires_at),
            "magicLink": link,
            "frontendPath": f"/hr/special/{raw_token}",
        },
    }


@frappe.whitelist(methods=["GET"])
def list_hr_invites():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    rows = frappe.get_all(
        "Scout HR Access Token",
        filters={"tpo_user": user_id},
        fields=["name", "hr_email", "hr_name", "campus_drive_title", "posting_id", "expires_at", "used_at", "is_active", "creation"],
        order_by="creation desc",
        limit_page_length=50,
    )
    return {
        "ok": True,
        "data": {
            "invites": [
                {
                    "id": r.name,
                    "hrEmail": r.hr_email,
                    "hrName": r.hr_name or "",
                    "campusDriveTitle": r.campus_drive_title or "",
                    "postingId": r.posting_id or "",
                    "expiresAt": str(r.expires_at or ""),
                    "usedAt": str(r.used_at or ""),
                    "isActive": bool(r.is_active),
                }
                for r in rows
            ]
        },
    }


@frappe.whitelist(methods=["GET"])
def list_tpo_community_posts():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    rows = frappe.get_all(
        "Scout Community Post",
        filters={"tpo_user": user_id},
        fields=["name", "title", "author_name", "tags", "is_published", "is_public_blog", "creation", "modified"],
        order_by="creation desc",
        limit_page_length=100,
    )
    return {"ok": True, "data": {"posts": [_serialize_post_short(r) for r in rows]}}


@frappe.whitelist(methods=["GET"])
def get_tpo_community_post():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    post_id = norm(frappe.form_dict.get("postId"))
    if not post_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Post ID is required.")}
    doc = frappe.get_doc("Scout Community Post", post_id)
    if doc.tpo_user != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Not allowed.")}
    return {"ok": True, "data": {"post": _serialize_post_full(doc)}}


@frappe.whitelist(methods=["POST"])
def upsert_tpo_community_post():
    user_id, err = get_tpo_session_user()
    if err:
        return err
    p = frappe.request.get_json(silent=True) or {}
    post_id = norm(p.get("postId"))
    title = norm(p.get("title"))
    if not title:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Title is required.")}
    if post_id:
        doc = frappe.get_doc("Scout Community Post", post_id)
        if doc.tpo_user != user_id:
            frappe.local.response["http_status_code"] = 403
            return {"ok": False, "message": _("Not allowed.")}
    else:
        doc = frappe.get_doc({"doctype": "Scout Community Post", "tpo_user": user_id})
    doc.title = title
    doc.body = p.get("body") or ""
    doc.author_name = norm(p.get("authorName"))
    doc.tags = norm(p.get("tags"))
    doc.is_published = 1 if p.get("isPublished") else 0
    doc.is_public_blog = 1 if p.get("isPublicBlog") else 0
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Post saved."), "data": {"post": _serialize_post_full(doc)}}


def _serialize_post_short(row):
    return {
        "id": row.name,
        "title": row.title,
        "authorName": row.author_name or "",
        "tags": row.tags or "",
        "isPublished": bool(row.is_published),
        "isPublicBlog": bool(row.is_public_blog),
        "createdAt": str(row.creation or ""),
    }


def _serialize_post_full(doc):
    return {
        "id": doc.name,
        "title": doc.title,
        "body": doc.body or "",
        "authorName": doc.author_name or "",
        "tags": doc.tags or "",
        "isPublished": bool(doc.is_published),
        "isPublicBlog": bool(doc.is_public_blog),
    }
