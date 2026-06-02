"""Request pagination helpers for Scout APIs."""

from __future__ import annotations

import math

import frappe
from frappe.utils import cint

DEFAULT_PAGE_SIZE = 30
MAX_PAGE_SIZE = 200


def pagination_from_request(
    *,
    default_page_size: int = DEFAULT_PAGE_SIZE,
    max_page_size: int = MAX_PAGE_SIZE,
) -> tuple[int, int, int]:
    """Return (page, page_size, offset). Page is 1-based."""
    page = max(1, cint(frappe.form_dict.get("page")) or 1)
    page_size = cint(frappe.form_dict.get("pageSize")) or default_page_size
    page_size = max(1, min(max_page_size, page_size))
    offset = (page - 1) * page_size
    return page, page_size, offset


def pagination_meta(page: int, page_size: int, total: int, *, truncated: bool = False) -> dict:
    total_pages = max(1, math.ceil(total / page_size)) if total else 1
    return {
        "page": page,
        "pageSize": page_size,
        "total": total,
        "totalPages": total_pages,
        "truncated": bool(truncated),
    }
