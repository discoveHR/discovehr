"""TPO HTTP API (Frappe paths: ``scout.api.tpo.*``)."""

import frappe

from scout.api.tpo.college_setup import (
    complete_college_setup as _complete_college_setup,
    get_college_setup as _get_college_setup,
    save_college_setup as _save_college_setup,
)
from scout.api.tpo.aptitude import (
    assign_tpo_aptitude_to_students as _assign_tpo_aptitude_to_students,
    create_tpo_aptitude_payment_order as _create_tpo_aptitude_payment_order,
    list_tpo_aptitude_assessments as _list_tpo_aptitude_assessments,
    list_tpo_aptitude_assignments as _list_tpo_aptitude_assignments,
    verify_tpo_aptitude_payment as _verify_tpo_aptitude_payment,
)
from scout.api.tpo.calendars import (
    create_mock_exam as _create_mock_exam,
    create_placement_calendar_event as _create_placement_calendar_event,
    create_training_session as _create_training_session,
    list_mock_exams as _list_mock_exams,
    list_placement_calendar_events as _list_placement_calendar_events,
    list_training_sessions as _list_training_sessions,
    publish_mock_exam_results as _publish_mock_exam_results,
)
from scout.api.tpo.candidate_progress import (
    get_candidate_progress_kanban as _get_candidate_progress_kanban,
    list_kanban_jobs as _list_kanban_jobs,
)
from scout.api.tpo.engagement import (
    get_tpo_community_post as _get_tpo_community_post,
    invite_hr_partner as _invite_hr_partner,
    list_credit_packs_tpo as _list_credit_packs_tpo,
    list_hr_invites as _list_hr_invites,
    list_tpo_community_posts as _list_tpo_community_posts,
    purchase_student_credits_order as _purchase_student_credits_order,
    purchase_student_credits_verify as _purchase_student_credits_verify,
    upsert_tpo_community_post as _upsert_tpo_community_post,
)
from scout.api.tpo.challenges import (
    create_tpo_challenge as _create_tpo_challenge,
    list_tpo_challenges as _list_tpo_challenges,
    update_challenge_application_status as _update_challenge_application_status,
)
from scout.api.tpo.inbound_jobs import (
    get_inbound_job_detail as _get_inbound_job_detail,
    list_inbound_jobs as _list_inbound_jobs,
    respond_inbound_job as _respond_inbound_job,
    suggest_students_for_inbound_job as _suggest_students_for_inbound_job,
    update_inbound_recruitment_stage as _update_inbound_recruitment_stage,
)
from scout.api.tpo.invites import invite_student_minimal as _invite_student_minimal, list_student_invites as _list_student_invites
from scout.api.tpo.postings import (
    create_tpo_posting as _create_tpo_posting,
    download_tpo_applicants as _download_tpo_applicants,
    get_tpo_posting_applicants as _get_tpo_posting_applicants,
    list_tpo_postings as _list_tpo_postings,
    send_company_dashboard_link as _send_company_dashboard_link,
)
from scout.api.tpo.profile import (
    get_tpo_account_status as _get_tpo_account_status,
    get_tpo_dashboard_rollup as _get_tpo_dashboard_rollup,
    get_tpo_profile as _get_tpo_profile_impl,
    upsert_tpo_profile as _upsert_tpo_profile_impl,
)
from scout.api.tpo.report_export import (
    download_tpo_report_export as _download_tpo_report_export,
    enqueue_tpo_report_export as _enqueue_tpo_report_export,
    get_tpo_report_export_status as _get_tpo_report_export_status,
)
from scout.api.tpo.reports import (
    download_tpo_report as _download_tpo_report,
    get_tpo_report as _get_tpo_report,
    list_tpo_report_jobs as _list_tpo_report_jobs,
)
from scout.api.tpo.student_profile_edits import (
    approve_student_profile_edit as _approve_student_profile_edit,
    list_student_profile_edit_requests as _list_student_profile_edit_requests,
)
from scout.api.tpo.student_360 import get_student_360 as _get_student_360
from scout.api.tpo.bulk_upload import get_bulk_upload_status as _get_bulk_upload_status
from scout.api.tpo.students import (
    bulk_upsert_students as _bulk_upsert_students,
    count_students_directory as _count_students_directory,
    download_students_by_parameters as _download_students_by_parameters,
    list_students_by_parameters as _list_students_by_parameters,
)


@frappe.whitelist(allow_guest=True)
def get_tpo_dashboard_rollup():
    return _get_tpo_dashboard_rollup()


@frappe.whitelist(allow_guest=True)
def get_tpo_profile():
    return _get_tpo_profile_impl()


@frappe.whitelist(allow_guest=True)
def get_tpo_account_status():
    return _get_tpo_account_status()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def upsert_tpo_profile():
    return _upsert_tpo_profile_impl()


@frappe.whitelist(allow_guest=True)
def get_college_setup():
    return _get_college_setup()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def save_college_setup():
    return _save_college_setup()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def complete_college_setup():
    return _complete_college_setup()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def create_tpo_posting():
    return _create_tpo_posting()


@frappe.whitelist(allow_guest=True)
def list_tpo_postings():
    return _list_tpo_postings()


@frappe.whitelist(allow_guest=True)
def get_tpo_posting_applicants():
    return _get_tpo_posting_applicants()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def send_company_dashboard_link():
    return _send_company_dashboard_link()


@frappe.whitelist(allow_guest=True)
def download_tpo_applicants():
    return _download_tpo_applicants()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def invite_student_minimal():
    return _invite_student_minimal()


@frappe.whitelist()
def list_student_invites():
    return _list_student_invites()


@frappe.whitelist(allow_guest=True)
def count_students_directory():
    return _count_students_directory()


@frappe.whitelist(allow_guest=True)
def list_students_by_parameters():
    return _list_students_by_parameters()


@frappe.whitelist(allow_guest=True)
def get_student_360():
    return _get_student_360()


@frappe.whitelist(allow_guest=True)
def download_students_by_parameters():
    return _download_students_by_parameters()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def bulk_upsert_students():
    return _bulk_upsert_students()


@frappe.whitelist(allow_guest=True)
def get_bulk_upload_status():
    return _get_bulk_upload_status()


@frappe.whitelist(allow_guest=True)
def list_student_profile_edit_requests():
    return _list_student_profile_edit_requests()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def approve_student_profile_edit():
    return _approve_student_profile_edit()


@frappe.whitelist(allow_guest=True)
def get_tpo_report():
    return _get_tpo_report()


@frappe.whitelist(allow_guest=True)
def download_tpo_report():
    return _download_tpo_report()


@frappe.whitelist(allow_guest=True)
def list_tpo_report_jobs():
    return _list_tpo_report_jobs()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def enqueue_tpo_report_export():
    return _enqueue_tpo_report_export()


@frappe.whitelist(allow_guest=True)
def get_tpo_report_export_status():
    return _get_tpo_report_export_status()


@frappe.whitelist(allow_guest=True)
def download_tpo_report_export():
    return _download_tpo_report_export()


@frappe.whitelist(allow_guest=True)
def list_inbound_jobs():
    return _list_inbound_jobs()


@frappe.whitelist(allow_guest=True)
def get_inbound_job_detail():
    return _get_inbound_job_detail()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def respond_inbound_job():
    return _respond_inbound_job()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def suggest_students_for_inbound_job():
    return _suggest_students_for_inbound_job()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def update_inbound_recruitment_stage():
    return _update_inbound_recruitment_stage()


@frappe.whitelist(allow_guest=True)
def list_placement_calendar_events():
    return _list_placement_calendar_events()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def create_placement_calendar_event():
    return _create_placement_calendar_event()


@frappe.whitelist(allow_guest=True)
def list_training_sessions():
    return _list_training_sessions()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def create_training_session():
    return _create_training_session()


@frappe.whitelist(allow_guest=True)
def list_mock_exams():
    return _list_mock_exams()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def create_tpo_aptitude_payment_order():
    return _create_tpo_aptitude_payment_order()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def verify_tpo_aptitude_payment():
    return _verify_tpo_aptitude_payment()


@frappe.whitelist(allow_guest=True)
def list_tpo_aptitude_assessments():
    return _list_tpo_aptitude_assessments()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def assign_tpo_aptitude_to_students():
    return _assign_tpo_aptitude_to_students()


@frappe.whitelist(allow_guest=True)
def list_tpo_aptitude_assignments():
    return _list_tpo_aptitude_assignments()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def create_mock_exam():
    return _create_mock_exam()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def publish_mock_exam_results():
    return _publish_mock_exam_results()


@frappe.whitelist(allow_guest=True)
def list_tpo_challenges():
    return _list_tpo_challenges()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def create_tpo_challenge():
    return _create_tpo_challenge()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def update_challenge_application_status():
    return _update_challenge_application_status()


@frappe.whitelist(allow_guest=True)
def list_kanban_jobs():
    return _list_kanban_jobs()


@frappe.whitelist(allow_guest=True)
def get_candidate_progress_kanban():
    return _get_candidate_progress_kanban()


@frappe.whitelist(allow_guest=True)
def list_credit_packs_tpo():
    return _list_credit_packs_tpo()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def purchase_student_credits_order():
    return _purchase_student_credits_order()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def purchase_student_credits_verify():
    return _purchase_student_credits_verify()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def invite_hr_partner():
    return _invite_hr_partner()


@frappe.whitelist(allow_guest=True)
def list_hr_invites():
    return _list_hr_invites()


@frappe.whitelist(allow_guest=True)
def list_tpo_community_posts():
    return _list_tpo_community_posts()


@frappe.whitelist(allow_guest=True)
def get_tpo_community_post():
    return _get_tpo_community_post()


@frappe.whitelist(allow_guest=True, methods=["POST"])
def upsert_tpo_community_post():
    return _upsert_tpo_community_post()


__all__ = [
    "approve_student_profile_edit",
    "bulk_upsert_students",
    "complete_college_setup",
    "assign_tpo_aptitude_to_students",
    "create_mock_exam",
    "create_tpo_aptitude_payment_order",
    "create_placement_calendar_event",
    "create_training_session",
    "create_tpo_challenge",
    "create_tpo_posting",
    "download_students_by_parameters",
    "download_tpo_applicants",
    "download_tpo_report",
    "download_tpo_report_export",
    "enqueue_tpo_report_export",
    "get_college_setup",
    "get_candidate_progress_kanban",
    "get_tpo_community_post",
    "get_inbound_job_detail",
    "get_student_360",
    "get_tpo_report",
    "get_tpo_report_export_status",
    "get_tpo_account_status",
    "get_bulk_upload_status",
    "get_tpo_dashboard_rollup",
    "get_tpo_posting_applicants",
    "get_tpo_profile",
    "invite_hr_partner",
    "invite_student_minimal",
    "list_credit_packs_tpo",
    "list_hr_invites",
    "list_inbound_jobs",
    "list_tpo_community_posts",
    "list_kanban_jobs",
    "list_mock_exams",
    "list_tpo_aptitude_assessments",
    "list_tpo_aptitude_assignments",
    "list_placement_calendar_events",
    "list_tpo_challenges",
    "list_training_sessions",
    "list_student_invites",
    "list_student_profile_edit_requests",
    "list_students_by_parameters",
    "list_tpo_report_jobs",
    "list_tpo_postings",
    "publish_mock_exam_results",
    "purchase_student_credits_order",
    "purchase_student_credits_verify",
    "respond_inbound_job",
    "save_college_setup",
    "send_company_dashboard_link",
    "suggest_students_for_inbound_job",
    "update_challenge_application_status",
    "update_inbound_recruitment_stage",
    "upsert_tpo_community_post",
    "upsert_tpo_profile",
    "verify_tpo_aptitude_payment",
]
