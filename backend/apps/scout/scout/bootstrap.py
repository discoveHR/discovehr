"""One-time per-worker bootstrap: env, DocTypes, expired token cleanup."""

from __future__ import annotations

import frappe
from frappe.utils import now_datetime

from scout.utils.env_config import load_scout_env_files

# DocTypes that must exist for the portal API (auto-sync if missing after bench reload / WSL mount).
REQUIRED_DOCTYPES = (
    "Scout Job",
    "Scout Application",
    "Scout Assessment",
    "Scout TPO Posting",
    "Scout TPO Profile",
    "Scout College",
    "Scout TPO Rollup Stats",
    "Scout Job Rollup Stats",
    "Scout College Department",
    "Scout College Branch",
    "Scout College Passout Year",
    "Scout College Batch",
    "Scout Student Profile",
    "Scout Placement Calendar Event",
    "Scout Training Session",
    "Scout Mock Exam",
    "Scout Mock Exam Registration",
    "Scout Company Credit Wallet",
    "Scout Psychometric Assessment",
    "Scout Psychometric Assignment",
    "Scout Psychometric Result",
    "Scout Aptitude Assessment",
    "Scout Aptitude Assignment",
    "Scout Aptitude Result",
    "Scout Portal Auth Token",
    "Scout Payment Order",
)


def _missing_doctypes() -> list[str]:
    return [name for name in REQUIRED_DOCTYPES if not frappe.db.exists("DocType", name)]


def sync_scout_doctypes_if_needed(force: bool = False) -> None:
    missing = _missing_doctypes()
    if not missing and not force:
        return
    from frappe.model.sync import sync_for

    try:
        sync_for("scout", force=True)
        frappe.db.commit()
    except Exception:
        frappe.log_error(frappe.get_traceback(), "scout.bootstrap: sync_for failed")
        if force:
            raise


def _purge_expired_portal_tokens() -> None:
    if not frappe.db.exists("DocType", "Scout Portal Auth Token"):
        return
    cache = frappe.cache()
    if cache.get_value("scout:portal_token_purge_lock"):
        return
    try:
        cache.set_value("scout:portal_token_purge_lock", 1, expires_in_sec=300)
        frappe.db.sql(
            """
            DELETE FROM `tabScout Portal Auth Token`
            WHERE expires_at IS NOT NULL AND expires_at < %s
            LIMIT 500
            """,
            (now_datetime(),),
        )
    except Exception:
        frappe.log_error(frappe.get_traceback(), "scout.bootstrap: token purge failed")


def force_sync_scout_doctypes():
    """CLI: bench --site SITE execute scout.bootstrap.force_sync_scout_doctypes"""
    sync_scout_doctypes_if_needed(force=True)
    return True


def ensure_scout_ready():
    """Run once per worker process before handling API traffic."""
    if getattr(frappe.local, "scout_bootstrapped", False):
        return

    load_scout_env_files()

    if _missing_doctypes():
        sync_scout_doctypes_if_needed()
    else:
        path = (getattr(getattr(frappe.local, "request", None), "path", None) or "").lower()
        is_auth_path = "/api/method/scout.api.auth." in path or "/api/method/scout.api.admin_api." in path
        if not is_auth_path:
            _purge_expired_portal_tokens()

    frappe.local.scout_bootstrapped = True
