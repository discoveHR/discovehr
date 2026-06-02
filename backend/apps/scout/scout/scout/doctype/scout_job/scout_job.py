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
        return f"`tabScout Job`.`company_user` = {escaped_user}"

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


class ScoutJob(Document):
    def validate(self):
        self._validate_status_workflow()

    def _validate_status_workflow(self):
        allowed_statuses = {"Draft", "Active", "Closed"}
        if self.status not in allowed_statuses:
            frappe.throw(_("Invalid status for Scout Job."))

        if self.is_new():
            return

        previous_status = frappe.db.get_value("Scout Job", self.name, "status")
        allowed_transitions = {
            "Draft": {"Draft", "Active"},
            "Active": {"Active", "Closed"},
            "Closed": {"Closed"},
        }

        if previous_status and self.status not in allowed_transitions.get(previous_status, {previous_status}):
            frappe.throw(_("Status transition not allowed: {0} -> {1}").format(previous_status, self.status))
