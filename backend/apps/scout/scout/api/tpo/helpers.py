import re

import frappe
from frappe.utils import cint

MAX_CSV_EXPORT_ROWS = 5000
MAX_DIRECTORY_TOTAL = 10000


def norm(value):
    return (value or "").strip()


def parse_batch_tokens(text):
    """Split comma/semicolon/pipe/newlines; expand 2026-2028 into individual years."""
    raw = norm(text)
    if not raw:
        return []
    tokens = set()
    for part in re.split(r"[,;/|\n]+", raw):
        part = part.strip()
        if not part:
            continue
        m = re.match(r"^(\d{4})\s*-\s*(\d{4})$", part)
        if m:
            a, b = int(m.group(1)), int(m.group(2))
            lo, hi = (a, b) if a <= b else (b, a)
            for y in range(lo, hi + 1):
                tokens.add(str(y))
            continue
        tokens.add(part)
    return list(tokens)


def _branch_filter_applies(branch):
    b = norm(branch).lower()
    return bool(b) and b not in ("all", "any", "*", "everyone")


def profile_matches_internal_audience(profile, posting):
    """profile: dict with department_stream, academic_year, course_class_grade; posting row dict."""
    is_internal = cint(posting.get("is_internal_job"))
    if not is_internal:
        branch = norm(posting.get("branch")).lower()
        batch = norm(posting.get("batch")).lower()
        row_branch = norm(profile.get("department_stream")).lower()
        row_batch = norm(profile.get("academic_year")).lower()
        if branch and branch not in row_branch:
            return False
        if batch and batch not in row_batch:
            return False
        return True

    audience = norm(posting.get("batch_audience")) or "Specific Batches"
    branch = norm(posting.get("branch"))

    if _branch_filter_applies(branch):
        row_branch = norm(profile.get("department_stream")).lower()
        if norm(branch).lower() not in row_branch:
            return False

    if audience == "All Students":
        return True

    target_src = norm(posting.get("target_batches")) or norm(posting.get("batch"))
    tokens = [t.lower() for t in parse_batch_tokens(target_src)]
    if not tokens:
        return False
    ay = norm(profile.get("academic_year")).lower()
    ccg = norm(profile.get("course_class_grade")).lower()
    haystack = f"{ay} {ccg}"
    return any(t in haystack for t in tokens)


def _serialize_applicant_row(row: dict) -> dict:
    uid = row.get("student_user")
    return {
        "studentId": uid,
        "studentName": row.get("full_name") or frappe.get_cached_value("User", uid, "full_name"),
        "studentEmail": row.get("email") or frappe.get_cached_value("User", uid, "email"),
        "branch": row.get("department_stream") or "",
        "batch": row.get("academic_year") or "",
        "courseClassGrade": row.get("course_class_grade") or "",
        "resumeFile": row.get("resume_file") or "",
    }


def _posting_profile_query_filters(posting: dict) -> tuple[dict, bool]:
    """Build frappe filters for profiles; return (filters, needs_python_audience_filter)."""
    filters: dict = {}
    tpo_user = norm(posting.get("created_by_tpo"))
    if tpo_user:
        filters["linked_tpo_user"] = tpo_user

    is_internal = cint(posting.get("is_internal_job"))
    branch = norm(posting.get("branch"))
    batch = norm(posting.get("batch"))

    if not is_internal:
        if _branch_filter_applies(branch):
            filters["department_stream"] = ["like", f"%{branch}%"]
        if batch:
            filters["academic_year"] = ["like", f"%{batch}%"]
        return filters, False

    if _branch_filter_applies(branch):
        filters["department_stream"] = ["like", f"%{branch}%"]

    audience = norm(posting.get("batch_audience")) or "Specific Batches"
    if audience == "All Students":
        return filters, False
    return filters, True


def collect_posting_applicants(posting, *, max_rows: int = 2000):
    filters, needs_python = _posting_profile_query_filters(posting)
    profile_rows = frappe.get_all(
        "Scout Student Profile",
        filters=filters or None,
        fields=[
            "student_user",
            "full_name",
            "email",
            "department_stream",
            "academic_year",
            "course_class_grade",
            "resume_file",
        ],
        limit_page_length=max_rows,
    )

    applicants = []
    for row in profile_rows:
        if needs_python and not profile_matches_internal_audience(row, posting):
            continue
        applicants.append(_serialize_applicant_row(row))
    return applicants


def _profile_match_sql_for_invite_exclusion(
    branch: str = "",
    batch: str = "",
    state: str = "",
    country: str = "",
    area_of_study: str = "",
) -> tuple[str, list]:
    """SQL on alias `p` matching invite email to an existing profile (with list filters)."""
    parts = [
        "("
        "LOWER(TRIM(IFNULL(p.email,''))) = LOWER(TRIM(IFNULL(i.email,''))) "
        "OR LOWER(TRIM(IFNULL(p.student_user,''))) = LOWER(TRIM(IFNULL(i.email,'')))"
        ")"
    ]
    params: list = []
    pf = student_profile_filters(branch, batch, state, country, area_of_study)
    if "department_stream" in pf:
        parts.append("LOWER(IFNULL(p.department_stream,'')) LIKE %s")
        params.append(pf["department_stream"][1].lower())
    if "academic_year" in pf:
        parts.append("LOWER(IFNULL(p.academic_year,'')) LIKE %s")
        params.append(pf["academic_year"][1].lower())
    if "state" in pf:
        parts.append("p.state = %s")
        params.append(pf["state"])
    if "country" in pf:
        parts.append("p.country = %s")
        params.append(pf["country"])
    if "area_of_study" in pf:
        parts.append("LOWER(IFNULL(p.area_of_study,'')) LIKE %s")
        params.append(pf["area_of_study"][1].lower())
    return " AND ".join(parts), params


def _invite_list_sql_filters(
    tpo_user_id: str,
    branch: str = "",
    batch: str = "",
) -> tuple[list[str], list]:
    clauses = ["i.created_by_tpo = %s"]
    params: list = [tpo_user_id]
    if branch:
        clauses.append("LOWER(IFNULL(i.branch,'')) LIKE %s")
        params.append(f"%{branch.lower()}%")
    if batch:
        clauses.append(
            "(LOWER(IFNULL(i.year,'')) LIKE %s OR LOWER(IFNULL(i.batch,'')) LIKE %s)"
        )
        params.extend([f"%{batch.lower()}%", f"%{batch.lower()}%"])
    return clauses, params


def count_invites_without_matching_profile(
    tpo_user_id: str,
    *,
    branch: str = "",
    batch: str = "",
    state: str = "",
    country: str = "",
    area_of_study: str = "",
) -> int:
    invite_clauses, invite_params = _invite_list_sql_filters(tpo_user_id, branch, batch)
    profile_match, profile_params = _profile_match_sql_for_invite_exclusion(
        branch, batch, state, country, area_of_study
    )
    sql = f"""
        SELECT COUNT(*)
        FROM `tabScout Student Invite` i
        WHERE {" AND ".join(invite_clauses)}
          AND NOT EXISTS (
            SELECT 1 FROM `tabScout Student Profile` p
            WHERE {profile_match}
          )
    """
    return int(frappe.db.sql(sql, tuple(invite_params + profile_params))[0][0] or 0)


def invite_rows_page_for_tpo(
    tpo_user_id: str,
    *,
    branch: str = "",
    batch: str = "",
    state: str = "",
    country: str = "",
    area_of_study: str = "",
    limit_start: int = 0,
    limit_page_length: int = 10,
) -> list[dict]:
    invite_clauses, invite_params = _invite_list_sql_filters(tpo_user_id, branch, batch)
    profile_match, profile_params = _profile_match_sql_for_invite_exclusion(
        branch, batch, state, country, area_of_study
    )
    sql = f"""
        SELECT i.name, i.email, i.branch, i.batch, i.year, i.status
        FROM `tabScout Student Invite` i
        WHERE {" AND ".join(invite_clauses)}
          AND NOT EXISTS (
            SELECT 1 FROM `tabScout Student Profile` p
            WHERE {profile_match}
          )
        ORDER BY i.modified DESC
        LIMIT %s OFFSET %s
    """
    params = invite_params + profile_params + [limit_page_length, limit_start]
    rows = frappe.db.sql(sql, tuple(params), as_dict=True)
    tpo_college = norm(frappe.db.get_value("Scout TPO Profile", {"tpo_user": tpo_user_id}, "college_name"))
    out: list[dict] = []
    for inv in rows:
        email = norm(inv.get("email")).lower()
        if not email:
            continue
        inv_batch = norm(inv.get("year")) or norm(inv.get("batch"))
        out.append(
            {
                "studentId": email,
                "fullName": email,
                "email": email,
                "phone": "",
                "college": tpo_college,
                "areaOfStudy": "",
                "batch": inv_batch,
                "branch": norm(inv.get("branch")),
                "state": "",
                "country": "",
                "courseClassGrade": norm(inv.get("batch")) or "",
                "resumeFile": "",
                "inviteStatus": inv.get("status") or "Pending",
                "isPendingInvite": True,
            }
        )
    return out


def serialize_posting(doc):
    return {
        "id": doc.get("name"),
        "title": doc.get("title") or "",
        "description": doc.get("description") or "",
        "branch": doc.get("branch") or "",
        "batch": doc.get("batch") or "",
        "eligibilityCriteria": doc.get("eligibility_criteria") or "",
        "posterFile": doc.get("poster_file") or "",
        "applicationLink": doc.get("application_link") or "",
        "companyEmail": doc.get("company_email") or "",
        "status": doc.get("status") or "Draft",
        "createdByTpo": doc.get("created_by_tpo") or "",
        "validTill": doc.get("valid_till") or "",
        "isInternalJob": bool(cint(doc.get("is_internal_job"))),
        "batchAudience": doc.get("batch_audience") or "Specific Batches",
        "targetBatches": doc.get("target_batches") or "",
        "postingType": doc.get("posting_type") or "",
        "audienceDescription": doc.get("audience_description") or "",
    }


def student_profile_filters(branch="", batch="", state="", country="", area_of_study=""):
    filters = {}
    if branch:
        filters["department_stream"] = ["like", f"%{branch}%"]
    if batch:
        filters["academic_year"] = ["like", f"%{batch}%"]
    if state:
        filters["state"] = state
    if country:
        filters["country"] = country
    if area_of_study:
        filters["area_of_study"] = ["like", f"%{area_of_study}%"]
    return filters


def count_student_profiles_by_filters(branch="", batch="", state="", country="", area_of_study=""):
    return frappe.db.count(
        "Scout Student Profile",
        filters=student_profile_filters(branch, batch, state, country, area_of_study),
    )


def student_rows_by_filters(
    branch="",
    batch="",
    state="",
    country="",
    area_of_study="",
    *,
    limit_start=0,
    limit_page_length=500,
):
    return frappe.get_all(
        "Scout Student Profile",
        filters=student_profile_filters(branch, batch, state, country, area_of_study),
        fields=[
            "student_user",
            "full_name",
            "email",
            "phone",
            "college",
            "area_of_study",
            "academic_year",
            "department_stream",
            "state",
            "country",
            "course_class_grade",
            "resume_file",
        ],
        order_by="modified desc",
        limit_start=limit_start,
        limit_page_length=limit_page_length,
    )
