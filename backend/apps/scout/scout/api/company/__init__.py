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
from scout.api.company.hrms import (
    create_department,
    create_employee,
    create_employee_from_application,
    delete_department,
    get_employee,
    list_departments,
    list_employees,
    list_leave_requests,
    update_employee,
    update_leave_request,
)
from scout.api.company.job_payments import (
    create_job_boost_order,
    create_job_extension_order,
    verify_job_boost,
    verify_job_extension,
)
from scout.api.company.jobs_applications import (
    create_job,
    ensure_demo_company_user,
    invite_college_for_job,
    list_college_invites,
    list_applicants,
    list_jobs,
    send_offer_letter,
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
    "create_department",
    "create_employee",
    "create_employee_from_application",
    "create_job",
    "create_job_boost_order",
    "create_job_extension_order",
    "decline_collegiate_enrollment",
    "delete_department",
    "ensure_demo_company_user",
    "get_employee",
    "get_student_profile",
    "invite_college_for_job",
    "list_applicants",
    "list_assessments",
    "list_college_invites",
    "list_departments",
    "list_employees",
    "list_jobs",
    "list_leave_requests",
    "send_offer_letter",
    "login",
    "logout",
    "me",
    "register",
    "request_student_profile_edit",
    "student_dashboard",
    "student_lms_context",
    "update_application_status",
    "update_employee",
    "update_job_status",
    "update_leave_request",
    "update_student_profile",
    "verify_job_boost",
    "verify_job_extension",
]
