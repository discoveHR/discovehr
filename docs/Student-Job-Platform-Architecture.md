# Student + Job Posting Platform Architecture

## 1) Overview

This document defines the end-to-end architecture for a multi-role student and opportunity platform built with:

- Backend: `Frappe`
- Frontend: `Next.js`
- Database: `MariaDB`
- LMS Integration: `Moodle` (Student role)

The platform supports six login types:

1. Campus
2. Student
3. Training and Placement Officer (TPO)
4. Internal Team
5. Freelancer
6. Admin

Each role has separate functionality and access boundaries.

---

## 2) Product Goals

- Manage student lifecycle from onboarding to placement outcomes.
- Centralize internship/job/freelance opportunity workflows.
- Provide role-based dashboards and strict access control.
- Integrate Moodle LMS for student learning progress and eligibility.
- Offer auditability, scalability, and operational controls for internal teams and admins.

---

## 3) Role-Wise Functional Scope

### Campus
- Manage campus profile, departments, and batches.
- Approve/verify student registrations from the campus.
- View campus-level placement and performance reports.

### Student
- Maintain profile, resume, skills, and certifications.
- Access Moodle LMS through SSO.
- View LMS progress and completion data.
- Apply for opportunities and track application status.

### Training and Placement Officer (TPO)
- Validate student readiness.
- Publish opportunities for campus/cohorts.
- Manage application pipeline for assigned opportunities.
- Monitor placement statistics.

### Internal Team
- Moderate opportunities and onboarding queues.
- Handle support and operational workflows.
- Manage quality checks and process compliance.

### Freelancer
- Post freelance or short-term opportunities.
- Review applicants and update selection stages.

### Admin
- Global governance and RBAC.
- Integration configuration.
- System analytics, audit, and platform administration.

---

## 4) High-Level Architecture

### Frontend (`Next.js`)
- App Router-based role dashboards.
- Protected route groups by active role context.
- Shared API client layer for Frappe methods.
- Server-side data fetching where suitable; client-side interactivity for dynamic modules.

### Backend (`Frappe`)
- Custom DocTypes for domain entities.
- Role and permission model via Frappe RBAC + user permissions.
- Whitelisted methods for business workflows.
- Worker queues for asynchronous tasks (sync, notification, reporting).

### Integrations
- Moodle SSO and progress synchronization.
- Optional notification providers (Email, SMS, WhatsApp).

### Infrastructure
- `MariaDB` for primary transactional data.
- `Redis` for queue/caching.
- Object storage for file attachments (resume/docs).
- Nginx reverse proxy.
- Environments: Dev, UAT, Production.

---

## 5) Module Breakdown

1. Identity and Access Management
2. Student Lifecycle Management
3. Opportunity Management (Job/Internship/Freelance)
4. Application Pipeline and Stage Tracking
5. Campus and TPO Operations
6. Internal Operations and Approvals
7. Moodle LMS Integration
8. Notifications and Communication
9. Reporting and Analytics
10. Audit and Compliance

---

## 6) MariaDB-Focused Architecture Decisions

- Use MariaDB as primary OLTP database for all modules.
- Keep normalized LMS progress tables for reporting.
- Store raw integration payloads in sync logs for debugging and traceability.
- Use explicit indexes for high-traffic filters and dashboards.
- Maintain append-only audit records for compliance.
- Prefer external IDs/UUID mappings for Moodle and third-party integrations.

---

## 7) Logical Data Model (Core Entities)

- Campus
- Department
- User Role Map
- Student Profile
- TPO Profile
- Freelancer Profile
- Skill Master
- Student Skill
- Student Certification
- Opportunity
- Opportunity Eligibility
- Application
- Application Stage History
- Approval Request
- Support Ticket
- Notification Event
- Audit Event
- LMS User Map
- LMS Course Map
- Student LMS Progress
- LMS Sync Log

---

## 8) Detailed MariaDB Schema Draft

> Note: In Frappe, DocTypes map to tables like `tab<DocType Name>`. The structure below is the business schema draft.

### 8.1 `user_role_map`
- `id` (PK)
- `user_id` (FK -> User)
- `role_type` ENUM (`campus`, `student`, `tpo`, `internal_team`, `freelancer`, `admin`)
- `is_active`
- `created_at`

### 8.2 `campus`
- `id` (PK)
- `campus_code` (UNIQUE)
- `name`
- `address`
- `city`, `state`, `country`
- `contact_email`, `contact_phone`
- `status` ENUM (`pending`, `active`, `inactive`)
- `created_at`, `updated_at`

Indexes:
- UNIQUE(`campus_code`)
- INDEX(`status`)

### 8.3 `department`
- `id` (PK)
- `campus_id` (FK)
- `name`
- `status`
- `created_at`

Indexes:
- INDEX(`campus_id`)

### 8.4 `skill_master`
- `id` (PK)
- `skill_code` (UNIQUE)
- `skill_name`
- `category`
- `is_active`

Indexes:
- UNIQUE(`skill_code`)
- INDEX(`category`)

### 8.5 `student_profile`
- `id` (PK)
- `user_id` (FK -> User, UNIQUE)
- `campus_id` (FK)
- `department_id` (FK)
- `enrollment_no` (UNIQUE)
- `first_name`, `last_name`
- `dob`, `gender`
- `email`, `phone`
- `graduation_year`
- `cgpa`
- `resume_url`
- `profile_completion_pct`
- `placement_readiness_status` ENUM (`not_ready`, `in_progress`, `ready`)
- `status` ENUM (`active`, `inactive`, `blocked`)
- `created_at`, `updated_at`

Indexes:
- UNIQUE(`user_id`)
- UNIQUE(`enrollment_no`)
- INDEX(`campus_id`, `graduation_year`)
- INDEX(`placement_readiness_status`)

### 8.6 `student_skill`
- `id` (PK)
- `student_id` (FK)
- `skill_id` (FK)
- `proficiency` ENUM (`beginner`, `intermediate`, `advanced`)
- `verified_by`
- `verified_at`

Indexes:
- UNIQUE(`student_id`, `skill_id`)
- INDEX(`student_id`)
- INDEX(`skill_id`)

### 8.7 `student_certification`
- `id` (PK)
- `student_id` (FK)
- `certificate_name`
- `issuer`
- `issue_date`
- `expiry_date`
- `credential_url`

Indexes:
- INDEX(`student_id`)

### 8.8 `tpo_profile`
- `id` (PK)
- `user_id` (FK -> User, UNIQUE)
- `campus_id` (FK)
- `designation`
- `status`
- `created_at`

Indexes:
- UNIQUE(`user_id`)
- INDEX(`campus_id`)

### 8.9 `campus_student_import_log`
- `id` (PK)
- `campus_id` (FK)
- `uploaded_by` (FK -> User)
- `file_url`
- `total_rows`, `success_rows`, `failed_rows`
- `import_status` ENUM (`processing`, `completed`, `failed`)
- `created_at`

Indexes:
- INDEX(`campus_id`, `created_at`)
- INDEX(`import_status`)

### 8.10 `opportunity`
- `id` (PK)
- `opportunity_code` (UNIQUE)
- `posted_by_user_id` (FK -> User)
- `posted_by_role` ENUM (`tpo`, `internal_team`, `freelancer`, `admin`)
- `type` ENUM (`job`, `internship`, `freelance`)
- `title`
- `company_name`
- `description`
- `location_type` ENUM (`onsite`, `remote`, `hybrid`)
- `location_city`
- `stipend_min`, `stipend_max`
- `salary_min`, `salary_max`
- `application_start_date`, `application_end_date`
- `status` ENUM (`draft`, `pending_approval`, `published`, `closed`, `rejected`)
- `visibility_scope` ENUM (`global`, `campus_specific`, `cohort_specific`)
- `created_at`, `updated_at`

Indexes:
- UNIQUE(`opportunity_code`)
- INDEX(`type`, `status`)
- INDEX(`application_end_date`)
- INDEX(`posted_by_user_id`)

### 8.11 `opportunity_eligibility`
- `id` (PK)
- `opportunity_id` (FK)
- `min_cgpa`
- `graduation_year_from`, `graduation_year_to`
- `allowed_campuses_json`
- `allowed_departments_json`
- `required_skills_json`
- `required_lms_course_id`

Indexes:
- INDEX(`opportunity_id`)

### 8.12 `application`
- `id` (PK)
- `application_no` (UNIQUE)
- `opportunity_id` (FK)
- `student_id` (FK)
- `applied_at`
- `current_stage` ENUM (`applied`, `screening`, `interview`, `selected`, `offered`, `rejected`, `withdrawn`)
- `source` ENUM (`portal`, `campus_drive`, `referral`)
- `remarks`
- `updated_at`

Indexes:
- UNIQUE(`application_no`)
- UNIQUE(`opportunity_id`, `student_id`)
- INDEX(`student_id`, `current_stage`)
- INDEX(`opportunity_id`, `current_stage`)

### 8.13 `application_stage_history`
- `id` (PK)
- `application_id` (FK)
- `from_stage`
- `to_stage`
- `changed_by` (FK -> User)
- `change_reason`
- `changed_at`

Indexes:
- INDEX(`application_id`, `changed_at`)
- INDEX(`to_stage`)

### 8.14 `approval_queue`
- `id` (PK)
- `entity_type` ENUM (`opportunity`, `campus`, `freelancer`, `content`)
- `entity_id`
- `requested_by`
- `assigned_to`
- `status` ENUM (`open`, `approved`, `rejected`, `needs_changes`)
- `decision_note`
- `created_at`, `closed_at`

Indexes:
- INDEX(`entity_type`, `status`)
- INDEX(`assigned_to`, `status`)

### 8.15 `support_ticket`
- `id` (PK)
- `ticket_no` (UNIQUE)
- `raised_by` (FK -> User)
- `role_type`
- `category`
- `priority` ENUM (`low`, `medium`, `high`, `critical`)
- `status` ENUM (`open`, `in_progress`, `resolved`, `closed`)
- `assigned_to`
- `subject`
- `description`
- `created_at`, `updated_at`

Indexes:
- UNIQUE(`ticket_no`)
- INDEX(`status`, `priority`)
- INDEX(`assigned_to`)

### 8.16 `audit_event`
- `id` (PK)
- `actor_user_id`
- `actor_role`
- `action_type`
- `entity_type`
- `entity_id`
- `before_json`
- `after_json`
- `ip_address`
- `user_agent`
- `created_at`

Indexes:
- INDEX(`actor_user_id`, `created_at`)
- INDEX(`entity_type`, `entity_id`)
- INDEX(`action_type`)

### 8.17 `freelancer_profile`
- `id` (PK)
- `user_id` (FK -> User, UNIQUE)
- `organization_name`
- `contact_name`
- `email`, `phone`
- `verification_status` ENUM (`pending`, `verified`, `rejected`)
- `status`
- `created_at`

Indexes:
- UNIQUE(`user_id`)
- INDEX(`verification_status`)

### 8.18 `lms_user_map`
- `id` (PK)
- `student_id` (FK, UNIQUE)
- `moodle_user_id` (UNIQUE)
- `moodle_username`
- `sync_status` ENUM (`linked`, `pending`, `error`)
- `last_synced_at`

Indexes:
- UNIQUE(`student_id`)
- UNIQUE(`moodle_user_id`)
- INDEX(`sync_status`)

### 8.19 `lms_course_map`
- `id` (PK)
- `moodle_course_id` (UNIQUE)
- `course_code`
- `course_name`
- `is_active`
- `last_synced_at`

Indexes:
- UNIQUE(`moodle_course_id`)
- INDEX(`course_code`)

### 8.20 `student_lms_progress`
- `id` (PK)
- `student_id` (FK)
- `moodle_course_id`
- `enrollment_status`
- `progress_pct` DECIMAL(5,2)
- `completion_status` ENUM (`not_started`, `in_progress`, `completed`)
- `completion_date`
- `grade_pct` DECIMAL(5,2)
- `last_synced_at`

Indexes:
- UNIQUE(`student_id`, `moodle_course_id`)
- INDEX(`completion_status`)
- INDEX(`last_synced_at`)

### 8.21 `lms_sync_log`
- `id` (PK)
- `sync_type` ENUM (`user`, `course`, `progress`, `bulk`)
- `reference_id`
- `request_payload` LONGTEXT
- `response_payload` LONGTEXT
- `sync_status` ENUM (`success`, `failed`)
- `error_message`
- `created_at`

Indexes:
- INDEX(`sync_type`, `created_at`)
- INDEX(`sync_status`)

### 8.22 `notification_event`
- `id` (PK)
- `user_id`
- `channel` ENUM (`email`, `sms`, `whatsapp`, `in_app`)
- `template_code`
- `entity_type`
- `entity_id`
- `status` ENUM (`queued`, `sent`, `failed`)
- `provider_message_id`
- `created_at`, `sent_at`

Indexes:
- INDEX(`user_id`, `status`)
- INDEX(`channel`, `created_at`)

---

## 9) Minimum Index Plan

Create these indexes at initial release:

- `application(opportunity_id, current_stage)`
- `application(student_id, current_stage)`
- `opportunity(type, status, application_end_date)`
- `student_profile(campus_id, graduation_year, placement_readiness_status)`
- `student_lms_progress(student_id, completion_status, progress_pct)`
- `audit_event(entity_type, entity_id, created_at)`

---

## 10) Data Retention and Archival

- `lms_sync_log`: 6-12 months
- `notification_event`: 12 months
- `application_stage_history`: archive yearly
- `audit_event`: 3-7 years (compliance requirement dependent)

---

## 11) Authentication and Authorization Design

### Authentication
- Use Frappe user authentication as source of truth.
- Frontend session/token handling in Next.js.
- Optional social login can be introduced in later phase.

### Authorization
- Role-based access using Frappe Roles.
- Row-level control using user permissions and permission query conditions:
  - Campus sees only own campus students.
  - TPO sees assigned campus/cohorts.
  - Freelancer sees only own opportunities and applications.
  - Student sees only own profile/applications/LMS data.
  - Admin has global access.

### Security
- MFA for Admin and Internal Team.
- API rate limiting on auth and sensitive endpoints.
- PII handling and encrypted backups.
- Full audit trail for approvals and stage transitions.

---

## 12) Moodle Integration Architecture

### Flow
1. Student logs in via platform.
2. Student clicks LMS launch.
3. Platform generates Moodle SSO URL/token.
4. Student redirected to Moodle.
5. Scheduled jobs sync progress, completion, and grade.
6. Data stored in `Student LMS Progress`.
7. LMS metrics displayed in student dashboard and eligibility checks.

### Integration Components
- Moodle client module (API wrapper)
- SSO generation endpoint
- Scheduled sync jobs (incremental + bulk)
- Sync logs and retry handling

---

## 13) Frappe DocType Blueprint

Recommended DocTypes:

1. Role Assignment (optional custom extension)
2. Campus Profile
3. Student Profile
4. TPO Profile
5. Freelancer Profile
6. Opportunity
7. Opportunity Eligibility
8. Opportunity Campus Link (child table if needed)
9. Application
10. Application Stage History (child table)
11. Approval Request
12. Support Ticket
13. LMS User Map
14. LMS Course Map
15. Student LMS Progress
16. LMS Sync Log
17. Notification Event
18. Audit Event

Field types should use Frappe native types (`Data`, `Link`, `Select`, `Text Editor`, `Date`, `Datetime`, `Attach`, `Percent`, `Check`, etc.).

---

## 14) Permission Matrix (DocType Access Summary)

### Student
- Own `Student Profile` (R/W)
- Eligible `Opportunity` (R)
- Own `Application` (Create/R)
- Own `Student LMS Progress` (R)

### Campus
- Campus-scoped student records (R)
- Campus-level reports (R)

### TPO
- `Opportunity` (Create/Update for assigned scope)
- `Application` (Update stage for owned opportunities)
- Reports and student lists (R)

### Internal Team
- `Approval Request` (R/W)
- `Support Ticket` (R/W)
- Moderation operations

### Freelancer
- Own `Opportunity` (R/W)
- Own opportunity `Application` pipeline (R/W)

### Admin
- Full access across all DocTypes

---

## 15) API Contract (Frappe Whitelisted Methods)

Use endpoint pattern:

- `POST /api/method/scout.api.<module>.<method>`
- `GET /api/method/scout.api.<module>.<method>`

### 15.1 Auth APIs
- `scout.api.auth.login`
- `scout.api.auth.switch_role`

### 15.2 Student APIs
- `scout.api.student.get_dashboard`
- `scout.api.student.update_profile`
- `scout.api.student.list_opportunities`
- `scout.api.student.apply_opportunity`
- `scout.api.student.list_applications`
- `scout.api.student.get_lms_progress`

### 15.3 TPO/Campus APIs
- `scout.api.tpo.get_dashboard`
- `scout.api.tpo.create_opportunity`
- `scout.api.tpo.update_application_stage`
- `scout.api.tpo.list_students`
- `scout.api.tpo.bulk_import_students`
- `scout.api.tpo.placement_report`

### 15.4 Freelancer APIs
- `scout.api.freelancer.get_dashboard`
- `scout.api.freelancer.create_opportunity`
- `scout.api.freelancer.list_applications`
- `scout.api.freelancer.update_application_stage`

### 15.5 Internal Team APIs
- `scout.api.internal.list_approval_queue`
- `scout.api.internal.take_decision`
- `scout.api.internal.list_support_tickets`
- `scout.api.internal.update_ticket`

### 15.6 Admin APIs
- `scout.api.admin.platform_metrics`
- `scout.api.admin.create_user_with_role`
- `scout.api.admin.configure_integration`
- `scout.api.admin.audit_events`

### 15.7 LMS APIs
- `scout.api.lms.generate_sso_url`
- `scout.api.lms.sync_student_progress`
- `scout.api.lms.bulk_sync_progress`
- `scout.api.lms.get_sync_logs`

---

## 16) API Standards

### Success response
```json
{
  "ok": true,
  "message": "Success",
  "data": {},
  "error": null
}
```

### Error response
```json
{
  "ok": false,
  "message": "Validation failed",
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "details": []
  }
}
```

### Cross-cutting requirements
- Role validation on every API.
- Pagination for all list APIs (`limit`, `offset`, `sort_by`, `sort_order`).
- Consistent error codes.
- Idempotency for retry-prone operations where applicable.

---

## 17) Suggested Frappe App Structure

- `scout/api/auth.py`
- `scout/api/student.py`
- `scout/api/tpo.py`
- `scout/api/freelancer.py`
- `scout/api/internal.py`
- `scout/api/admin.py`
- `scout/api/lms.py`
- `scout/integrations/moodle/client.py`
- `scout/integrations/moodle/sync_jobs.py`
- `scout/permissions/queries.py`

---

## 18) Next.js Frontend Structure

- `app/(public)` for landing, register, login
- `app/(dashboard)/student`
- `app/(dashboard)/campus`
- `app/(dashboard)/tpo`
- `app/(dashboard)/internal`
- `app/(dashboard)/freelancer`
- `app/(dashboard)/admin`

Shared modules:
- `components/ui`
- `components/forms`
- `components/charts`
- `lib/api`
- `lib/auth`
- `lib/rbac`

---

## 19) Development Roadmap

### Phase 1 (MVP: 6-8 weeks)
- Auth + RBAC
- Student profile basics
- Campus/TPO basic dashboards
- Opportunity posting + application flow
- Admin setup + basic reporting

### Phase 2 (4-6 weeks)
- Moodle SSO and progress sync
- Internal moderation and approval workflows
- Freelancer operations
- Notification engine

### Phase 3 (4 weeks)
- Advanced analytics
- Rule-based automations
- Security and performance hardening
- UAT and production readiness

---

## 20) Team Recommendation

- 1 Frappe backend engineer
- 1 Next.js frontend engineer
- 1 full-stack integration engineer (Moodle + DevOps)
- 1 QA engineer
- 1 Product/Business analyst (part-time)

---

## 21) Risks and Mitigation

### Complex RBAC
- Mitigation: permission matrix first; test row-level permissions early.

### Moodle data mismatch
- Mitigation: retry queues + reconciliation jobs + sync logs.

### Scale bottlenecks
- Mitigation: indexing, async processing, summary tables for dashboards.

### Adoption friction
- Mitigation: import templates, clear onboarding, and role-specific training.

---

## 22) Deliverables Checklist

- Product Requirements Document (all six roles)
- Role-permission matrix
- ER/data model and DocType register
- API contract document
- Moodle integration specification
- Role-wise dashboard wireframes
- Sprint plan with milestones
- QA/UAT test checklist

---

## 23) Non-Functional Baseline

- p95 API target: under 500 ms for common dashboard APIs.
- Background jobs for heavy workloads (sync/report/import).
- Daily backups + binlog-based point-in-time recovery.
- Regular backup restore drills.
- Least-privilege database credentials.
- Production-only DB network access.

