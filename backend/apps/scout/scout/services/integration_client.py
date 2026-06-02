from __future__ import annotations

import frappe

from scout.services.config import integration_service_url, use_integration_service
from scout.services.http_client import post_json


def fetch_student_lms_context(platform_user_id: str) -> dict | None:
    if not use_integration_service():
        return None

    email = frappe.get_value("User", platform_user_id, "email") or platform_user_id
    full_name = frappe.get_value("User", platform_user_id, "full_name") or ""
    body = post_json(
        integration_service_url(),
        "/v1/moodle/student-context",
        {
            "platformUserId": platform_user_id,
            "email": email,
            "fullName": full_name,
        },
    )
    return body.get("data")
