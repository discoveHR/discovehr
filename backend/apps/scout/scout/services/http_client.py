"""POST JSON to a sidecar service with internal auth."""

from __future__ import annotations

import json
from typing import Any

import frappe

from scout.services.config import internal_secret


def post_json(base_url: str, path: str, payload: dict[str, Any], *, timeout: int = 25) -> dict[str, Any]:
    import requests

    secret = internal_secret()
    if not secret:
        frappe.throw("SCOUT_SERVICE_INTERNAL_SECRET is required when microservices are enabled.")

    url = f"{base_url.rstrip('/')}{path}"
    headers = {
        "Content-Type": "application/json",
        "X-Scout-Internal": secret,
    }
    try:
        resp = requests.post(url, headers=headers, data=json.dumps(payload), timeout=timeout)
    except Exception as exc:
        frappe.log_error(frappe.get_traceback(), f"Scout service call failed: {url}")
        frappe.throw(f"Sidecar service unavailable: {exc}")

    try:
        body = resp.json()
    except Exception:
        frappe.throw(f"Sidecar service returned invalid JSON (HTTP {resp.status_code})")

    if resp.status_code >= 400 or not body.get("ok"):
        detail = body.get("detail") or body.get("message") or resp.text
        if isinstance(detail, list):
            detail = detail[0].get("msg") if detail else resp.text
        frappe.throw(f"Sidecar service error: {detail}")
    return body
