"""
Company portal implementation and legacy ``scout.api.company.*`` re-exports.

Implementation modules:

- ``scout.api.company.jobs_applications`` — jobs and applications
- ``scout.api.company.assessments`` — assessments (TAO hooks)

Stable Frappe paths for the SPA still use ``scout.api.company_api.*``; see
``scout.api.company_api`` (thin shim).
"""

from scout.api.auth import login, logout, me, register
from scout.api.company.assessments import create_assessment, list_assessments
from scout.api.company.jobs_applications import (
    create_job,
    ensure_demo_company_user,
    invite_college_for_job,
    list_college_invites,
    list_applicants,
    list_jobs,
    update_application_status,
    update_job_status,
)
from scout.api.lms import student_lms_context
from scout.api.student import (
    accept_collegiate_enrollment,
    apply_to_job,
    decline_collegiate_enrollment,
    get_student_profile,
    request_student_profile_edit,
    student_dashboard,
    update_student_profile,
)

__all__ = [
    "accept_collegiate_enrollment",
    "apply_to_job",
    "create_assessment",
    "create_job",
    "decline_collegiate_enrollment",
    "ensure_demo_company_user",
    "get_student_profile",
    "invite_college_for_job",
    "list_applicants",
    "list_assessments",
    "list_college_invites",
    "list_jobs",
    "login",
    "logout",
    "me",
    "register",
    "request_student_profile_edit",
    "student_dashboard",
    "student_lms_context",
    "update_application_status",
    "update_job_status",
    "update_student_profile",
]
