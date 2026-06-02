#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:8000}"
EMAIL="tokentest$(date +%s)@scout.com"
PASS="Test@12345"

printf '%s\n' "{\"fullName\":\"Token TPO\",\"email\":\"$EMAIL\",\"password\":\"$PASS\",\"role\":\"Training & Placement Officer\"}" > /tmp/reg.json
curl -s -X POST "$BASE/api/method/scout.api.auth.register" -H 'Content-Type: application/json' -d @/tmp/reg.json | grep -q '"ok": true'

printf '%s\n' "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" > /tmp/login.json
LOGIN=$(curl -s -X POST "$BASE/api/method/scout.api.auth.token_login" -H 'Content-Type: application/json' -d @/tmp/login.json)
TOKEN=$(python3 -c "import json,sys; d=json.loads(sys.argv[1]); print((d.get('message') or {}).get('data',{}).get('accessToken',''))" "$LOGIN")

PROFILE=$(curl -s "$BASE/api/method/scout.api.tpo.get_tpo_profile" -H "Authorization: Bearer $TOKEN")
echo "$PROFILE" | grep -q '"ok": true'
echo "token flow OK for $EMAIL"
