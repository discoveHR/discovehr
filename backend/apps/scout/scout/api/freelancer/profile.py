import frappe
from frappe import _
from frappe.utils import cint, now_datetime

from scout.api.common import get_freelancer_session_user
from scout.api.freelancer.documents import serialize_documents as _serialize_documents

PROFILE_API_FIELD_MAP = [
    ("full_name", "fullName"),
    ("email", "email"),
    ("phone", "phone"),
    ("profile_photo", "profilePhoto"),
    ("date_of_birth", "dateOfBirth"),
    ("gender", "gender"),
    ("address", "address"),
    ("city", "city"),
    ("district", "district"),
    ("state", "state"),
    ("country", "country"),
    ("pin_code", "pinCode"),
    ("professional_summary", "professionalSummary"),
    ("skills", "skills"),
    ("years_of_experience", "yearsOfExperience"),
    ("primary_service", "primaryService"),
    ("hourly_rate", "hourlyRate"),
    ("availability", "availability"),
    ("linkedin_profile", "linkedinProfile"),
    ("github_profile", "githubProfile"),
    ("portfolio_website", "portfolioWebsite"),
    ("resume_file", "resumeFile"),
    ("id_proof_file", "idProofFile"),
    ("work_experience", "workExperience"),
    ("profile_consent", "profileConsent"),
    ("profile_submitted", "profileSubmitted"),
    ("submitted_at", "submittedAt"),
    ("approval_status", "approvalStatus"),
    ("rejection_reason", "rejectionReason"),
]

REQUIRED_TEXT_FIELDS = [
    "full_name",
    "phone",
    "gender",
    "date_of_birth",
    "address",
    "city",
    "state",
    "country",
    "pin_code",
    "professional_summary",
    "skills",
    "years_of_experience",
    "primary_service",
    "resume_file",
    "id_proof_file",
    "work_experience",
]


def _norm(value):
    return (value or "").strip()


def create_freelancer_profile_on_register(*, email: str, full_name: str, phone: str = "") -> None:
    if frappe.db.exists("Scout Freelancer Profile", email):
        frappe.db.set_value(
            "Scout Freelancer Profile",
            email,
            {"full_name": full_name, "email": email, "phone": phone or ""},
            update_modified=True,
        )
        return
    doc = frappe.get_doc(
        {
            "doctype": "Scout Freelancer Profile",
            "freelancer_user": email,
            "full_name": full_name,
            "email": email,
            "phone": phone or "",
            "country": "India",
            "approval_status": "Pending",
            "profile_submitted": 0,
        }
    )
    doc.insert(ignore_permissions=True)


def _has_experience_certificate(documents):
    for row in documents or []:
        if (row.get("document_type") or row.get("documentType")) == "Experience Certificate":
            if _norm(row.get("file")):
                return True
    return False


def profile_row_complete(row, documents=None):
    if not row:
        return False
    for fieldname in REQUIRED_TEXT_FIELDS:
        if fieldname == "profile_consent":
            if not cint((row or {}).get(fieldname)):
                return False
            continue
        if not _norm((row or {}).get(fieldname)):
            return False
    if not cint((row or {}).get("profile_consent")):
        return False
    if documents is None:
        parent = (row or {}).get("name") or (row or {}).get("freelancer_user")
        documents = (
            frappe.get_all(
                "Scout Freelancer Document",
                filters={"parent": parent},
                fields=["document_type", "file"],
            )
            if parent
            else []
        )
    return _has_experience_certificate(documents)


def _parse_payload(payload):
    data = {}
    for db_field, api_key in PROFILE_API_FIELD_MAP:
        if api_key in ("profileSubmitted", "approvalStatus", "submittedAt", "rejectionReason", "email"):
            continue
        if db_field == "profile_consent":
            data[db_field] = cint(payload.get(api_key))
        else:
            data[db_field] = _norm(payload.get(api_key))
    return data


def _serialize_profile(row, user_row, documents=None):
    base = {api: (row or {}).get(db) for db, api in PROFILE_API_FIELD_MAP}
    base["fullName"] = base.get("fullName") or (user_row or {}).get("full_name") or ""
    base["email"] = base.get("email") or (user_row or {}).get("email") or ""
    base["phone"] = base.get("phone") or (user_row or {}).get("mobile_no") or ""
    base["profileConsent"] = bool(cint((row or {}).get("profile_consent")))
    base["profileSubmitted"] = bool(cint((row or {}).get("profile_submitted")))
    base["approvalStatus"] = (row or {}).get("approval_status") or "Pending"
    base["documents"] = documents if documents is not None else []
    submitted = base["profileSubmitted"]
    approval = base["approvalStatus"]
    complete = profile_row_complete(row, documents=documents)
    approved = approval == "Approved"
    base["profileComplete"] = complete
    base["canApplyToJobs"] = submitted and complete and approved
    base["profileLocked"] = submitted and approval != "Rejected"
    return base


def serialize_freelancer_profile_doc(doc):
    """Full profile payload for admin review and company detail views."""
    user_row = (
        frappe.db.get_value("User", doc.freelancer_user, ["full_name", "email", "mobile_no"], as_dict=True) or {}
    )
    docs = _serialize_documents(doc)
    profile = _serialize_profile(doc.as_dict(), user_row, documents=docs)
    profile["profileId"] = doc.name
    profile["freelancerUser"] = doc.freelancer_user
    profile["registeredAt"] = doc.creation
    profile["approvedAt"] = doc.get("approved_at")
    profile["approvedBy"] = doc.get("approved_by") or ""
    return profile


def _load_profile_doc(user_id):
    if not frappe.db.exists("Scout Freelancer Profile", user_id):
        create_freelancer_profile_on_register(
            email=user_id,
            full_name=frappe.get_value("User", user_id, "full_name") or user_id,
            phone=frappe.get_value("User", user_id, "mobile_no") or "",
        )
        frappe.db.commit()
    return frappe.get_doc("Scout Freelancer Profile", user_id)


@frappe.whitelist(methods=["GET"])
def get_freelancer_profile():
    user_id, err = get_freelancer_session_user()
    if err:
        return err

    user_row = frappe.db.get_value("User", user_id, ["full_name", "email", "mobile_no"], as_dict=True) or {}
    doc = _load_profile_doc(user_id)
    docs = _serialize_documents(doc)
    profile = _serialize_profile(doc.as_dict(), user_row, documents=docs)
    return {"ok": True, "data": {"profile": profile}}


@frappe.whitelist(methods=["POST"])
def update_freelancer_profile():
    user_id, err = get_freelancer_session_user()
    if err:
        return err

    payload = frappe.request.get_json(silent=True) or {}
    finalize_profile = cint(payload.get("finalizeProfile", 0))
    parsed = _parse_payload(payload)
    full_name = parsed.get("full_name") or _norm(payload.get("fullName"))
    email = frappe.get_value("User", user_id, "email")
    parsed["email"] = email

    if not full_name:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("Full name is required.")}

    doc = _load_profile_doc(user_id)
    if cint(doc.profile_submitted) and (doc.approval_status or "Pending") != "Rejected":
        frappe.local.response["http_status_code"] = 403
        return {
            "ok": False,
            "message": _("Your profile is locked after submission. Contact support if you need changes."),
        }

    for field, value in parsed.items():
        if field == "email":
            continue
        if hasattr(doc, field):
            setattr(doc, field, value)
    doc.full_name = full_name
    doc.email = email

    incoming_docs = payload.get("documents")
    if isinstance(incoming_docs, list):
        doc.set("documents", [])
        for item in incoming_docs:
            if not isinstance(item, dict):
                continue
            file_url = _norm(item.get("file"))
            doc_type = _norm(item.get("documentType") or item.get("document_type"))
            if not file_url or not doc_type:
                continue
            doc.append(
                "documents",
                {
                    "document_type": doc_type,
                    "description": _norm(item.get("description")),
                    "file": file_url,
                },
            )

    merged = doc.as_dict()
    if finalize_profile and not profile_row_complete(merged, documents=doc.get("documents")):
        frappe.local.response["http_status_code"] = 400
        return {
            "ok": False,
            "message": _(
                "Complete all required fields, upload resume and ID proof, add at least one experience certificate, and accept the declaration before submitting."
            ),
        }

    if finalize_profile:
        doc.profile_submitted = 1
        doc.submitted_at = now_datetime()
        doc.approval_status = "Pending"

    doc.save(ignore_permissions=True)
    frappe.db.commit()

    docs = _serialize_documents(doc)
    profile = _serialize_profile(doc.as_dict(), frappe.get_value("User", user_id, ["full_name", "email", "mobile_no"], as_dict=True), documents=docs)
    message = _("Profile submitted for admin approval.") if finalize_profile else _("Profile saved.")
    return {"ok": True, "message": message, "data": {"profile": profile}}


@frappe.whitelist(methods=["GET"])
def freelancer_dashboard():
    user_id, err = get_freelancer_session_user()
    if err:
        return err

    user_row = frappe.db.get_value("User", user_id, ["full_name", "email"], as_dict=True) or {}
    doc = _load_profile_doc(user_id)
    docs = _serialize_documents(doc)
    profile = _serialize_profile(doc.as_dict(), user_row, documents=docs)
    return {
        "ok": True,
        "data": {
            "user": {
                "id": user_id,
                "full_name": user_row.get("full_name") or "",
                "email": user_row.get("email") or user_id,
            },
            "profile": profile,
        },
    }


def freelancer_apply_gate(user_id):
    """Return error dict if user cannot apply via freelancer profile, else None."""
    if not frappe.db.exists("Scout Freelancer Profile", user_id):
        return {
            "ok": False,
            "message": _("Complete and submit your freelancer interviewer profile before applying to jobs."),
        }
    row = frappe.db.get_value(
        "Scout Freelancer Profile",
        user_id,
        [
            "name",
            "profile_submitted",
            "approval_status",
            "full_name",
            "phone",
            "resume_file",
            "id_proof_file",
            "profile_consent",
            "professional_summary",
            "skills",
            "years_of_experience",
            "primary_service",
            "work_experience",
            "gender",
            "date_of_birth",
            "address",
            "city",
            "state",
            "country",
            "pin_code",
        ],
        as_dict=True,
    )
    if not row or not cint(row.get("profile_submitted")) or not profile_row_complete(row):
        return {
            "ok": False,
            "message": _("Complete and submit your profile before applying to jobs."),
        }
    if (row.get("approval_status") or "Pending") != "Approved":
        return {
            "ok": False,
            "message": _("Your profile is pending admin approval. You can apply once approved."),
        }
    return None
