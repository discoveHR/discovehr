#!/bin/bash
set -euo pipefail
BASE="${BASE_URL:-http://127.0.0.1:8000}"
EMAIL="${1:?email required}"
PASS="${2:?password required}"

echo "=== token_login ==="
LOGIN_JSON=$(curl -s -X POST "${BASE}/api/method/scout.api.auth.token_login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASS}\"}")
echo "$LOGIN_JSON" | head -c 400
echo ""

TOKEN=$(echo "$LOGIN_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('message',{}).get('data',{}).get('accessToken',''))" 2>/dev/null || true)
if [ -z "$TOKEN" ]; then
  echo "FAIL: no accessToken in response"
  exit 1
fi
echo "OK: got accessToken (${#TOKEN} chars)"

echo "=== get_tpo_profile with Bearer ==="
curl -s -w "\nHTTP:%{http_code}\n" "${BASE}/api/method/scout.api.tpo.get_tpo_profile" \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Accept: application/json" | head -c 300
echo ""
