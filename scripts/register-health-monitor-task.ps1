[CmdletBinding()]
param(
    [string]$TaskName = 'PortfolioHealthMonitor',
    [int]$IntervalMinutes = 5,
    [string]$HealthUrl = 'http://127.0.0.1:8000/api/health',
    [switch]$Remove
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($IntervalMinutes -lt 1) {
    throw 'IntervalMinutes must be >= 1'
}

if ($Remove) {
    schtasks /Delete /TN $TaskName /F | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Removed scheduled task: $TaskName"
    } else {
        Write-Host "Task not found or could not be removed: $TaskName"
    }
    exit 0
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
$checkScript = Join-Path $repoRoot 'scripts\check-health.ps1'
if (-not (Test-Path $checkScript)) {
    throw "Health check script not found: $checkScript"
}

$taskCommand = "powershell.exe -NoProfile -ExecutionPolicy Bypass -File `"$checkScript`" -HealthUrl `"$HealthUrl`""

schtasks /Create /SC MINUTE /MO $IntervalMinutes /TN $TaskName /TR $taskCommand /F | Out-Null
if ($LASTEXITCODE -ne 0) {
    throw "Failed to create scheduled task: $TaskName"
}

Write-Host "Registered scheduled task: $TaskName every $IntervalMinutes minute(s)"
