[CmdletBinding()]
param(
    [string]$ServiceName = 'PortfolioPythonServer',
    [Alias('Host')]
    [string]$BindHost = '127.0.0.1',
    [int]$Port = 8000,
    [string]$EnvFile = 'portfolio.env.local.ps1',
    [string]$PythonPath,
    [switch]$StartNow
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
$runner = Join-Path $repoRoot 'scripts\run-server-service.ps1'
if (-not (Test-Path $runner)) {
    throw "run-server-service.ps1 not found in $repoRoot\scripts"
}

function Resolve-NssmExecutable {
    $nssm = Get-Command nssm -ErrorAction SilentlyContinue
    if ($nssm -and $nssm.Source -and (Test-Path $nssm.Source)) {
        return $nssm.Source
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

$nssmPath = Resolve-NssmExecutable
$resolvedPython = Resolve-PythonExecutable -ExplicitPath $PythonPath

sc.exe query $ServiceName 2>$null | Out-Null
if ($LASTEXITCODE -eq 0) {
    throw "Service '$ServiceName' already exists. Remove it first or use a different service name."
}

$logsDir = Join-Path $repoRoot 'logs\service'
New-Item -ItemType Directory -Force -Path $logsDir | Out-Null

$appArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$runner`" -BindHost $BindHost -Port $Port -EnvFile `"$EnvFile`" -PythonPath `"$resolvedPython`""
& $nssmPath install $ServiceName powershell.exe $appArgs | Out-Null
& $nssmPath set $ServiceName AppDirectory $repoRoot | Out-Null
& $nssmPath set $ServiceName Start SERVICE_AUTO_START | Out-Null
& $nssmPath set $ServiceName AppStdout (Join-Path $logsDir 'stdout.log') | Out-Null
& $nssmPath set $ServiceName AppStderr (Join-Path $logsDir 'stderr.log') | Out-Null
& $nssmPath set $ServiceName AppRotateFiles 1 | Out-Null
& $nssmPath set $ServiceName AppRotateOnline 1 | Out-Null

if ($StartNow) {
    sc.exe start $ServiceName | Out-Null
}

[pscustomobject]@{
    ServiceName = $ServiceName
    BindHost = $BindHost
    Port = $Port
    EnvFile = $EnvFile
    PythonPath = $resolvedPython
    NssmPath = $nssmPath
    Started = [bool]$StartNow
} | Format-List
