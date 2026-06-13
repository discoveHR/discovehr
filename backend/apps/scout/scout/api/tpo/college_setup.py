import frappe
from frappe import _
from frappe.utils import strip_html

from scout.api.common import get_tpo_session_user
from scout.api.tpo.helpers import norm
from scout.api.tpo.profile import (
    TPO_ADMIN_APPROVAL_REQUIRED,
    _apply_profile_fields_to_doc,
    _ensure_tpo_profile,
    _profile_status_payload,
    get_tpo_profile_row,
    resolve_tpo_profile_fields,
    serialize_tpo_profile_api,
)
from scout.bootstrap import sync_scout_doctypes_if_needed

COLLEGE_SETUP_DOCTYPES = (
    "Scout College Department",
    "Scout College Branch",
    "Scout College Passout Year",
    "Scout College Batch",
)


def _ensure_college_setup_doctypes():
    missing = [name for name in COLLEGE_SETUP_DOCTYPES if not frappe.db.exists("DocType", name)]
    if missing:
        sync_scout_doctypes_if_needed(force=True)


def _sync_child_rows(doctype: str, user_id: str, rows: list[dict], field_map: dict[str, str]):
    existing = frappe.get_all(doctype, filters={"tpo_user": user_id}, pluck="name")
    incoming_ids = {norm(r.get("id")) for r in rows if norm(r.get("id"))}

    for name in existing:
        if name not in incoming_ids:
            frappe.delete_doc(doctype, name, ignore_permissions=True)

    for row in rows:
        doc_name = norm(row.get("id"))
        payload = {"tpo_user": user_id}
        for api_key, fieldname in field_map.items():
            value = row.get(api_key)
            if value is not None:
                payload[fieldname] = norm(value) if isinstance(value, str) else value

        primary_field = next(iter(field_map.values()), None)
        if primary_field and not norm(payload.get(primary_field)):
            continue

        if doc_name and frappe.db.exists(doctype, doc_name):
            doc = frappe.get_doc(doctype, doc_name)
            doc.update(payload)
            doc.save(ignore_permissions=True)
        else:
            frappe.get_doc({"doctype": doctype, **payload}).insert(ignore_permissions=True)


def _serialize_departments(user_id: str):
    rows = frappe.get_all(
        "Scout College Department",
        filters={"tpo_user": user_id},
        fields=["name", "department_name", "hod_name", "hod_email", "hod_phone"],
        order_by="department_name asc",
    )
    return [
        {
            "id": r.name,
            "departmentName": r.department_name or "",
            "hodName": r.hod_name or "",
            "hodEmail": r.hod_email or "",
            "hodPhone": r.hod_phone or "",
        }
        for r in rows
    ]


def _serialize_branches(user_id: str):
    rows = frappe.get_all(
        "Scout College Branch",
        filters={"tpo_user": user_id},
        fields=["name", "branch_name", "department_name", "passout_year"],
        order_by="branch_name asc",
    )
    return [
        {
            "id": r.name,
            "batchName": r.branch_name or "",
            "departmentName": r.department_name or "",
            "passoutYear": r.passout_year or "",
        }
        for r in rows
    ]


def _serialize_passout_years(user_id: str):
    rows = frappe.get_all(
        "Scout College Passout Year",
        filters={"tpo_user": user_id},
        fields=["name", "passout_year", "coordinator_name", "coordinator_email", "coordinator_phone"],
        order_by="passout_year asc",
    )
    return [
        {
            "id": r.name,
            "passoutYear": r.passout_year or "",
            "coordinatorName": r.coordinator_name or "",
            "coordinatorEmail": r.coordinator_email or "",
            "coordinatorPhone": r.coordinator_phone or "",
        }
        for r in rows
    ]


def _serialize_batches(user_id: str):
    rows = frappe.get_all(
        "Scout College Batch",
        filters={"tpo_user": user_id},
        fields=[
            "name",
            "batch_name",
            "department_name",
            "branch_name",
            "passout_year",
            "coordinator_name",
            "coordinator_email",
            "coordinator_phone",
        ],
        order_by="batch_name asc",
    )
    return [
        {
            "id": r.name,
            "batchName": r.batch_name or "",
            "departmentName": r.department_name or "",
            "branchName": r.branch_name or "",
            "passoutYear": r.passout_year or "",
            "coordinatorName": r.coordinator_name or "",
            "coordinatorEmail": r.coordinator_email or "",
            "coordinatorPhone": r.coordinator_phone or "",
        }
        for r in rows
    ]


@frappe.whitelist(methods=["GET"])
def get_college_setup():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    _ensure_college_setup_doctypes()
    row = get_tpo_profile_row(user_id)
    status = _profile_status_payload(row)
    # RELEASE: re-enable when TPO_ADMIN_APPROVAL_REQUIRED is True.
    if TPO_ADMIN_APPROVAL_REQUIRED and status["approvalStatus"] != "Approved":
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("College setup is available after admin approval.")}

    profile_resp = serialize_tpo_profile_api(row, user_id)

    from scout.api.cache_utils import COLLEGE_SETUP_TTL, college_setup_cache_key

    cache_key = college_setup_cache_key(user_id)
    structure = frappe.cache().get_value(cache_key)
    if structure is None:
        structure = {
            "departments": _serialize_departments(user_id),
            "branches": _serialize_branches(user_id),
            "passoutYears": _serialize_passout_years(user_id),
            "batches": _serialize_batches(user_id),
        }
        frappe.cache().set_value(cache_key, structure, expires_in_sec=COLLEGE_SETUP_TTL)

    return {
        "ok": True,
        "data": {
            "status": status,
            "profile": profile_resp,
            **structure,
        },
    }


@frappe.whitelist(methods=["POST"])
def save_college_setup():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    row = get_tpo_profile_row(user_id)
    status = _profile_status_payload(row)
    # RELEASE: re-enable when TPO_ADMIN_APPROVAL_REQUIRED is True.
    if TPO_ADMIN_APPROVAL_REQUIRED and status["approvalStatus"] != "Approved":
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("College setup is available after admin approval.")}

    payload = frappe.request.get_json(silent=True) or {}
    profile = payload.get("profile") or {}
    fields = resolve_tpo_profile_fields(user_id, profile, row)

    try:
        _ensure_college_setup_doctypes()
        doc = _ensure_tpo_profile(user_id)
        _apply_profile_fields_to_doc(doc, fields)
        doc.save(ignore_permissions=True)

        departments = payload.get("departments") or []
        branches = payload.get("branches") or []
        passout_years = payload.get("passoutYears") or []
        batches = payload.get("batches") or []

        _sync_child_rows(
            "Scout College Department",
            user_id,
            departments,
            {
                "departmentName": "department_name",
                "hodName": "hod_name",
                "hodEmail": "hod_email",
                "hodPhone": "hod_phone",
            },
        )
        _sync_child_rows(
            "Scout College Branch",
            user_id,
            branches,
            {
                "batchName": "branch_name",
                "departmentName": "department_name",
                "passoutYear": "passout_year",
            },
        )
        _sync_child_rows(
            "Scout College Passout Year",
            user_id,
            passout_years,
            {
                "passoutYear": "passout_year",
                "coordinatorName": "coordinator_name",
                "coordinatorEmail": "coordinator_email",
                "coordinatorPhone": "coordinator_phone",
            },
        )
        _sync_child_rows(
            "Scout College Batch",
            user_id,
            batches,
            {
                "batchName": "batch_name",
                "departmentName": "department_name",
                "branchName": "branch_name",
                "passoutYear": "passout_year",
                "coordinatorName": "coordinator_name",
                "coordinatorEmail": "coordinator_email",
                "coordinatorPhone": "coordinator_phone",
            },
        )

        frappe.db.commit()
        from scout.api.cache_utils import invalidate_college_setup_cache
        invalidate_college_setup_cache(user_id)
    except frappe.ValidationError as exc:
        frappe.db.rollback()
        frappe.local.response["http_status_code"] = 400
        cleaned = strip_html(str(exc)).strip()
        return {"ok": False, "message": cleaned or _("Invalid college setup data.")}
    except ImportError as exc:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Scout API: save_college_setup")
        frappe.local.response["http_status_code"] = 500
        if str(exc).strip() in ("Scout TPO Profile", "Scout TPO Posting"):
            return {
                "ok": False,
                "message": _(
                    "TPO profile module failed to load. Restart bench (bench start) and retry."
                ),
            }
        return {"ok": False, "message": strip_html(str(exc)).strip() or _("Could not save college structure.")}
    except Exception as exc:
        frappe.db.rollback()
        frappe.log_error(frappe.get_traceback(), "Scout API: save_college_setup")
        frappe.local.response["http_status_code"] = 500
        detail = strip_html(str(exc)).strip()
        if "doesn't exist" in detail.lower() or "does not exist" in detail.lower():
            return {
                "ok": False,
                "message": _("College setup database tables are missing. Please retry in a moment or run bench migrate."),
            }
        return {
            "ok": False,
            "message": detail or _("Could not save college structure."),
        }
    return {"ok": True, "message": _("College structure saved.")}


@frappe.whitelist(methods=["POST"])
def complete_college_setup():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    row = get_tpo_profile_row(user_id)
    status = _profile_status_payload(row)
    # RELEASE: re-enable when TPO_ADMIN_APPROVAL_REQUIRED is True.
    if TPO_ADMIN_APPROVAL_REQUIRED and status["approvalStatus"] != "Approved":
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("College setup is available after admin approval.")}

    profile_name = frappe.db.exists("Scout TPO Profile", {"tpo_user": user_id})
    if profile_name:
        frappe.db.set_value(
            "Scout TPO Profile",
            profile_name,
            {"college_setup_complete": 1},
            update_modified=True,
        )
    frappe.db.commit()
    return {
        "ok": True,
        "message": _(
            "College setup completed. You can add or update profile and structure anytime under Admin in the dashboard."
        ),
    }
