#!/usr/bin/env bash
set -euo pipefail
rsync -a "/mnt/c/Users/Dell/Documents/Scout express/backend/apps/scout/" ~/frappe-bench/apps/scout/
cd ~/frappe-bench
bench restart
sleep 2
bench --site all execute scout.api.company_api.list_approved_freelancer_interviewers 2>&1 | head -20
