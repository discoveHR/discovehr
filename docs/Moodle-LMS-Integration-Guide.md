# Scout Express Moodle LMS Integration Guide (Step-by-Step)

This guide explains how to connect Scout Express (Frappe + Next.js) with a Moodle LMS.

It covers:
- Local Moodle setup (`http://localhost:8080`)
- Moodle web service token setup
- Frappe configuration
- Validation in Student Dashboard
- Switching to another Moodle website later

---

## 1) Prerequisites

- Scout backend is running (Frappe bench).
- Scout frontend is running.
- Moodle is accessible (local or hosted).
- You have Moodle admin access.

---

## 2) Moodle Setup (Admin Side)

Login to Moodle as admin, then do the following.

### 2.1 Enable Web Services

1. Go to `Site administration -> Advanced features`
2. Enable **Web services**
3. Click **Save changes**

### 2.2 Enable REST Protocol

1. Go to `Site administration -> Server -> Web services -> Manage protocols`
2. Enable **REST**

Direct URL (local):  
`http://localhost:8080/admin/settings.php?section=webserviceprotocols`

### 2.3 Create External Service

1. Go to `Site administration -> Server -> Web services -> External services`
2. Click **Add**
3. Set:
   - Name: `Scout LMS Service`
   - Enabled: checked
   - Authorised users only: checked (recommended)
4. Save

Direct URL (local):  
`http://localhost:8080/admin/settings.php?section=externalservices`

### 2.4 Add Required Functions

Inside `Scout LMS Service`, click **Functions**, then add:

- `core_user_get_users_by_field`
- `core_user_create_users`
- `core_enrol_get_users_courses`

### 2.5 Authorize User for Service

If "Authorised users only" is enabled:

1. Open `Users` for `Scout LMS Service`
2. Move your admin user from "Not authorised users" to "Authorised users"

### 2.6 Generate Token

1. Go to `Site administration -> Server -> Web services -> Manage tokens`
2. Click **Create token**
3. Select:
   - User: your admin/service user
   - Service: `Scout LMS Service`
4. Save and copy the token

Direct URL (local):  
`http://localhost:8080/admin/settings.php?section=webservicetokens`

---

## 3) Configure Scout (Frappe Site Config)

Run in WSL:

```bash
cd ~/frappe-bench
bench --site scout.localhost set-config genvarsity_moodle_url "http://localhost:8080"
bench --site scout.localhost set-config genvarsity_moodle_token "<YOUR_MOODLE_TOKEN>"
bench --site scout.localhost clear-cache
bench restart
```

For hosted Moodle, replace URL:

```bash
bench --site scout.localhost set-config genvarsity_moodle_url "https://your-moodle-domain.com"
```

---

## 4) Validate Integration

1. Login to Scout as a **Student**
2. Open `Student Dashboard -> LMS (GenVarsity)`
3. Confirm:
   - LMS section loads without errors
   - Launch URL opens Moodle (`/my/`)
   - Course list appears (if user is enrolled)

---

## 5) How It Works Internally

Scout LMS API module is:

- `backend/apps/scout/scout/api/lms.py`

Main behavior:
- Reads `genvarsity_moodle_url` and `genvarsity_moodle_token` from Frappe config
- Calls Moodle REST endpoint: `/webservice/rest/server.php`
- Finds Moodle user by email
- Creates user if missing
- Fetches enrolled courses

Frontend call:
- `frontend/lib/api.ts` -> `getStudentLmsContext()`
- API endpoint: `scout.api.lms.student_lms_context`

---

## 6) Switch to Another LMS Website Later

You can switch anytime by updating only two values:

```bash
cd ~/frappe-bench
bench --site scout.localhost set-config genvarsity_moodle_url "https://new-lms-domain.com"
bench --site scout.localhost set-config genvarsity_moodle_token "<NEW_TOKEN>"
bench --site scout.localhost clear-cache
bench restart
```

No code changes are required if the new site is Moodle and exposes the same functions.

---

## 7) Troubleshooting

### A) "Web services" menu not visible
- Enable from `Advanced features`
- Save changes
- Reopen admin page

### B) Token creation says user not allowed
- Add admin user under External Service -> Users
- Or disable "Authorised users only" (less secure)

### C) Student LMS panel shows API error
- Verify URL and token in Frappe config
- Verify service has all 3 required functions
- Verify REST protocol enabled

### D) Moodle opens but no courses shown
- User may exist but has no enrollments
- Enroll the user in at least one course in Moodle

### E) Wrong URL used
- `genvarsity.com` is marketing site
- Use Moodle base URL (example: `http://localhost:8080` or `https://learn.example.com`)

---

## 8) Security Notes

- Treat Moodle token as secret.
- Do not expose token in frontend code.
- Store token only in Frappe site config.
- Rotate token if accidentally shared.

