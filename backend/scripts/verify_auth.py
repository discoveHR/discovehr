#!/usr/bin/env python3
import json
import sys
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
EMAIL = sys.argv[2] if len(sys.argv) > 2 else "admin@scout.com"
PASSWORD = sys.argv[3] if len(sys.argv) > 3 else "admin123"


def post(path, payload=None, headers=None):
    data = json.dumps(payload or {}).encode()
    req = urllib.request.Request(
        f"{BASE}{path}",
        data=data,
        headers={"Content-Type": "application/json", **(headers or {})},
        method="POST",
    )
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read())


def get(path, headers=None):
    req = urllib.request.Request(f"{BASE}{path}", headers=headers or {}, method="GET")
    with urllib.request.urlopen(req) as resp:
        return resp.status, json.loads(resp.read())


status, login = post("/api/method/scout.api.auth.token_login", {"email": EMAIL, "password": PASSWORD})
msg = login.get("message") or {}
print("login_status", status, "ok", msg.get("ok"), "message", msg.get("message"))
if not msg.get("ok"):
    sys.exit(1)
token = (msg.get("data") or {}).get("accessToken")
print("token_len", len(token or ""))
status2, prof = get("/api/method/scout.api.company_api.list_jobs", {"Authorization": f"Bearer {token}"})
pm = prof.get("message") or {}
print("company_api_status", status2, "ok", pm.get("ok"), "message", pm.get("message"))
