[CmdletBinding()]
param(
    [string]$HealthUrl = 'http://127.0.0.1:8000/api/health',
    [int]$TimeoutSec = 8,
    [string]$LogFile = 'logs/monitor/health-monitor.log',
    [string]$StateFile = 'logs/monitor/health-monitor.state.json',
    [string]$AlertWebhookUrl = '',
    [int]$AlertCooldownMinutes = 30
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot

if (-not $AlertWebhookUrl -and $env:PORTFOLIO_ALERT_WEBHOOK_URL) {
    $AlertWebhookUrl = $env:PORTFOLIO_ALERT_WEBHOOK_URL
}

$resolvedLog = if ([System.IO.Path]::IsPathRooted($LogFile)) { $LogFile } else { Join-Path $repoRoot $LogFile }
$resolvedState = if ([System.IO.Path]::IsPathRooted($StateFile)) { $StateFile } else { Join-Path $repoRoot $StateFile }

New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resolvedLog) | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $resolvedState) | Out-Null

function Write-LogLine {
    param([string]$Level, [string]$Message)
    $line = "{0} [{1}] {2}" -f ((Get-Date).ToString('s')), $Level, $Message
    Add-Content -Path $resolvedLog -Value $line
    Write-Host $line
}

function Get-State {
    if (-not (Test-Path $resolvedState)) {
        return @{ last_alert_utc = '' }
    }
    try {
        return (Get-Content $resolvedState -Raw | ConvertFrom-Json -AsHashtable)
    } catch {
        return @{ last_alert_utc = '' }
    }
}

function Save-State {
    param([hashtable]$State)
    $State | ConvertTo-Json | Set-Content -Path $resolvedState -Encoding UTF8
}

$state = Get-State

try {
    $response = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec $TimeoutSec
    if ($response.ok -eq $true) {
        Write-LogLine -Level 'INFO' -Message "Health check OK ($HealthUrl)"
        exit 0
    }
    throw "Health endpoint returned ok=false"
} catch {
    $errText = $_.Exception.Message
    Write-LogLine -Level 'ERROR' -Message "Health check failed ($HealthUrl): $errText"

    if ($AlertWebhookUrl) {
        $canAlert = $true
        if ($state.ContainsKey('last_alert_utc') -and $state.last_alert_utc) {
            $last = [datetime]::Parse($state.last_alert_utc).ToUniversalTime()
            $mins = ((Get-Date).ToUniversalTime() - $last).TotalMinutes
            if ($mins -lt $AlertCooldownMinutes) {
                $canAlert = $false
            }
        }

        if ($canAlert) {
            $payload = @{
                text = "Portfolio health check failed"
                health_url = $HealthUrl
                timestamp_utc = (Get-Date).ToUniversalTime().ToString('o')
                error = $errText
            }
            try {
                Invoke-RestMethod -Method Post -Uri $AlertWebhookUrl -ContentType 'application/json' -Body ($payload | ConvertTo-Json -Depth 5) | Out-Null
                $state.last_alert_utc = (Get-Date).ToUniversalTime().ToString('o')
                Save-State -State $state
                Write-LogLine -Level 'WARN' -Message 'Alert webhook notification sent.'
            } catch {
                Write-LogLine -Level 'ERROR' -Message "Alert webhook failed: $($_.Exception.Message)"
            }
        } else {
            Write-LogLine -Level 'INFO' -Message 'Alert suppressed by cooldown window.'
        }
    }

    exit 1
}
