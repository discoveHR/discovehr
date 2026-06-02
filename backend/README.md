# Backend (Frappe)

This backend is now structured for a Frappe app named `scout`.

## Prerequisites

- Ubuntu/WSL2 recommended on Windows
- Python 3.10+
- Node.js LTS
- Redis
- MariaDB 10.6+
- wkhtmltopdf
- Bench CLI

## 1) Install Bench

```bash
pip install frappe-bench
```

## 2) Create bench (first time only)

```bash
bench init frappe-bench --frappe-branch version-15
cd frappe-bench
```

## 3) Get this app into bench

Copy this `backend/apps/scout` folder into:

`frappe-bench/apps/scout`

Then run:

```bash
bench get-app apps/scout
bench new-site scout.localhost
bench --site scout.localhost install-app scout
bench start
```

## 4) Company login endpoint

Whitelisted method:

`/api/method/scout.api.company.login`

Payload:

```json
{
  "email": "hr@company.com",
  "password": "password"
}
```

Note: user must have `Company` role.
