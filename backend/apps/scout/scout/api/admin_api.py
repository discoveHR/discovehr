"""
Frappe method paths: ``scout.api.admin_api.*``

Admin portal is separate from the public Company/Student/TPO login.
"""

from scout.api.admin.auth import ensure_demo_admin_user, login, logout, me
from scout.api.admin.dashboard import overview
from scout.api.admin.directory import (
    get_admin_student_detail,
    list_college_students,
    list_colleges_with_tpos,
    list_registered_companies,
)
from scout.api.admin.freelancer_approvals import (
    approve_freelancer,
    get_freelancer_profile_for_admin,
    list_pending_freelancers,
    reject_freelancer,
)
from scout.api.admin.tpo_approvals import approve_tpo, list_pending_tpos, reject_tpo

__all__ = [
    "approve_freelancer",
    "approve_freelancer",
    "approve_tpo",
    "ensure_demo_admin_user",
    "get_freelancer_profile_for_admin",
    "get_admin_student_detail",
    "list_college_students",
    "list_colleges_with_tpos",
    "list_pending_freelancers",
    "list_pending_tpos",
    "list_registered_companies",
    "login",
    "logout",
    "me",
    "overview",
    "reject_freelancer",
    "reject_tpo",
]
