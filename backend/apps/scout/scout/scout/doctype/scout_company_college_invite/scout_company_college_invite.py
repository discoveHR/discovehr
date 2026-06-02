import frappe
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
        return f"`tabScout Company College Invite`.`company_user` = {escaped_user}"

    if "Training & Placement Officer" in roles or "TPO" in roles:
        escaped_user = frappe.db.escape(user)
        escaped_email = frappe.db.escape(user)
        return (
            f"(`tabScout Company College Invite`.`tpo_user` = {escaped_user} "
            f"OR `tabScout Company College Invite`.`college_email` = {escaped_email})"
        )

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

    if "Training & Placement Officer" in roles or "TPO" in roles:
        return doc.tpo_user == user or doc.college_email == user

    return False


class ScoutCompanyCollegeInvite(Document):
    pass
