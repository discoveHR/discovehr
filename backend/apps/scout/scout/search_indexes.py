"""Database indexes for high-traffic Scout filters (idempotent on migrate)."""

import frappe

SCOUT_DB_INDEXES: dict[str, list[list[str]]] = {
    "Scout Student Profile": [
        ["linked_tpo_user"],
        ["student_user"],
        ["email"],
        ["college"],
        ["scout_college"],
        ["department_stream"],
        ["academic_year"],
        ["full_name"],
        ["roll_number"],
    ],
    "Scout College": [
        ["college_name_normalized"],
        ["primary_tpo_user"],
    ],
    "Scout Student Invite": [
        ["created_by_tpo"],
        ["email"],
        ["created_by_tpo", "status"],
    ],
    "Scout Application": [
        ["student_user"],
        ["job_id"],
        ["student_user", "job_id"],
    ],
    "Scout Job": [
        ["company_user"],
    ],
    "Scout Portal Auth Token": [
        ["token_hash"],
    ],
    "Scout Psychometric Assignment": [
        ["student_user"],
        ["student_user", "status"],
        ["psychometric_assessment"],
    ],
    "Scout Psychometric Result": [
        ["student_user"],
        ["student_user", "completed_at"],
    ],
    "Scout TPO Profile": [
        ["tpo_user"],
        ["college_name"],
    ],
    "Scout TPO Posting": [
        ["created_by_tpo"],
    ],
}


def ensure_scout_db_indexes() -> None:
    for doctype, index_specs in SCOUT_DB_INDEXES.items():
        if not frappe.db.table_exists(f"tab{doctype}"):
            continue
        for fields in index_specs:
            if any(not frappe.db.has_column(doctype, f) for f in fields):
                continue
            try:
                frappe.db.add_index(doctype, fields)
            except Exception:
                frappe.log_error(
                    title=f"Scout index skipped: {doctype} {fields}",
                    message=frappe.get_traceback(),
                )


def ensure_scout_fulltext_indexes() -> None:
    """Optional FULLTEXT for student name/email search (MariaDB)."""
    if not frappe.db.table_exists("tabScout Student Profile"):
        return
    if not frappe.db.has_column("Scout Student Profile", "full_name"):
        return
    try:
        existing = frappe.db.sql(
            """
            SHOW INDEX FROM `tabScout Student Profile`
            WHERE Key_name = 'scout_student_fulltext'
            """
        )
        if existing:
            return
        frappe.db.sql(
            """
            ALTER TABLE `tabScout Student Profile`
            ADD FULLTEXT INDEX scout_student_fulltext (full_name, email, roll_number)
            """
        )
    except Exception:
        frappe.log_error(title="Scout FULLTEXT index skipped", message=frappe.get_traceback())

    if not frappe.db.table_exists("tabScout Job"):
        return
    try:
        existing = frappe.db.sql(
            """
            SHOW INDEX FROM `tabScout Job`
            WHERE Key_name = 'scout_job_fulltext'
            """
        )
        if existing:
            return
        frappe.db.sql(
            """
            ALTER TABLE `tabScout Job`
            ADD FULLTEXT INDEX scout_job_fulltext (title, skills)
            """
        )
    except Exception:
        frappe.log_error(title="Scout job FULLTEXT index skipped", message=frappe.get_traceback())
