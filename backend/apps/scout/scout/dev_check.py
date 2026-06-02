def test_save_college_setup():
    """bench --site scout.localhost execute scout.dev_check.test_save_college_setup"""
    import frappe

    from scout.api.tpo.college_setup import save_college_setup

    tpos = frappe.get_all(
        "Has Role",
        filters={"role": "Training & Placement Officer", "parenttype": "User"},
        pluck="parent",
        limit=1,
    )
    if not tpos:
        print("No TPO user")
        return False
    uid = tpos[0]
    frappe.set_user(uid)
    payload = {
        "profile": {
            "tpoName": "manu",
            "collegeName": "ukf",
            "country": "India",
            "state": "Kerala",
            "collegeLocation": "paripally",
        },
        "departments": [{"departmentName": "sdfsdf"}],
        "branches": [{"branchName": "dgfdf", "departmentName": "dfdgfdfg"}],
        "passoutYears": [{"passoutYear": "2027", "coordinatorEmail": "athulunni5050@gmail.com"}],
        "batches": [{"batchName": "zcsdffsdf", "departmentName": "sdfsdf", "branchName": "sdfsf", "passoutYear": "2027"}],
    }

    class _Req:
        @staticmethod
        def get_json(silent=True):
            return payload

    frappe.request = _Req()  # type: ignore[assignment]
    frappe.controllers.setdefault(frappe.local.site, {}).pop("Scout TPO Profile", None)
    result = save_college_setup()
    print("Result:", result)
    return bool(result and result.get("ok"))
