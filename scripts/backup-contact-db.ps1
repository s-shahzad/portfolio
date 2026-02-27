[CmdletBinding()]
param(
    [string]$SourceDb = 'contact_messages/messages.db',
    [string]$BackupDir = 'backups/contact-db',
    [int]$RetentionDays = 30,
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
& $pythonExe scripts/backup_contact_db.py --source-db $SourceDb --backup-dir $BackupDir --retention-days $RetentionDays
exit $LASTEXITCODE
