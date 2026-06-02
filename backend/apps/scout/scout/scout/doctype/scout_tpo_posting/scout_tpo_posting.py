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

    if "Training & Placement Officer" in roles:
        escaped_user = frappe.db.escape(user)
        return f"`tabScout TPO Posting`.`created_by_tpo` = {escaped_user}"

    return "1=0"


def has_permission(doc, user=None, permission_type=None):
    user = user or frappe.session.user
    if not user or user == "Guest":
        return False

    roles = frappe.get_roles(user)
    if "System Manager" in roles:
        return True

    if "Training & Placement Officer" in roles:
        return doc.created_by_tpo == user

    return False


class ScoutTPOPosting(Document):
    def validate(self):
        allowed_statuses = {"Draft", "Active", "Closed"}
        if self.status not in allowed_statuses:
            frappe.throw(_("Invalid status for TPO posting."))
        if not self.is_internal_job and not (self.company_email or "").strip():
            frappe.throw(_("Company email is required for company placement postings."))
        if self.is_internal_job and (self.batch_audience or "") == "Specific Batches":
            tb = (self.target_batches or "").strip() or (self.batch or "").strip()
            if not tb:
                frappe.throw(_("Target batches (or Batch) is required when audience is Specific Batches."))
