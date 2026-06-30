"""HRMS endpoints for the company portal."""

import frappe
from frappe import _
from frappe.utils import cint, today

from scout.api.common import get_company_session_user


# ---------------------------------------------------------------------------
# Departments
# ---------------------------------------------------------------------------

@frappe.whitelist(methods=["GET"])
def list_departments():
    company_user, err = get_company_session_user()
    if err:
        return err
    rows = frappe.get_all(
        "Scout Department",
        filters={"company_user": company_user},
        fields=["name", "department_name", "description"],
        order_by="department_name asc",
    )
    return {"ok": True, "departments": rows}


@frappe.whitelist(methods=["POST"])
def create_department():
    company_user, err = get_company_session_user()
    if err:
        return err
    fd = frappe.form_dict
    name = (fd.get("name") or "").strip()
    if not name:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Department name is required.")}

    dept = frappe.get_doc({
        "doctype": "Scout Department",
        "department_name": name,
        "company_user": company_user,
        "description": fd.get("description") or "",
    })
    dept.insert(ignore_permissions=True)
    return {"ok": True, "department": dept.as_dict()}


@frappe.whitelist(methods=["POST"])
def delete_department():
    company_user, err = get_company_session_user()
    if err:
        return err
    dept_id = (frappe.form_dict.get("department_id") or "").strip()
    if not dept_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Department ID is required.")}

    dept = frappe.get_doc("Scout Department", dept_id)
    if dept.company_user != company_user:
        frappe.throw(_("Not authorised"), frappe.PermissionError)

    in_use = frappe.db.count("Scout Employee", {"department": dept_id, "company_user": company_user})
    if in_use:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Cannot delete department with active employees.")}

    dept.delete(ignore_permissions=True)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Employees
# ---------------------------------------------------------------------------

@frappe.whitelist(methods=["GET"])
def list_employees():
    company_user, err = get_company_session_user()
    if err:
        return err
    page = cint(frappe.form_dict.get("page")) or 1
    page_size = cint(frappe.form_dict.get("page_size")) or 20

    employees = frappe.get_all(
        "Scout Employee",
        filters={"company_user": company_user},
        fields=[
            "name", "employee_name", "designation", "department",
            "employment_type", "status", "date_of_joining",
            "email", "phone",
        ],
        order_by="employee_name asc",
        limit=page_size,
        start=(page - 1) * page_size,
    )
    total = frappe.db.count("Scout Employee", {"company_user": company_user})
    return {"ok": True, "employees": employees, "total": total, "page": page, "page_size": page_size}


@frappe.whitelist(methods=["GET"])
def get_employee():
    company_user, err = get_company_session_user()
    if err:
        return err
    emp_id = (frappe.form_dict.get("employee_id") or "").strip()
    if not emp_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Employee ID is required.")}
    emp = frappe.get_doc("Scout Employee", emp_id)
    if emp.company_user != company_user:
        frappe.throw(_("Not authorised"), frappe.PermissionError)
    return {"ok": True, "employee": emp.as_dict()}


@frappe.whitelist(methods=["POST"])
def create_employee():
    """Create a new employee directly (without a job application)."""
    company_user, err = get_company_session_user()
    if err:
        return err
    fd = frappe.form_dict
    emp_name = (fd.get("employee_name") or "").strip()
    if not emp_name:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Employee name is required.")}

    emp = frappe.get_doc({
        "doctype": "Scout Employee",
        "employee_name": emp_name,
        "company_user": company_user,
        "designation": fd.get("designation") or "",
        "department": fd.get("department") or None,
        "employment_type": fd.get("employment_type") or "Full-time",
        "status": "Active",
        "date_of_joining": fd.get("date_of_joining") or today(),
        "email": fd.get("email") or "",
        "phone": fd.get("phone") or "",
        "location": fd.get("location") or "",
        "salary": fd.get("salary") or 0,
        "salary_currency": fd.get("salary_currency") or "INR",
        "notes": fd.get("notes") or "",
    })
    emp.insert(ignore_permissions=True)
    return {"ok": True, "employee": emp.as_dict()}


@frappe.whitelist(methods=["POST"])
def create_employee_from_application():
    """Convert an accepted job application into a Scout Employee record."""
    company_user, err = get_company_session_user()
    if err:
        return err
    fd = frappe.form_dict
    app_id = fd.get("application_id") or ""

    application = frappe.get_doc("Scout Application", app_id)
    if application.company_user != company_user:
        frappe.throw(_("Not authorised"), frappe.PermissionError)
    if application.status not in ("Offer Accepted", "Hired"):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Only accepted/hired applications can be converted.")}

    existing = frappe.db.exists("Scout Employee", {"job_application": app_id})
    if existing:
        return {"ok": True, "employee": frappe.get_doc("Scout Employee", existing).as_dict(), "duplicate": True}

    emp = frappe.get_doc({
        "doctype": "Scout Employee",
        "employee_name": application.student_name or "",
        "company_user": company_user,
        "employee_user": application.student_user or None,
        "job_application": app_id,
        "designation": fd.get("designation") or "",
        "department": fd.get("department") or None,
        "employment_type": fd.get("employment_type") or "Full-time",
        "status": "Active",
        "date_of_joining": fd.get("date_of_joining") or today(),
        "email": application.student_user or "",
        "salary": fd.get("salary") or 0,
        "salary_currency": fd.get("salary_currency") or "INR",
    })
    emp.insert(ignore_permissions=True)
    return {"ok": True, "employee": emp.as_dict()}


@frappe.whitelist(methods=["POST"])
def update_employee():
    company_user, err = get_company_session_user()
    if err:
        return err
    fd = frappe.form_dict
    emp_id = (fd.get("employee_id") or "").strip()
    if not emp_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Employee ID is required.")}
    emp = frappe.get_doc("Scout Employee", emp_id)
    if emp.company_user != company_user:
        frappe.throw(_("Not authorised"), frappe.PermissionError)

    EDITABLE = [
        "employee_name", "designation", "department", "employment_type",
        "status", "date_of_joining", "email", "phone", "location",
        "reporting_to", "salary", "salary_currency",
        "bank_account_number", "bank_name", "notes",
    ]
    for field in EDITABLE:
        if field in fd:
            emp.set(field, fd.get(field))

    emp.save(ignore_permissions=True)
    return {"ok": True, "employee": emp.as_dict()}


# ---------------------------------------------------------------------------
# Leave Requests
# ---------------------------------------------------------------------------

@frappe.whitelist(methods=["GET"])
def list_leave_requests():
    company_user, err = get_company_session_user()
    if err:
        return err
    fd = frappe.form_dict
    page = cint(fd.get("page")) or 1
    page_size = cint(fd.get("page_size")) or 20

    filters: dict = {"company_user": company_user}
    if fd.get("employee_id"):
        filters["employee"] = fd["employee_id"]
    if fd.get("status"):
        filters["status"] = fd["status"]

    requests = frappe.get_all(
        "Scout Leave Request",
        filters=filters,
        fields=[
            "name", "employee", "employee_name", "leave_type",
            "status", "from_date", "to_date", "total_days",
            "half_day", "reason", "approved_by",
        ],
        order_by="from_date desc",
        limit=page_size,
        start=(page - 1) * page_size,
    )
    total = frappe.db.count("Scout Leave Request", filters)
    return {"ok": True, "leave_requests": requests, "total": total, "page": page, "page_size": page_size}


@frappe.whitelist(methods=["POST"])
def update_leave_request():
    company_user, err = get_company_session_user()
    if err:
        return err
    fd = frappe.form_dict
    req_id = (fd.get("request_id") or "").strip()
    if not req_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Request ID is required.")}
    req = frappe.get_doc("Scout Leave Request", req_id)
    if req.company_user != company_user:
        frappe.throw(_("Not authorised"), frappe.PermissionError)

    new_status = fd.get("status") or ""
    if new_status not in ("Approved", "Rejected", "Cancelled"):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid status.")}

    req.status = new_status
    req.approved_by = frappe.session.user
    if new_status == "Rejected":
        req.rejection_reason = fd.get("rejection_reason") or ""

    req.save(ignore_permissions=True)
    return {"ok": True, "leave_request": req.as_dict()}
