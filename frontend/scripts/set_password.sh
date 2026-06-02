#!/bin/bash
cd ~/frappe-bench
bench --site scout.localhost execute frappe.utils.password.update_password --args '["test.student.live@scout.dev", "Scout@1234"]' 2>&1
echo "Exit code: $?"
