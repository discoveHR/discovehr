#!/usr/bin/env bash
set -euo pipefail
BASE="${BASE:-http://127.0.0.1:8000}"
EMAIL="${1:-manul@gmail.com}"
PASS="${2:-}"

if [[ -z "$PASS" ]]; then
  echo "Usage: $0 <email> <password>"
  exit 1
fi

printf '%s\n' "{\"email\":\"$EMAIL\",\"password\":\"$PASS\"}" > /tmp/login.json
LOGIN="$(curl -s -X POST "$BASE/api/method/scout.api.auth.token_login" -H 'Content-Type: application/json' -d @/tmp/login.json)"
echo "login: ${LOGIN:0:200}"

TOKEN="$(python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('message',{}).get('data',{}).get('accessToken',''))" <<< "$LOGIN")"
if [[ -z "$TOKEN" ]]; then
  echo "No access token"
  exit 1
fi

PROFILE="$(curl -s "$BASE/api/method/scout.api.tpo.get_tpo_profile" -H "Authorization: Bearer $TOKEN")"
echo "profile: ${PROFILE:0:200}"
echo "$PROFILE" | grep -q '"ok": true' && echo "OK"
