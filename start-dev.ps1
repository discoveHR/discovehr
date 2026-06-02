param(
    [switch]$ForceFrontendRestart
)

$ErrorActionPreference = "SilentlyContinue"

function Test-Url($url) {
    try {
        $resp = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
        return ($resp.StatusCode -ge 200 -and $resp.StatusCode -lt 500)
    } catch {
        return $false
    }
}

function Stop-FrontendPorts {
    $ports = @(3000, 3001, 3002, 3003)
    foreach ($p in $ports) {
        $lines = netstat -ano | Select-String ":$p\s"
        foreach ($line in $lines) {
            $parts = ($line.ToString() -replace "\s+", " ").Trim().Split(" ")
            $procId = $parts[-1]
            if ($procId -match "^[0-9]+$" -and $procId -ne "0") {
                taskkill /PID $procId /F | Out-Null
            }
        }
    }
}

function Test-WslBench {
    try {
        $code = wsl -e bash -lc "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:8000/api/method/frappe.ping 2>/dev/null"
        return ($code.Trim() -eq "200")
    } catch {
        return $false
    }
}

$backendUp = (Test-Url "http://localhost:8000/api/method/frappe.ping") -or (Test-WslBench)
if (-not $backendUp) {
    Write-Host "Starting Frappe backend (WSL bench)..."
    wsl -e bash -lc "fuser -k 8000/tcp 11000/tcp 13000/tcp 2>/dev/null; sleep 2" | Out-Null
    $benchScript = Join-Path $PSScriptRoot "backend\scripts\bench-dev-loop.sh"
    $wslBench = (wsl wslpath -a $benchScript).Trim()
    Start-Process -WindowStyle Normal powershell -ArgumentList "-NoExit", "-NoProfile", "-Command", "wsl -e bash -lc ""bash '$wslBench'"""
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 2
        $backendUp = (Test-Url "http://localhost:8000/api/method/frappe.ping") -or (Test-WslBench)
        if ($backendUp) { break }
    }
}

if ($ForceFrontendRestart) {
    Stop-FrontendPorts
}

function Test-FrontendProxy {
    return (Test-Url "http://localhost:3000/frappe/api/method/frappe.ping")
}

$frontendUp = Test-FrontendProxy
if (-not $frontendUp) {
    if (-not $ForceFrontendRestart) {
        Stop-FrontendPorts
    }
    Write-Host "Starting Next.js frontend..."
    $frontendPath = "c:\Users\Dell\Documents\Scout express\frontend"
    Start-Process -WindowStyle Normal powershell -ArgumentList "-NoExit", "-NoProfile", "-Command", "Set-Location '$frontendPath'; npm run dev"
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep -Seconds 2
        $frontendUp = Test-FrontendProxy
        if ($frontendUp) { break }
    }
}

if ($backendUp -and $frontendUp) {
    Write-Host "Dev stack is running."
    Write-Host "Frontend: http://localhost:3000"
    Write-Host "Backend:  http://localhost:8000"
} else {
    Write-Host "Stack started partially. Check terminal windows."
    Write-Host "backend_up=$backendUp frontend_up=$frontendUp"
}
