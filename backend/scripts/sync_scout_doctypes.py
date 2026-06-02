import frappe
from frappe.model.sync import sync_for

frappe.init(site="scout.localhost")
frappe.connect()

missing_before = []
for name in (
    "Scout TPO Posting",
    "Scout TPO Profile",
    "Scout Student Profile",
    "Scout Student Invite",
):
    if not frappe.db.exists("DocType", name):
        missing_before.append(name)

print("missing_before:", missing_before or "none")

sync_for("scout", force=True)
frappe.db.commit()

missing_after = []
for name in (
    "Scout TPO Posting",
    "Scout TPO Profile",
    "Scout Student Profile",
    "Scout Student Invite",
):
    if not frappe.db.exists("DocType", name):
        missing_after.append(name)

print("missing_after:", missing_after or "none")
