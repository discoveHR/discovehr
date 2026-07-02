"""Paginated public job board for students."""

import frappe
from frappe import _

from scout.api.common import company_info_map, get_student_session_user, row_to_job
from scout.api.pagination_utils import pagination_from_request, pagination_meta
from scout.api.student.inbound_suggestions import inbound_suggested_job_ids_for_student

JOB_FIELDS = [
    "name",
    "company_user",
    "title",
    "opportunity_type",
    "location_type",
    "openings",
    "skills",
    "min_experience",
    "status",
    "total_views",
    "applications",
    "description",
    "creation",
    "target_states",
]

DEFAULT_STUDENT_JOBS_PAGE_SIZE = 30
MAX_STUDENT_JOBS_PAGE_SIZE = 100
SUGGESTED_JOBS_LIMIT = 4
HOME_JOBS_LIMIT = 6
MAX_APPLICATION_STATUS_ROWS = 200


def _student_application_map(user_id: str) -> dict[str, dict]:
    rows = frappe.get_all(
        "Scout Application",
        filters={"student_user": user_id},
        fields=["name", "job_id", "application_status", "creation"],
        order_by="creation desc",
        limit_page_length=5000,
    )
    return {row.get("job_id"): row for row in rows if row.get("job_id")}


def _enrich_jobs(jobs: list[dict], application_by_job: dict[str, dict], inbound_ids: set[str]) -> list[dict]:
    for job in jobs:
        applied = application_by_job.get(job.get("id"))
        job["isApplied"] = bool(applied)
        job["applicationStatus"] = applied.get("application_status") if applied else "Not Applied"
        job["suggestedByTpo"] = job.get("id") in inbound_ids
    return jobs


def _base_job_filters() -> dict:
    filters: dict = {"status": "Active"}
    location = (frappe.form_dict.get("locationType") or "").strip()
    if location and location != "All":
        filters["location_type"] = location
    opp = (frappe.form_dict.get("opportunityType") or "").strip()
    if opp and opp != "All":
        filters["opportunity_type"] = opp
    exp = (frappe.form_dict.get("minExperience") or "").strip()
    if exp and exp != "All":
        filters["min_experience"] = exp
    return filters


def _job_list_filters() -> dict:
    filters = _base_job_filters()
    q = (frappe.form_dict.get("q") or "").strip()
    if q:
        filters["title"] = ["like", f"%{q}%"]
    return filters


def _fulltext_job_search(q: str, *, limit: int, offset: int, base_filters: dict | None = None) -> tuple[list[str], int] | None:
    try:
        extra_clauses = []
        extra_params: list = []
        if base_filters:
            for field, value in base_filters.items():
                if field == "status":
                    continue  # already hardcoded as 'Active'
                if isinstance(value, str):
                    extra_clauses.append(f"`{field}` = %s")
                    extra_params.append(value)

        extra_sql = (" AND " + " AND ".join(extra_clauses)) if extra_clauses else ""

        rows = frappe.db.sql(
            f"""
            SELECT name,
                   MATCH(title, skills) AGAINST (%s IN BOOLEAN MODE) AS relevance
            FROM `tabScout Job`
            WHERE status = 'Active'
              AND MATCH(title, skills) AGAINST (%s IN BOOLEAN MODE)
              {extra_sql}
            ORDER BY relevance DESC, creation DESC
            LIMIT %s OFFSET %s
            """,
            (q, q, *extra_params, limit, offset),
            as_dict=True,
        )
        count_row = frappe.db.sql(
            f"""
            SELECT COUNT(*) AS total
            FROM `tabScout Job`
            WHERE status = 'Active'
              AND MATCH(title, skills) AGAINST (%s IN BOOLEAN MODE)
              {extra_sql}
            """,
            (q, *extra_params),
            as_dict=True,
        )
        total = int((count_row[0] or {}).get("total") or 0) if count_row else 0
        return [r["name"] for r in rows if r.get("name")], total
    except Exception:
        return None


_SIMPLE_FILTER_KEYS = frozenset({"status", "location_type", "opportunity_type", "min_experience"})


def _job_state_matches(row: dict, student_state: str) -> bool:
    """Return True if this job is visible to a student in the given state."""
    if not student_state:
        return True
    ts = (row.get("target_states") or "").strip()
    if not ts:
        return True  # no restriction — visible to everyone
    return student_state in {s.strip() for s in ts.split(",")}


def _filters_are_cacheable(filters: dict | None) -> bool:
    return not filters or set(filters.keys()) <= _SIMPLE_FILTER_KEYS


def _apply_filters_in_python(rows: list[dict], filters: dict | None) -> list[dict]:
    if not filters:
        return rows
    result = rows
    for key, value in filters.items():
        if isinstance(value, str):
            result = [r for r in result if r.get(key) == value]
    return result


def _fetch_active_jobs(*, limit: int, offset: int = 0, filters: dict | None = None, student_state: str = "") -> list[dict]:
    if not _filters_are_cacheable(filters):
        rows = frappe.get_all(
            "Scout Job",
            filters=filters or {"status": "Active"},
            fields=JOB_FIELDS,
            order_by="creation desc",
            limit_page_length=5000 if student_state else limit,
            limit_start=0 if student_state else offset,
        )
        if student_state:
            rows = [r for r in rows if _job_state_matches(r, student_state)]
            rows = rows[offset : offset + limit]
        cinfo = company_info_map(list(rows))
        return [row_to_job(row, cinfo) for row in rows]

    from scout.api.cache_utils import get_cached_active_job_rows

    all_rows = get_cached_active_job_rows()
    filtered = _apply_filters_in_python(all_rows, filters)
    if student_state:
        filtered = [r for r in filtered if _job_state_matches(r, student_state)]
    page_rows = filtered[offset : offset + limit]
    cinfo = company_info_map(page_rows)
    return [row_to_job(row, cinfo) for row in page_rows]


def _active_jobs_total(filters: dict | None = None, student_state: str = "") -> int:
    if not _filters_are_cacheable(filters):
        if student_state:
            rows = frappe.get_all(
                "Scout Job",
                filters=filters or {"status": "Active"},
                fields=["name", "target_states"],
                limit_page_length=5000,
            )
            return sum(1 for r in rows if _job_state_matches(r, student_state))
        return int(frappe.db.count("Scout Job", filters=filters or {"status": "Active"}))

    from scout.api.cache_utils import get_cached_active_job_rows

    all_rows = get_cached_active_job_rows()
    filtered = _apply_filters_in_python(all_rows, filters)
    if student_state:
        filtered = [r for r in filtered if _job_state_matches(r, student_state)]
    return len(filtered)


def build_suggested_jobs(user_id: str, application_by_job: dict[str, dict], student_state: str = "") -> list[dict]:
    inbound_ids = inbound_suggested_job_ids_for_student(user_id)
    if inbound_ids:
        rows = frappe.get_all(
            "Scout Job",
            filters={"name": ["in", list(inbound_ids)], "status": "Active"},
            fields=JOB_FIELDS,
            order_by="creation desc",
            limit_page_length=SUGGESTED_JOBS_LIMIT,
        )
        if student_state:
            rows = [r for r in rows if _job_state_matches(r, student_state)]
        cinfo = company_info_map(list(rows))
        return _enrich_jobs([row_to_job(r, cinfo) for r in rows], application_by_job, inbound_ids)[:SUGGESTED_JOBS_LIMIT]

    student_skills = frappe.db.get_value("Scout Student Profile", user_id, "skills") or ""
    first_skill = (student_skills.split(",")[0].strip() if student_skills else "").lower()
    rows: list = []
    if first_skill:
        rows = frappe.get_all(
            "Scout Job",
            filters={"status": "Active", "skills": ["like", f"%{first_skill}%"]},
            fields=JOB_FIELDS,
            order_by="creation desc",
            limit_page_length=SUGGESTED_JOBS_LIMIT,
        )
    if not rows:
        rows = frappe.get_all(
            "Scout Job",
            filters={"status": "Active"},
            fields=JOB_FIELDS,
            order_by="creation desc",
            limit_page_length=SUGGESTED_JOBS_LIMIT,
        )
    if student_state:
        rows = [r for r in rows if _job_state_matches(r, student_state)]
    cinfo = company_info_map(list(rows))
    return _enrich_jobs([row_to_job(r, cinfo) for r in rows], application_by_job, inbound_ids)


def application_status_for_student(user_id: str) -> tuple[list[dict], bool]:
    application_rows = frappe.get_all(
        "Scout Application",
        filters={"student_user": user_id},
        fields=["name", "job_id", "application_status", "creation"],
        order_by="creation desc",
        limit_page_length=MAX_APPLICATION_STATUS_ROWS + 1,
    )
    truncated = len(application_rows) > MAX_APPLICATION_STATUS_ROWS
    application_rows = application_rows[:MAX_APPLICATION_STATUS_ROWS]
    job_ids = [r.get("job_id") for r in application_rows if r.get("job_id")]
    title_map: dict[str, str] = {}
    if job_ids:
        for row in frappe.get_all(
            "Scout Job",
            filters={"name": ["in", job_ids]},
            fields=["name", "title"],
            limit_page_length=len(job_ids),
        ):
            title_map[row["name"]] = row.get("title") or ""

    return (
        [
            {
                "applicationId": row.get("name"),
                "jobId": row.get("job_id"),
                "jobTitle": title_map.get(row.get("job_id"), ""),
                "status": row.get("application_status"),
                "appliedOn": frappe.utils.formatdate(row.get("creation"), "dd MMM yyyy"),
            }
            for row in application_rows
        ],
        truncated,
    )


def _mask_company_for_non_pro(jobs: list[dict], is_pro: bool) -> list[dict]:
    if is_pro:
        return jobs
    for job in jobs:
        job["companyName"] = ""
        job["companyAbout"] = ""
        job["companyHidden"] = True
    return jobs


@frappe.whitelist(methods=["GET"])
def list_student_jobs():
    user_id, err = get_student_session_user()
    if err:
        return err

    page, page_size, offset = pagination_from_request(
        default_page_size=DEFAULT_STUDENT_JOBS_PAGE_SIZE,
        max_page_size=MAX_STUDENT_JOBS_PAGE_SIZE,
    )
    q = (frappe.form_dict.get("q") or "").strip()
    base_filters = _base_job_filters()
    application_by_job = _student_application_map(user_id)
    inbound_ids = inbound_suggested_job_ids_for_student(user_id)
    student_state = (frappe.db.get_value(
        "Scout Student Profile", {"student_user": user_id}, "state",
    ) or "").strip()
    try:
        is_pro = bool(frappe.db.get_value("Scout Student Profile", {"student_user": user_id}, "is_pro"))
    except Exception:
        is_pro = False

    jobs: list[dict] = []
    total = 0

    if q:
        from scout.services.search_client import search_jobs as meili_search_jobs

        meili = meili_search_jobs(q, limit=page_size, offset=offset)
        if meili:
            job_ids, total = meili
            filters = {**base_filters, "name": ["in", job_ids]} if job_ids else {"name": ("in", ["__none__"])}
            rows = frappe.get_all(
                "Scout Job",
                filters=filters,
                fields=JOB_FIELDS,
                order_by="creation desc",
                limit_page_length=page_size,
            )
            if student_state:
                rows = [r for r in rows if _job_state_matches(r, student_state)]
            by_id = {row["name"]: row for row in rows}
            ordered = [by_id[jid] for jid in job_ids if jid in by_id]
            cinfo = company_info_map(ordered)
            jobs = _enrich_jobs(
                [row_to_job(r, cinfo) for r in ordered],
                application_by_job,
                inbound_ids,
            )
        else:
            ft = _fulltext_job_search(q, limit=page_size, offset=offset, base_filters=base_filters)
            if ft:
                job_ids, total = ft
                if job_ids:
                    rows = frappe.get_all(
                        "Scout Job",
                        filters={"name": ["in", job_ids], **base_filters},
                        fields=JOB_FIELDS,
                        limit_page_length=len(job_ids),
                    )
                    if student_state:
                        rows = [r for r in rows if _job_state_matches(r, student_state)]
                    by_id = {row["name"]: row for row in rows}
                    ordered = [by_id[jid] for jid in job_ids if jid in by_id]
                    cinfo = company_info_map(ordered)
                    jobs = _enrich_jobs(
                        [row_to_job(r, cinfo) for r in ordered],
                        application_by_job,
                        inbound_ids,
                    )
                else:
                    jobs = []
            else:
                filters = _job_list_filters()
                total = _active_jobs_total(filters, student_state)
                jobs = _enrich_jobs(
                    _fetch_active_jobs(limit=page_size, offset=offset, filters=filters, student_state=student_state),
                    application_by_job,
                    inbound_ids,
                )
    else:
        filters = base_filters
        total = _active_jobs_total(filters, student_state)
        jobs = _enrich_jobs(
            _fetch_active_jobs(limit=page_size, offset=offset, filters=filters, student_state=student_state),
            application_by_job,
            inbound_ids,
        )

    jobs = _mask_company_for_non_pro(jobs, is_pro)

    return {
        "ok": True,
        "data": {
            "jobs": jobs,
            "pagination": pagination_meta(page, page_size, total),
        },
    }
