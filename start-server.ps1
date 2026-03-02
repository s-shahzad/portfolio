[CmdletBinding()]
param(
    [Alias('Host')]
    [string]$BindHost = '0.0.0.0',
    [int]$Port = 8000,
    [switch]$Background,
    [switch]$StopExisting,
    [string]$EnvFile = 'portfolio.env.local.ps1',
    [string]$PythonPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$serverPath = Join-Path $scriptRoot 'server.py'
if (-not (Test-Path $serverPath)) {
    throw "server.py not found in $scriptRoot"
}

function Resolve-PythonExecutable {
    param([string]$ExplicitPath)

    $candidates = New-Object System.Collections.Generic.List[string]
    if ($ExplicitPath) {
        $candidates.Add($ExplicitPath)
    }

    if ($env:LOCALAPPDATA) {
        foreach ($ver in @('Python312', 'Python313', 'Python311', 'Python310')) {
            $candidates.Add((Join-Path $env:LOCALAPPDATA "Programs\\Python\\$ver\\python.exe"))
        }
    }

    foreach ($candidate in $candidates) {
        if ([string]::IsNullOrWhiteSpace($candidate)) { continue }
        if (Test-Path $candidate) {
            return (Resolve-Path $candidate).Path
        }
    }

    $pyCmd = Get-Command python -ErrorAction SilentlyContinue
    if ($pyCmd -and $pyCmd.Source -and (Test-Path $pyCmd.Source)) {
        return $pyCmd.Source
    }

    throw 'Python executable not found. Install Python or pass -PythonPath.'
}

function Get-ListenerOnPort {
    param([int]$LocalPort)
    return Get-NetTCPConnection -LocalPort $LocalPort -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
}


function Get-CredentialHelperScript {
    $credScript = Join-Path $scriptRoot 'scripts\credential-manager.ps1'
    if (Test-Path $credScript) {
        return $credScript
    }
    return $null
}

function Load-SecretsFromCredentialManager {
    if (-not (Get-Command Get-PortfolioSecret -ErrorAction SilentlyContinue)) {
        return
    }

    if (-not $env:PORTFOLIO_ADMIN_TOKEN -and -not $env:PORTFOLIO_ADMIN_TOKEN_HASH) {
        $adminToken = Get-PortfolioSecret -Target 'portfolio/admin-token'
        if ($adminToken) {
            $env:PORTFOLIO_ADMIN_TOKEN = $adminToken
        }

        $adminTokenHash = Get-PortfolioSecret -Target 'portfolio/admin-token-hash'
        if ($adminTokenHash) {
            $env:PORTFOLIO_ADMIN_TOKEN_HASH = $adminTokenHash
        }
    }

    if (-not $env:PORTFOLIO_SMTP_PASSWORD) {
        $smtpPassword = Get-PortfolioSecret -Target 'portfolio/smtp-password'
        if ($smtpPassword) {
            $env:PORTFOLIO_SMTP_PASSWORD = $smtpPassword
        }
    }
}

function Get-PrimaryIPv4 {
    try {
        $route = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction Stop |
            Sort-Object -Property RouteMetric, ifMetric |
            Select-Object -First 1
        if ($null -eq $route) { return $null }
        $ip = Get-NetIPAddress -InterfaceIndex $route.ifIndex -AddressFamily IPv4 -ErrorAction Stop |
            Where-Object { $_.IPAddress -notlike '127.*' -and $_.ValidLifetime -gt 0 } |
            Sort-Object -Property SkipAsSource |
            Select-Object -First 1
        return $ip.IPAddress
    } catch {
        return $null
    }
}

$resolvedEnvFile = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $scriptRoot $EnvFile }
if (Test-Path $resolvedEnvFile) {
    . $resolvedEnvFile
    Write-Host "Loaded env file: $resolvedEnvFile"
} else {
    Write-Host "Optional env file not found: $resolvedEnvFile"
}

$credHelperScript = Get-CredentialHelperScript
if ($credHelperScript) {
    . $credHelperScript
    Load-SecretsFromCredentialManager
}

$pythonExe = Resolve-PythonExecutable -ExplicitPath $PythonPath
Write-Host "Python: $pythonExe"

if ($StopExisting) {
    $existing = Get-ListenerOnPort -LocalPort $Port
    if ($existing) {
        Write-Host "Stopping existing listener on port $Port (PID $($existing.OwningProcess))"
        Stop-Process -Id $existing.OwningProcess -Force -ErrorAction Stop
        Start-Sleep -Milliseconds 400
    }
}

$arguments = @('server.py', '--host', $BindHost, '--port', [string]$Port)
$localUrl = "http://127.0.0.1:$Port"
$lanIp = Get-PrimaryIPv4
$lanUrl = if ($lanIp) { "http://$lanIp`:$Port" } else { $null }

$smtpConfigured = [bool]($env:PORTFOLIO_SMTP_PROVIDER -or $env:PORTFOLIO_SMTP_HOST)
$adminTokenConfigured = [bool]($env:PORTFOLIO_ADMIN_TOKEN -or $env:PORTFOLIO_ADMIN_TOKEN_HASH)
Write-Host ("SMTP configured: {0}" -f $smtpConfigured)
Write-Host ("Admin token configured: {0}" -f $adminTokenConfigured)

if ($Background) {
    $proc = Start-Process -FilePath $pythonExe -ArgumentList $arguments -WorkingDirectory $scriptRoot -PassThru -WindowStyle Hidden
    Start-Sleep -Seconds 2

    $health = $null
    $healthError = $null
    try {
        $health = Invoke-RestMethod -Uri "$localUrl/api/health" -TimeoutSec 10
    } catch {
        $healthError = $_.Exception.Message
    }

    [pscustomobject]@{
        Started = $true
        Pid = $proc.Id
        LocalUrl = $localUrl
        LanUrl = $lanUrl
        Server = if ($health) { $health.server } else { $null }
        HealthOk = if ($health) { [bool]$health.ok } else { $false }
        ContactStore = if ($health) { $health.contact_store } else { $null }
        ProjectsStore = if ($health) { $health.projects_store } else { $null }
        AdminMode = if ($health) { $health.admin_panel.mode } else { $null }
        SmtpEnabled = if ($health) { [bool]$health.smtp_enabled } else { $null }
        HealthError = $healthError
    } | Format-List
    return
}

Write-Host "Starting portfolio server in foreground..."
Write-Host "Local URL: $localUrl"
if ($lanUrl) { Write-Host "LAN URL:   $lanUrl" }
Write-Host "Press Ctrl+C to stop."
& $pythonExe @arguments
exit $LASTEXITCODE
