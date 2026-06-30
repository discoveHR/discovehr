"""Company interview scheduler: calendar records + HR/interviewer/student notifications."""

import re
from datetime import datetime, timedelta
from urllib.parse import quote

import frappe
from frappe import _
from frappe.exceptions import OutgoingEmailError
from frappe.utils import get_datetime, now_datetime

from scout.api.common import get_company_session_user
from scout.api.company.credits import freelance_interview_coin_cost, spend_company_credits
from scout.api.company.freelancer_interviewers import get_approved_freelancer_profile
from scout.utils.email import scout_send_email


def norm(value):
    return (value or "").strip()


def _parse_email_list(raw: str) -> list[str]:
    tokens = re.split(r"[,;\s]+", norm(raw))
    seen = set()
    out = []
    for token in tokens:
        email = token.strip().lower()
        if not email or "@" not in email or email in seen:
            continue
        seen.add(email)
        out.append(email)
    return out


def _serialize_interview(row: dict) -> dict:
    student_name = frappe.get_cached_value("User", row.get("student_user"), "full_name") or ""
    student_email = frappe.get_cached_value("User", row.get("student_user"), "email") or ""
    job_title = frappe.get_value("Scout Job", row.get("job_id"), "title") or ""
    start = row.get("start_datetime")
    end = row.get("end_datetime")
    return {
        "id": row.get("name"),
        "applicationId": row.get("application_id"),
        "jobId": row.get("job_id"),
        "jobTitle": job_title,
        "studentId": row.get("student_user"),
        "studentName": student_name,
        "studentEmail": student_email,
        "title": row.get("title") or "",
        "interviewType": row.get("interview_type") or "Video",
        "startDatetime": str(start or ""),
        "endDatetime": str(end or ""),
        "meetingLink": row.get("meeting_link") or "",
        "location": row.get("location") or "",
        "interviewerName": row.get("interviewer_name") or "",
        "interviewerEmail": row.get("interviewer_email") or "",
        "freelancerInterviewerUser": row.get("freelancer_interviewer_user") or "",
        "freelancerInterviewerName": (
            (
                frappe.get_cached_value("User", row.get("freelancer_interviewer_user"), "full_name")
                if row.get("freelancer_interviewer_user")
                else ""
            )
            or row.get("interviewer_name")
            or ""
        ),
        "hrNotifyEmails": row.get("hr_notify_emails") or "",
        "notes": row.get("notes") or "",
        "status": row.get("status") or "Scheduled",
        "googleCalendarUrl": _google_calendar_url(row),
        "icsFilename": f"scout-interview-{row.get('name')}.ics",
    }


def _google_calendar_url(row: dict) -> str:
    start = get_datetime(row.get("start_datetime"))
    end = get_datetime(row.get("end_datetime")) if row.get("end_datetime") else start + timedelta(hours=1)
    if not start:
        return ""
    fmt = "%Y%m%dT%H%M%S"
    dates = f"{start.strftime(fmt)}/{end.strftime(fmt)}"
    details = []
    if row.get("meeting_link"):
        details.append(f"Meeting: {row.get('meeting_link')}")
    if row.get("notes"):
        details.append(row.get("notes"))
    params = {
        "action": "TEMPLATE",
        "text": row.get("title") or "Interview",
        "dates": dates,
        "details": "\n".join(details),
        "location": row.get("location") or row.get("meeting_link") or "",
    }
    query = "&".join(f"{k}={quote(str(v))}" for k, v in params.items() if v)
    return f"https://calendar.google.com/calendar/render?{query}"


def _build_ics(row: dict) -> str:
    start = get_datetime(row.get("start_datetime"))
    end = get_datetime(row.get("end_datetime")) if row.get("end_datetime") else start + timedelta(hours=1)
    uid = f"{row.get('name')}@scout-express"
    stamp = now_datetime().strftime("%Y%m%dT%H%M%SZ")
    start_s = start.strftime("%Y%m%dT%H%M%S")
    end_s = end.strftime("%Y%m%dT%H%M%S")
    desc_parts = []
    if row.get("meeting_link"):
        desc_parts.append(f"Meeting link: {row.get('meeting_link')}")
    if row.get("notes"):
        desc_parts.append(row.get("notes"))
    description = "\\n".join(desc_parts).replace(",", "\\,")
    location = (row.get("location") or row.get("meeting_link") or "").replace(",", "\\,")
    summary = (row.get("title") or "Interview").replace(",", "\\,")
    return "\r\n".join(
        [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//DiscoveHR//Interview Scheduler//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:REQUEST",
            "BEGIN:VEVENT",
            f"UID:{uid}",
            f"DTSTAMP:{stamp}",
            f"DTSTART:{start_s}",
            f"DTEND:{end_s}",
            f"SUMMARY:{summary}",
            f"DESCRIPTION:{description}",
            f"LOCATION:{location}",
            "END:VEVENT",
            "END:VCALENDAR",
        ]
    )


def _send_interview_notifications(doc, company_name: str, job_title: str):
    student_email = frappe.get_cached_value("User", doc.student_user, "email")
    student_name = frappe.get_cached_value("User", doc.student_user, "full_name") or "Candidate"
    start_label = frappe.utils.format_datetime(doc.start_datetime, "dd MMM yyyy, hh:mm a")
    end_label = frappe.utils.format_datetime(doc.end_datetime, "hh:mm a") if doc.end_datetime else ""
    time_range = f"{start_label} – {end_label}" if end_label else start_label

    meet_block = ""
    if doc.meeting_link:
        meet_block = f"<b>Meeting link:</b> <a href='{doc.meeting_link}'>{doc.meeting_link}</a><br>"
    loc_block = f"<b>Location:</b> {doc.location}<br>" if doc.location else ""
    notes_block = f"<b>Notes:</b> {doc.notes}<br>" if doc.notes else ""

    student_subject = _("Interview scheduled — {0} at {1}").format(job_title, company_name)
    student_body = (
        f"Dear {student_name},<br><br>"
        f"Your interview for <b>{job_title}</b> with {company_name} is scheduled.<br><br>"
        f"<b>When:</b> {time_range}<br>"
        f"<b>Type:</b> {doc.interview_type}<br>"
        f"{meet_block}{loc_block}{notes_block}<br>"
        f"Regards,<br>{company_name}"
    )

    internal_subject = _("Interview scheduled — {0} / {1}").format(job_title, student_name)
    freelancer_block = ""
    if getattr(doc, "freelancer_interviewer_user", None):
        fi_name = frappe.get_cached_value("User", doc.freelancer_interviewer_user, "full_name") or "Freelancer interviewer"
        freelancer_block = f"<b>Assigned freelancer interviewer:</b> {fi_name}<br>"

    internal_body = (
        f"<b>Interview:</b> {doc.title}<br>"
        f"<b>Candidate:</b> {student_name} ({student_email or 'no email'})<br>"
        f"<b>When:</b> {time_range}<br>"
        f"<b>Type:</b> {doc.interview_type}<br>"
        f"{freelancer_block}{meet_block}{loc_block}{notes_block}"
        f"<b>Scheduled by:</b> {company_name}<br>"
    )

    freelancer_subject = _("Interview assignment — {0} / {1}").format(job_title, student_name)
    freelancer_body = (
        f"You have been assigned to conduct an interview for <b>{company_name}</b>.<br><br>"
        f"<b>Candidate:</b> {student_name} ({student_email or 'no email'})<br>"
        f"<b>Role:</b> {job_title}<br>"
        f"<b>When:</b> {time_range}<br>"
        f"{meet_block}{loc_block}{notes_block}<br>"
        f"Sign in to your freelancer interviewer dashboard to view this assignment."
    )

    recipients = set()
    if student_email:
        recipients.add(student_email)
    if doc.interviewer_email:
        recipients.add(norm(doc.interviewer_email).lower())
    for email in _parse_email_list(doc.hr_notify_emails or ""):
        recipients.add(email)

    company_email = frappe.get_cached_value("User", doc.company_user, "email")
    if company_email:
        recipients.add(company_email.lower())

    warnings = []
    freelancer_email = ""
    if getattr(doc, "freelancer_interviewer_user", None):
        freelancer_email = (frappe.get_cached_value("User", doc.freelancer_interviewer_user, "email") or "").lower()
        if freelancer_email:
            recipients.add(freelancer_email)

    for email in sorted(recipients):
        is_student = email == (student_email or "").lower()
        is_freelancer = freelancer_email and email == freelancer_email
        try:
            scout_send_email(
                [email],
                student_subject
                if is_student
                else (freelancer_subject if is_freelancer else internal_subject),
                student_body if is_student else (freelancer_body if is_freelancer else internal_body),
            )
        except OutgoingEmailError:
            warnings.append(_("Email could not be sent to {0}. Configure Postmark or Frappe outgoing email.").format(email))
        except Exception:
            frappe.log_error(frappe.get_traceback(), f"Interview notify: {email}")

    return warnings


@frappe.whitelist(methods=["GET"])
def list_company_interviews():
    user_id, err = get_company_session_user()
    if err:
        return err

    job_id = norm(frappe.form_dict.get("jobId"))
    filters = {"company_user": user_id, "status": ["!=", "Cancelled"]}
    if job_id:
        filters["job_id"] = job_id

    rows = frappe.get_all(
        "Scout Company Interview",
        filters=filters,
        fields="*",
        order_by="start_datetime asc",
        limit_page_length=500,
    )
    return {"ok": True, "data": {"interviews": [_serialize_interview(r) for r in rows]}}


@frappe.whitelist(methods=["POST"])
def schedule_company_interview():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    application_id = norm(payload.get("applicationId"))
    start_dt = payload.get("startDatetime")
    end_dt = payload.get("endDatetime") or start_dt
    interview_type = norm(payload.get("interviewType")) or "Video"
    meeting_link = norm(payload.get("meetingLink"))
    location = norm(payload.get("location"))
    interviewer_name = norm(payload.get("interviewerName"))
    interviewer_email = norm(payload.get("interviewerEmail")).lower()
    freelancer_interviewer_user = norm(payload.get("freelancerInterviewerUser"))
    hr_emails = norm(payload.get("hrNotifyEmails"))
    notes = norm(payload.get("notes"))
    mark_shortlisted = payload.get("markShortlisted", True)

    if not application_id or not start_dt:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Application and start date/time are required.")}

    if interview_type == "Video" and not meeting_link:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Meeting link is required for video interviews.")}

    app_doc = frappe.get_doc("Scout Application", application_id)
    job_owner = frappe.db.get_value("Scout Job", app_doc.job_id, "company_user")
    if job_owner != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("You are not allowed to schedule for this application.")}

    if interview_type == "Freelancer" and not freelancer_interviewer_user:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Select an approved freelancer interviewer.")}

    if freelancer_interviewer_user:
        fi_doc = get_approved_freelancer_profile(freelancer_interviewer_user)
        if not fi_doc:
            frappe.local.response["http_status_code"] = 400
            return {"ok": False, "message": _("Approved freelancer interviewer not found.")}
        interviewer_name = fi_doc.full_name or interviewer_name
        interviewer_email = (
            norm(fi_doc.email)
            or norm(frappe.get_cached_value("User", freelancer_interviewer_user, "email"))
            or interviewer_email
        )

    if interview_type == "Freelancer":
        coin_cost = freelance_interview_coin_cost()
        if not spend_company_credits(
            user_id,
            coin_cost,
            note="Freelancer interview scheduled",
            reference_doctype="Scout Application",
            reference_name=application_id,
        ):
            frappe.local.response["http_status_code"] = 402
            return {
                "ok": False,
                "message": _("Insufficient coins for freelancer interviewer session ({0} coins required).").format(coin_cost),
            }

    student_name = frappe.get_cached_value("User", app_doc.student_user, "full_name") or "Candidate"
    job_title = frappe.get_value("Scout Job", app_doc.job_id, "title") or "Position"
    company_name = frappe.get_cached_value("User", user_id, "full_name") or "Company"
    title = norm(payload.get("title")) or f"{interview_type} interview — {student_name}"

    try:
        start_parsed = get_datetime(start_dt)
        end_parsed = get_datetime(end_dt) if end_dt else start_parsed + timedelta(hours=1)
    except Exception:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid date/time format. Use ISO 8601 (e.g. 2026-06-10T14:30:00).")}
    if end_parsed <= start_parsed:
        end_parsed = start_parsed + timedelta(hours=1)

    doc = frappe.get_doc(
        {
            "doctype": "Scout Company Interview",
            "company_user": user_id,
            "application_id": application_id,
            "job_id": app_doc.job_id,
            "student_user": app_doc.student_user,
            "title": title,
            "interview_type": interview_type,
            "start_datetime": start_parsed,
            "end_datetime": end_parsed,
            "meeting_link": meeting_link,
            "location": location,
            "interviewer_name": interviewer_name,
            "interviewer_email": interviewer_email,
            "freelancer_interviewer_user": freelancer_interviewer_user or "",
            "hr_notify_emails": hr_emails,
            "notes": notes,
            "status": "Scheduled",
        }
    )
    doc.insert(ignore_permissions=True)

    if mark_shortlisted and app_doc.application_status in {"Submitted", "In Review"}:
        app_doc.application_status = "Shortlisted"
        app_doc.save(ignore_permissions=True)

    warnings = _send_interview_notifications(doc, company_name, job_title)
    frappe.db.commit()

    message = _("Interview scheduled and notifications sent.")
    if warnings:
        message = _("Interview saved. ") + " ".join(warnings[:2])

    return {
        "ok": True,
        "message": message,
        "data": {"interview": _serialize_interview(doc.as_dict())},
    }


@frappe.whitelist(methods=["POST"])
def cancel_company_interview():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    interview_id = norm(payload.get("interviewId"))
    if not interview_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Interview ID is required.")}

    doc = frappe.get_doc("Scout Company Interview", interview_id)
    if doc.company_user != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Not allowed.")}

    doc.status = "Cancelled"
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Interview cancelled."), "data": {"interview": _serialize_interview(doc.as_dict())}}


@frappe.whitelist(methods=["GET"])
def get_interview_ics():
    user_id, err = get_company_session_user()
    if err:
        return err

    interview_id = norm(frappe.form_dict.get("interviewId"))
    if not interview_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Interview ID is required.")}

    row = frappe.db.get_value("Scout Company Interview", interview_id, "*", as_dict=True)
    if not row or row.get("company_user") != user_id:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Interview not found.")}

    return {
        "ok": True,
        "data": {
            "ics": _build_ics(row),
            "filename": f"scout-interview-{interview_id}.ics",
        },
    }


@frappe.whitelist(methods=["GET"])
def download_interview_ics():
    user_id, err = get_company_session_user()
    if err:
        return err

    interview_id = norm(frappe.form_dict.get("interviewId"))
    if not interview_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Interview ID is required.")}

    row = frappe.db.get_value("Scout Company Interview", interview_id, "*", as_dict=True)
    if not row or row.get("company_user") != user_id:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Interview not found.")}

    ics = _build_ics(row)
    frappe.local.response.filename = f"scout-interview-{interview_id}.ics"
    frappe.local.response.filecontent = ics
    frappe.local.response.type = "download"
    frappe.local.response.display_content_as = "attachment"
