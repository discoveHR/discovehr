"""Lightweight Redis cache helpers for hot read-only Scout data."""

from __future__ import annotations

import frappe

ACTIVE_JOBS_KEY = "scout:active_jobs_v1"
ACTIVE_JOBS_TTL = 60  # seconds — acceptable staleness for job board

COLLEGE_SETUP_TTL = 300  # 5 min — college structure changes rarely


def get_cached_active_job_rows() -> list[dict]:
    """Return all active Scout Job raw rows from cache, or fetch and cache them."""
    cached = frappe.cache().get_value(ACTIVE_JOBS_KEY)
    if cached is not None:
        return cached

    from scout.api.student.jobs import JOB_FIELDS

    rows = frappe.get_all(
        "Scout Job",
        filters={"status": "Active"},
        fields=JOB_FIELDS,
        order_by="creation desc",
        limit_page_length=5000,
    )
    rows = [dict(r) for r in rows]
    frappe.cache().set_value(ACTIVE_JOBS_KEY, rows, expires_in_sec=ACTIVE_JOBS_TTL)
    return rows


def invalidate_active_jobs_cache() -> None:
    frappe.cache().delete_value(ACTIVE_JOBS_KEY)


def college_setup_cache_key(tpo_user: str) -> str:
    return f"scout:college_setup:{tpo_user}"


def invalidate_college_setup_cache(tpo_user: str) -> None:
    frappe.cache().delete_value(college_setup_cache_key(tpo_user))
