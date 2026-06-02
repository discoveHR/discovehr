# Scout Express — How to Run (Frontend + Backend)

This guide is for **local development on Windows** with **Frappe in WSL2** and **Next.js on Windows**.

---

## 1. What you need to install

### On Windows

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js LTS](https://nodejs.org) | 18+ (20+ recommended) | Frontend (`npm`) |
| [WSL2](https://learn.microsoft.com/en-us/windows/wsl/install) + Ubuntu | Latest | Run Frappe bench |
| [Git](https://git-scm.com) | Optional | Clone repo |

Check:

```powershell
node -v
npm -v
wsl --version
```

### Inside WSL (Ubuntu)

| Tool | Purpose |
|------|---------|
| Python 3.10+ | Frappe |
| MariaDB 10.6+ | Database |
| Redis | Cache / queues |
| Node.js LTS | Frappe asset build (`bench start` watch) |
| Yarn | Frappe bench watch process |
| wkhtmltopdf | PDFs (Frappe) |
| **frappe-bench** | Bench CLI |

Install bench (once):

```bash
pip install frappe-bench
```

Full Frappe bench setup (first time only) is in [backend/README.md](backend/README.md).

---

## 2. Project layout

```
Scout express/
├── backend/apps/scout/     # Frappe app (link into bench)
├── backend/.env              # Scout settings (copy from .env.example)
├── frontend/                 # Next.js app
└── RUNNING.md                # This file
```

Your bench should live at **`~/frappe-bench`** (WSL), with the scout app linked:

```bash
ln -sfn "/mnt/c/Users/<YOU>/Documents/Scout express/backend/apps/scout" ~/frappe-bench/apps/scout
```

---

## 3. One-time setup

### Backend (WSL)

```bash
cd ~/frappe-bench

# If bench does not exist yet — see backend/README.md for bench init + new-site

# Link scout app from Windows repo (adjust path to your machine)
ln -sfn "/mnt/c/Users/Dell/Documents/Scout express/backend/apps/scout" apps/scout

# Install app on site (first time)
bench --site scout.localhost install-app scout

# Optional: sync DocTypes after pulling code changes
bench --site scout.localhost migrate
```

Copy environment file on Windows:

```powershell
copy "backend\.env.example" "backend\.env"
```

Edit `backend/.env` if needed (Razorpay, psychometric dev mode, etc.).

### Frontend (Windows PowerShell)

```powershell
cd "c:\Users\Dell\Documents\Scout express\frontend"
npm install
copy .env.local.example .env.local
```

`frontend/.env.local` should contain:

```env
NEXT_PUBLIC_API_URL=/frappe
```

The frontend proxies `/frappe/*` to your WSL bench automatically (see `frontend/app/frappe/[...path]/route.ts`).

---

## 4. Run every day (two terminals)

### Terminal A — Backend (WSL)

```bash
cd ~/frappe-bench
bench start
```

Wait until you see:

```text
Running on http://127.0.0.1:8000
```

**Leave this terminal open.** If you close it, the API stops and login will fail.

### Terminal B — Frontend (Windows PowerShell)

```powershell
cd "c:\Users\Dell\Documents\Scout express\frontend"
npm run dev
```

Wait until you see:

```text
Ready on http://localhost:3000
```

Optional helper (opens bench + frontend windows, auto-restarts bench if it exits):

```powershell
cd "c:\Users\Dell\Documents\Scout express"
.\start-dev.ps1 -ForceFrontendRestart
```

---

## 5. Open the app

| URL | Use |
|-----|-----|
| http://localhost:3000/login | Main portal sign-in (one form for all roles) |
| http://localhost:3000 | Redirects to `/login` |
| http://localhost:3000/admin/login | Admin console |
| http://localhost:3000/signup | Sign up |

### Demo admin (local)

1. Open http://localhost:3000/admin/login  
2. Click **Create demo admin (dev)**  
3. Sign in with **`admin@scout.com`** / **`Admin@123`**

---

## 6. Troubleshooting

### “Cannot reach Frappe” / login HTTP 500 / 502

**Cause:** Bench is not running, or it just stopped.

**Fix:**

```bash
cd ~/frappe-bench && bench start
```

Wait 10 seconds, hard-refresh the browser (Ctrl+Shift+R), try again.

### Bench stops after ~8–10 minutes (`worker.1 stopped`, everything shuts down)

**Why:** `bench start` runs several processes via **Honcho** (web, Redis, worker, watch, schedule, …). If **any** process exits, Honcho stops **all** of them.

On your machine the background **RQ worker** often logs:

```text
Redis connection timeout, quitting...
```

then exits cleanly (`rc=0`). That is enough for Honcho to tear down web + Redis, so login/API die even though you did nothing wrong.

Common triggers: WSL Redis queue idle/connection issues, starting bench from a short-lived terminal (Cursor background task), or port/redis restarts.

**Stable dev (login, company/TPO dashboards):** use the project script (web + Redis only, no worker):

```powershell
.\start-dev.ps1
```

That opens a window running `backend/scripts/bench-dev-loop.sh` (default mode). **Keep that window open.**

**When you need background jobs** (emails, long queues): in WSL, `export SCOUT_BENCH_FULL=1` then run the loop script, or use `bench start` and expect occasional full shutdowns until Redis timeout is fixed.

### Frontend works but API fails after WSL restart

Restart frontend so the proxy can resolve the new WSL IP:

```powershell
cd frontend
npm run dev
```

(Usually not needed if you use the dynamic `/frappe` proxy route.)

### Backend stops when you save Python files

`bench start` uses a **dev auto-reloader** — the web process restarts on each `.py` save (a few seconds downtime). That is normal.

You do **not** need `bench migrate` for normal Python edits.

### When to run `bench migrate`

Only when you change **DocType `.json` files** (new fields, new DocTypes):

```bash
bench --site scout.localhost migrate
```

Or force sync scout DocTypes:

```bash
bench --site scout.localhost execute scout.bootstrap.force_sync_scout_doctypes
```

### Check API is up

In WSL:

```bash
curl http://127.0.0.1:8000/api/method/ping
```

Should return: `{"message":"pong"}`

From Windows (with frontend running):

```powershell
curl http://localhost:3000/frappe/api/method/ping
```

---

## 7. npm scripts (frontend)

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (port 3000) |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |

---

## 8. Useful paths

| Item | Path |
|------|------|
| Frappe bench | `~/frappe-bench` (WSL) |
| Site name | `scout.localhost` |
| Scout app code | `backend/apps/scout/` |
| API base (via frontend) | `http://localhost:3000/frappe` |
| API base (direct in WSL) | `http://127.0.0.1:8000` |

More backend detail: [backend/README.md](backend/README.md)  
Architecture / schema: [docs/scout-database-schema.md](docs/scout-database-schema.md)

---

## 8.1 Reset database (fresh start, local dev only)

**Warning:** This deletes all users, jobs, students, TPO data, and uploads on `scout.localhost`. A backup is written under `sites/scout.localhost/private/backups/` when you use `drop-site`.

Run these commands **in a WSL Ubuntu terminal** (not PowerShell), with bench stopped (Ctrl+C on `bench serve`):

```bash
cd ~/frappe-bench
pkill -f "bench serve" 2>/dev/null || true
rm -f sites/scout.localhost/locks/*.lock

# Option A — full reinstall (preferred)
bench --site scout.localhost reinstall --yes --admin-password 'Admin@123'
bench --site scout.localhost migrate
bench --site scout.localhost clear-cache
```

If `reinstall` asks for MariaDB root password, use your local MariaDB root password (often empty on dev — press Enter).

**Option B — from bench execute** (after code is synced):

```bash
bench --site scout.localhost execute scout.api.dev_reset_site.fresh_start_yes
bench --site scout.localhost migrate
bench --site scout.localhost clear-cache
```

**After reset**

1. Clear browser **localStorage** for `localhost:3000` / `localhost:3001` (Scout tokens + `scout_session`).
2. Frappe Desk admin: **Administrator** / **Admin@123** (unless you changed it).
3. Portal: register new users at `/signup`, or use **Create demo admin** on `/admin/login`.

Script (same as Option A): `backend/scripts/reset-dev-site.sh`

---

## 9. Production scale (indexes, workers, reports)

After deploying performance changes, run in WSL:

```bash
cd ~/frappe-bench
bench --site scout.localhost migrate
```

This applies Scout DB indexes (`search_indexes.py`) and DocType updates.

**Background workers (required for scale):**

```bash
bench worker --queue short   # rollups, Meilisearch index upserts
bench worker --queue long    # TPO report CSV export, bulk student CSV (>100 rows)
```

(or `bench start` with workers enabled)

**TPO bulk student upload:** Sheets with **more than 100 rows** are queued on `long`. The TPO UI polls until complete (`get_bulk_upload_status`). Smaller sheets still run synchronously.

**TPO reports:** UI loads 100 students per page. Colleges with 800+ students use **queued CSV export** (polls until ready). Use Redis in production for TPO scope cache and export state.

**Admin directory:** `list_colleges_with_tpos`, `list_registered_companies`, and `list_college_students` accept `page` and `pageSize` (default 50, max 200). Student counts use SQL aggregates instead of loading all profiles.

**Job search:** After migrate, MariaDB FULLTEXT on `Scout Job` title/skills is used when `q` is set. Optional Meilisearch: see [services/search-service/README.md](services/search-service/README.md) and `SCOUT_MEILISEARCH_*` in `backend/.env.example`.

**Production Frappe / MariaDB (infra, not in repo):**

- Run **multiple Gunicorn workers** (`gunicorn_workers` in `site_config.json` or Procfile) for concurrent API traffic.
- Use **Redis** for cache, sessions, and job queues.
- For very large read load, add a **MariaDB read replica** and point heavy report queries there (custom site config); Scout defaults to a single DB.
- Schedule `bench worker` under systemd/supervisor alongside `bench serve`.

**College master + rollups:** `Scout College` links TPOs and students; home dashboard reads `Scout TPO Rollup Stats` (refreshed every 15 min via queued jobs). See [docs/production-scale.md](docs/production-scale.md) if present.

---

## 10. Psychometric tests (admin → student)

### Environment (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `SCOUT_PSYCHOMETRIC_DEV_MODE=1` | Local testing without TAO: sample results + admin **Simulate result** |
| `SCOUT_TAO_BASE_URL` + API key or client id/secret | Production TAO delivery |
| `SCOUT_TAO_WEBHOOK_SECRET` | HMAC for inbound results |

Restart bench after changing env. Sync Windows repo env into WSL bench:

```bash
cp "/mnt/c/Users/Dell/Documents/Scout express/backend/.env" ~/frappe-bench/.env
```

Smoke test (optional): `bench --site scout.localhost execute scout.api.smoke_psychometric.run`

### Admin flow

1. http://localhost:3000/admin/login → **Psychometric tests**
2. **Create & publish** — title, duration; optional TAO test id
3. **Assign to students** — paste emails, **or** **Assign from college** (checkbox roster), **or** **Colleges & TPOs** → **Assign psychometric test** on a college card

Students must exist as User accounts with role `Student` or `Job Seeker`.

### Student flow

1. Main portal login → dashboard → **Tests & assessments**
2. **Start test** (TAO tab) or **Submit sample result** when dev mode is on
3. Results appear on the student panel and in TPO Student 360

### Production webhook (TAO → Scout)

POST to:

```text
https://<your-frappe-host>/api/method/scout.api.psychometric_api.tao_results_webhook
```

Headers: `X-Tao-Signature` or `X-Scout-Signature` = HMAC-SHA256 hex of raw body using `SCOUT_TAO_WEBHOOK_SECRET`.

JSON body (minimum):

```json
{
  "externalAssignmentId": "PSY-ASN-00001",
  "overallScore": 74,
  "scores": { "openness": 80 },
  "traits": { "primary": "Analytical Collaborator" },
  "recommendations": "Optional text",
  "completedAt": "2026-05-20 12:00:00"
}
```

`externalAssignmentId` must match the **Scout Psychometric Assignment** name (`PSY-ASN-xxxxx`).

---

## 11. Aptitude tests (admin / TPO → student)

Separate from psychometric. Content and delivery use **TAO** with `testType: aptitude`.

### Environment (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `SCOUT_APTITUDE_DEV_MODE=1` | Aptitude dev mode (falls back to `SCOUT_PSYCHOMETRIC_DEV_MODE` if unset) |
| `SCOUT_TPO_APTITUDE_FEE_INR=30` | TPO one-time fee (INR) to create one aptitude test |
| `SCOUT_TAO_*` | Same TAO base URL / auth as psychometric |
| `SCOUT_TAO_WEBHOOK_SECRET` | HMAC for aptitude results webhook |

### Admin flow (free)

1. http://localhost:3000/admin/login → **Aptitude tests**
2. **Create & publish** — syncs to TAO with `testType: aptitude`
3. Assign students by email or **Assign from college** (same as psychometric)

### TPO flow (₹30 per test)

1. TPO dashboard → **Aptitude tests**
2. Enter title / duration → **Pay ₹30 & create test** (Razorpay; dev bypass when keys unset)
3. After payment, **Assign students** from college roster

### Student flow

1. Student hub → **Tests & assessments** → tab **Aptitude**
2. **Start test** (TAO) or **Submit sample result** in dev mode

### Production webhook (TAO → Scout)

POST to:

```text
https://<your-frappe-host>/api/method/scout.api.aptitude_api.tao_aptitude_results_webhook
```

Same signature headers as psychometric. `externalAssignmentId` must match **Scout Aptitude Assignment** (`APT-ASN-xxxxx`).

---

## 12. Mailgun email (TPO + company)

Outbound mail uses **Mailgun** when configured; otherwise Scout falls back to Frappe’s default outgoing Email Account.

### Environment (`backend/.env`)

| Variable | Purpose |
|----------|---------|
| `SCOUT_MAILGUN_API_KEY` | Mailgun private API key |
| `SCOUT_MAILGUN_DOMAIN` | Sending domain (e.g. `mg.yourcollege.edu`) |
| `SCOUT_MAIL_FROM` | From header, e.g. `Scout Express <noreply@mg.yourcollege.edu>` |
| `SCOUT_MAILGUN_API_HOST` | Optional: `api.eu.mailgun.net` for EU accounts |

Restart bench after changing env. Sync `.env` into WSL bench if needed.

### What sends email

**TPO**

- Student invites (`Students` → send invite)
- Internal posting notifications (when creating an active internal job with notify on)
- Company special dashboard link (placement postings)
- HR partner invite (`Engagement` → HR tab)

**Company**

- College / TPO invitations for jobs
- Shortlist interview emails
- Offer letters
- Interview scheduler notifications (student, interviewer, HR CC)

### Portal status

TPO and company dashboards call `scout.api.email_api.get_mailer_config` to show whether Mailgun (or Frappe fallback) is active.

### Test before domain verification (Mailgun sandbox)

1. Use your Mailgun **sandbox** domain and API key in `backend/.env`.
2. In Mailgun → **Sending** → your sandbox domain → **Authorized recipients**, add every inbox you will test (including your own).
3. Restart bench, log in as TPO or Employer, open **Students** or **Engagement** (banner at top), enter an authorized address if needed, click **Send test email**.

API (logged in):

```bash
curl -s -b cookies.txt -c cookies.txt -X POST \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"toEmail":"you@example.com"}' \
  http://127.0.0.1:8000/api/method/scout.api.email_api.send_test_email
```

Omit `toEmail` to send to the logged-in user’s email.

---

## 13. Optional microservices (production-style)

Frappe stays the **core** (users, DocTypes, workflows). Sidecar services handle integrations, email, and Razorpay when enabled.

| Service | Port | Role |
|---------|------|------|
| integration-service | 8101 | Moodle LMS, TAO webhooks (HMAC + retry → Frappe) |
| notification-service | 8102 | Mailgun email (async enqueue) |
| payment-service | 8103 | Razorpay create order + verify signature |

Docs: [services/README.md](services/README.md), [services/ARCHITECTURE.md](services/ARCHITECTURE.md).

### Enable from `backend/.env`

```env
SCOUT_USE_MICROSERVICES=1
SCOUT_INTEGRATION_SERVICE_URL=http://127.0.0.1:8101
SCOUT_NOTIFICATION_SERVICE_URL=http://127.0.0.1:8102
SCOUT_PAYMENT_SERVICE_URL=http://127.0.0.1:8103
SCOUT_SERVICE_INTERNAL_SECRET=dev-internal-secret
SCOUT_FRAPPE_BASE_URL=http://127.0.0.1:8000
```

Copy Mailgun / Razorpay / Moodle vars to `services/.env` (from `services/.env.example`).

### Run sidecars

```bash
cd services
cp .env.example .env
docker compose up --build
```

Or three terminals: `uvicorn main:app --port 8101` (etc.) in each service folder.

**Without** `SCOUT_USE_MICROSERVICES`, behavior is unchanged (in-process Moodle, Mailgun, Razorpay).

### TAO webhooks in production

Point TAO to the **integration service** (not Frappe directly):

- `https://<integration-host>/v1/webhooks/tao/psychometric`
- `https://<integration-host>/v1/webhooks/tao/aptitude`

The service validates `SCOUT_TAO_WEBHOOK_SECRET` and forwards to Frappe with retries.
