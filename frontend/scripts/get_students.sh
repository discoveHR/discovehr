#!/bin/bash
# Check columns in the table
echo "=== Table columns ==="
mysql -u scout_localhost -piP3k0qWnSCRWiMlN scout_localhost -e "DESCRIBE \`tabScout Student Profile\`;" | grep -E "aadhaar|user|name"

echo ""
echo "=== Student records ==="
mysql -u scout_localhost -piP3k0qWnSCRWiMlN scout_localhost -e "SELECT name, owner, full_name, aadhaar_number FROM \`tabScout Student Profile\` LIMIT 10;"
