import frappe
from frappe.model.document import Document


def get_permission_query_conditions(user=None):
    user = user or frappe.session.user
    if not user or user == "Guest":
        return "1=0"

    roles = frappe.get_roles(user)
    if "System Manager" in roles:
        return None

    if "Training & Placement Officer" in roles:
        escaped_user = frappe.db.escape(user)
        return f"`tabScout TPO Profile`.`tpo_user` = {escaped_user}"

    return "1=0"


def has_permission(doc, user=None, permission_type=None):
    user = user or frappe.session.user
    if not user or user == "Guest":
        return False

    roles = frappe.get_roles(user)
    if "System Manager" in roles:
        return True

    if "Training & Placement Officer" in roles:
        return doc.tpo_user == user

    return False


class ScoutTPOProfile(Document):
    pass
