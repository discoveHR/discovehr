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

    if "Company" in roles:
        escaped_user = frappe.db.escape(user)
        return f"`tabScout Assessment`.`company_user` = {escaped_user}"

    return "1=0"


def has_permission(doc, user=None, permission_type=None):
    user = user or frappe.session.user
    if not user or user == "Guest":
        return False

    roles = frappe.get_roles(user)
    if "System Manager" in roles:
        return True

    if "Company" in roles:
        return doc.company_user == user

    return False


class ScoutAssessment(Document):
    def validate(self):
        allowed_statuses = {"Draft", "Published", "Closed"}
        if self.status not in allowed_statuses:
            frappe.throw(_("Invalid status for Scout Assessment."))
