"""TPO student scope (linked profiles, college match, accepted invites) with request cache."""

import frappe
from frappe import _

from scout.api.college_registry import tpo_scout_college_id
from scout.api.tpo.helpers import norm

TPO_STUDENT_IDS_CACHE_TTL = 300
TPO_STUDENT_COUNT_CACHE_TTL = 300
MAX_REPORT_STUDENTS = 3000
MAX_SCOPE_IDS = 50000
DEFAULT_REPORT_PAGE_SIZE = 100
MAX_REPORT_PAGE_SIZE = 200


def invalidate_tpo_student_ids_cache(tpo_user_id: str | None = None) -> None:
    cache = frappe.cache()
    if tpo_user_id:
        cache.delete_value(f"scout:tpo_student_ids:{tpo_user_id}")
        cache.delete_value(f"scout:tpo_student_count:{tpo_user_id}")
        return


def tpo_student_scope_sql(tpo_user_id: str) -> tuple[str, list]:
    """SQL UNION of all students visible to this TPO (single round-trip when listing ids)."""
    scout_college = tpo_scout_college_id(tpo_user_id)
    college = norm(frappe.db.get_value("Scout TPO Profile", {"tpo_user": tpo_user_id}, "college_name"))
    parts: list[str] = []
    params: list = []

    parts.append(
        """
        SELECT DISTINCT p.student_user AS student_user
        FROM `tabScout Student Profile` p
        WHERE p.linked_tpo_user = %s AND IFNULL(p.student_user, '') != ''
        """
    )
    params.append(tpo_user_id)

    if scout_college and frappe.db.has_column("Scout Student Profile", "scout_college"):
        parts.append(
            """
            SELECT DISTINCT p.student_user AS student_user
            FROM `tabScout Student Profile` p
            WHERE p.scout_college = %s AND IFNULL(p.student_user, '') != ''
            """
        )
        params.append(scout_college)
    elif college:
        parts.append(
            """
            SELECT DISTINCT p.student_user AS student_user
            FROM `tabScout Student Profile` p
            WHERE LOWER(TRIM(p.college)) = LOWER(TRIM(%s)) AND IFNULL(p.student_user, '') != ''
            """
        )
        params.append(college)

    parts.append(
        """
        SELECT DISTINCT u.name AS student_user
        FROM `tabScout Student Invite` i
        INNER JOIN `tabUser` u ON LOWER(u.name) = LOWER(TRIM(i.email))
        WHERE i.created_by_tpo = %s
          AND i.status = 'Accepted'
          AND IFNULL(TRIM(i.email), '') != ''
        """
    )
    params.append(tpo_user_id)

    return " UNION ".join(parts), params


def _load_tpo_student_ids(tpo_user_id: str) -> set[str]:
    scope_sql, params = tpo_student_scope_sql(tpo_user_id)
    rows = frappe.db.sql(
        f"""
        SELECT DISTINCT student_user
        FROM ({scope_sql}) AS scoped
        WHERE IFNULL(student_user, '') != ''
        LIMIT {MAX_SCOPE_IDS + 1}
        """,
        params,
        as_dict=True,
    )
    ids = {row["student_user"] for row in rows if row.get("student_user")}
    if len(rows) > MAX_SCOPE_IDS:
        frappe.logger("scout").warning(
            "TPO %s student scope truncated at %s ids", tpo_user_id, MAX_SCOPE_IDS
        )
    return ids


def tpo_student_ids_count(tpo_user_id: str) -> int:
    cache = frappe.cache()
    key = f"scout:tpo_student_count:{tpo_user_id}"
    hit = cache.get_value(key)
    if hit is not None:
        return int(hit)

    scope_sql, params = tpo_student_scope_sql(tpo_user_id)
    total = frappe.db.sql(
        f"""
        SELECT COUNT(DISTINCT student_user)
        FROM ({scope_sql}) AS scoped
        WHERE IFNULL(student_user, '') != ''
        """,
        params,
    )[0][0]
    cache.set_value(key, int(total), expires_in_sec=TPO_STUDENT_COUNT_CACHE_TTL)
    return int(total)


def tpo_student_ids_page(tpo_user_id: str, page: int, page_size: int) -> tuple[list[str], int]:
    page = max(1, page)
    page_size = max(1, min(MAX_REPORT_PAGE_SIZE, page_size))
    total = tpo_student_ids_count(tpo_user_id)
    offset = (page - 1) * page_size
    scope_sql, params = tpo_student_scope_sql(tpo_user_id)
    rows = frappe.db.sql(
        f"""
        SELECT DISTINCT student_user
        FROM ({scope_sql}) AS scoped
        WHERE IFNULL(student_user, '') != ''
        ORDER BY student_user
        LIMIT %s OFFSET %s
        """,
        [*params, page_size, offset],
        as_dict=True,
    )
    return [row["student_user"] for row in rows if row.get("student_user")], total


def tpo_student_ids(tpo_user_id: str) -> set[str]:
    """Students visible to this TPO (cached 5 minutes)."""
    cache = frappe.cache()
    key = f"scout:tpo_student_ids:{tpo_user_id}"
    hit = cache.get_value(key)
    if hit is not None:
        return set(hit)
    ids = _load_tpo_student_ids(tpo_user_id)
    cache.set_value(key, list(ids), expires_in_sec=TPO_STUDENT_IDS_CACHE_TTL)
    return ids


def tpo_student_ids_for_report(
    tpo_user_id: str,
    page: int | None = None,
    page_size: int | None = None,
) -> tuple[set[str], bool, dict]:
    """
    Return student ids for reports.
    With page/page_size: only that page (preferred at scale).
    Without: legacy cap at MAX_REPORT_STUDENTS.
    """
    meta: dict = {"page": 1, "pageSize": 0, "total": 0, "totalPages": 0}

    if page is not None and page_size is not None:
        page = max(1, page)
        page_size = max(1, min(MAX_REPORT_PAGE_SIZE, page_size))
        ids_list, total = tpo_student_ids_page(tpo_user_id, page, page_size)
        meta = {
            "page": page,
            "pageSize": page_size,
            "total": total,
            "totalPages": max(1, (total + page_size - 1) // page_size) if total else 1,
        }
        scope_truncated = total > MAX_SCOPE_IDS
        meta["scopeTruncated"] = scope_truncated
        if scope_truncated:
            meta["scopeTruncatedMessage"] = _(
                "Your college has more than {0} students in scope. Some legacy reports may be incomplete — use paginated student lists."
            ).format(MAX_SCOPE_IDS)
        return set(ids_list), scope_truncated, meta

    ids = tpo_student_ids(tpo_user_id)
    total = len(ids)
    meta["total"] = total
    if total <= MAX_REPORT_STUDENTS:
        return ids, total > MAX_SCOPE_IDS, meta
    return set(list(ids)[:MAX_REPORT_STUDENTS]), True, meta


def report_pagination_from_request() -> tuple[int | None, int | None]:
    from frappe.utils import cint

    page_raw = frappe.form_dict.get("page")
    size_raw = frappe.form_dict.get("pageSize")
    if page_raw is None and size_raw is None:
        return None, None
    page = max(1, cint(page_raw) or 1)
    page_size = max(1, min(MAX_REPORT_PAGE_SIZE, cint(size_raw) or DEFAULT_REPORT_PAGE_SIZE))
    return page, page_size
