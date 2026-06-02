"""bench --site scout.localhost execute backend/scripts/fix_user_role.py --kwargs '{"email":"manul@gmail.com","role":"Training & Placement Officer"}'"""

import frappe


def run(email: str = "", role: str = "Training & Placement Officer"):
    email = (email or "").strip().lower()
    role = (role or "").strip()
    if not email:
        return {"ok": False, "message": "email required"}

    if not frappe.db.exists("User", email):
        return {"ok": False, "message": f"User {email} not found"}

    if not frappe.db.exists("Role", role):
        frappe.get_doc({"doctype": "Role", "role_name": role}).insert(ignore_permissions=True)

    user = frappe.get_doc("User", email)
    roles_before = frappe.get_roles(email)
    if role not in roles_before:
        user.add_roles(role)
        frappe.db.commit()

    roles_after = frappe.get_roles(email)
    return {
        "ok": True,
        "email": email,
        "added": role,
        "roles": roles_after,
        "has_tpo": any(
            r in {"Training & Placement Officer", "Training and Placement Officer", "TPO"}
            for r in roles_after
        ),
    }
