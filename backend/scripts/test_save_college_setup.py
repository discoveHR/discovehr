"""Run: bench --site scout.localhost execute scout.scripts.test_save_college_setup.run_test"""

import frappe

from scout.api.tpo.college_setup import save_college_setup


def run_test():
    tpos = frappe.get_all(
        "Has Role",
        filters={"role": "Training & Placement Officer", "parenttype": "User"},
        pluck="parent",
        limit=1,
    )
    if not tpos:
        print("No TPO user found")
        return
    uid = tpos[0]
    frappe.set_user(uid)
    frappe.local.form_dict = frappe._dict()
    frappe.request = type("R", (), {})()
    frappe.request.method = "POST"
    payload = {
        "profile": {
            "tpoName": "manu",
            "collegeName": "ukf",
            "country": "India",
            "state": "Kerala",
            "collegeLocation": "paripally",
        },
        "departments": [
            {
                "departmentName": "sdfsdf",
                "hodName": "",
                "hodEmail": "",
                "hodPhone": "",
                "coordinatorName": "",
                "coordinatorEmail": "",
                "coordinatorPhone": "",
            }
        ],
        "branches": [
            {
                "branchName": "dgfdf",
                "departmentName": "dfdgfdfg",
                "coordinatorName": "dssd",
                "coordinatorEmail": "test@example.com",
                "coordinatorPhone": "",
            }
        ],
        "passoutYears": [
            {
                "passoutYear": "2027",
                "coordinatorName": "vcvxc",
                "coordinatorEmail": "athulunni5050@gmail.com",
                "coordinatorPhone": "",
            }
        ],
        "batches": [
            {
                "batchName": "zcsdffsdf",
                "departmentName": "sdfsdf",
                "branchName": "sdfsf",
                "passoutYear": "2027",
                "coordinatorName": "",
                "coordinatorEmail": "",
                "coordinatorPhone": "",
            }
        ],
    }

    def get_json(silent=True):
        return payload

    frappe.request.get_json = get_json  # type: ignore[attr-defined]

    result = save_college_setup()
    print("Result:", result)
    print("HTTP status:", frappe.local.response.get("http_status_code"))
