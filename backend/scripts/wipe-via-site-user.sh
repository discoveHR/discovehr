#!/usr/bin/env bash
set -euo pipefail
cd "${FRAPPE_BENCH_ROOT:-/home/dell/frappe-bench}"
SITE="${FRAPPE_SITE:-scout.localhost}"
pkill -f "bench serve" 2>/dev/null || true
sleep 2
rm -f "sites/${SITE}/locks/"*.lock 2>/dev/null || true
bench --site "$SITE" execute scout.api.dev_reset_site.fresh_start_yes
bench --site "$SITE" migrate
bench --site "$SITE" clear-cache
echo DONE
