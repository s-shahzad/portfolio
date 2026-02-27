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

$resolvedEnvFile = if ([System.IO.Path]::IsPathRooted($EnvFile)) { $EnvFile } else { Join-Path $repoRoot $EnvFile }
if (Test-Path $resolvedEnvFile) {
    . $resolvedEnvFile
}

$pythonExe = Resolve-PythonExecutable -ExplicitPath $PythonPath
Set-Location $repoRoot
& $pythonExe $serverPath --host $BindHost --port $Port
exit $LASTEXITCODE
