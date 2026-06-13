import frappe
from frappe import _
from frappe.exceptions import OutgoingEmailError
from frappe.model.naming import make_autoname

from scout.api.common import get_company_session_user, row_to_job
from scout.api.pagination_utils import pagination_from_request, pagination_meta
from scout.api.student.pri import profile_pri_score_value, student_profile_pri_score_column_exists

DEFAULT_APPLICANTS_PAGE_SIZE = 50
MAX_APPLICANTS_PAGE_SIZE = 200
from scout.utils.email import scout_send_email


def _student_profile_fields():
    fields = [
        "student_user",
        "resume_file",
        "full_name",
        "email",
        "department_stream",
        "academic_year",
        "course_class_grade",
        "phone",
        "skills",
    ]
    if student_profile_pri_score_column_exists():
        fields.append("pri_score")
    return fields


def _psychometric_summary_for_students(student_ids: list[str]) -> dict[str, dict]:
    if not student_ids:
        return {}
    out: dict[str, dict] = {}
    chunk_size = 80
    for start in range(0, len(student_ids), chunk_size):
        chunk = student_ids[start : start + chunk_size]
        assignments = frappe.get_all(
            "Scout Psychometric Assignment",
            filters={"student_user": ["in", chunk], "status": "Completed"},
            fields=["name", "student_user", "psychometric_assessment"],
            order_by="modified desc",
            limit_page_length=len(chunk) * 3,
        )
        assignment_by_student: dict[str, str] = {}
        for row in assignments:
            uid = row.get("student_user")
            if uid and uid not in assignment_by_student:
                assignment_by_student[uid] = row.get("name")

        if not assignment_by_student:
            continue

        assignment_ids = list(assignment_by_student.values())
        results = frappe.get_all(
            "Scout Psychometric Result",
            filters={"assignment": ["in", assignment_ids]},
            fields=["assignment", "overall_score", "psychometric_assessment"],
            limit_page_length=len(assignment_ids),
        )
        result_by_assignment = {r.get("assignment"): r for r in results}

        assessment_ids = list({r.get("psychometric_assessment") for r in results if r.get("psychometric_assessment")})
        title_map: dict = {}
        if assessment_ids:
            assessments = frappe.get_all(
                "Scout Psychometric Assessment",
                filters={"name": ["in", assessment_ids]},
                fields=["name", "title"],
                limit_page_length=len(assessment_ids),
            )
            title_map = {a["name"]: a.get("title") or "" for a in assessments}

        for uid, assignment_id in assignment_by_student.items():
            if uid in out:
                continue
            result = result_by_assignment.get(assignment_id)
            if not result:
                continue
            out[uid] = {
                "overallScore": float(result.get("overall_score") or 0),
                "assessmentTitle": title_map.get(result.get("psychometric_assessment") or "", ""),
            }
    return out


@frappe.whitelist(methods=["GET"])
def list_jobs():
    user_id, err = get_company_session_user()
    if err:
        return err

    rows = frappe.get_all(
        "Scout Job",
        filters={"company_user": user_id},
        fields=[
            "name",
            "company_user",
            "title",
            "opportunity_type",
            "location_type",
            "openings",
            "skills",
            "min_experience",
            "status",
            "total_views",
            "applications",
            "description",
            "creation",
            "journey_stages",
        ],
        order_by="creation desc",
    )
    return {"ok": True, "data": {"jobs": [row_to_job(row) for row in rows]}}


def _parse_college_emails(payload):
    emails = payload.get("collegeEmails")
    if isinstance(emails, list):
        raw_tokens = [str(item or "").strip().lower() for item in emails]
    else:
        email_text = payload.get("collegeEmail") or payload.get("collegeEmails") or ""
        separators_normalized = str(email_text).replace(";", ",").replace("\n", ",")
        raw_tokens = [token.strip().lower() for token in separators_normalized.split(",")]
    deduped = []
    seen = set()
    for token in raw_tokens:
        if not token or token in seen:
            continue
        seen.add(token)
        deduped.append(token)
    return deduped


def _log_college_invite(company_user, job_id, college_email, note, status, error_message="", extra=None):
    from scout.api.tpo.inbound_jobs import _resolve_tpo_user_for_college_email

    payload = {
        "doctype": "Scout Company College Invite",
        "company_user": company_user,
        "job_id": job_id,
        "college_email": college_email,
        "status": status,
        "sent_at": frappe.utils.now_datetime(),
        "note": note or "",
        "error_message": error_message or "",
        "tpo_response": "Pending" if status == "Sent" else "Pending",
        "recruitment_stage": "Request Received",
    }
    if status == "Sent":
        tpo_user = _resolve_tpo_user_for_college_email(college_email)
        if tpo_user:
            payload["tpo_user"] = tpo_user
    if extra:
        payload.update(extra)
    doc = frappe.get_doc(payload)
    doc.insert(ignore_permissions=True)


@frappe.whitelist(methods=["POST"])
def invite_college_for_job():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    job_id = (payload.get("jobId") or "").strip()
    college_emails = _parse_college_emails(payload)
    note = (payload.get("note") or "").strip()
    application_deadline = (payload.get("applicationDeadline") or "").strip() or None
    eligibility_branch = (payload.get("eligibilityBranch") or "").strip()
    eligibility_batch = (payload.get("eligibilityBatch") or "").strip()
    eligibility_note = (payload.get("eligibilityNote") or "").strip()
    invite_extra = {
        "application_deadline": application_deadline,
        "eligibility_branch": eligibility_branch,
        "eligibility_batch": eligibility_batch,
        "eligibility_note": eligibility_note or note,
    }
    if not job_id or not college_emails:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Job ID and at least one college email are required.")}

    job = frappe.get_value(
        "Scout Job",
        {"name": job_id, "company_user": user_id},
        ["name", "title", "description", "skills", "location_type", "status", "openings", "company_user"],
        as_dict=True,
    )
    if not job:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Job not found or you do not have access to this job.")}

    company_name = frappe.get_cached_value("User", user_id, "full_name") or "Company"
    from scout.utils.env_config import get_frontend_base_url
    frontend_base_url = get_frontend_base_url()
    signup_link = f"{frontend_base_url}/signup"
    role_label = "Training & Placement Officer"

    subject = _("Placement Invitation: {0}").format(job.get("title") or "New Opportunity")
    message = (
        f"Hello,<br><br>"
        f"{company_name} invites your college to participate in a placement opportunity on Scout Express.<br><br>"
        f"<b>Job:</b> {job.get('title') or ''}<br>"
        f"<b>Location:</b> {job.get('location_type') or ''}<br>"
        f"<b>Skills:</b> {job.get('skills') or ''}<br>"
        f"<b>Openings:</b> {job.get('openings') or ''}<br>"
        f"<b>Status:</b> {job.get('status') or ''}<br><br>"
        f"{f'<b>Note from company:</b> {note}<br><br>' if note else ''}"
        f"To continue, sign up/login as <b>{role_label}</b>: "
        f"<a href='{signup_link}'>{signup_link}</a><br><br>"
        f"Regards,<br>{company_name}"
    )
    sent_count = 0
    failed_count = 0
    failures = []
    for college_email in college_emails:
        if "@" not in college_email:
            failed_count += 1
            failures.append({"email": college_email, "reason": _("Invalid email format.")})
            _log_college_invite(user_id, job_id, college_email, note, "Failed", _("Invalid email format."), invite_extra)
            continue
        try:
            scout_send_email([college_email], subject, message)
            _log_college_invite(user_id, job_id, college_email, note, "Sent", "", invite_extra)
            sent_count += 1
        except OutgoingEmailError:
            failed_count += 1
            reason = _("Could not send email. Configure Postmark (SCOUT_POSTMARK_SERVER_TOKEN) or Frappe outgoing email.")
            failures.append({"email": college_email, "reason": reason})
            _log_college_invite(user_id, job_id, college_email, note, "Failed", reason, invite_extra)
        except Exception:
            failed_count += 1
            frappe.log_error(frappe.get_traceback(), "College Invite Email Send Error")
            reason = _("Invite email failed due to a server issue.")
            failures.append({"email": college_email, "reason": reason})
            _log_college_invite(user_id, job_id, college_email, note, "Failed", reason, invite_extra)

    frappe.db.commit()
    if sent_count == 0:
        frappe.local.response["http_status_code"] = 500
        return {
            "ok": False,
            "message": _("Could not send invitations to any college email."),
            "data": {"sent": sent_count, "failed": failed_count, "failures": failures},
        }
    message = _("Invitation sent successfully to {0} college email(s).").format(sent_count)
    if failed_count:
        message += " " + _("Failed for {0}.").format(failed_count)
    return {
        "ok": True,
        "message": message,
        "data": {"sent": sent_count, "failed": failed_count, "failures": failures},
    }


@frappe.whitelist(methods=["GET"])
def list_college_invites():
    user_id, err = get_company_session_user()
    if err:
        return err

    job_id = (frappe.form_dict.get("jobId") or "").strip()
    filters = {"company_user": user_id}
    if job_id:
        filters["job_id"] = job_id

    rows = frappe.get_all(
        "Scout Company College Invite",
        filters=filters,
        fields=[
            "name",
            "job_id",
            "college_email",
            "status",
            "sent_at",
            "note",
            "error_message",
            "creation",
            "tpo_response",
            "decline_reason",
            "recruitment_stage",
            "application_deadline",
            "eligibility_branch",
            "eligibility_batch",
        ],
        order_by="creation desc",
        limit_page_length=500,
    )
    job_ids = list({row.get("job_id") for row in rows if row.get("job_id")})
    invite_job_title_map: dict = {}
    if job_ids:
        jobs = frappe.get_all(
            "Scout Job",
            filters={"name": ["in", job_ids]},
            fields=["name", "title"],
            limit_page_length=len(job_ids),
        )
        invite_job_title_map = {j["name"]: j.get("title") or "" for j in jobs}

    items = [
        {
            "id": row.get("name"),
            "jobId": row.get("job_id"),
            "jobTitle": invite_job_title_map.get(row.get("job_id") or "", ""),
            "collegeEmail": row.get("college_email") or "",
            "status": row.get("status") or "",
            "sentAt": row.get("sent_at") or row.get("creation") or "",
            "note": row.get("note") or "",
            "errorMessage": row.get("error_message") or "",
            "tpoResponse": row.get("tpo_response") or "",
            "declineReason": row.get("decline_reason") or "",
            "recruitmentStage": row.get("recruitment_stage") or "",
            "applicationDeadline": str(row.get("application_deadline") or ""),
            "eligibilityBranch": row.get("eligibility_branch") or "",
            "eligibilityBatch": row.get("eligibility_batch") or "",
        }
        for row in rows
    ]
    return {"ok": True, "data": {"invites": items}}


def _serialize_applicant_row(row, job_title_map, profile_map, psycho_map):
    uid = row.get("student_user")
    prof = profile_map.get(uid) or {}
    pri = float(prof.get("pri_score") or 0) if prof else profile_pri_score_value(uid)
    psycho = psycho_map.get(uid) or {}
    return {
        "applicationId": row.get("name"),
        "jobId": row.get("job_id"),
        "jobTitle": job_title_map.get(row.get("job_id"), ""),
        "studentId": uid,
        "studentName": prof.get("full_name") or frappe.get_cached_value("User", uid, "full_name"),
        "studentEmail": prof.get("email") or frappe.get_cached_value("User", uid, "email"),
        "status": row.get("application_status"),
        "appliedOn": frappe.utils.formatdate(row.get("creation"), "dd MMM yyyy"),
        "resumeFile": prof.get("resume_file") or "",
        "branch": prof.get("department_stream") or "",
        "batch": prof.get("academic_year") or "",
        "phone": prof.get("phone") or "",
        "skills": prof.get("skills") or "",
        "priScore": pri,
        "psychometricScore": psycho.get("overallScore"),
        "psychometricTitle": psycho.get("assessmentTitle") or "",
        "companyFeedback": row.get("company_feedback") or "",
    }


@frappe.whitelist(methods=["GET"])
def list_applicants():
    user_id, err = get_company_session_user()
    if err:
        return err

    job_id = (frappe.form_dict.get("jobId") or "").strip()
    job_filters = {"company_user": user_id}
    if job_id:
        job_filters["name"] = job_id

    company_jobs = frappe.get_all("Scout Job", filters=job_filters, fields=["name", "title"])
    if job_id and not company_jobs:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("You are not allowed to view applicants for this job.")}
    if not company_jobs:
        page, page_size, _ = pagination_from_request(
            default_page_size=DEFAULT_APPLICANTS_PAGE_SIZE,
            max_page_size=MAX_APPLICANTS_PAGE_SIZE,
        )
        return {
            "ok": True,
            "data": {
                "applicants": [],
                "pagination": pagination_meta(page, page_size, 0),
            },
        }

    job_title_map = {job.get("name"): job.get("title") for job in company_jobs}
    job_ids = list(job_title_map.keys())
    app_filters = {"job_id": ["in", job_ids]}
    page, page_size, offset = pagination_from_request(
        default_page_size=DEFAULT_APPLICANTS_PAGE_SIZE,
        max_page_size=MAX_APPLICANTS_PAGE_SIZE,
    )
    sort_mode = (frappe.form_dict.get("sort") or "score").strip().lower()
    total = int(frappe.db.count("Scout Application", filters=app_filters))

    app_fields = ["name", "job_id", "student_user", "application_status", "creation"]
    if frappe.db.has_column("Scout Application", "company_feedback"):
        app_fields.append("company_feedback")

    if sort_mode == "recent":
        rows = frappe.get_all(
            "Scout Application",
            filters=app_filters,
            fields=app_fields,
            order_by="creation desc",
            limit_start=offset,
            limit_page_length=page_size,
        )
    else:
        rows = _applicants_page_sorted_by_score(job_ids, app_fields, offset, page_size)

    student_ids = sorted({row.get("student_user") for row in rows if row.get("student_user")})
    profile_rows = (
        frappe.get_all(
            "Scout Student Profile",
            filters={"student_user": ["in", student_ids]},
            fields=_student_profile_fields(),
        )
        if student_ids
        else []
    )
    profile_map = {row.get("student_user"): row for row in profile_rows}
    psycho_map = _psychometric_summary_for_students(student_ids)

    applicants = [_serialize_applicant_row(row, job_title_map, profile_map, psycho_map) for row in rows]
    if sort_mode != "recent":
        applicants.sort(
            key=lambda item: (
                -(item.get("psychometricScore") or 0),
                -(item.get("priScore") or 0),
                (item.get("studentName") or "").lower(),
            )
        )
    rank_base = offset + 1
    for index, item in enumerate(applicants, start=rank_base):
        item["rank"] = index

    return {
        "ok": True,
        "data": {
            "applicants": applicants,
            "pagination": pagination_meta(page, page_size, total),
        },
    }


def _applicants_page_sorted_by_score(job_ids: list[str], app_fields: list[str], offset: int, page_size: int) -> list[dict]:
    """Paginate applications ordered by PRI (indexed); psychometric re-sorted in Python per page."""
    if not job_ids:
        return []
    placeholders = ", ".join(["%s"] * len(job_ids))
    pri_col = "IFNULL(p.pri_score, 0)" if student_profile_pri_score_column_exists() else "0"
    field_list = ", ".join(f"a.`{f}`" for f in app_fields)
    rows = frappe.db.sql(
        f"""
        SELECT {field_list}
        FROM `tabScout Application` a
        LEFT JOIN `tabScout Student Profile` p ON p.student_user = a.student_user
        WHERE a.job_id IN ({placeholders})
        ORDER BY {pri_col} DESC, a.creation DESC
        LIMIT %s OFFSET %s
        """,
        [*job_ids, page_size, offset],
        as_dict=True,
    )
    return rows


@frappe.whitelist(methods=["POST"])
def update_application_status():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    application_id = payload.get("applicationId")
    next_status = payload.get("status")
    schedule = payload.get("schedule") or {}
    if not application_id or not next_status:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Application ID and status are required.")}

    allowed_statuses = {"Submitted", "In Review", "Shortlisted", "Rejected", "Selected"}
    if next_status not in allowed_statuses:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invalid application status.")}

    app_doc = frappe.get_doc("Scout Application", application_id)
    job_owner = frappe.db.get_value("Scout Job", app_doc.job_id, "company_user")
    if job_owner != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("You are not allowed to update this application.")}

    app_doc.application_status = next_status
    feedback = (payload.get("feedback") or "").strip()
    if feedback and frappe.db.has_column("Scout Application", "company_feedback"):
        app_doc.company_feedback = feedback
    app_doc.save(ignore_permissions=True)

    email_sent = False
    email_warning = ""

    if next_status == "Shortlisted":
        gmeet_link = (schedule.get("gmeetLink") or "").strip()
        schedule_at = (schedule.get("scheduleAt") or "").strip()
        if gmeet_link and schedule_at:
            student_email = frappe.get_cached_value("User", app_doc.student_user, "email")
            student_name = frappe.get_cached_value("User", app_doc.student_user, "full_name") or "Student"
            company_name = frappe.get_cached_value("User", user_id, "full_name") or "Company"
            job_title = frappe.get_value("Scout Job", app_doc.job_id, "title") or "the position"
            subject = _("Interview Scheduled for {0}").format(job_title)
            message = (
                f"Dear {student_name},<br><br>"
                f"Congratulations! You have been shortlisted by {company_name} for <b>{job_title}</b>.<br><br>"
                f"<b>Interview Time:</b> {schedule_at}<br>"
                f"<b>Google Meet Link:</b> <a href='{gmeet_link}'>{gmeet_link}</a><br><br>"
                "Please join on time. All the best!<br><br>"
                f"Regards,<br>{company_name}"
            )
            if student_email:
                try:
                    scout_send_email([student_email], subject, message)
                    email_sent = True
                except OutgoingEmailError:
                    email_warning = _("Interview status updated, but email could not be sent. Configure Postmark or Frappe outgoing email.")
                except Exception:
                    frappe.log_error(frappe.get_traceback(), "Shortlist Email Send Error")
                    email_warning = _("Interview status updated, but email delivery failed due to a server issue.")

    frappe.db.commit()
    if next_status == "Shortlisted":
        if email_sent:
            return {"ok": True, "message": _("Application status updated and interview email sent.")}
        if email_warning:
            return {"ok": True, "message": email_warning}
        return {"ok": True, "message": _("Application status updated. Add schedule details to send interview email.")}
    return {"ok": True, "message": _("Application status updated successfully.")}


@frappe.whitelist(methods=["POST"])
def send_offer_letter():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    application_id = (payload.get("applicationId") or "").strip()
    offer_details = (payload.get("offerDetails") or "").strip()
    if not application_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Application ID is required.")}

    app_doc = frappe.get_doc("Scout Application", application_id)
    job_owner = frappe.db.get_value("Scout Job", app_doc.job_id, "company_user")
    if job_owner != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("You are not allowed to send an offer for this application.")}

    student_email = frappe.get_cached_value("User", app_doc.student_user, "email")
    student_name = frappe.get_cached_value("User", app_doc.student_user, "full_name") or "Candidate"
    company_name = frappe.get_cached_value("User", user_id, "full_name") or "Company"
    job_title = frappe.get_value("Scout Job", app_doc.job_id, "title") or "the position"

    macro_body = offer_details or (
        f"We are pleased to offer you the role of <b>{job_title}</b> at {company_name}. "
        "Our HR team will share joining formalities shortly."
    )

    app_doc.application_status = "Selected"
    if frappe.db.has_column("Scout Application", "company_feedback") and not (app_doc.company_feedback or "").strip():
        app_doc.company_feedback = macro_body
    app_doc.save(ignore_permissions=True)

    subject = _("Offer letter — {0} at {1}").format(job_title, company_name)
    message = (
        f"Dear {student_name},<br><br>"
        f"Congratulations! {company_name} is pleased to extend an offer for <b>{job_title}</b>.<br><br>"
        f"{macro_body}<br><br>"
        f"Regards,<br>{company_name}"
    )

    email_sent = False
    email_warning = ""
    if student_email:
        try:
            scout_send_email([student_email], subject, message)
            email_sent = True
        except OutgoingEmailError:
            email_warning = _("Offer saved; configure Mailgun or Frappe outgoing email to deliver the letter.")
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Offer Email Send Error")
            email_warning = _("Offer saved; email delivery failed.")

    frappe.db.commit()
    if email_sent:
        return {"ok": True, "message": _("Offer letter sent and application marked Selected.")}
    if email_warning:
        return {"ok": True, "message": email_warning}
    return {"ok": True, "message": _("Application marked Selected. Add student email to deliver offer.")}


@frappe.whitelist(methods=["POST"])
def create_job():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    title = (payload.get("title") or "").strip()
    skills = (payload.get("skills") or "").strip()
    openings = payload.get("openings")
    if not title or not skills or not openings:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Title, skills, and openings are required.")}

    try:
        openings = int(openings)
    except (TypeError, ValueError):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Openings must be a number.")}
    if openings <= 0:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Openings must be greater than zero.")}

    doc_payload = {
        "doctype": "Scout Job",
        "company_user": user_id,
        "title": title,
        "opportunity_type": payload.get("opportunityType") or "Job",
        "location_type": payload.get("locationType") or "In office",
        "work_type": payload.get("workType") or "Full-time",
        "openings": openings,
        "skills": skills,
        "min_experience": payload.get("minExperience") or "0 year",
        "description": payload.get("description") or "",
        "preferences": payload.get("preferences") or "",
        "min_salary": payload.get("minSalary") or "",
        "max_salary": payload.get("maxSalary") or "",
        "screening_question": payload.get("screeningQuestion") or "",
        "status": "Draft",
        "total_views": 0,
        "applications": 0,
    }
    from scout.api.recruitment_journey import dump_journey_stages

    journey_stages = payload.get("journeyStages")
    if isinstance(journey_stages, list) and journey_stages:
        doc_payload["journey_stages"] = dump_journey_stages(journey_stages)
    else:
        doc_payload["journey_stages"] = dump_journey_stages([])

    doc = None
    for _attempt in range(3):
        candidate_name = make_autoname("JOB-.#####")
        try:
            doc = frappe.get_doc(doc_payload)
            doc.insert(ignore_permissions=True, set_name=candidate_name)
            break
        except frappe.DuplicateEntryError:
            doc = None
            continue

    if not doc:
        frappe.local.response["http_status_code"] = 409
        return {"ok": False, "message": _("Unable to generate unique job ID. Please try again.")}

    frappe.db.commit()

    rows = frappe.get_all(
        "Scout Job",
        filters={"company_user": user_id},
        fields=[
            "name",
            "company_user",
            "title",
            "opportunity_type",
            "location_type",
            "openings",
            "skills",
            "min_experience",
            "status",
            "total_views",
            "applications",
            "description",
            "creation",
        ],
        order_by="creation desc",
    )
    jobs = [row_to_job(row) for row in rows]
    job = next((item for item in jobs if item["id"] == doc.name), None)
    return {"ok": True, "message": _("Job posted successfully."), "data": {"job": job, "jobs": jobs}}


@frappe.whitelist(methods=["POST"])
def update_job_status():
    user_id, err = get_company_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    job_id = payload.get("jobId")
    next_status = payload.get("status")
    if not job_id or not next_status:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Job ID and status are required.")}

    doc = frappe.get_doc("Scout Job", job_id)
    if doc.company_user != user_id:
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("You are not allowed to modify this job.")}

    doc.status = next_status
    doc.save(ignore_permissions=True)
    frappe.db.commit()
    return {"ok": True, "message": _("Job status updated successfully."), "data": {"job": row_to_job(doc.as_dict())}}


def ensure_demo_company_user():
    email = "company@scout.com"
    password = "Company@123"

    if not frappe.db.exists("Role", "Company"):
        frappe.get_doc({"doctype": "Role", "role_name": "Company"}).insert(ignore_permissions=True)

    if frappe.db.exists("User", email):
        user = frappe.get_doc("User", email)
    else:
        user = frappe.get_doc(
            {
                "doctype": "User",
                "email": email,
                "first_name": "Scout",
                "last_name": "Company",
                "enabled": 1,
                "send_welcome_email": 0,
                "user_type": "System User",
            }
        ).insert(ignore_permissions=True)

    existing_roles = {role.role for role in user.roles}
    if "Company" not in existing_roles:
        user.append("roles", {"role": "Company"})

    user.new_password = password
    user.enabled = 1
    user.save(ignore_permissions=True)
    frappe.db.commit()
    return {"email": email, "password": password}
