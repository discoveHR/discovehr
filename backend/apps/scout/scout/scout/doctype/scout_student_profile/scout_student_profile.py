import frappe
from frappe.model.document import Document


class ScoutStudentProfile(Document):
    def validate(self):
        if self.student_user and self.name != self.student_user:
            self.name = self.student_user
