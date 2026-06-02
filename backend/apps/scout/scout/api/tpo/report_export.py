"""Background CSV export for large TPO reports."""

from __future__ import annotations

import csv
import io

import frappe
from frappe import _

from scout.api.common import get_tpo_session_user
from scout.api.tpo.helpers import norm
from scout.api.tpo.reports import get_tpo_report
from scout.api.tpo.student_scope import tpo_student_ids_count

ASYNC_EXPORT_MIN_STUDENTS = 800
EXPORT_CACHE_TTL = 3600


def _export_cache_key(export_id: str) -> str:
    return f"scout:tpo_report_export:{export_id}"


def _rows_to_csv(report_key: str, rows: list[dict]) -> tuple[str, str]:
    stream = io.StringIO()
    writer = csv.writer(stream)

    if report_key == "applications":
        writer.writerow(["Student", "Email", "Branch", "Batch", "Job", "Company", "Status", "Applied On"])
        for r in rows:
            writer.writerow(
                [
                    r.get("fullName"),
                    r.get("email"),
                    r.get("branch"),
                    r.get("batch"),
                    r.get("jobTitle"),
                    r.get("companyName"),
                    r.get("applicationStatus"),
                    r.get("appliedOn"),
                ]
            )
        return "applications_report.csv", stream.getvalue()

    if report_key == "training-attendance":
        writer.writerow(["Student", "Email", "Branch", "Batch", "Assessments", "Completed", "Attended All", "Titles", "Last Completed"])
        for r in rows:
            writer.writerow(
                [
                    r.get("fullName"),
                    r.get("email"),
                    r.get("branch"),
                    r.get("batch"),
                    r.get("assignmentsTotal"),
                    r.get("assignmentsCompleted"),
                    "Yes" if r.get("attendedAllTrainings") else "No",
                    r.get("assessmentTitles"),
                    r.get("lastCompletedAt"),
                ]
            )
        return "training_attendance_report.csv", stream.getvalue()

    if report_key == "test-scores":
        writer.writerow(["Student", "Email", "Assessment", "Overall Score", "Scores", "Completed At"])
        for r in rows:
            writer.writerow(
                [
                    r.get("fullName"),
                    r.get("email"),
                    r.get("assessmentTitle"),
                    r.get("overallScore"),
                    r.get("scoresSummary"),
                    r.get("completedAt"),
                ]
            )
        return "test_scores_report.csv", stream.getvalue()

    if report_key == "recruitment-status":
        writer.writerow(["Student", "Email", "Job", "Recruitment Status"])
        for r in rows:
            writer.writerow([r.get("fullName"), r.get("email"), r.get("jobTitle"), r.get("recruitmentStatus")])
        return "recruitment_status_report.csv", stream.getvalue()

    if report_key == "job-selections":
        writer.writerow(["Student", "Email", "Branch", "Batch", "Job", "Status", "Applied On"])
        for r in rows:
            writer.writerow(
                [
                    r.get("fullName"),
                    r.get("email"),
                    r.get("branch"),
                    r.get("batch"),
                    r.get("jobTitle"),
                    r.get("applicationStatus"),
                    r.get("appliedOn"),
                ]
            )
        return "job_selections_report.csv", stream.getvalue()

    if report_key == "eligibility-students":
        writer.writerow(["Student ID", "Name", "Email", "Phone", "College", "Area Of Study", "Batch", "Branch", "State", "Country"])
        for r in rows:
            writer.writerow(
                [
                    r.get("studentId"),
                    r.get("fullName"),
                    r.get("email"),
                    r.get("phone"),
                    r.get("college"),
                    r.get("areaOfStudy"),
                    r.get("batch"),
                    r.get("branch"),
                    r.get("state"),
                    r.get("country"),
                ]
            )
        return "eligible_students.csv", stream.getvalue()

    raise ValueError(_("Unknown report type."))


def run_tpo_report_export(export_id: str, tpo_user: str, report_key: str, form_snapshot: dict):
    frappe.set_user(tpo_user)
    frappe.form_dict.update(form_snapshot)
    try:
        all_rows: list[dict] = []
        page = 1
        page_size = 200
        max_pages = 250

        while page <= max_pages:
            frappe.form_dict["page"] = page
            frappe.form_dict["pageSize"] = page_size
            payload = get_tpo_report()
            if not isinstance(payload, dict) or not payload.get("ok"):
                msg = (payload or {}).get("message") if isinstance(payload, dict) else _("Export failed.")
                frappe.cache().set_value(
                    _export_cache_key(export_id),
                    {"status": "failed", "message": msg or _("Export failed.")},
                    expires_in_sec=EXPORT_CACHE_TTL,
                )
                return

            data = payload.get("data") or {}
            chunk = data.get("rows") or []
            all_rows.extend(chunk)
            total_pages = int(data.get("totalPages") or 1)
            if page >= total_pages or not chunk:
                break
            page += 1

        rows = all_rows
        filename, content = _rows_to_csv(report_key, rows)
        frappe.cache().set_value(
            _export_cache_key(export_id),
            {"status": "ready", "filename": filename, "content": content, "rowCount": len(rows)},
            expires_in_sec=EXPORT_CACHE_TTL,
        )
    except Exception:
        frappe.log_error(title="TPO report export failed", message=frappe.get_traceback())
        frappe.cache().set_value(
            _export_cache_key(export_id),
            {"status": "failed", "message": _("Export failed. Try again or narrow filters.")},
            expires_in_sec=EXPORT_CACHE_TTL,
        )


@frappe.whitelist(methods=["POST"])
def enqueue_tpo_report_export():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    report_key = norm(frappe.form_dict.get("reportKey")).lower()
    if not report_key:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Report type is required.")}

    export_id = frappe.generate_hash(length=16)
    form_snapshot = dict(frappe.form_dict)
    form_snapshot.pop("cmd", None)

    frappe.enqueue(
        run_tpo_report_export,
        queue="long",
        timeout=1800,
        export_id=export_id,
        tpo_user=user_id,
        report_key=report_key,
        form_snapshot=form_snapshot,
    )

    frappe.cache().set_value(
        _export_cache_key(export_id),
        {"status": "queued"},
        expires_in_sec=EXPORT_CACHE_TTL,
    )

    return {"ok": True, "data": {"exportId": export_id, "status": "queued"}}


@frappe.whitelist(methods=["GET"])
def get_tpo_report_export_status():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    export_id = norm(frappe.form_dict.get("exportId"))
    if not export_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Export ID is required.")}

    state = frappe.cache().get_value(_export_cache_key(export_id)) or {"status": "unknown"}
    if state.get("status") == "ready":
        return {
            "ok": True,
            "data": {
                "status": "ready",
                "filename": state.get("filename"),
                "rowCount": state.get("rowCount", 0),
                "downloadUrl": f"/api/method/scout.api.tpo.download_tpo_report_export?exportId={export_id}",
            },
        }
    return {"ok": True, "data": {"status": state.get("status"), "message": state.get("message")}}


@frappe.whitelist(methods=["GET"])
def download_tpo_report_export():
    user_id, err = get_tpo_session_user()
    if err:
        return err

    export_id = norm(frappe.form_dict.get("exportId"))
    state = frappe.cache().get_value(_export_cache_key(export_id)) or {}
    if state.get("status") != "ready":
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Export not ready.")}

    frappe.local.response.filename = state.get("filename") or "report.csv"
    frappe.local.response.filecontent = state.get("content") or ""
    frappe.local.response.type = "download"
    return None


def should_async_export(tpo_user_id: str) -> bool:
    return tpo_student_ids_count(tpo_user_id) >= ASYNC_EXPORT_MIN_STUDENTS
