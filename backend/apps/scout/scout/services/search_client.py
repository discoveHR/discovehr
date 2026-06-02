"""Optional Meilisearch for Scout Job title search; falls back to SQL LIKE."""

from __future__ import annotations

import os

import frappe


def meilisearch_enabled() -> bool:
    return bool((os.environ.get("SCOUT_MEILISEARCH_URL") or frappe.conf.get("scout_meilisearch_url") or "").strip())


def _meili_config() -> tuple[str, str, str]:
    base = (os.environ.get("SCOUT_MEILISEARCH_URL") or frappe.conf.get("scout_meilisearch_url") or "").rstrip("/")
    api_key = os.environ.get("SCOUT_MEILISEARCH_API_KEY") or frappe.conf.get("scout_meilisearch_api_key") or ""
    index = os.environ.get("SCOUT_MEILISEARCH_JOBS_INDEX") or frappe.conf.get("scout_meilisearch_jobs_index") or "scout_jobs"
    return base, api_key, index


def search_jobs(query: str, *, limit: int = 100, offset: int = 0) -> tuple[list[str], int] | None:
    """Return (job_ids, total) from Meilisearch, or None to use SQL fallback."""
    if not meilisearch_enabled() or not query.strip():
        return None

    base, api_key, index = _meili_config()
    try:
        import json
        import urllib.parse
        import urllib.request

        params = urllib.parse.urlencode(
            {
                "q": query.strip(),
                "limit": limit,
                "offset": offset,
                "filter": 'status = "Active"',
            }
        )
        url = f"{base}/indexes/{urllib.parse.quote(index)}/search?{params}"
        req = urllib.request.Request(
            url,
            headers={"Authorization": f"Bearer {api_key}"} if api_key else {},
            method="GET",
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        hits = payload.get("hits") or []
        ids = [h.get("id") or h.get("name") for h in hits if h.get("id") or h.get("name")]
        total = int(payload.get("estimatedTotalHits") or payload.get("totalHits") or len(ids))
        return ids, total
    except Exception:
        frappe.logger("scout").warning("Meilisearch job search failed; using SQL fallback", exc_info=True)
        return None


def search_job_ids(query: str, *, limit: int = 100, offset: int = 0) -> list[str] | None:
    result = search_jobs(query, limit=limit, offset=offset)
    return result[0] if result else None


def index_scout_job(scout_job_id: str) -> None:
    """Best-effort index upsert when Meilisearch is configured."""
    job_id = scout_job_id
    if not meilisearch_enabled() or not job_id:
        return
    row = frappe.db.get_value(
        "Scout Job",
        job_id,
        ["name", "title", "skills", "status", "company_user", "creation"],
        as_dict=True,
    )
    if not row:
        return
    base, api_key, index = _meili_config()
    try:
        import json
        import urllib.request

        doc = {
            "id": row.name,
            "name": row.name,
            "title": row.title or "",
            "skills": row.skills or "",
            "status": row.status or "",
            "company_user": row.company_user or "",
        }
        url = f"{base}/indexes/{index}/documents"
        req = urllib.request.Request(
            url,
            data=json.dumps([doc]).encode("utf-8"),
            headers={
                "Content-Type": "application/json",
                **({"Authorization": f"Bearer {api_key}"} if api_key else {}),
            },
            method="POST",
        )
        urllib.request.urlopen(req, timeout=5)
    except Exception:
        frappe.logger("scout").debug("Meilisearch index upsert skipped for %s", job_id, exc_info=True)
