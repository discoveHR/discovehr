from scout.api.admin.auth import ensure_demo_admin_user, login, logout, me
from scout.api.admin.dashboard import overview
from scout.api.admin.psychometric import (
    assign_psychometric_to_students,
    create_psychometric_assessment,
    list_psychometric_assessments,
    list_psychometric_assignments,
)

__all__ = [
    "assign_psychometric_to_students",
    "create_psychometric_assessment",
    "ensure_demo_admin_user",
    "list_psychometric_assessments",
    "list_psychometric_assignments",
    "login",
    "logout",
    "me",
    "overview",
]
