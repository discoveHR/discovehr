import frappe

frappe.init(site="scout.localhost", sites_path="/home/dell/frappe-bench/sites")
frappe.connect()
names = frappe.get_all("DocType", filters={"name": ["like", "Scout%"]}, pluck="name", order_by="name")
for n in names:
    print(n)
frappe.destroy()
