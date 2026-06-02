# Start Scout sidecar microservices (Windows). Requires Python 3.10+ and pip install per service.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

if (-not (Test-Path "$root\.env")) {
  Copy-Item "$root\.env.example" "$root\.env"
  Write-Host "Created services/.env from .env.example — edit before production."
}

function Start-ServiceWindow($name, $dir, $port) {
  $wslPath = (wsl wslpath -a $dir 2>$null)
  if ($wslPath) {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
cd '$dir'
pip install -q -r requirements.txt 2>`$null
`$env:PYTHONPATH='$root'
uvicorn main:app --host 127.0.0.1 --port $port
"@
  } else {
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$dir'; pip install -q -r requirements.txt; uvicorn main:app --host 127.0.0.1 --port $port"
  }
  Write-Host "Started $name on port $port"
}

Start-ServiceWindow "integration-service" "$root\integration-service" 8101
Start-ServiceWindow "notification-service" "$root\notification-service" 8102
Start-ServiceWindow "payment-service" "$root\payment-service" 8103

Write-Host "Sidecars starting. Enable in backend/.env with SCOUT_USE_MICROSERVICES=1"
