"""Run: cd ~/frappe-bench && bench --site scout.localhost run-script /mnt/c/Users/Dell/Documents/Scout\ express/scripts/sync_scout_doctypes.py"""
import frappe
from frappe.model.sync import sync_for

sync_for("scout", force=True)
frappe.db.commit()
print("sync_for(scout) done")
