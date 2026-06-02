import frappe
from frappe.model.document import Document


def normalize_college_name(name: str) -> str:
    return " ".join((name or "").strip().lower().split())


class ScoutCollege(Document):
    def before_save(self):
        self.college_name_normalized = normalize_college_name(self.college_name)
