#!/usr/bin/env bash
set -euo pipefail
BENCH="${FRAPPE_BENCH_ROOT:-/home/dell/frappe-bench}"
SITE="${FRAPPE_SITE:-scout.localhost}"
ADMIN_PW="${SCOUT_ADMIN_PASSWORD:-Admin@123}"
SCOUT_REPO="${SCOUT_REPO:-/mnt/c/Users/Dell/Documents/Scout express}"

cd "$BENCH"
pkill -f "bench serve" 2>/dev/null || true
pkill -f "frappe serve" 2>/dev/null || true
pkill -f "gunicorn" 2>/dev/null || true
sleep 2
rm -f "sites/${SITE}/locks/"*.lock 2>/dev/null || true

reinstall_ok=0
for root_pw in "1234" "Athul@123" ""; do
  echo "==> Trying bench reinstall (db-root-password=${root_pw:-empty})..."
  set +e
  if [[ -n "$root_pw" ]]; then
    bench --site "$SITE" reinstall --yes --admin-password "$ADMIN_PW" --db-root-password "$root_pw" 2>&1 | tail -20
    rc=${PIPESTATUS[0]}
  else
    bench --site "$SITE" reinstall --yes --admin-password "$ADMIN_PW" 2>&1 | tail -20
    rc=${PIPESTATUS[0]}
  fi
  set -e
  if [[ "$rc" -eq 0 ]]; then
    reinstall_ok=1
    echo "==> Reinstall succeeded."
    break
  fi
  echo "==> Reinstall failed (exit $rc), trying next password..."
done

if [[ "$reinstall_ok" -ne 1 ]]; then
  echo "ERROR: reinstall failed with all passwords." >&2
  exit 1
fi

if [[ -d "$SCOUT_REPO/backend/apps/scout" ]]; then
  ln -sfn "$SCOUT_REPO/backend/apps/scout" apps/scout 2>/dev/null || true
fi

bench --site "$SITE" migrate
bench --site "$SITE" clear-cache
echo "==> DB reset complete. Administrator / $ADMIN_PW"
