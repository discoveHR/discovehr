"""Student / job seeker HTTP API (Frappe paths: ``scout.api.student.*``)."""

from scout.api.student.applications import apply_to_job
from scout.api.student.calendars import (
    create_mock_exam_payment_order,
    list_student_mock_exams,
    list_student_placement_calendar,
    list_student_training_calendar,
    register_student_mock_exam,
    verify_mock_exam_payment,
)
from scout.api.student.challenges import apply_student_challenge, list_student_challenges
from scout.api.payments.credits import get_student_credit_wallet
from scout.api.student.dashboard import student_dashboard
from scout.api.student.jobs import list_student_jobs
from scout.api.student.profile import (
    accept_collegiate_enrollment,
    decline_collegiate_enrollment,
    get_student_profile,
    request_student_profile_edit,
    update_student_profile,
)
from scout.api.student.aptitude import (
    get_aptitude_result,
    launch_aptitude_assignment,
    list_aptitude_assignments,
    submit_aptitude_dev_result,
)
from scout.api.student.psychometric import (
    get_psychometric_result,
    launch_psychometric_assignment,
    list_psychometric_assignments,
    submit_psychometric_dev_result,
)
from scout.api.student.documents import (
    list_my_document_requests,
    submit_document_upload,
)
from scout.api.kyc import (
    generate_aadhaar_otp,
    verify_aadhaar_otp,
)

__all__ = [
    "generate_aadhaar_otp",
    "verify_aadhaar_otp",
    "accept_collegiate_enrollment",
    "apply_student_challenge",
    "apply_to_job",
    "list_my_document_requests",
    "submit_document_upload",
    "create_mock_exam_payment_order",
    "decline_collegiate_enrollment",
    "get_aptitude_result",
    "get_psychometric_result",
    "get_student_credit_wallet",
    "get_student_profile",
    "launch_aptitude_assignment",
    "launch_psychometric_assignment",
    "list_aptitude_assignments",
    "list_psychometric_assignments",
    "list_student_challenges",
    "list_student_jobs",
    "list_student_mock_exams",
    "list_student_placement_calendar",
    "list_student_training_calendar",
    "register_student_mock_exam",
    "request_student_profile_edit",
    "student_dashboard",
    "submit_aptitude_dev_result",
    "submit_psychometric_dev_result",
    "update_student_profile",
    "verify_mock_exam_payment",
]
