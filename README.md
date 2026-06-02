# Scout Express - Starter Setup

This starter includes:

- `backend/` Frappe app scaffold (`apps/scout`)
- `frontend/` Next.js app with Company Login page

**Quick start (run frontend + backend):** see **[RUNNING.md](RUNNING.md)** — prerequisites, `npm install`, `bench start`, login URLs, and troubleshooting.

## 1) Install prerequisites

### Frontend

1. Install Node.js LTS from [https://nodejs.org](https://nodejs.org)
2. Reopen terminal and verify:
   - `node -v`
   - `npm -v`

### Backend (Frappe)

- Python 3.10+
- Redis
- MariaDB 10.6+
- wkhtmltopdf
- Bench CLI (`pip install frappe-bench`)

Use Ubuntu/WSL2 for Frappe development on Windows.

## 2) Backend setup (Frappe)

See detailed guide in `backend/README.md`.

Company login method:

- `POST /api/method/scout.api.company.login`
- body:
  - `email`
  - `password`

The authenticated user must have `Company` role.

## 3) Frontend setup

From `frontend/`:

1. `npm install`
2. Copy `.env.local.example` to `.env.local`
3. Run `npm run dev`

Frontend URL: `http://localhost:3000`

Default backend URL expected by frontend:

- `http://localhost:8000`

## 4) Module status

Implemented first module:

- Company login UI (responsive + styled)
- Company login integration with Frappe whitelisted API
- Session-based auth flow using Frappe cookies

Next suggested step:

- Add Company Dashboard page after login
- Add `Company Profile` DocType and company-specific data permissions
