"""Scoped student search for TPO directory (indexed-friendly SQL)."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import cint

from scout.api.common import get_tpo_session_user
from scout.api.tpo.helpers import norm
from scout.api.tpo.student_scope import tpo_student_scope_sql


MAX_SEARCH_RESULTS = 50


@frappe.whitelist(methods=["GET"])
def search_tpo_students():
    """Search students in TPO scope by name, email, branch, or roll number."""
    user_id, err = get_tpo_session_user()
    if err:
        return err

    query = norm(frappe.form_dict.get("q") or frappe.form_dict.get("query"))
    if len(query) < 2:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Enter at least 2 characters to search.")}

    limit = min(MAX_SEARCH_RESULTS, max(5, cint(frappe.form_dict.get("limit") or 25)))
    scope_sql, scope_params = tpo_student_scope_sql(user_id)
    like = f"%{query.lower()}%"

    rows = frappe.db.sql(
        f"""
        SELECT
            p.student_user,
            p.full_name,
            p.email,
            p.department_stream,
            p.academic_year,
            p.college,
            p.roll_number
        FROM `tabScout Student Profile` p
        INNER JOIN ({scope_sql}) sc ON sc.student_user = p.student_user
        WHERE (
            LOWER(IFNULL(p.full_name, '')) LIKE %s
            OR LOWER(IFNULL(p.email, '')) LIKE %s
            OR LOWER(IFNULL(p.department_stream, '')) LIKE %s
            OR LOWER(IFNULL(p.roll_number, '')) LIKE %s
        )
        ORDER BY p.full_name
        LIMIT %s
        """,
        [*scope_params, like, like, like, like, limit],
        as_dict=True,
    )

    results = [
        {
            "studentId": r.get("student_user") or "",
            "fullName": r.get("full_name") or "",
            "email": r.get("email") or "",
            "branch": r.get("department_stream") or "",
            "batch": r.get("academic_year") or "",
            "college": r.get("college") or "",
            "rollNumber": r.get("roll_number") or "",
        }
        for r in rows
    ]

    return {"ok": True, "data": {"results": results, "query": query, "limit": limit}}
