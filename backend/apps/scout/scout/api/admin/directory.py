from collections import Counter, defaultdict

import frappe
from frappe import _
from frappe.utils import cint

from scout.api.common import get_admin_session_user
from scout.api.pagination_utils import pagination_from_request, pagination_meta
from scout.scout.doctype.scout_college.scout_college import normalize_college_name


def _get_profile_helpers():
    from scout.api.student.profile import (  # noqa: PLC0415
        PROFILE_API_FIELD_MAP,
        _serialize_profile_values,
        profile_row_complete,
    )
    return PROFILE_API_FIELD_MAP, _serialize_profile_values, profile_row_complete

_STUDENT_LIST_FIELDS = [
    "name",
    "student_user",
    "full_name",
    "email",
    "phone",
    "college",
    "scout_college",
    "linked_tpo_user",
    "candidate_type",
    "department_stream",
    "academic_year",
    "course_class_grade",
    "state",
    "country",
    "profile_submitted",
    "pending_institutional_invite",
    "profile_edit_requested",
    "pri_score",
    "creation",
]


def _serialize_tpo(profile):
    return {
        "profileId": profile.name,
        "tpoUser": profile.tpo_user,
        "tpoName": profile.tpo_name or "",
        "email": frappe.get_value("User", profile.tpo_user, "email") or profile.tpo_user,
        "approvalStatus": profile.approval_status or "",
        "collegeSetupComplete": bool(profile.college_setup_complete),
        "registeredAt": profile.creation,
    }


def _derive_student_status(row: dict) -> str:
    if not row:
        return "In progress"
    if row.get("pending_institutional_invite") and not cint(row.get("profile_submitted")):
        return "Invite pending"
    _, _, profile_row_complete = _get_profile_helpers()
    if cint(row.get("profile_submitted")) and profile_row_complete(row):
        return "Complete"
    if cint(row.get("profile_submitted")):
        return "Submitted"
    return "In progress"


def _serialize_admin_student_row(row: dict) -> dict:
    return {
        "studentId": row.get("student_user") or row.get("name") or "",
        "fullName": row.get("full_name") or "",
        "email": row.get("email") or row.get("student_user") or "",
        "phone": row.get("phone") or "",
        "college": row.get("college") or "",
        "branch": row.get("department_stream") or "",
        "batch": row.get("academic_year") or "",
        "courseClassGrade": row.get("course_class_grade") or "",
        "state": row.get("state") or "",
        "country": row.get("country") or "",
        "candidateType": row.get("candidate_type") or "",
        "profileStatus": _derive_student_status(row),
        "profileSubmitted": bool(cint(row.get("profile_submitted"))),
        "linkedTpoUser": row.get("linked_tpo_user") or "",
        "registeredAt": row.get("creation"),
    }


def _college_entry(college_id="", college_name="", country="", state="", district="", primary_tpo_user=""):
    primary_name = ""
    primary_email = ""
    if primary_tpo_user:
        primary_name = frappe.get_value("User", primary_tpo_user, "full_name") or primary_tpo_user
        primary_email = frappe.get_value("User", primary_tpo_user, "email") or primary_tpo_user
    return {
        "collegeId": college_id,
        "collegeName": college_name,
        "country": country or "",
        "state": state or "",
        "district": district or "",
        "primaryTpoUser": primary_tpo_user or "",
        "primaryTpoName": primary_name,
        "primaryTpoEmail": primary_email,
        "tpos": [],
        "studentCount": 0,
        "studentStatusCounts": {},
    }


def _build_college_indexes(entries: dict):
    id_to_key = {}
    name_to_key = {}
    tpo_to_keys: dict[str, set] = defaultdict(set)

    for key, entry in entries.items():
        college_id = entry.get("collegeId") or ""
        if college_id:
            id_to_key[college_id] = key
        college_norm = normalize_college_name(entry.get("collegeName") or "")
        if college_norm:
            name_to_key[college_norm] = key
        for tpo in entry.get("tpos") or []:
            tpo_user = tpo.get("tpoUser") or ""
            if tpo_user:
                tpo_to_keys[tpo_user].add(key)

    return id_to_key, name_to_key, tpo_to_keys


def _match_college_keys(row: dict, id_to_key: dict, name_to_key: dict, tpo_to_keys: dict) -> set:
    keys: set = set()
    scout_college = row.get("scout_college") or ""
    if scout_college and scout_college in id_to_key:
        keys.add(id_to_key[scout_college])
    college_norm = normalize_college_name(row.get("college") or "")
    if college_norm and college_norm in name_to_key:
        keys.add(name_to_key[college_norm])
    linked_tpo = row.get("linked_tpo_user") or ""
    if linked_tpo and linked_tpo in tpo_to_keys:
        keys.update(tpo_to_keys[linked_tpo])
    return keys


def _attach_student_stats(entries: dict):
    """Aggregate student counts via SQL (no full-table scan)."""
    id_to_key, name_to_key, tpo_to_keys = _build_college_indexes(entries)
    seen_by_key: dict = defaultdict(set)
    status_by_key: dict = defaultdict(Counter)

    if frappe.db.has_column("Scout Student Profile", "scout_college"):
        for row in frappe.db.sql(
            """
            SELECT scout_college, student_user,
                   profile_submitted, pending_institutional_invite
            FROM `tabScout Student Profile`
            WHERE IFNULL(scout_college, '') != '' AND IFNULL(student_user, '') != ''
            """,
            as_dict=True,
        ):
            key = id_to_key.get(row.get("scout_college"))
            if not key:
                continue
            uid = row.get("student_user")
            if uid in seen_by_key[key]:
                continue
            seen_by_key[key].add(uid)
            status_by_key[key][_derive_student_status(row)] += 1

    if frappe.db.has_column("Scout Student Profile", "linked_tpo_user"):
        for row in frappe.db.sql(
            """
            SELECT linked_tpo_user, student_user,
                   profile_submitted, pending_institutional_invite
            FROM `tabScout Student Profile`
            WHERE IFNULL(linked_tpo_user, '') != '' AND IFNULL(student_user, '') != ''
            """,
            as_dict=True,
        ):
            uid = row.get("student_user")
            for key in tpo_to_keys.get(row.get("linked_tpo_user") or "", set()):
                if uid in seen_by_key[key]:
                    continue
                seen_by_key[key].add(uid)
                status_by_key[key][_derive_student_status(row)] += 1

    if not frappe.db.has_column("Scout Student Profile", "scout_college"):
        for key, entry in entries.items():
            entry["studentCount"] = len(seen_by_key[key])
            entry["studentStatusCounts"] = dict(status_by_key[key])
        return

    offset = 0
    batch_size = 5000
    while True:
        rows = frappe.db.sql(
            """
            SELECT student_user, college, scout_college, linked_tpo_user,
                   profile_submitted, pending_institutional_invite
            FROM `tabScout Student Profile`
            WHERE IFNULL(student_user, '') != ''
              AND IFNULL(scout_college, '') = ''
              AND IFNULL(linked_tpo_user, '') = ''
            LIMIT %s OFFSET %s
            """,
            (batch_size, offset),
            as_dict=True,
        )
        if not rows:
            break
        for row in rows:
            matched = _match_college_keys(row, id_to_key, name_to_key, tpo_to_keys)
            if not matched:
                continue
            student_id = row.get("student_user") or ""
            if not student_id:
                continue
            status = _derive_student_status(row)
            for key in matched:
                if student_id in seen_by_key[key]:
                    continue
                seen_by_key[key].add(student_id)
                status_by_key[key][status] += 1
        offset += batch_size
        if len(rows) < batch_size:
            break

    for key, entry in entries.items():
        entry["studentCount"] = len(seen_by_key[key])
        entry["studentStatusCounts"] = dict(status_by_key[key])


def _query_college_students(
    college_id: str,
    college_name: str,
    tpo_users: list[str],
    *,
    limit: int | None = None,
    offset: int = 0,
) -> list[dict]:
    clauses: list[str] = []
    params: list = []
    has_scout_college = frappe.db.has_column("Scout Student Profile", "scout_college")

    if college_id and has_scout_college:
        clauses.append("p.scout_college = %s")
        params.append(college_id)
    if college_name:
        clauses.append("LOWER(TRIM(IFNULL(p.college, ''))) = LOWER(TRIM(%s))")
        params.append(college_name.strip())
    if tpo_users:
        placeholders = ", ".join(["%s"] * len(tpo_users))
        clauses.append(f"p.linked_tpo_user IN ({placeholders})")
        params.extend(tpo_users)

    if not clauses:
        return []

    where_sql = " OR ".join(clauses)
    field_list = ", ".join(f"p.`{field}`" for field in _STUDENT_LIST_FIELDS)
    limit_sql = ""
    if limit is not None:
        limit_sql = " LIMIT %s OFFSET %s"
        params.extend([limit, offset])

    return frappe.db.sql(
        f"""
        SELECT DISTINCT {field_list}
        FROM `tabScout Student Profile` p
        WHERE ({where_sql})
          AND IFNULL(p.student_user, '') != ''
        ORDER BY p.full_name ASC, p.student_user ASC
        {limit_sql}
        """,
        tuple(params),
        as_dict=True,
    )


def _count_college_students(college_id: str, college_name: str, tpo_users: list[str]) -> int:
    clauses: list[str] = []
    params: list = []
    has_scout_college = frappe.db.has_column("Scout Student Profile", "scout_college")

    if college_id and has_scout_college:
        clauses.append("p.scout_college = %s")
        params.append(college_id)
    if college_name:
        clauses.append("LOWER(TRIM(IFNULL(p.college, ''))) = LOWER(TRIM(%s))")
        params.append(college_name.strip())
    if tpo_users:
        placeholders = ", ".join(["%s"] * len(tpo_users))
        clauses.append(f"p.linked_tpo_user IN ({placeholders})")
        params.extend(tpo_users)

    if not clauses:
        return 0

    where_sql = " OR ".join(clauses)
    return int(
        frappe.db.sql(
            f"""
            SELECT COUNT(DISTINCT p.student_user)
            FROM `tabScout Student Profile` p
            WHERE ({where_sql})
              AND IFNULL(p.student_user, '') != ''
            """,
            tuple(params),
        )[0][0]
    )


@frappe.whitelist(methods=["GET"])
def list_colleges_with_tpos():
    user_id, err = get_admin_session_user()
    if err:
        return err

    del user_id

    entries = {}

    if frappe.db.table_exists("tabScout College"):
        college_offset = 0
        while True:
            college_batch = frappe.get_all(
                "Scout College",
                fields=["name", "college_name", "country", "state", "district", "primary_tpo_user"],
                order_by="college_name asc",
                limit_start=college_offset,
                limit_page_length=500,
            )
            if not college_batch:
                break
            for row in college_batch:
                entries[("id", row.name)] = _college_entry(
                    college_id=row.name,
                    college_name=row.college_name,
                    country=row.country,
                    state=row.state,
                    district=row.district,
                    primary_tpo_user=row.primary_tpo_user,
                )
            college_offset += 500
            if len(college_batch) < 500:
                break

    profiles = []
    tpo_offset = 0
    while True:
        tpo_batch = frappe.get_all(
            "Scout TPO Profile",
            fields=[
                "name",
                "tpo_user",
                "tpo_name",
                "college_name",
                "scout_college",
                "country",
                "state",
                "district",
                "approval_status",
                "college_setup_complete",
                "creation",
            ],
            order_by="college_name asc, tpo_name asc",
            limit_start=tpo_offset,
            limit_page_length=500,
        )
        if not tpo_batch:
            break
        profiles.extend(tpo_batch)
        tpo_offset += 500
        if len(tpo_batch) < 500:
            break

    for profile in profiles:
        tpo = _serialize_tpo(profile)
        if profile.scout_college:
            key = ("id", profile.scout_college)
            if key not in entries:
                master_name = frappe.db.get_value("Scout College", profile.scout_college, "college_name")
                entries[key] = _college_entry(
                    college_id=profile.scout_college,
                    college_name=master_name or profile.college_name or profile.scout_college,
                    country=profile.country,
                    state=profile.state,
                    district=profile.district,
                )
            entries[key]["tpos"].append(tpo)
            continue

        label = (profile.college_name or "").strip() or "Unknown college"
        norm = normalize_college_name(label) or "unknown"
        key = ("name", norm)
        if key not in entries:
            entries[key] = _college_entry(
                college_name=label,
                country=profile.country,
                state=profile.state,
                district=profile.district,
            )
        entries[key]["tpos"].append(tpo)

    _attach_student_stats(entries)

    colleges = []
    total_students = 0
    for entry in entries.values():
        entry["tpoCount"] = len(entry["tpos"])
        total_students += entry.get("studentCount") or 0
        colleges.append(entry)

    colleges.sort(key=lambda row: (row.get("collegeName") or "").lower())

    page, page_size, offset = pagination_from_request(default_page_size=50, max_page_size=200)
    page_colleges = colleges[offset : offset + page_size]

    return {
        "ok": True,
        "data": {
            "totalColleges": len(colleges),
            "totalTpos": len(profiles),
            "totalStudents": total_students,
            "colleges": page_colleges,
            "pagination": pagination_meta(page, page_size, len(colleges)),
        },
    }


def _college_tpo_users(college_id: str, college_name: str) -> list[str]:
    tpo_users: list[str] = []
    if college_id and frappe.db.exists("Scout College", college_id):
        college_name = college_name or frappe.db.get_value("Scout College", college_id, "college_name") or ""
        primary_tpo = frappe.db.get_value("Scout College", college_id, "primary_tpo_user")
        if primary_tpo:
            tpo_users.append(primary_tpo)

    profile_filters = {}
    if college_id and frappe.db.has_column("Scout TPO Profile", "scout_college"):
        profile_filters["scout_college"] = college_id
    elif college_name:
        profile_filters["college_name"] = college_name

    if profile_filters:
        for row in frappe.get_all("Scout TPO Profile", filters=profile_filters, pluck="tpo_user", limit_page_length=500):
            if row and row not in tpo_users:
                tpo_users.append(row)
    return tpo_users


def college_student_user_ids(college_id: str = "", college_name: str = "") -> list[str]:
    """Distinct student_user ids for a college (used by psychometric bulk assign)."""
    college_id = (college_id or "").strip()
    college_name = (college_name or "").strip()
    if not college_id and not college_name:
        return []

    tpo_users = _college_tpo_users(college_id, college_name)
    if college_id and frappe.db.exists("Scout College", college_id):
        college_name = college_name or frappe.db.get_value("Scout College", college_id, "college_name") or ""

    rows = _query_college_students(college_id, college_name, tpo_users)
    seen: set[str] = set()
    user_ids: list[str] = []
    for row in rows:
        student_id = (row.get("student_user") or "").strip().lower()
        if student_id and student_id not in seen:
            seen.add(student_id)
            user_ids.append(student_id)
    return user_ids


@frappe.whitelist(methods=["GET"])
def list_college_students():
    user_id, err = get_admin_session_user()
    if err:
        return err

    del user_id

    college_id = (frappe.form_dict.get("collegeId") or "").strip()
    college_name = (frappe.form_dict.get("collegeName") or "").strip()
    if not college_id and not college_name:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("collegeId or collegeName is required.")}

    if college_id and frappe.db.exists("Scout College", college_id):
        college_name = college_name or frappe.db.get_value("Scout College", college_id, "college_name") or ""

    tpo_users = _college_tpo_users(college_id, college_name)
    page, page_size, offset = pagination_from_request(default_page_size=50, max_page_size=200)
    total = _count_college_students(college_id, college_name, tpo_users)
    rows = _query_college_students(
        college_id,
        college_name,
        tpo_users,
        limit=page_size + 50,
        offset=offset,
    )
    seen: set[str] = set()
    students = []
    status_counts: Counter = Counter()
    for row in rows:
        student_id = row.get("student_user") or ""
        if not student_id or student_id in seen:
            continue
        seen.add(student_id)
        item = _serialize_admin_student_row(row)
        students.append(item)
        status_counts[item["profileStatus"]] += 1
        if len(students) >= page_size:
            break

    return {
        "ok": True,
        "data": {
            "collegeId": college_id,
            "collegeName": college_name,
            "totalStudents": total,
            "studentStatusCounts": dict(status_counts),
            "students": students[:page_size],
            "pagination": pagination_meta(page, page_size, total),
        },
    }


@frappe.whitelist(methods=["GET"])
def get_admin_student_detail():
    user_id, err = get_admin_session_user()
    if err:
        return err

    del user_id

    student_id = (frappe.form_dict.get("studentId") or "").strip().lower()
    if not student_id:
        frappe.local.response["http_status_code"] = 400
        return {"ok": False, "message": _("studentId is required.")}

    PROFILE_API_FIELD_MAP, _serialize_profile_values, profile_row_complete = _get_profile_helpers()
    profile_fields = [db for db, _api in PROFILE_API_FIELD_MAP] + [
        "student_user",
        "profile_submitted",
        "profile_edit_requested",
        "profile_edit_approved",
        "pri_score",
        "scout_college",
        "pending_institutional_invite",
        "creation",
    ]
    profile_row = frappe.db.get_value("Scout Student Profile", student_id, profile_fields, as_dict=True)
    if not profile_row:
        profile_row = frappe.db.get_value(
            "Scout Student Profile",
            {"student_user": student_id},
            profile_fields,
            as_dict=True,
        )
    if not profile_row:
        frappe.local.response["http_status_code"] = 404
        return {"ok": False, "message": _("Student not found.")}

    student_id = profile_row.get("student_user") or student_id
    user_row = frappe.db.get_value("User", student_id, ["full_name", "email", "mobile_no", "enabled"], as_dict=True) or {}
    profile = _serialize_profile_values(profile_row, user_row)
    _, _, profile_row_complete = _get_profile_helpers()
    profile["profileStatus"] = _derive_student_status(profile_row)
    profile["profileComplete"] = profile_row_complete(profile_row)
    profile["registeredAt"] = profile_row.get("creation")
    if profile_row.get("scout_college"):
        profile["scoutCollegeId"] = profile_row.get("scout_college")
        profile["scoutCollegeName"] = frappe.db.get_value("Scout College", profile_row.get("scout_college"), "college_name") or ""

    application_count = frappe.db.count("Scout Application", {"student_user": student_id})

    return {
        "ok": True,
        "data": {
            "student": profile,
            "applicationCount": application_count,
        },
    }


def _job_counts_by_company():
    rows = frappe.db.sql(
        """
        SELECT company_user, COUNT(*) AS job_count
        FROM `tabScout Job`
        WHERE company_user IS NOT NULL AND company_user != ''
        GROUP BY company_user
        """,
        as_dict=True,
    )
    return {row.company_user: int(row.job_count or 0) for row in rows}


def _assessment_counts_by_company():
    rows = frappe.db.sql(
        """
        SELECT company_user, COUNT(*) AS assessment_count
        FROM `tabScout Assessment`
        WHERE company_user IS NOT NULL AND company_user != ''
        GROUP BY company_user
        """,
        as_dict=True,
    )
    return {row.company_user: int(row.assessment_count or 0) for row in rows}


def _application_counts_by_company():
    rows = frappe.db.sql(
        """
        SELECT j.company_user, COUNT(a.name) AS application_count
        FROM `tabScout Application` a
        INNER JOIN `tabScout Job` j ON j.name = a.job_id
        WHERE j.company_user IS NOT NULL AND j.company_user != ''
        GROUP BY j.company_user
        """,
        as_dict=True,
    )
    return {row.company_user: int(row.application_count or 0) for row in rows}


@frappe.whitelist(methods=["GET"])
def list_registered_companies():
    user_id, err = get_admin_session_user()
    if err:
        return err

    del user_id

    page, page_size, offset = pagination_from_request(default_page_size=50, max_page_size=200)
    total = int(
        frappe.db.sql(
            """
            SELECT COUNT(DISTINCT u.name)
            FROM `tabUser` u
            INNER JOIN `tabHas Role` hr ON hr.parent = u.name AND hr.role = 'Company'
            """
        )[0][0]
    )
    rows = frappe.db.sql(
        """
        SELECT DISTINCT
            u.name AS user_id,
            u.full_name,
            u.email,
            u.phone,
            u.bio,
            u.creation,
            u.enabled
        FROM `tabUser` u
        INNER JOIN `tabHas Role` hr ON hr.parent = u.name AND hr.role = 'Company'
        ORDER BY u.creation DESC
        LIMIT %s OFFSET %s
        """,
        (page_size, offset),
        as_dict=True,
    )

    job_counts = _job_counts_by_company()
    assessment_counts = _assessment_counts_by_company()
    application_counts = _application_counts_by_company()

    companies = []
    for row in rows:
        uid = row.user_id
        companies.append(
            {
                "userId": uid,
                "companyName": row.full_name or uid,
                "email": row.email or uid,
                "phone": row.phone or "",
                "bio": row.bio or "",
                "enabled": bool(row.enabled),
                "registeredAt": row.creation,
                "jobCount": job_counts.get(uid, 0),
                "assessmentCount": assessment_counts.get(uid, 0),
                "applicationCount": application_counts.get(uid, 0),
            }
        )

    return {
        "ok": True,
        "data": {
            "totalCompanies": total,
            "companies": companies,
            "pagination": pagination_meta(page, page_size, total),
        },
    }
