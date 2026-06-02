#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:8000}"
EMAIL="tposmoke$(date +%s)@scout.com"
PASS="Test@12345"
JAR="$(mktemp)"
trap 'rm -f "$JAR" /tmp/reg.json /tmp/login.json' EXIT

printf '%s\n' "{\"fullName\":\"TPO Smoke\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"role\":\"Training & Placement Officer\"}" > /tmp/reg.json
curl -s -X POST "$BASE/api/method/scout.api.auth.register" -H 'Content-Type: application/json' -d @/tmp/reg.json | grep -q '"ok": true'

printf '%s\n' "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" > /tmp/login.json
curl -s -c "$JAR" -b "$JAR" -X POST "$BASE/api/method/scout.api.auth.login" -H 'Content-Type: application/json' -d @/tmp/login.json | grep -q '"ok": true'

curl -s -b "$JAR" "$BASE/api/method/scout.api.tpo.get_tpo_profile" | grep -q '"ok": true'
curl -s -b "$JAR" "$BASE/api/method/scout.api.tpo.list_tpo_postings" | grep -q '"ok": true'

echo "TPO smoke OK ($EMAIL)"
