"""Public blog posts (guest-readable)."""

import frappe
from frappe import _


@frappe.whitelist(allow_guest=True, methods=["GET"])
def list_public_blog_posts():
    rows = frappe.get_all(
        "Scout Community Post",
        filters={"is_public_blog": 1, "is_published": 1},
        fields=["name", "title", "author_name", "tags", "body", "creation"],
        order_by="creation desc",
        limit_page_length=50,
    )
    return {
        "ok": True,
        "data": {
            "posts": [
                {
                    "id": r.name,
                    "title": r.title,
                    "authorName": r.author_name or _("TPO Community"),
                    "tags": (r.tags or "").split(",") if r.tags else [],
                    "excerpt": (r.body or "")[:280],
                    "body": r.body or "",
                    "publishedAt": str(r.creation or ""),
                }
                for r in rows
            ]
        },
    }
