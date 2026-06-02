import frappe


def assign_manul_tpo():
    return assign_portal_role("manul@gmail.com", "Training & Placement Officer")


def check_manul():
    email = "manul@gmail.com"
    roles = list(frappe.get_roles(email))
    profile = frappe.db.get_value("Scout TPO Profile", {"tpo_user": email}, "name")
    return {"email": email, "roles": roles, "tpoProfile": profile or None}


def assign_athul_student():
    return ensure_student_account("athul@gmail.com")


def check_athul():
    return check_student_account("athul@gmail.com")


def check_student_account(email: str):
    email = (email or "").strip().lower()
    if not frappe.db.exists("User", email):
        return {"ok": False, "email": email, "message": "User not found"}
    roles = list(frappe.get_roles(email))
    profile = frappe.db.get_value(
        "Scout Student Profile",
        email,
        ["name", "full_name", "phone", "email"],
        as_dict=True,
    )
    return {"ok": True, "email": email, "roles": roles, "studentProfile": profile}


def ensure_student_account(email: str):
    email = (email or "").strip().lower()
    if not email:
        return {"ok": False, "message": "email required"}
    if not frappe.db.exists("User", email):
        return {"ok": False, "message": f"User {email} not found"}

    role_result = assign_portal_role(email, "Student")
    if not role_result.get("ok"):
        return role_result

    user_row = frappe.db.get_value("User", email, ["first_name", "last_name", "full_name", "mobile_no"], as_dict=True) or {}
    full_name = (user_row.get("full_name") or "").strip()
    if not full_name:
        first = (user_row.get("first_name") or "").strip()
        last = (user_row.get("last_name") or "").strip()
        full_name = f"{first} {last}".strip() or email.split("@")[0]

    phone = (user_row.get("mobile_no") or "").strip()
    if frappe.db.exists("Scout Student Profile", email):
        frappe.db.set_value(
            "Scout Student Profile",
            email,
            {"full_name": full_name, "email": email, "phone": phone or None},
            update_modified=True,
        )
    else:
        profile = frappe.get_doc(
            {
                "doctype": "Scout Student Profile",
                "student_user": email,
                "full_name": full_name,
                "email": email,
                "phone": phone,
                "candidate_type": "Independent",
            }
        )
        profile.db_insert()

    _clear_portal_tokens(email)
    from frappe.utils.password import update_password

    update_password(email, "Athul@123")

    frappe.db.commit()
    return {
        "ok": True,
        "email": email,
        "roles": list(frappe.get_roles(email)),
        "studentProfile": frappe.db.get_value("Scout Student Profile", email, "name"),
        "message": "Student role and profile are ready. Sign out, clear browser storage, and sign in again.",
    }


def _clear_portal_tokens(email: str) -> None:
    if frappe.db.table_exists("Scout Portal Auth Token"):
        frappe.db.delete("Scout Portal Auth Token", {"user": email})


def assign_portal_role(email: str, role: str = "Training & Placement Officer"):
    email = (email or "").strip().lower()
    role = (role or "").strip()
    if not email:
        return {"ok": False, "message": "email required"}
    if not frappe.db.exists("User", email):
        return {"ok": False, "message": f"User {email} not found"}
    if not frappe.db.exists("Role", role):
        frappe.get_doc({"doctype": "Role", "role_name": role}).insert(ignore_permissions=True)
    user = frappe.get_doc("User", email)
    roles_before = list(frappe.get_roles(email))
    if role not in roles_before:
        user.add_roles(role)
        frappe.db.commit()
    roles_after = list(frappe.get_roles(email))
    return {"ok": True, "email": email, "roles": roles_after}


@frappe.whitelist()
def assign_portal_role_api(email: str, role: str = "Training & Placement Officer"):
    return assign_portal_role(email, role)


@frappe.whitelist()
def ensure_student_account_api(email: str):
    return ensure_student_account(email)
