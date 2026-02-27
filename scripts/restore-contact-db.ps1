[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)][string]$BackupFile,
    [Parameter(Mandatory = $true)][string]$TargetDb,
    [switch]$Overwrite,
    [string]$PythonPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
Set-Location $repoRoot

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

$pythonExe = Resolve-PythonExecutable -ExplicitPath $PythonPath
$args = @('scripts/restore_contact_db.py', '--backup-file', $BackupFile, '--target-db', $TargetDb)
if ($Overwrite) {
    $args += '--overwrite'
}
& $pythonExe @args
exit $LASTEXITCODE
