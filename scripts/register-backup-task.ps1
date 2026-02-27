[CmdletBinding()]
param(
    [string]$TaskName = 'PortfolioContactDbBackup',
    [string]$DailyTime = '02:00',
    [int]$RetentionDays = 30,
    [switch]$Remove
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

if ($Remove) {
    if (Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue) {
        Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
        Write-Host "Removed scheduled task: $TaskName"
    } else {
        Write-Host "Task not found: $TaskName"
    }
    exit 0
}

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot
$backupScript = Join-Path $repoRoot 'scripts\backup-contact-db.ps1'
if (-not (Test-Path $backupScript)) {
    throw "Backup script not found: $backupScript"
}

$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$backupScript`" -RetentionDays $RetentionDays"
$trigger = New-ScheduledTaskTrigger -Daily -At $DailyTime

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Description 'Daily backup for portfolio contact SQLite database' -Force | Out-Null
Write-Host "Registered scheduled task: $TaskName at $DailyTime"
