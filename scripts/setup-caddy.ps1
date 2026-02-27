[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$Domain,
    [Alias('Host')]
    [string]$BackendHost = '127.0.0.1',
    [int]$BackendPort = 8000,
    [switch]$InstallWithWinget,
    [switch]$InstallService,
    [string]$ServiceName = 'PortfolioCaddyProxy'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
$templatePath = Join-Path $repoRoot 'ops\Caddyfile.example'
$configPath = Join-Path $repoRoot 'ops\Caddyfile'
$accessLogDir = Join-Path $repoRoot 'logs'
$accessLogPath = Join-Path $accessLogDir 'caddy-access.log'

if (-not (Test-Path $templatePath)) {
    throw "Template not found: $templatePath"
}

if ($InstallWithWinget) {
    winget install --id CaddyServer.Caddy -e --accept-package-agreements --accept-source-agreements
}

function Resolve-CaddyExecutable {
    $cmd = Get-Command caddy -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source -and (Test-Path $cmd.Source)) {
        return $cmd.Source
    }

    $candidates = @(
        'C:\Users\shaik\AppData\Local\Microsoft\WinGet\Links\caddy.exe',
        'C:\Program Files\Caddy\caddy.exe'
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    throw 'caddy executable not found. Install Caddy or run with -InstallWithWinget.'
}

function Resolve-NssmExecutable {
    $cmd = Get-Command nssm -ErrorAction SilentlyContinue
    if ($cmd -and $cmd.Source -and (Test-Path $cmd.Source)) {
        return $cmd.Source
    }

    $candidates = @(
        'C:\Users\shaik\AppData\Local\Microsoft\WinGet\Links\nssm.exe',
        'C:\Program Files\nssm\win64\nssm.exe',
        'C:\Program Files\nssm\nssm.exe'
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) {
            return $candidate
        }
    }

    throw 'nssm executable not found. Install NSSM first (winget install NSSM.NSSM).'
}

$caddyPath = Resolve-CaddyExecutable

New-Item -ItemType Directory -Force -Path $accessLogDir | Out-Null

$content = Get-Content $templatePath -Raw
$content = $content.Replace('__DOMAIN__', $Domain)
$content = $content.Replace('__BACKEND__', "$BackendHost`:$BackendPort")
$content = $content.Replace('__ACCESS_LOG__', ($accessLogPath -replace '\\','/'))
Set-Content -Path $configPath -Value $content -Encoding UTF8

if ($InstallService) {
    $nssmPath = Resolve-NssmExecutable

    sc.exe query $ServiceName 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        & $nssmPath stop $ServiceName | Out-Null
        & $nssmPath remove $ServiceName confirm | Out-Null
    }

    $logsDir = Join-Path $repoRoot 'logs\caddy-service'
    New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

    $args = "run --config `"$configPath`" --adapter caddyfile"
    & $nssmPath install $ServiceName $caddyPath $args | Out-Null
    & $nssmPath set $ServiceName AppDirectory $repoRoot | Out-Null
    & $nssmPath set $ServiceName Start SERVICE_AUTO_START | Out-Null
    & $nssmPath set $ServiceName AppStdout (Join-Path $logsDir 'stdout.log') | Out-Null
    & $nssmPath set $ServiceName AppStderr (Join-Path $logsDir 'stderr.log') | Out-Null
    & $nssmPath set $ServiceName AppRotateFiles 1 | Out-Null
    & $nssmPath set $ServiceName AppRotateOnline 1 | Out-Null

    sc.exe start $ServiceName | Out-Null
} else {
    & $caddyPath start --config $configPath
}

[pscustomobject]@{
    Domain = $Domain
    Backend = "$BackendHost`:$BackendPort"
    CaddyConfig = $configPath
    CaddyPath = $caddyPath
    Mode = if ($InstallService) { 'service' } else { 'background-process' }
    ServiceName = if ($InstallService) { $ServiceName } else { '' }
} | Format-List
