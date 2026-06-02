"""Pre-aggregated TPO and job metrics (refreshed on schedule and data changes)."""

from __future__ import annotations

import frappe
from frappe.utils import now_datetime


def _college_helpers():
    from scout.api.college_registry import tpo_scout_college_id  # noqa: PLC0415
    from scout.api.tpo.student_scope import (  # noqa: PLC0415
        invalidate_tpo_student_ids_cache,
        tpo_student_ids_count,
        tpo_student_scope_sql,
    )
    return tpo_scout_college_id, invalidate_tpo_student_ids_cache, tpo_student_ids_count, tpo_student_scope_sql


def refresh_tpo_rollup(tpo_user_id: str) -> dict:
    if not tpo_user_id or not frappe.db.exists("DocType", "Scout TPO Rollup Stats"):
        return {}

    tpo_scout_college_id, _, tpo_student_ids_count, tpo_student_scope_sql = _college_helpers()

    student_count = tpo_student_ids_count(tpo_user_id)
    scout_college = tpo_scout_college_id(tpo_user_id)

    scope_sql, scope_params = tpo_student_scope_sql(tpo_user_id)
    application_count = frappe.db.sql(
        f"""
        SELECT COUNT(a.name)
        FROM `tabScout Application` a
        INNER JOIN ({scope_sql}) sc ON sc.student_user = a.student_user
        """,
        scope_params,
    )[0][0]

    pending_invite_count = frappe.db.count(
        "Scout Student Invite",
        {"created_by_tpo": tpo_user_id, "status": "Pending"},
    )

    training_all_completed_count = frappe.db.sql(
        f"""
        SELECT COUNT(*) FROM (
            SELECT pa.student_user
            FROM `tabScout Psychometric Assignment` pa
            INNER JOIN ({scope_sql}) sc ON sc.student_user = pa.student_user
            GROUP BY pa.student_user
            HAVING COUNT(*) > 0
               AND SUM(CASE WHEN pa.status = 'Completed' THEN 1 ELSE 0 END) = COUNT(*)
        ) completed_students
        """,
        scope_params,
    )[0][0]

    payload = {
        "doctype": "Scout TPO Rollup Stats",
        "tpo_user": tpo_user_id,
        "scout_college": scout_college or "",
        "student_count": int(student_count or 0),
        "application_count": int(application_count or 0),
        "training_all_completed_count": int(training_all_completed_count or 0),
        "pending_invite_count": int(pending_invite_count or 0),
        "last_refreshed": now_datetime(),
    }

    fields = {
        "scout_college": scout_college or "",
        "student_count": int(student_count or 0),
        "application_count": int(application_count or 0),
        "training_all_completed_count": int(training_all_completed_count or 0),
        "pending_invite_count": int(pending_invite_count or 0),
        "last_refreshed": now_datetime(),
    }
    if frappe.db.exists("Scout TPO Rollup Stats", tpo_user_id):
        frappe.db.set_value("Scout TPO Rollup Stats", tpo_user_id, fields, update_modified=False)
    else:
        frappe.get_doc({"doctype": "Scout TPO Rollup Stats", "tpo_user": tpo_user_id, **fields}).insert(
            ignore_permissions=True
        )

    return {**payload, **fields}


def refresh_job_rollup(scout_job_id: str) -> dict | None:
    job_id = scout_job_id
    if not job_id or not frappe.db.exists("Scout Job", job_id):
        return None
    if not frappe.db.exists("DocType", "Scout Job Rollup Stats"):
        return None

    company_user = frappe.db.get_value("Scout Job", job_id, "company_user")
    rows = frappe.db.sql(
        """
        SELECT application_status, COUNT(*) AS cnt
        FROM `tabScout Application`
        WHERE job_id = %s
        GROUP BY application_status
        """,
        (job_id,),
        as_dict=True,
    )
    buckets = {
        "Submitted": "submitted",
        "In Review": "in_review",
        "Shortlisted": "shortlisted",
        "Selected": "selected",
        "Rejected": "rejected",
    }
    counts = {field: 0 for field in buckets.values()}
    total = 0
    for row in rows:
        status = row.get("application_status") or ""
        cnt = int(row.get("cnt") or 0)
        total += cnt
        field = buckets.get(status)
        if field:
            counts[field] = cnt

    payload = {
        "doctype": "Scout Job Rollup Stats",
        "job": job_id,
        "company_user": company_user or "",
        "total": total,
        "last_refreshed": now_datetime(),
        **counts,
    }

    if frappe.db.exists("Scout Job Rollup Stats", job_id):
        doc = frappe.get_doc("Scout Job Rollup Stats", job_id)
        doc.update(payload)
        doc.save(ignore_permissions=True)
    else:
        frappe.get_doc(payload).insert(ignore_permissions=True)

    return payload


def schedule_tpo_rollup_refresh(tpo_user_id: str) -> None:
    if not tpo_user_id:
        return
    _, invalidate_tpo_student_ids_cache, _, _ = _college_helpers()
    invalidate_tpo_student_ids_cache(tpo_user_id)
    frappe.enqueue(
        refresh_tpo_rollup,
        queue="short",
        tpo_user_id=tpo_user_id,
        job_id=f"scout-tpo-rollup-{tpo_user_id}",
        deduplicate=True,
    )


def refresh_all_tpo_rollups() -> int:
    """Scheduled: refresh rollups for active TPOs (batch)."""
    if not frappe.db.exists("DocType", "Scout TPO Rollup Stats"):
        return 0
    offset = 0
    batch_size = 100
    count = 0
    while True:
        tpo_users = frappe.get_all(
            "Scout TPO Profile",
            filters={"approval_status": ["in", ["Approved", "Pending"]]},
            pluck="tpo_user",
            limit_start=offset,
            limit_page_length=batch_size,
        )
        if not tpo_users:
            break
        for tpo_user in tpo_users:
            if tpo_user:
                frappe.enqueue(
                    refresh_tpo_rollup,
                    queue="short",
                    tpo_user_id=tpo_user,
                    job_id=f"scout-tpo-rollup-{tpo_user}",
                    deduplicate=True,
                )
                count += 1
        offset += batch_size
        if len(tpo_users) < batch_size:
            break
    return count


def get_tpo_rollup_payload(tpo_user_id: str) -> dict:
    pending = 0
    try:
        pending = frappe.db.count(
            "Scout Student Invite",
            {"created_by_tpo": tpo_user_id, "status": "Pending"},
        )
    except Exception:
        pass

    _, _, tpo_student_ids_count, _ = _college_helpers()

    if not frappe.db.table_exists("tabScout TPO Rollup Stats"):
        return {
            "studentCount": tpo_student_ids_count(tpo_user_id),
            "applicationCount": 0,
            "trainingAllCompletedCount": 0,
            "pendingInviteCount": int(pending or 0),
            "lastRefreshed": "",
            "stale": True,
        }

    if not frappe.db.exists("Scout TPO Rollup Stats", tpo_user_id):
        return {
            "studentCount": tpo_student_ids_count(tpo_user_id),
            "applicationCount": 0,
            "trainingAllCompletedCount": 0,
            "pendingInviteCount": int(pending or 0),
            "lastRefreshed": "",
            "stale": True,
        }

    row = frappe.db.get_value(
        "Scout TPO Rollup Stats",
        tpo_user_id,
        [
            "student_count",
            "application_count",
            "training_all_completed_count",
            "pending_invite_count",
            "last_refreshed",
        ],
        as_dict=True,
    )
    return {
        "studentCount": int((row or {}).get("student_count") or 0),
        "applicationCount": int((row or {}).get("application_count") or 0),
        "trainingAllCompletedCount": int((row or {}).get("training_all_completed_count") or 0),
        "pendingInviteCount": int((row or {}).get("pending_invite_count") or 0),
        "lastRefreshed": str((row or {}).get("last_refreshed") or ""),
        "stale": False,
    }
