# Start Next.js with current WSL bench IP (optional override in .env.local).
$ErrorActionPreference = "Stop"
$frontendDir = Split-Path -Parent $PSScriptRoot
Set-Location $frontendDir

try {
  $ip = (wsl hostname -I).Trim().Split(" ", [System.StringSplitOptions]::RemoveEmptyEntries)[0]
  if ($ip) {
    $line = "NEXT_FRAPPE_BACKEND_URL=http://${ip}:8000"
    $envFile = Join-Path $frontendDir ".env.local"
    $existing = @()
    if (Test-Path $envFile) {
      $existing = Get-Content $envFile | Where-Object { $_ -notmatch "^NEXT_FRAPPE_BACKEND_URL=" }
    }
    @("NEXT_PUBLIC_API_URL=/frappe", $line) + $existing | Set-Content $envFile -Encoding utf8
    Write-Host "WSL backend: http://${ip}:8000"
  }
} catch {
  Write-Host "Could not read WSL IP; proxy route will resolve at runtime."
}

npm run dev
