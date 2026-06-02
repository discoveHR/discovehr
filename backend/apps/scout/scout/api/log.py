"""Centralized API error logging for Scout."""

from __future__ import annotations

from typing import Any

import frappe


def log_api_error(title: str, exc: BaseException | None = None, context: dict[str, Any] | None = None) -> None:
    """Write one Error Log entry with a stable title and optional JSON context."""
    if exc is not None:
        frappe.log_error(frappe.get_traceback(), title)
        return
    detail = frappe.as_json(context or {}, indent=0) if context else ""
    frappe.log_error(detail or title, title)
