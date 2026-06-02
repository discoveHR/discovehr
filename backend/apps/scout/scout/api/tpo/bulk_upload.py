"""Queued bulk student CSV/XLSX import for TPOs."""

from __future__ import annotations

import hashlib
import secrets

import frappe
from frappe import _
from frappe.model.naming import make_autoname

from scout.api.common import get_tpo_session_user
from scout.api.tpo.helpers import norm
from scout.api.tpo.students import (
    _count_rows_with_email,
    _map_row_fields,
    _parse_csv_or_excel,
    _sheet_has_email_column,
)

ASYNC_BULK_MIN_ROWS = 100
BULK_UPLOAD_CACHE_TTL = 7200
BULK_COMMIT_EVERY = 50


def _upload_cache_key(upload_id: str) -> str:
    return f"scout:tpo_bulk_upload:{upload_id}"


def _empty_result() -> dict:
    return {
        "processed": 0,
        "profilesUpdated": 0,
        "profilesCreated": 0,
        "invitesCreated": 0,
        "skipped": 0,
        "errors": [],
    }


def _process_bulk_rows(
    tpo_user_id: str,
    rows: list[dict],
    *,
    default_batch: str = "",
    default_department: str = "",
    default_year: str = "",
    create_invite_for_missing: bool = True,
    progress_upload_id: str | None = None,
) -> dict:
    processed = 0
    profiles_updated = 0
    profiles_created = 0
    invites_created = 0
    skipped = 0
    errors: list[str] = []
    total = _count_rows_with_email(rows)
    cache = frappe.cache()

    tpo_college = norm(frappe.db.get_value("Scout TPO Profile", {"tpo_user": tpo_user_id}, "college_name"))

    for index, raw_row in enumerate(rows, start=2):
        mapped = _map_row_fields(raw_row)
        email = norm(mapped.get("email")).lower()
        if not email:
            skipped += 1
            if len(errors) < 50:
                errors.append(f"Row {index}: email is required.")
            continue

        batch = norm(mapped.get("batch")) or default_batch
        department = norm(mapped.get("department")) or default_department
        year = norm(mapped.get("year")) or default_year or batch
        full_name = norm(mapped.get("full_name"))
        phone = norm(mapped.get("phone"))
        college = norm(mapped.get("college"))
        area_of_study = norm(mapped.get("area_of_study"))
        state = norm(mapped.get("state"))
        country = norm(mapped.get("country"))

        processed += 1

        if frappe.db.exists("User", email):
            profile_name = frappe.db.exists("Scout Student Profile", {"student_user": email}) or frappe.db.exists(
                "Scout Student Profile", email
            )
            if profile_name:
                doc = frappe.get_doc("Scout Student Profile", profile_name)
                profiles_updated += 1
            else:
                doc = frappe.get_doc(
                    {
                        "doctype": "Scout Student Profile",
                        "student_user": email,
                        "email": email,
                        "candidate_type": "Institutional",
                        "linked_tpo_user": tpo_user_id,
                    }
                )
                profiles_created += 1

            if full_name:
                doc.full_name = full_name
            doc.email = email
            if not norm(doc.linked_tpo_user):
                doc.linked_tpo_user = tpo_user_id
            if norm(doc.candidate_type) == "Independent":
                doc.candidate_type = "Institutional"
            if phone:
                doc.phone = phone
            if batch:
                doc.course_class_grade = batch
            if department:
                doc.department_stream = department
            if year:
                doc.academic_year = year
            if college:
                doc.college = college
            elif tpo_college and not norm(doc.college):
                doc.college = tpo_college
            if area_of_study:
                doc.area_of_study = area_of_study
            if state:
                doc.state = state
            if country:
                doc.country = country

            if profile_name:
                doc.save(ignore_permissions=True)
            else:
                doc.insert(ignore_permissions=True)

            update_user_payload = {}
            if full_name:
                update_user_payload["full_name"] = full_name
            if phone:
                update_user_payload["mobile_no"] = phone
            if update_user_payload:
                frappe.db.set_value("User", email, update_user_payload, update_modified=False)
        elif create_invite_for_missing:
            pending_invite = frappe.db.exists(
                "Scout Student Invite", {"email": email, "status": "Pending", "is_active": 1}
            )
            if pending_invite:
                skipped += 1
            else:
                raw_token = secrets.token_urlsafe(32)
                token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
                expires_at = frappe.utils.add_to_date(frappe.utils.now_datetime(), hours=72, as_datetime=True)
                invite_doc = None
                for _attempt in range(3):
                    candidate_name = make_autoname("STU-INV-.#####")
                    try:
                        invite_doc = frappe.get_doc(
                            {
                                "doctype": "Scout Student Invite",
                                "email": email,
                                "branch": department,
                                "batch": batch,
                                "year": year,
                                "token_hash": token_hash,
                                "expires_at": expires_at,
                                "status": "Pending",
                                "is_active": 1,
                                "created_by_tpo": tpo_user_id,
                            }
                        )
                        invite_doc.insert(ignore_permissions=True, set_name=candidate_name)
                        invites_created += 1
                        break
                    except frappe.DuplicateEntryError:
                        invite_doc = None
                        continue
                if not invite_doc:
                    skipped += 1
                    if len(errors) < 50:
                        errors.append(f"Row {index}: unable to create invite for {email}.")
        else:
            skipped += 1
            if len(errors) < 50:
                errors.append(f"Row {index}: user not found for {email}.")

        if progress_upload_id and processed % BULK_COMMIT_EVERY == 0:
            frappe.db.commit()
            cache.set_value(
                _upload_cache_key(progress_upload_id),
                {
                    "status": "processing",
                    "totalRows": total,
                    "processed": processed,
                    "profilesUpdated": profiles_updated,
                    "profilesCreated": profiles_created,
                    "invitesCreated": invites_created,
                    "skipped": skipped,
                },
                expires_in_sec=BULK_UPLOAD_CACHE_TTL,
            )

    frappe.db.commit()
    from scout.api.tpo.student_scope import invalidate_tpo_student_ids_cache

    invalidate_tpo_student_ids_cache(tpo_user_id)

    return {
        "processed": processed,
        "profilesUpdated": profiles_updated,
        "profilesCreated": profiles_created,
        "invitesCreated": invites_created,
        "skipped": skipped,
        "errors": errors[:30],
    }


def run_bulk_upsert_students(
    upload_id: str,
    tpo_user_id: str,
    file_url: str,
    options: dict,
):
    frappe.set_user(tpo_user_id)
    cache = frappe.cache()
    try:
        file_doc = frappe.get_value("File", {"file_url": file_url}, ["name", "file_name"], as_dict=True)
        if not file_doc:
            cache.set_value(
                _upload_cache_key(upload_id),
                {"status": "failed", "message": _("Uploaded file not found.")},
                expires_in_sec=BULK_UPLOAD_CACHE_TTL,
            )
            return

        file_content = frappe.get_doc("File", file_doc.get("name")).get_content()
        rows = _parse_csv_or_excel(file_doc.get("file_name"), file_content)
        cache.set_value(
            _upload_cache_key(upload_id),
            {"status": "processing", "totalRows": _count_rows_with_email(rows), "processed": 0},
            expires_in_sec=BULK_UPLOAD_CACHE_TTL,
        )

        result = _process_bulk_rows(
            tpo_user_id,
            rows,
            default_batch=norm(options.get("default_batch") or options.get("defaultBatch")),
            default_department=norm(options.get("default_department") or options.get("defaultDepartment")),
            default_year=norm(options.get("default_year") or options.get("defaultYear")),
            create_invite_for_missing=bool(options.get("create_invite_for_missing", options.get("createInviteForMissing", True))),
            progress_upload_id=upload_id,
        )
        cache.set_value(
            _upload_cache_key(upload_id),
            {"status": "ready", **result},
            expires_in_sec=BULK_UPLOAD_CACHE_TTL,
        )
    except Exception:
        frappe.log_error(title="TPO bulk student upload failed", message=frappe.get_traceback())
        cache.set_value(
            _upload_cache_key(upload_id),
            {"status": "failed", "message": _("Bulk upload failed. Check error log or retry with a smaller file.")},
            expires_in_sec=BULK_UPLOAD_CACHE_TTL,
        )


def _load_and_validate_rows(file_url: str) -> tuple[list[dict] | None, dict | None]:
    file_doc = frappe.get_value("File", {"file_url": file_url}, ["name", "file_name"], as_dict=True)
    if not file_doc:
        frappe.local.response["http_status_code"] = 404
        return None, {"ok": False, "message": _("Uploaded file not found.")}

    file_content = frappe.get_doc("File", file_doc.get("name")).get_content()
    rows = _parse_csv_or_excel(file_doc.get("file_name"), file_content)
    if not rows:
        return rows, {
            "ok": True,
            "message": _("No rows found in uploaded file."),
            "data": {"async": False, **_empty_result()},
        }

    if not _sheet_has_email_column(rows):
        frappe.local.response["http_status_code"] = 400
        return None, {
            "ok": False,
            "message": _(
                "The sheet must include an Email column. Add a column with a heading such as Email, Student Email, or E-mail."
            ),
        }

    if _count_rows_with_email(rows) == 0:
        frappe.local.response["http_status_code"] = 400
        return None, {
            "ok": False,
            "message": _("The Email column is present but no row contains a valid email address."),
        }
    return rows, None


def bulk_upsert_students_impl():
    tpo_user_id, err = get_tpo_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    file_url = norm(payload.get("fileUrl"))
    if not file_url:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("File URL is required.")}

    rows, validation_err = _load_and_validate_rows(file_url)
    if validation_err:
        return validation_err
    assert rows is not None

    row_count = _count_rows_with_email(rows)
    options = {
        "default_batch": norm(payload.get("defaultBatch")),
        "default_department": norm(payload.get("defaultDepartment")),
        "default_year": norm(payload.get("defaultYear")),
        "create_invite_for_missing": bool(payload.get("createInviteForMissing", True)),
    }

    if row_count <= ASYNC_BULK_MIN_ROWS:
        result = _process_bulk_rows(tpo_user_id, rows, **options)
        return {
            "ok": True,
            "message": _("Student sheet processed successfully."),
            "data": {"async": False, **result},
        }

    upload_id = frappe.generate_hash(length=16)
    frappe.cache().set_value(
        _upload_cache_key(upload_id),
        {"status": "queued", "totalRows": row_count},
        expires_in_sec=BULK_UPLOAD_CACHE_TTL,
    )
    frappe.enqueue(
        run_bulk_upsert_students,
        queue="long",
        timeout=3600,
        upload_id=upload_id,
        tpo_user_id=tpo_user_id,
        file_url=file_url,
        options=options,
    )
    return {
        "ok": True,
        "message": _("Large upload queued. Poll status until processing completes."),
        "data": {
            "async": True,
            "uploadId": upload_id,
            "status": "queued",
            "totalRows": row_count,
        },
    }


@frappe.whitelist(methods=["GET"])
def get_bulk_upload_status():
    _user_id, err = get_tpo_session_user()
    if err:
        return err

    upload_id = norm(frappe.form_dict.get("uploadId"))
    if not upload_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Upload ID is required.")}

    state = frappe.cache().get_value(_upload_cache_key(upload_id)) or {"status": "unknown"}
    return {"ok": True, "data": state}
