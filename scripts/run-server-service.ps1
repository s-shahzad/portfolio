[CmdletBinding()]
param(
    [Alias('Host')]
    [string]$BindHost = '127.0.0.1',
    [int]$Port = 8000,
    [string]$EnvFile = 'portfolio.env.local.ps1',
    [string]$PythonPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
$serverPath = Join-Path $repoRoot 'server.py'
if (-not (Test-Path $serverPath)) {
    throw "server.py not found in $repoRoot"
}

function Resolve-PythonExecutable {
    param([string]$ExplicitPath)

    if ($ExplicitPath) {
        if (-not (Test-Path $ExplicitPath)) {
            throw "PythonPath not found: $ExplicitPath"
        }
        return (Resolve-Path $ExplicitPath).Path
    }

    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python -and $python.Source -and (Test-Path $python.Source)) {
        return $python.Source
    }

    throw 'Python executable not found. Install Python or pass -PythonPath.'
}


function Import-CredentialHelpers {
    $credScript = Join-Path $repoRoot 'scripts\credential-manager.ps1'
    if (Test-Path $credScript) {
        . $credScript
        return $true
    }
    return $false
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

$resolvedEnvFile = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $repoRoot $EnvFile }
if (Test-Path $resolvedEnvFile) {
    . $resolvedEnvFile
}

if (Import-CredentialHelpers) {
    Load-SecretsFromCredentialManager
}

$pythonExe = Resolve-PythonExecutable -ExplicitPath $PythonPath
Set-Location $repoRoot
& $pythonExe $serverPath --host $BindHost --port $Port
exit $LASTEXITCODE
