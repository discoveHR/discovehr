"""Moodle REST client (extracted from Frappe scout.api.lms)."""

from __future__ import annotations

import json
import os
from typing import Any, Optional
from urllib import parse, request


def _settings() -> dict[str, Any]:
    base_url = (os.getenv("GENVARSITY_MOODLE_URL") or os.getenv("genvarsity_moodle_url") or "").strip().rstrip("/")
    token = (os.getenv("GENVARSITY_MOODLE_TOKEN") or os.getenv("genvarsity_moodle_token") or "").strip()
    return {"base_url": base_url, "token": token, "enabled": bool(base_url and token)}


def moodle_api_call(function_name: str, params: Optional[dict] = None) -> Any:
    settings = _settings()
    if not settings["enabled"]:
        raise RuntimeError("LMS is not configured (GENVARSITY_MOODLE_URL / GENVARSITY_MOODLE_TOKEN)")

    payload = {"wstoken": settings["token"], "wsfunction": function_name, "moodlewsrestformat": "json"}
    if params:
        payload.update(params)

    url = f"{settings['base_url']}/webservice/rest/server.php"
    encoded = parse.urlencode(payload).encode("utf-8")
    req = request.Request(url, data=encoded, method="POST")
    req.add_header("Content-Type", "application/x-www-form-urlencoded")

    with request.urlopen(req, timeout=12) as response:
        body = response.read().decode("utf-8")

    parsed = json.loads(body or "{}")
    if isinstance(parsed, dict) and parsed.get("exception"):
        raise RuntimeError(parsed.get("message") or parsed.get("exception") or "LMS API error")
    return parsed


def get_or_create_moodle_user(*, email: str, full_name: str, platform_user_id: str) -> dict:
    found = moodle_api_call("core_user_get_users_by_field", {"field": "email", "values[0]": email})
    if isinstance(found, list) and found:
        return found[0]

    first_name, _, last_name = (full_name or "Student User").partition(" ")
    username_base = (email or platform_user_id).split("@")[0]
    username = f"scout_{username_base}".replace(" ", "_").lower()
    created = moodle_api_call(
        "core_user_create_users",
        {
            "users[0][username]": username,
            "users[0][firstname]": first_name or "Student",
            "users[0][lastname]": last_name or "User",
            "users[0][email]": email,
            "users[0][auth]": "manual",
            "users[0][password]": "Sc0ut@Temp123!",
        },
    )
    if isinstance(created, list) and created:
        return created[0]
    raise RuntimeError("Unable to link student with LMS account")


def get_moodle_courses(moodle_user_id: int | str) -> list[dict]:
    courses = moodle_api_call("core_enrol_get_users_courses", {"userid": moodle_user_id})
    if not isinstance(courses, list):
        return []
    return [
        {
            "id": row.get("id"),
            "shortname": row.get("shortname"),
            "fullname": row.get("fullname"),
            "categoryid": row.get("categoryid"),
        }
        for row in courses
    ]


def student_lms_context(*, email: str, full_name: str, platform_user_id: str) -> dict:
    settings = _settings()
    if not settings["enabled"]:
        return {
            "enabled": False,
            "provider": "LMS",
            "launchUrl": "",
            "courses": [],
            "message": "LMS is not configured yet.",
        }

    moodle_user = get_or_create_moodle_user(email=email, full_name=full_name, platform_user_id=platform_user_id)
    courses = get_moodle_courses(moodle_user.get("id"))
    return {
        "enabled": True,
        "provider": "LMS",
        "launchUrl": f"{settings['base_url']}/my/",
        "moodleUserId": moodle_user.get("id"),
        "courses": courses,
    }
