import frappe

frappe.init(site="all")
frappe.connect()

for path in (
    "scout.api.company_api.list_approved_freelancer_interviewers",
    "scout.api.company.freelancer_interviewers.list_approved_freelancer_interviewers",
):
    try:
        fn = frappe.get_attr(path)
        print(f"OK {path} -> {fn}")
    except Exception as exc:
        print(f"FAIL {path} -> {exc}")
