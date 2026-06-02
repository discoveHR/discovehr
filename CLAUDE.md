# Scout Express / DiscoveHR — Codebase Guide

## Architecture

Three-tier stack:
- **Frontend** — Next.js 14 (TypeScript, React) at `frontend/`
- **Backend** — Frappe 5 (Python) at `backend/apps/scout/` — served from WSL2 at `http://localhost:8000`
- **Services** — Optional Python microservices at `services/` (disabled by default)

The frontend talks to Frappe entirely through a Next.js proxy at `app/frappe/[...path]/route.ts`. The proxy reads `scout_access_token` from an HttpOnly cookie and injects `Authorization: Bearer <token>` so client-side JS never touches the token.

---

## Starting the project

```powershell
# 1. Start Frappe (WSL terminal)
wsl bash -lc "cd ~/frappe-bench && bench start"

# 2. Start Next.js dev server (PowerShell)
cd frontend && npm run dev
```

Or use `start-dev.ps1` in the project root.

**Frappe site:** `scout.localhost`  
**Frontend:** `http://localhost:3000`  
**Frappe backend:** `http://localhost:8000`

---

## Key directories

```
frontend/
  app/                  Next.js App Router pages
    admin/              Admin portal pages
    company/            Employer portal pages
    student/            Student dashboard pages
    tpo/                TPO dashboard pages
    login/              Unified login (student/candidate)
    frappe/[...path]/   Frappe proxy route handler
    api/auth/           Token login/logout/refresh handlers
  components/           React components by portal
  lib/api/              All Frappe API client functions
  lib/auth/             Session management, role routing
  styles/               auth.css, company-dashboard.css, tpo-dashboard.css

backend/apps/scout/scout/
  api/                  Frappe whitelisted endpoints
    admin/              Admin-only endpoints
    company/            Company portal endpoints
    student/            Student portal endpoints
    tpo/                TPO portal endpoints
    auth.py             Token login/refresh/register
    company_api.py      Backward-compat company API facade
    email_api.py        Email config & test-send
    lms.py              Moodle LMS integration
    psychometric_api.py Psychometric test endpoints
    aptitude_api.py     Aptitude test endpoints
  scout/doctype/        Frappe DocType definitions (40+ models)
  services/             Microservice client stubs
  utils/                Email helpers, env config
  hooks.py              Frappe app hooks
```

---

## Auth flow

1. Login POSTs to `/api/auth/login` (Next.js route) → calls Frappe `scout.api.auth.token_login`
2. Frappe issues `accessToken` + `refreshToken`
3. Next.js stores both as HttpOnly cookies (`scout_access_token`, `scout_refresh_token`)
4. Every Frappe API call goes through `/frappe/[...path]` which reads the cookie and injects Bearer
5. Role check after login routes to the correct dashboard (`/company/dashboard`, `/student/dashboard`, etc.)

**Admin login** uses Frappe session-based auth (not Bearer tokens) via `scout.api.admin_api.login`.

---

## Test accounts (local dev)

| Role | Email | Password |
|------|-------|----------|
| Student | `final_stu@scout.test` | `Test@1234` |
| Company | `final_co@scout.test` | `Test@1234` |
| TPO | `final_tpo@scout.test` | `Test@1234` |
| Admin | `admin@scout.com` | `Admin@123` |

Create/reset admin: visit `http://localhost:3000/admin/login` and click "Create demo admin".

---

## Moodle (LMS)

Configured in Frappe site_config.json:
- `genvarsity_moodle_url`: `http://localhost:8080`
- `genvarsity_moodle_token`: set in `sites/scout.localhost/site_config.json`

Moodle runs via Docker in `backend/moodle-stack/`.

---

## TAO (assessments)

TAO is not configured locally — `SCOUT_PSYCHOMETRIC_DEV_MODE=1` is set in `backend/.env`, enabling dev-mode test sessions without a real TAO server. Students can submit sample results via the "Submit sample result (dev)" button.

---

## API naming convention

Frontend calls go to `scout.api.<module>.<function>` via the Frappe proxy. Key facades:
- `scout.api.company_api.*` — company portal (backward-compat wrapper)
- `scout.api.student.*` — student endpoints (exported from `student/__init__.py`)
- `scout.api.tpo.*` — TPO endpoints (exported from `tpo/__init__.py`)
- `scout.api.admin_api.*` — admin endpoints
- `scout.api.lms.student_lms_context` — Moodle LMS context
