[CmdletBinding()]
param(
    [Alias('Host')]
    [string]$BindHost = '127.0.0.1',
    [int]$Port = 8100,
    [string]$EnvFile = 'portfolio.env.staging.ps1',
    [string]$PythonPath,
    [int]$HealthTimeoutSeconds = 20
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$deployScript = Join-Path $scriptRoot 'deploy.ps1'
if (-not (Test-Path $deployScript)) {
    throw "deploy.ps1 not found in $scriptRoot"
}

$args = @(
    '-ExecutionPolicy', 'Bypass',
    '-File', $deployScript,
    '-BindHost', $BindHost,
    '-Port', [string]$Port,
    '-EnvFile', $EnvFile,
    '-HealthTimeoutSeconds', [string]$HealthTimeoutSeconds
)
if ($PythonPath) {
    $args += @('-PythonPath', $PythonPath)
}

& powershell @args
exit $LASTEXITCODE
