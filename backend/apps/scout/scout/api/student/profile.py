import frappe
from frappe import _
from frappe.utils import cint, flt

from scout.api.common import get_student_session_user


def _norm(value):
    if value is None:
        return ""
    return str(value).strip()


# DB field -> API camelCase key (student information form)
PROFILE_API_FIELD_MAP = [
    ("full_name", "fullName"),
    ("email", "email"),
    ("phone", "phone"),
    ("profile_photo", "profilePhoto"),
    ("date_of_birth", "dateOfBirth"),
    ("gender", "gender"),
    ("parent_guardian_name", "parentGuardianName"),
    ("parent_contact_number", "parentContactNumber"),
    ("address", "address"),
    ("city", "city"),
    ("district", "district"),
    ("state", "state"),
    ("country", "country"),
    ("pin_code", "pinCode"),
    ("college", "college"),
    ("university_name", "universityName"),
    ("school", "school"),
    ("area_of_study", "areaOfStudy"),
    ("course_class_grade", "courseClassGrade"),
    ("department_stream", "departmentStream"),
    ("academic_year", "academicYear"),
    ("semester", "semester"),
    ("roll_number", "rollNumber"),
    ("admission_year", "admissionYear"),
    ("expected_graduation_year", "expectedGraduationYear"),
    ("current_cgpa", "currentCgpa"),
    ("skills", "skills"),
    ("certifications", "certifications"),
    ("areas_of_interest", "areasOfInterest"),
    ("internship_experience", "internshipExperience"),
    ("project_title", "projectTitle"),
    ("preferred_job_role", "preferredJobRole"),
    ("resume_file", "resumeFile"),
    ("student_id_card_number", "studentIdCardNumber"),
    ("aadhaar_number", "aadhaarNumber"),
    ("aadhaar_verified", "aadhaarVerified"),
    ("linkedin_profile", "linkedinProfile"),
    ("github_profile", "githubProfile"),
    ("portfolio_website", "portfolioWebsite"),
    ("profile_consent", "profileConsent"),
    ("candidate_type", "candidateType"),
    ("linked_tpo_user", "linkedTpoUser"),
    ("profile_submitted", "profileSubmitted"),
    ("profile_edit_requested", "profileEditRequested"),
    ("profile_edit_approved", "profileEditApproved"),
    ("pri_score", "priScore"),
]

PROFILE_REQUIRED_TEXT_FIELDS = [
    "full_name",
    "phone",
    "gender",
    "date_of_birth",
    "parent_guardian_name",
    "parent_contact_number",
    "address",
    "city",
    "district",
    "state",
    "country",
    "pin_code",
    "college",
    "university_name",
    "course_class_grade",
    "department_stream",
    "academic_year",
    "semester",
    "roll_number",
    "admission_year",
    "expected_graduation_year",
    "current_cgpa",
    "skills",
    "preferred_job_role",
    "resume_file",
    "student_id_card_number",
]


def _column_exists(fieldname):
    try:
        return bool(frappe.db.has_column("Scout Student Profile", fieldname))
    except Exception:
        return False


def _required_field_ok(row, fieldname):
    if not _column_exists(fieldname):
        return True
    if fieldname == "profile_consent":
        return bool(cint((row or {}).get(fieldname)))
    return bool(_norm((row or {}).get(fieldname)))


def _parse_profile_payload(payload):
    data = {}
    skip_api = {"profileSubmitted", "profileEditRequested", "profileEditApproved", "priScore", "candidateType", "linkedTpoUser"}
    for db_field, api_key in PROFILE_API_FIELD_MAP:
        if api_key in skip_api or db_field == "email":
            continue
        if db_field == "profile_consent":
            data[db_field] = cint(payload.get(api_key))
        else:
            data[db_field] = _norm(payload.get(api_key))
    return data


def _serialize_profile_values(profile_row, user_row):
    row = profile_row or {}
    base = {}
    for db_field, api_key in PROFILE_API_FIELD_MAP:
        if db_field == "profile_consent":
            base[api_key] = bool(cint(row.get(db_field))) if _column_exists(db_field) else False
        elif db_field == "pri_score":
            base[api_key] = flt(row.get(db_field) or 0)
        elif db_field == "full_name":
            base[api_key] = row.get(db_field) or user_row.get("full_name") or ""
        elif db_field == "email":
            base[api_key] = row.get(db_field) or user_row.get("email") or ""
        elif db_field == "phone":
            base[api_key] = row.get(db_field) or user_row.get("mobile_no") or ""
        elif db_field == "date_of_birth":
            val = row.get(db_field) or ""
            base[api_key] = str(val)[:10] if val else ""
        else:
            base[api_key] = row.get(db_field) or ""
    return base


def _student_profile_select_fields(fieldnames):
    """Omit fields not yet synced to MariaDB (run bench migrate after DocType changes)."""
    out = []
    for fieldname in fieldnames:
        try:
            if frappe.db.has_column("Scout Student Profile", fieldname):
                out.append(fieldname)
        except Exception:
            continue
    return out


def _invite_active_for_student(inv, user_id):
    if not inv:
        return False
    if (inv.get("email") or "").strip().lower() != (user_id or "").strip().lower():
        return False
    if inv.get("status") != "Pending":
        return False
    if not cint(inv.get("is_active")):
        return False
    exp = inv.get("expires_at")
    if exp and exp < frappe.utils.now_datetime():
        return False
    return True


def _collegiate_invite_name_for_student(user_id, profile_row):
    pinv = (profile_row or {}).get("pending_institutional_invite")
    if pinv and frappe.db.exists("Scout Student Invite", pinv):
        inv = frappe.db.get_value(
            "Scout Student Invite",
            pinv,
            ["name", "email", "status", "is_active", "expires_at"],
            as_dict=True,
        )
        if _invite_active_for_student(inv, user_id):
            return inv.get("name")
    rows = frappe.get_all(
        "Scout Student Invite",
        filters={"email": user_id, "status": "Pending", "is_active": 1},
        pluck="name",
        order_by="modified desc",
        limit_page_length=1,
        ignore_permissions=True,
    )
    if not rows:
        return None
    inv = frappe.db.get_value(
        "Scout Student Invite",
        rows[0],
        ["name", "email", "status", "is_active", "expires_at"],
        as_dict=True,
    )
    return inv.get("name") if _invite_active_for_student(inv, user_id) else None


def _serialize_collegiate_invite(inv_name, user_id):
    inv = frappe.db.get_value(
        "Scout Student Invite",
        inv_name,
        ["name", "email", "branch", "batch", "year", "created_by_tpo", "status", "is_active", "expires_at"],
        as_dict=True,
    )
    if not inv or not _invite_active_for_student(inv, user_id):
        return None
    tpo_id = inv.get("created_by_tpo")
    tp = (
        frappe.db.get_value("Scout TPO Profile", {"tpo_user": tpo_id}, ["tpo_name", "college_name"], as_dict=True)
        if tpo_id
        else None
    )
    return {
        "inviteId": inv.get("name"),
        "tpoName": (tp or {}).get("tpo_name") or "",
        "collegeName": (tp or {}).get("college_name") or "",
        "suggestedBranch": inv.get("branch") or "",
        "suggestedBatch": inv.get("batch") or "",
        "suggestedYear": inv.get("year") or "",
    }


def profile_row_complete(row):
    """All fields required before profile can be finalized / job apply."""
    if not row:
        return False
    country = _norm(row.get("country"))
    pin = _norm(row.get("pin_code"))
    if country == "India" and pin and (not pin.isdigit() or len(pin) != 6):
        return False
    if pin and country != "India" and len(pin) > 16:
        return False
    aadhaar = _norm(row.get("aadhaar_number"))
    if aadhaar and _column_exists("aadhaar_number") and (not aadhaar.isdigit() or len(aadhaar) != 12):
        return False
    for fieldname in PROFILE_REQUIRED_TEXT_FIELDS:
        if not _required_field_ok(row, fieldname):
            return False
    if not _required_field_ok(row, "profile_consent"):
        return False
    return True


def _serialize_profile_flags(row, user_id):
    submitted = bool(cint((row or {}).get("profile_submitted")))
    edit_req = bool(cint((row or {}).get("profile_edit_requested")))
    edit_ok = bool(cint((row or {}).get("profile_edit_approved")))
    complete = profile_row_complete(row or {})
    can_apply = submitted and complete
    from scout.api.student.pri import public_job_apply_eligibility_payload

    pub = public_job_apply_eligibility_payload(user_id, include_moodle=False)
    can_general = bool(can_apply and pub.get("canApplyToPublicJobboard"))
    return {
        "profileSubmitted": submitted,
        "profileEditRequested": edit_req,
        "profileEditApproved": edit_ok,
        "profileComplete": complete,
        "canApplyToJobs": can_apply,
        "priScore": flt((row or {}).get("pri_score")),
        "publicJobApply": pub,
        "canApplyToGeneralJobboard": can_general,
    }


@frappe.whitelist(methods=["GET"])
def get_student_profile():
    user_id, err = get_student_session_user()
    if err:
        return err

    user_row = frappe.db.get_value("User", user_id, ["full_name", "email", "mobile_no"], as_dict=True) or {}
    profile_fields = _student_profile_select_fields(
        ["student_user", "pending_institutional_invite"]
        + [db for db, _api in PROFILE_API_FIELD_MAP]
    )
    profile_row = (
        frappe.db.get_value("Scout Student Profile", user_id, profile_fields, as_dict=True) if profile_fields else None
    )
    base = _serialize_profile_values(profile_row, user_row)
    inv_name = _collegiate_invite_name_for_student(user_id, profile_row)
    base["collegiateInvite"] = _serialize_collegiate_invite(inv_name, user_id) if inv_name else None
    base.update(_serialize_profile_flags(profile_row, user_id))
    return {"ok": True, "data": {"profile": base}}


@frappe.whitelist(methods=["POST"])
def update_student_profile():
    user_id, err = get_student_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    finalize_profile = cint(payload.get("finalizeProfile", 0))

    parsed = _parse_profile_payload(payload)
    full_name = parsed.get("full_name") or _norm(payload.get("fullName"))
    email = frappe.get_value("User", user_id, "email")
    parsed["email"] = email

    if not full_name:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Full name is required.")}

    existing = frappe.db.get_value(
        "Scout Student Profile",
        user_id,
        ["name", "profile_submitted", "profile_edit_approved"],
        as_dict=True,
    )
    submitted = bool(cint((existing or {}).get("profile_submitted")))
    edit_ok = bool(cint((existing or {}).get("profile_edit_approved")))

    if existing and submitted and not edit_ok:
        frappe.local.response["http_status_code"] = 403
        return {
            "ok": False,
            "message": _("Your profile is locked after submission. Ask your TPO to approve an edit, or use Request profile edit."),
        }

    merged = {**parsed, "full_name": full_name, "email": email}

    if finalize_profile and not profile_row_complete(merged):
        frappe.local.response["http_status_code"] = 400
        return {
            "ok": False,
            "message": _(
                "Complete every section of the student information form (including declaration and resume) before you lock your profile."
            ),
        }

    prof_inv = frappe.db.get_value(
        "Scout Student Profile",
        user_id,
        ["pending_institutional_invite"],
        as_dict=True,
    )
    if finalize_profile and _collegiate_invite_name_for_student(user_id, prof_inv or {}):
        frappe.local.response["http_status_code"] = 400
        return {
            "ok": False,
            "message": _("Accept or decline your college placement invitation under Profile before locking your profile."),
        }

    had_unlock = bool(existing and submitted and edit_ok)

    writable = {k: v for k, v in merged.items() if k not in ("email",) and _column_exists(k)}

    if frappe.db.exists("Scout Student Profile", user_id):
        doc = frappe.get_doc("Scout Student Profile", user_id)
        for fieldname, value in writable.items():
            setattr(doc, fieldname, value)
        if finalize_profile:
            doc.profile_submitted = 1
        if had_unlock:
            doc.profile_edit_approved = 0
            doc.profile_edit_requested = 0
        doc.save(ignore_permissions=True)
    else:
        insert_data = {
            "doctype": "Scout Student Profile",
            "student_user": user_id,
            "full_name": full_name,
            "email": email,
            "profile_submitted": 1 if finalize_profile else 0,
            "profile_edit_requested": 0,
            "profile_edit_approved": 0,
            "candidate_type": "Independent",
            **writable,
        }
        doc = frappe.get_doc(insert_data)
        doc.insert(ignore_permissions=True)

    user_updates = {"full_name": full_name}
    phone_val = (merged.get("phone") or "").strip()
    if phone_val:
        user_updates["mobile_no"] = phone_val
    frappe.db.set_value("User", user_id, user_updates, update_modified=False)
    frappe.db.commit()
    msg = _("Profile updated successfully.")
    if finalize_profile:
        msg = _("Profile saved and locked. You can apply to jobs. Contact your TPO to unlock edits.")
    elif had_unlock:
        msg = _("Profile updated. Your profile is locked again until the TPO approves another edit.")
    return {"ok": True, "message": msg}


@frappe.whitelist(methods=["POST"])
def request_student_profile_edit():
    user_id, err = get_student_session_user()
    if err:
        return err

    row = frappe.db.get_value(
        "Scout Student Profile",
        user_id,
        ["profile_submitted", "profile_edit_requested", "profile_edit_approved"],
        as_dict=True,
    )
    if not row or not cint(row.get("profile_submitted")):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Submit and lock your profile first before requesting an edit.")}

    if cint(row.get("profile_edit_approved")):
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("You can already edit your profile.")}

    if cint(row.get("profile_edit_requested")):
        return {"ok": True, "message": _("Your TPO already has a pending edit request.")}

    frappe.db.set_value(
        "Scout Student Profile",
        user_id,
        {"profile_edit_requested": 1},
        update_modified=True,
    )
    frappe.db.commit()
    return {"ok": True, "message": _("Edit request sent to your TPO. You will be able to edit after approval.")}


@frappe.whitelist(methods=["POST"])
def accept_collegiate_enrollment():
    user_id, err = get_student_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    invite_id = _norm(payload.get("inviteId"))
    department_stream = _norm(payload.get("departmentStream"))
    course_class_grade = _norm(payload.get("courseClassGrade"))
    academic_year = _norm(payload.get("academicYear"))
    area_of_study = _norm(payload.get("areaOfStudy"))
    if not invite_id or not department_stream or not course_class_grade or not academic_year:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Invite, department/branch, batch (class), and academic year are required.")}

    inv = frappe.db.get_value(
        "Scout Student Invite",
        invite_id,
        ["name", "email", "status", "is_active", "expires_at", "created_by_tpo"],
        as_dict=True,
    )
    if not inv or not _invite_active_for_student(inv, user_id):
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("No active placement invite found for your account.")}

    tpo_id = inv.get("created_by_tpo")
    tp_row = (
        frappe.db.get_value("Scout TPO Profile", {"tpo_user": tpo_id}, ["college_name"], as_dict=True) if tpo_id else None
    )
    college_name = _norm((tp_row or {}).get("college_name"))

    user_fn = frappe.get_value("User", user_id, "full_name") or user_id
    user_em = frappe.get_value("User", user_id, "email") or user_id

    if frappe.db.exists("Scout Student Profile", user_id):
        doc = frappe.get_doc("Scout Student Profile", user_id)
        if cint(doc.profile_submitted) and not cint(doc.profile_edit_approved):
            frappe.local.response["http_status_code"] = 403
            return {
                "ok": False,
                "message": _("Your profile is locked. Ask your TPO to approve an edit before changing college placement."),
            }
    else:
        doc = frappe.get_doc(
            {
                "doctype": "Scout Student Profile",
                "student_user": user_id,
                "full_name": user_fn,
                "email": user_em,
                "candidate_type": "Independent",
            }
        )

    doc.department_stream = department_stream
    doc.course_class_grade = course_class_grade
    doc.academic_year = academic_year
    if area_of_study:
        doc.area_of_study = area_of_study
    if college_name:
        doc.college = college_name
    doc.linked_tpo_user = tpo_id
    doc.candidate_type = "Institutional"
    doc.pending_institutional_invite = None
    if doc.is_new():
        doc.insert(ignore_permissions=True)
    else:
        doc.save(ignore_permissions=True)

    frappe.db.set_value(
        "Scout Student Invite",
        invite_id,
        {"status": "Accepted", "accepted_at": frappe.utils.now_datetime(), "is_active": 0},
        update_modified=False,
    )
    frappe.db.commit()
    return {"ok": True, "message": _("College placement confirmed. Continue your profile with the rest of your details.")}


@frappe.whitelist(methods=["POST"])
def decline_collegiate_enrollment():
    user_id, err = get_student_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    invite_id = _norm(payload.get("inviteId"))

    prof_inv = frappe.db.get_value(
        "Scout Student Profile",
        user_id,
        ["pending_institutional_invite", "profile_submitted", "profile_edit_approved"],
        as_dict=True,
    )
    if prof_inv and cint(prof_inv.get("profile_submitted")) and not cint(prof_inv.get("profile_edit_approved")):
        frappe.local.response["http_status_code"] = 403
        return {"ok": False, "message": _("Your profile is locked. Ask your TPO to approve an edit first.")}

    inv_name = invite_id or _collegiate_invite_name_for_student(user_id, prof_inv or {})
    if not inv_name:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("No placement invite to decline.")}

    inv = frappe.db.get_value(
        "Scout Student Invite",
        inv_name,
        ["name", "email", "status", "is_active", "expires_at"],
        as_dict=True,
    )
    if not inv or not _invite_active_for_student(inv, user_id):
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("That placement invite is no longer active.")}

    frappe.db.set_value(
        "Scout Student Invite",
        inv_name,
        {"status": "Declined", "is_active": 0},
        update_modified=False,
    )
    if frappe.db.exists("Scout Student Profile", user_id):
        frappe.db.set_value(
            "Scout Student Profile",
            user_id,
            {
                "pending_institutional_invite": None,
                "linked_tpo_user": None,
                "candidate_type": "Independent",
            },
            update_modified=True,
        )
    frappe.db.commit()
    return {
        "ok": True,
        "message": _("You are registered as an independent candidate. Enter your own college and program details in your profile."),
    }
