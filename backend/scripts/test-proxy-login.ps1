$body = Get-Content -Raw "$PSScriptRoot\admin_login_body.json"
$r = Invoke-WebRequest `
  -Uri "http://localhost:3000/frappe/api/method/scout.api.admin_api.login" `
  -Method POST `
  -Body $body `
  -ContentType "application/json" `
  -UseBasicParsing `
  -TimeoutSec 30
Write-Output "Status: $($r.StatusCode)"
Write-Output $r.Content.Substring(0, [Math]::Min(400, $r.Content.Length))
