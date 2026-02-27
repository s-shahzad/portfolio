[CmdletBinding()]
param(
    [Alias('Host')]
    [string]$BindHost = '0.0.0.0',
    [int]$Port = 8000,
    [string]$EnvFile = 'portfolio.env.local.ps1',
    [string]$PythonPath,
    [int]$HealthTimeoutSeconds = 20,
    [switch]$NoStopExisting
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$startScript = Join-Path $scriptRoot 'start-server.ps1'
if (-not (Test-Path $startScript)) {
    throw "start-server.ps1 not found in $scriptRoot"
}

$localUrl = "http://127.0.0.1:$Port"

$argsList = @(
    '-ExecutionPolicy', 'Bypass',
    '-File', $startScript,
    '-BindHost', $BindHost,
    '-Port', [string]$Port,
    '-Background',
    '-EnvFile', $EnvFile
)
if (-not $NoStopExisting) {
    $argsList += '-StopExisting'
}
if ($PythonPath) {
    $argsList += @('-PythonPath', $PythonPath)
}

Write-Host "Starting/restarting portfolio server via start-server.ps1 ..."
& powershell @argsList
if ($LASTEXITCODE -ne 0) {
    throw "start-server.ps1 failed with exit code $LASTEXITCODE"
}

$deadline = (Get-Date).AddSeconds($HealthTimeoutSeconds)
$lastErr = $null
$health = $null
while ((Get-Date) -lt $deadline) {
    try {
        $health = Invoke-RestMethod -Uri "$localUrl/api/health" -TimeoutSec 5
        if ($health.ok -eq $true) {
            break
        }
    } catch {
        $lastErr = $_.Exception.Message
    }
    Start-Sleep -Milliseconds 500
}

if (-not $health -or $health.ok -ne $true) {
    $msg = if ($lastErr) { $lastErr } else { 'health endpoint did not return ok=true in time' }
    throw "Deployment health check failed: $msg"
}

Write-Host 'Deployment health check passed.'
[pscustomobject]@{
    LocalUrl = $localUrl
    AdminMode = $health.admin_panel.mode
    SmtpEnabled = $health.smtp_enabled
    ContactStore = $health.contact_store
    Timestamp = $health.timestamp
} | Format-List
