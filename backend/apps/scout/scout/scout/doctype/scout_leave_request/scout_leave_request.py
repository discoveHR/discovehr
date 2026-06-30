import frappe
from frappe.model.document import Document
from frappe.utils import date_diff


class ScoutLeaveRequest(Document):
    def before_save(self):
        if self.from_date and self.to_date:
            days = date_diff(self.to_date, self.from_date) + 1
            self.total_days = days * 0.5 if self.half_day else days
