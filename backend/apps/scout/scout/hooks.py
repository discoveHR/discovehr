app_name = "scout"
app_title = "Scout"
app_publisher = "Scout Team"
app_description = "Student and job platform backend"
app_email = "admin@scout.local"
app_license = "MIT"

from scout.utils.env_config import load_scout_env_files

load_scout_env_files()

on_startup = ["scout.api.admin.auth.ensure_admin_user"]

auth_hooks = ["scout.api.auth.authenticate_scout_bearer_token"]

before_request = [
    "scout.bootstrap.ensure_scout_ready",
    "scout.api.auth.apply_bearer_auth",
]

permission_query_conditions = {
    "Scout Job": "scout.scout.doctype.scout_job.scout_job.get_permission_query_conditions",
    "Scout Assessment": "scout.scout.doctype.scout_assessment.scout_assessment.get_permission_query_conditions",
    "Scout Application": "scout.scout.doctype.scout_application.scout_application.get_permission_query_conditions",
    "Scout Company College Invite": "scout.scout.doctype.scout_company_college_invite.scout_company_college_invite.get_permission_query_conditions",
    "Scout TPO Posting": "scout.scout.doctype.scout_tpo_posting.scout_tpo_posting.get_permission_query_conditions",
    "Scout TPO Profile": "scout.scout.doctype.scout_tpo_profile.scout_tpo_profile.get_permission_query_conditions",
    "Scout Company Interview": "scout.scout.doctype.scout_company_interview.scout_company_interview.get_permission_query_conditions",
}

has_permission = {
    "Scout Job": "scout.scout.doctype.scout_job.scout_job.has_permission",
    "Scout Assessment": "scout.scout.doctype.scout_assessment.scout_assessment.has_permission",
    "Scout Application": "scout.scout.doctype.scout_application.scout_application.has_permission",
    "Scout Company College Invite": "scout.scout.doctype.scout_company_college_invite.scout_company_college_invite.has_permission",
    "Scout TPO Posting": "scout.scout.doctype.scout_tpo_posting.scout_tpo_posting.has_permission",
    "Scout TPO Profile": "scout.scout.doctype.scout_tpo_profile.scout_tpo_profile.has_permission",
    "Scout Company Interview": "scout.scout.doctype.scout_company_interview.scout_company_interview.has_permission",
}

doc_events = {
    "Scout TPO Profile": {
        "after_insert": "scout.api.doc_events.on_tpo_profile_save",
        "on_update": "scout.api.doc_events.on_tpo_profile_save",
    },
    "Scout Student Profile": {
        "after_insert": "scout.api.doc_events.on_student_profile_save",
        "on_update": "scout.api.doc_events.on_student_profile_save",
    },
    "Scout Student Invite": {
        "after_insert": "scout.api.doc_events.on_student_invite_save",
        "on_update": "scout.api.doc_events.on_student_invite_save",
    },
    "Scout Application": {
        "after_insert": "scout.api.doc_events.on_application_save",
        "on_update": "scout.api.doc_events.on_application_save",
        "on_trash": "scout.api.doc_events.on_application_save",
    },
    "Scout Psychometric Assignment": {
        "after_insert": "scout.api.doc_events.on_psychometric_assignment_save",
        "on_update": "scout.api.doc_events.on_psychometric_assignment_save",
    },
    "Scout Job": {
        "after_insert": "scout.api.doc_events.on_scout_job_save",
        "on_update": "scout.api.doc_events.on_scout_job_save",
    },
}

scheduler_events = {
    "cron": {
        "*/15 * * * *": ["scout.api.rollup_stats.refresh_all_tpo_rollups"],
    },
}


def after_migrate():
    from scout.api.college_registry import backfill_scout_colleges
    from scout.bootstrap import sync_scout_doctypes_if_needed
    from scout.search_indexes import ensure_scout_db_indexes, ensure_scout_fulltext_indexes

    sync_scout_doctypes_if_needed(force=True)
    ensure_scout_db_indexes()
    ensure_scout_fulltext_indexes()
    try:
        backfill_scout_colleges()
    except Exception:
        import frappe

        frappe.log_error(title="Scout college backfill failed", message=frappe.get_traceback())


def after_install():
    from scout.api.college_registry import backfill_scout_colleges
    from scout.bootstrap import sync_scout_doctypes_if_needed
    from scout.search_indexes import ensure_scout_db_indexes, ensure_scout_fulltext_indexes

    sync_scout_doctypes_if_needed(force=True)
    ensure_scout_db_indexes()
    ensure_scout_fulltext_indexes()
    try:
        backfill_scout_colleges()
    except Exception:
        import frappe

        frappe.log_error(title="Scout college backfill failed", message=frappe.get_traceback())
