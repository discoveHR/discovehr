"""Placement Readiness Index (PRI) helpers for public job board apply rules."""

import frappe
from frappe.utils import cint, flt


def public_job_apply_without_pri_cap() -> int:
    return max(1, cint(frappe.conf.get("scout_public_apply_without_pri_cap") or 5))


def pri_score_threshold() -> float:
    return max(0.0, flt(frappe.conf.get("scout_pri_score_threshold") or 1.0))


def student_public_job_application_count(student_user: str) -> int:
    return int(frappe.db.count("Scout Application", {"student_user": student_user}) or 0)


def student_profile_pri_score_column_exists() -> bool:
    """True after bench migrate adds pri_score to tabScout Student Profile."""
    try:
        return bool(frappe.db.has_column("Scout Student Profile", "pri_score"))
    except Exception:
        return False


def profile_pri_score_value(student_user: str) -> float:
    if not student_profile_pri_score_column_exists():
        return 0.0
    return flt(frappe.db.get_value("Scout Student Profile", student_user, "pri_score") or 0)


def _internship_application_track_met(student_user: str) -> bool:
    row = frappe.db.sql(
        """
        SELECT COUNT(*) AS c
        FROM `tabScout Application` a
        INNER JOIN `tabScout Job` j ON j.name = a.job_id
        WHERE a.student_user = %s AND IFNULL(j.opportunity_type, '') = 'Internship'
        """,
        (student_user,),
        as_dict=True,
    )
    return bool(row and (row[0].get("c") or 0) >= 1)


_MOODLE_PRI_CACHE_TTL = 600  # 10 minutes — course enrolment changes rarely
_MOODLE_PRI_CACHE_KEY = "scout:lms:pri_enrolment:{}"


def _moodle_enrolment_track_met(student_user: str) -> bool:
    # Check Redis before hitting Moodle — this is called on every job apply attempt.
    cache_key = _MOODLE_PRI_CACHE_KEY.format(student_user)
    cached = frappe.cache().get_value(cache_key)
    if cached is not None:
        return bool(cached)

    try:
        from scout.api.lms import _get_moodle_courses, _get_moodle_settings, _get_or_create_moodle_user
    except Exception:
        return False

    settings = _get_moodle_settings()
    if not settings.get("enabled"):
        return False
    try:
        moodle_user, _is_new = _get_or_create_moodle_user(student_user)
        courses = _get_moodle_courses(moodle_user.get("id"))
        result = len(courses or []) >= 1
        frappe.cache().set_value(cache_key, result, expires_in_sec=_MOODLE_PRI_CACHE_TTL)
        return result
    except Exception:
        return False


def student_has_pri_score(student_user: str, *, include_moodle: bool = True) -> bool:
    """
    PRI is satisfied if any of:
    - Profile pri_score meets configured threshold (manual / integrations).
    - Student has at least one application to an Internship-type public job (internship track).
    - Moodle (GenVarsity) shows at least one enrolled course when include_moodle is True.
    """
    if student_profile_pri_score_column_exists():
        if profile_pri_score_value(student_user) >= pri_score_threshold():
            return True
    if _internship_application_track_met(student_user):
        return True
    if include_moodle and _moodle_enrolment_track_met(student_user):
        return True
    return False


def can_apply_to_public_job(student_user: str, job_id: str | None = None, *, include_moodle: bool = True) -> bool:
    if job_id:
        try:
            from scout.api.student.inbound_suggestions import student_has_inbound_suggestion

            if student_has_inbound_suggestion(student_user, job_id):
                return True
        except Exception:
            pass
    if student_has_pri_score(student_user, include_moodle=include_moodle):
        return True
    used = student_public_job_application_count(student_user)
    return used < public_job_apply_without_pri_cap()


def public_job_apply_eligibility_payload(student_user: str, *, include_moodle: bool = True) -> dict:
    cap = public_job_apply_without_pri_cap()
    used = student_public_job_application_count(student_user)
    has_pri = student_has_pri_score(student_user, include_moodle=include_moodle)
    can_more = has_pri or used < cap
    return {
        "publicApplicationsUsed": used,
        "withoutPriCap": cap,
        "hasPriScore": has_pri,
        "canApplyToPublicJobboard": can_more,
        "remainingWithoutPri": None if has_pri else max(0, cap - used),
    }
