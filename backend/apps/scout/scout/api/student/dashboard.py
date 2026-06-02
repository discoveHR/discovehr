import frappe



from scout.api.common import get_student_session_user, row_to_job

from scout.api.student.jobs import (

    HOME_JOBS_LIMIT,

    application_status_for_student,

    build_suggested_jobs,

    _enrich_jobs,

    _fetch_active_jobs,

    _student_application_map,

)

from scout.api.student.inbound_suggestions import inbound_suggested_job_ids_for_student

from scout.api.student.profile import (

    _collegiate_invite_name_for_student,

    _serialize_collegiate_invite,

    _serialize_profile_flags,

)

from scout.api.tpo.helpers import profile_matches_internal_audience, serialize_posting





def _internal_postings_for_student(user_id):

    profile = frappe.db.get_value(

        "Scout Student Profile",

        {"student_user": user_id},

        ["department_stream", "academic_year", "course_class_grade"],

        as_dict=True,

    )

    if not profile:

        return []



    rows = frappe.get_all(

        "Scout TPO Posting",

        filters={"status": "Active", "is_internal_job": 1},

        fields=[

            "name",

            "title",

            "description",

            "branch",

            "batch",

            "eligibility_criteria",

            "poster_file",

            "application_link",

            "company_email",

            "status",

            "created_by_tpo",

            "valid_till",

            "creation",

            "is_internal_job",

            "batch_audience",

            "target_batches",

        ],

        order_by="creation desc",

        limit_page_length=50,

    )

    out = []

    for row in rows:

        if profile_matches_internal_audience(profile, row):

            out.append(serialize_posting(row))

    return out





@frappe.whitelist(methods=["GET"])

def student_dashboard():

    user_id, err = get_student_session_user()

    if err:

        return err



    application_by_job = _student_application_map(user_id)

    inbound_ids = inbound_suggested_job_ids_for_student(user_id)

    listed_jobs = _enrich_jobs(

        _fetch_active_jobs(limit=HOME_JOBS_LIMIT),

        application_by_job,

        inbound_ids,

    )

    suggested_jobs = build_suggested_jobs(user_id, application_by_job)

    application_status, applications_truncated = application_status_for_student(user_id)



    profile_row = frappe.db.get_value(

        "Scout Student Profile",

        {"student_user": user_id},

        [

            "profile_submitted",

            "profile_edit_requested",

            "profile_edit_approved",

            "pri_score",

            "candidate_type",

            "pending_institutional_invite",

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

            "profile_consent",

        ],

        as_dict=True,

    )

    profile_flags = _serialize_profile_flags(profile_row, user_id)

    public_job_apply = profile_flags.pop("publicJobApply", None)

    inv_name = _collegiate_invite_name_for_student(user_id, profile_row)

    collegiate_invite = _serialize_collegiate_invite(inv_name, user_id) if inv_name else None

    candidate_type = (profile_row or {}).get("candidate_type") or "Independent"



    return {

        "ok": True,

        "data": {

            "student": {

                "id": user_id,

                "full_name": frappe.get_value("User", user_id, "full_name"),

                "email": frappe.get_value("User", user_id, "email"),

            },

            "listJobs": listed_jobs,

            "suggestedJobs": suggested_jobs,

            "applicationStatus": application_status,

            "applicationsTruncated": applications_truncated,

            "internalPostings": _internal_postings_for_student(user_id),

            "publicJobApply": public_job_apply,

            "profileFlags": profile_flags,

            "collegiateInvite": collegiate_invite,

            "candidateType": candidate_type,

            "jobsUsePagination": True,

        },

    }


