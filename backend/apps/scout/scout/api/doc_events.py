"""Frappe doc_events hooks for cache invalidation and rollups."""

from __future__ import annotations

import frappe

from scout.api.college_registry import ensure_scout_college_for_tpo, sync_student_profile_college
from scout.api.rollup_stats import refresh_job_rollup, schedule_tpo_rollup_refresh
from scout.api.tpo.student_scope import invalidate_tpo_student_ids_cache


def on_tpo_profile_save(doc, method=None):
    if doc.get("tpo_user") and doc.get("college_name"):
        ensure_scout_college_for_tpo(
            doc.tpo_user,
            doc.college_name,
            country=doc.get("country") or "",
            state=doc.get("state") or "",
            district=doc.get("district") or "",
        )
        schedule_tpo_rollup_refresh(doc.tpo_user)


def on_student_profile_save(doc, method=None):
    sync_student_profile_college(doc.name)
    tpo_user = doc.get("linked_tpo_user")
    if tpo_user:
        invalidate_tpo_student_ids_cache(tpo_user)
        schedule_tpo_rollup_refresh(tpo_user)


def on_student_invite_save(doc, method=None):
    tpo_user = doc.get("created_by_tpo")
    if tpo_user:
        invalidate_tpo_student_ids_cache(tpo_user)
        schedule_tpo_rollup_refresh(tpo_user)


def on_application_save(doc, method=None):
    job_id = doc.get("job_id")
    if job_id:
        frappe.enqueue(
            refresh_job_rollup,
            queue="short",
            job_id=f"scout-job-rollup-{job_id}",
            deduplicate=True,
            scout_job_id=job_id,
        )
    student_user = doc.get("student_user")
    if student_user:
        tpo_user = frappe.db.get_value("Scout Student Profile", {"student_user": student_user}, "linked_tpo_user")
        if tpo_user:
            schedule_tpo_rollup_refresh(tpo_user)


def on_scout_job_save(doc, method=None):
    from scout.services.search_client import index_scout_job

    frappe.enqueue(
        index_scout_job,
        queue="short",
        job_id=f"scout-meili-job-{doc.name}",
        deduplicate=True,
        scout_job_id=doc.name,
    )


def on_psychometric_assignment_save(doc, method=None):
    student_user = doc.get("student_user")
    if not student_user:
        return
    tpo_user = frappe.db.get_value("Scout Student Profile", {"student_user": student_user}, "linked_tpo_user")
    if tpo_user:
        schedule_tpo_rollup_refresh(tpo_user)
