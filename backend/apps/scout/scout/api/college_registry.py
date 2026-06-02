"""Scout College master records and profile linking (production scale)."""

from __future__ import annotations

import frappe
from frappe import _

from scout.scout.doctype.scout_college.scout_college import normalize_college_name

# Inline instead of importing from scout.api.tpo.helpers to avoid a circular import:
# college_registry ← tpo.helpers ← tpo.__init__ ← student_scope ← college_registry
def norm(value: str | None) -> str:
    return (value or "").strip()


def ensure_scout_college_for_tpo(
    tpo_user: str,
    college_name: str,
    *,
    country: str = "",
    state: str = "",
    district: str = "",
) -> str | None:
    """Create or resolve Scout College for a TPO; returns college doc name."""
    if not tpo_user or not frappe.db.exists("User", tpo_user):
        return None
    if not frappe.db.table_exists("tabScout College"):
        return None

    college_name = norm(college_name)
    if not college_name or college_name in ("Pending approval", "(Pending)", "To be confirmed"):
        return None

    existing_on_profile = None
    if frappe.db.has_column("Scout TPO Profile", "scout_college"):
        existing_on_profile = frappe.db.get_value("Scout TPO Profile", {"tpo_user": tpo_user}, "scout_college")
    if existing_on_profile and frappe.db.table_exists("tabScout College") and frappe.db.exists("Scout College", existing_on_profile):
        return existing_on_profile

    by_tpo = frappe.db.get_value("Scout College", {"primary_tpo_user": tpo_user}, "name")
    if by_tpo:
        _link_tpo_profile_college(tpo_user, by_tpo)
        return by_tpo

    normalized = normalize_college_name(college_name)
    by_name = frappe.db.get_value("Scout College", {"college_name_normalized": normalized}, "name")
    if by_name:
        frappe.db.set_value("Scout College", by_name, "primary_tpo_user", tpo_user, update_modified=False)
        _link_tpo_profile_college(tpo_user, by_name)
        return by_name

    doc = frappe.get_doc(
        {
            "doctype": "Scout College",
            "college_name": college_name,
            "primary_tpo_user": tpo_user,
            "country": country or "India",
            "state": state or "",
            "district": district or "",
        }
    )
    doc.insert(ignore_permissions=True)
    _link_tpo_profile_college(tpo_user, doc.name)
    return doc.name


def _link_tpo_profile_college(tpo_user: str, scout_college: str) -> None:
    if not frappe.db.exists("Scout TPO Profile", tpo_user):
        return
    if not frappe.db.has_column("Scout TPO Profile", "scout_college"):
        return
    frappe.db.set_value(
        "Scout TPO Profile",
        tpo_user,
        "scout_college",
        scout_college,
        update_modified=False,
    )


def sync_student_profile_college(profile_name: str) -> str | None:
    """Set scout_college on a student profile from linked TPO or college text."""
    if not profile_name or not frappe.db.exists("Scout Student Profile", profile_name):
        return None

    row = frappe.db.get_value(
        "Scout Student Profile",
        profile_name,
        ["scout_college", "linked_tpo_user", "college"],
        as_dict=True,
    )
    if not row:
        return None
    if row.get("scout_college") and frappe.db.exists("Scout College", row["scout_college"]):
        return row["scout_college"]

    scout_college = None
    if row.get("linked_tpo_user"):
        scout_college = frappe.db.get_value("Scout TPO Profile", {"tpo_user": row["linked_tpo_user"]}, "scout_college")
        if not scout_college:
            tpo_row = frappe.db.get_value(
                "Scout TPO Profile",
                {"tpo_user": row["linked_tpo_user"]},
                ["college_name", "country", "state", "district"],
                as_dict=True,
            )
            if tpo_row:
                scout_college = ensure_scout_college_for_tpo(
                    row["linked_tpo_user"],
                    tpo_row.get("college_name") or "",
                    country=tpo_row.get("country") or "",
                    state=tpo_row.get("state") or "",
                    district=tpo_row.get("district") or "",
                )

    if not scout_college:
        college_text = norm(row.get("college"))
        if college_text:
            normalized = normalize_college_name(college_text)
            scout_college = frappe.db.get_value("Scout College", {"college_name_normalized": normalized}, "name")

    if scout_college and frappe.db.has_column("Scout Student Profile", "scout_college"):
        frappe.db.set_value(
            "Scout Student Profile",
            profile_name,
            "scout_college",
            scout_college,
            update_modified=False,
        )
    return scout_college


def backfill_scout_colleges() -> dict:
    """Link TPO profiles and students to Scout College (run on migrate)."""
    if not frappe.db.table_exists("tabScout College"):
        return {"ok": False, "message": "Scout College table missing"}

    batch_size = 500
    tpo_linked = 0
    tpo_offset = 0
    while True:
        tpo_batch = frappe.get_all(
            "Scout TPO Profile",
            fields=["tpo_user", "college_name", "country", "state", "district", "scout_college"],
            limit_start=tpo_offset,
            limit_page_length=batch_size,
        )
        if not tpo_batch:
            break
        for row in tpo_batch:
            if row.get("scout_college"):
                tpo_linked += 1
                continue
            if ensure_scout_college_for_tpo(
                row["tpo_user"],
                row.get("college_name") or "",
                country=row.get("country") or "",
                state=row.get("state") or "",
                district=row.get("district") or "",
            ):
                tpo_linked += 1
        tpo_offset += batch_size
        if len(tpo_batch) < batch_size:
            break

    student_linked = 0
    student_offset = 0
    while True:
        student_names = frappe.get_all(
            "Scout Student Profile",
            pluck="name",
            limit_start=student_offset,
            limit_page_length=batch_size,
        )
        if not student_names:
            break
        for name in student_names:
            if sync_student_profile_college(name):
                student_linked += 1
        student_offset += batch_size
        if len(student_names) < batch_size:
            break

    frappe.db.commit()
    return {
        "ok": True,
        "tpoProfilesLinked": tpo_linked,
        "studentsLinked": student_linked,
    }


def tpo_scout_college_id(tpo_user_id: str) -> str | None:
    """Resolved Scout College for scope queries."""
    if not frappe.db.table_exists("tabScout College"):
        return None

    scout_college = None
    if frappe.db.has_column("Scout TPO Profile", "scout_college"):
        scout_college = frappe.db.get_value("Scout TPO Profile", {"tpo_user": tpo_user_id}, "scout_college")
    if scout_college and frappe.db.exists("Scout College", scout_college):
        return scout_college

    row = frappe.db.get_value(
        "Scout TPO Profile",
        {"tpo_user": tpo_user_id},
        ["college_name", "country", "state", "district"],
        as_dict=True,
    )
    if not row:
        return None
    return ensure_scout_college_for_tpo(
        tpo_user_id,
        row.get("college_name") or "",
        country=row.get("country") or "",
        state=row.get("state") or "",
        district=row.get("district") or "",
    )
