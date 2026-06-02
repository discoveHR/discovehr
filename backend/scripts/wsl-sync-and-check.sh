#!/usr/bin/env bash
set -eu
cd /home/dell/frappe-bench
bench --site scout.localhost execute scout.bootstrap.force_sync_scout_doctypes
bench --site scout.localhost execute scout.dev_check.portal_token_doctype_ready
