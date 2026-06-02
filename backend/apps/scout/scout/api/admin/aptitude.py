import frappe
from frappe import _
from frappe.utils import get_datetime, now_datetime

from scout.api.admin.directory import college_student_user_ids
from scout.api.aptitude.results import row_to_assignment
from scout.api.common import get_admin_session_user
from scout.api.psychometric.tao_client import create_aptitude_test_in_tao


def _row_to_assessment(row: dict) -> dict:
    return {
        "id": row.get("name"),
        "title": row.get("title"),
        "description": row.get("description") or "",
        "durationMinutes": int(row.get("duration_minutes") or 0),
        "status": row.get("status") or "Draft",
        "taoTestId": row.get("tao_test_id") or "",
        "taoSyncStatus": row.get("tao_sync_status") or "",
        "taoSyncMessage": row.get("tao_sync_message") or "",
        "createdByTpo": bool(row.get("created_by_tpo")),
        "assignmentCount": frappe.db.count("Scout Aptitude Assignment", {"aptitude_assessment": row.get("name")}),
    }


@frappe.whitelist(methods=["GET"])
def list_aptitude_assessments():
    user_id, err = get_admin_session_user()
    if err:
        return err

    rows = frappe.get_all(
        "Scout Aptitude Assessment",
        fields=[
            "name",
            "title",
            "description",
            "duration_minutes",
            "status",
            "tao_test_id",
            "tao_sync_status",
            "tao_sync_message",
            "created_by_tpo",
        ],
        order_by="modified desc",
    )
    return {"ok": True, "data": {"assessments": [_row_to_assessment(row) for row in rows]}}


@frappe.whitelist(methods=["POST"])
def create_aptitude_assessment():
    user_id, err = get_admin_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    description = (payload.get("description") or "").strip()
    duration_minutes = payload.get("durationMinutes")
    status = (payload.get("status") or "Published").strip()
    manual_tao_id = (payload.get("taoTestId") or "").strip()

    if not title:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Title is required.")}
    try:
        duration_minutes = int(duration_minutes)
    except (TypeError, ValueError):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Duration must be a number.")}
    if duration_minutes <= 0:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Duration must be greater than zero.")}
    if status not in {"Draft", "Published", "Closed"}:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid status.")}

    doc = frappe.get_doc(
        {
            "doctype": "Scout Aptitude Assessment",
            "title": title,
            "description": description,
            "duration_minutes": duration_minutes,
            "status": status,
            "created_by_admin": user_id,
            "tao_sync_status": "Pending",
        }
    )
    doc.insert(ignore_permissions=True)

    if manual_tao_id:
        doc.tao_test_id = manual_tao_id
        doc.tao_sync_status = "Synced"
        doc.tao_sync_message = _("Linked to existing TAO test id.")
    else:
        tao_sync = create_aptitude_test_in_tao(doc)
        doc.tao_sync_status = tao_sync.get("status") or "Pending"
        doc.tao_sync_message = tao_sync.get("message") or ""
        if tao_sync.get("ok"):
            doc.tao_test_id = tao_sync.get("external_id") or ""
    doc.save(ignore_permissions=True)
    frappe.db.commit()

    return {
        "ok": True,
        "message": _("Aptitude assessment created."),
        "data": {"assessment": _row_to_assessment(doc.as_dict())},
    }


def _resolve_student_emails(payload: dict) -> list[str]:
    emails: set[str] = set()
    raw_emails = payload.get("studentEmails") or []
    if isinstance(raw_emails, list):
        for raw in raw_emails:
            email = (raw or "").strip().lower()
            if email:
                emails.add(email)

    raw_ids = payload.get("studentIds") or []
    if isinstance(raw_ids, list):
        for raw in raw_ids:
            student_id = (raw or "").strip().lower()
            if student_id:
                emails.add(student_id)

    college_id = (payload.get("collegeId") or "").strip()
    college_name = (payload.get("collegeName") or "").strip()
    assign_all_college = bool(payload.get("assignAllCollegeStudents"))
    if assign_all_college or college_id or college_name:
        for student_id in college_student_user_ids(college_id, college_name):
            emails.add(student_id)

    return sorted(emails)


def _assign_students_to_assessment(
    *,
    assigned_by: str,
    assessment_id: str,
    student_emails: list[str],
    parsed_due,
) -> tuple[list, list]:
    created = []
    skipped = []
    for raw_email in student_emails:
        email = (raw_email or "").strip().lower()
        if not email:
            continue
        if not frappe.db.exists("User", email):
            skipped.append({"email": email, "reason": "User not found"})
            continue
        roles = frappe.get_roles(email)
        if "Student" not in roles and "Job Seeker" not in roles:
            skipped.append({"email": email, "reason": "Not a student account"})
            continue
        existing = frappe.db.exists(
            "Scout Aptitude Assignment",
            {
                "aptitude_assessment": assessment_id,
                "student_user": email,
                "status": ["in", ["Assigned", "In Progress"]],
            },
        )
        if existing:
            skipped.append({"email": email, "reason": "Already assigned"})
            continue

        doc = frappe.get_doc(
            {
                "doctype": "Scout Aptitude Assignment",
                "aptitude_assessment": assessment_id,
                "student_user": email,
                "assigned_by": assigned_by,
                "status": "Assigned",
                "scheduled_from": now_datetime(),
                "due_at": parsed_due,
            }
        )
        doc.insert(ignore_permissions=True)
        created.append(row_to_assignment(doc.as_dict()))

    return created, skipped


@frappe.whitelist(methods=["POST"])
def assign_aptitude_to_students():
    user_id, err = get_admin_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    assessment_id = (payload.get("assessmentId") or "").strip()
    due_at = payload.get("dueAt")
    student_emails = _resolve_student_emails(payload)

    if not assessment_id or not frappe.db.exists("Scout Aptitude Assessment", assessment_id):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Valid assessment is required.")}
    if not student_emails:
        frappe.local.response["http_status_code"] = 400
        return {
            "ok": False,
            "message": _("Provide studentEmails, studentIds, or collegeId/collegeName with students."),
        }

    assessment = frappe.get_doc("Scout Aptitude Assessment", assessment_id)
    if assessment.status != "Published":
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Assessment must be Published before assigning students.")}

    parsed_due = None
    if due_at:
        try:
            parsed_due = get_datetime(due_at)
        except Exception:
            frappe.local.response["http_status_code"] = 400
            return {"ok": False, "message": _("Invalid due date.")}

    created, skipped = _assign_students_to_assessment(
        assigned_by=user_id,
        assessment_id=assessment_id,
        student_emails=student_emails,
        parsed_due=parsed_due,
    )
    frappe.db.commit()
    return {
        "ok": True,
        "message": _("Assigned {0} student(s).").format(len(created)),
        "data": {"created": created, "skipped": skipped},
    }


@frappe.whitelist(methods=["GET"])
def list_aptitude_assignments():
    user_id, err = get_admin_session_user()
    if err:
        return err

    assessment_id = (frappe.form_dict.get("assessmentId") or "").strip()
    filters = {}
    if assessment_id:
        filters["aptitude_assessment"] = assessment_id

    rows = frappe.get_all(
        "Scout Aptitude Assignment",
        filters=filters,
        fields=[
            "name",
            "aptitude_assessment",
            "student_user",
            "status",
            "due_at",
            "scheduled_from",
            "started_at",
            "completed_at",
            "launch_url",
        ],
        order_by="modified desc",
        limit=500,
    )
    return {"ok": True, "data": {"assignments": [row_to_assignment(row) for row in rows]}}
