import frappe
from frappe.model.document import Document


def get_permission_query_conditions(user=None):
    user = user or frappe.session.user
    if not user or user == "Guest":
        return "1=0"
    if "System Manager" in frappe.get_roles(user):
        return None
    if "Company" in frappe.get_roles(user):
        escaped_user = frappe.db.escape(user)
        return f"`tabScout Company Interview`.`company_user` = {escaped_user}"
    return "1=0"


def has_permission(doc, user=None, permission_type=None):
    user = user or frappe.session.user
    if not user or user == "Guest":
        return False
    if "System Manager" in frappe.get_roles(user):
        return True
    if "Company" in frappe.get_roles(user):
        return doc.company_user == user
    return False


class ScoutCompanyInterview(Document):
    pass
