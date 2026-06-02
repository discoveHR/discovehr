import frappe
from frappe import _
from frappe.model.document import Document


def get_permission_query_conditions(user=None):
    user = user or frappe.session.user
    if not user or user == "Guest":
        return "1=0"

    roles = frappe.get_roles(user)
    if "System Manager" in roles:
        return None

    escaped_user = frappe.db.escape(user)
    if "Student" in roles:
        return f"`tabScout Application`.`student_user` = {escaped_user}"

    if "Company" in roles:
        return f"`tabScout Application`.`job_id` in (select `name` from `tabScout Job` where `company_user` = {escaped_user})"

    return "1=0"


def has_permission(doc, user=None, permission_type=None):
    user = user or frappe.session.user
    if not user or user == "Guest":
        return False

    roles = frappe.get_roles(user)
    if "System Manager" in roles:
        return True

    if "Student" in roles:
        return doc.student_user == user

    if "Company" in roles:
        company_user = frappe.db.get_value("Scout Job", doc.job_id, "company_user")
        return company_user == user

    return False


class ScoutApplication(Document):
    def validate(self):
        allowed_statuses = {"Submitted", "In Review", "Shortlisted", "Rejected", "Selected"}
        if self.application_status not in allowed_statuses:
            frappe.throw(_("Invalid application status."))
