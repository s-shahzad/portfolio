[CmdletBinding()]
param(
    [string]$Owner = 's-shahzad',
    [string]$Repo = 'portfolio',
    [string]$Branch = 'main',
    [string[]]$RequiredChecks = @('checks'),
    [switch]$AllowAdminsPush
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$token = if ($env:GITHUB_TOKEN) { $env:GITHUB_TOKEN } elseif ($env:GH_TOKEN) { $env:GH_TOKEN } else { '' }
if ([string]::IsNullOrWhiteSpace($token)) {
    throw 'Set GITHUB_TOKEN or GH_TOKEN with repo administration scope before running this script.'
}

$checkObjects = @()
foreach ($check in $RequiredChecks) {
    if (-not [string]::IsNullOrWhiteSpace($check)) {
        $checkObjects += @{ context = $check }
    }
}
if ($checkObjects.Count -eq 0) {
    throw 'At least one required status check context must be provided.'
}

$body = @{
    required_status_checks = @{
        strict = $true
        checks = $checkObjects
    }
    enforce_admins = (-not $AllowAdminsPush)
    required_pull_request_reviews = @{
        dismiss_stale_reviews = $true
        require_code_owner_reviews = $false
        required_approving_review_count = 1
        require_last_push_approval = $true
    }
    restrictions = $null
    required_linear_history = $true
    allow_force_pushes = $false
    allow_deletions = $false
    block_creations = $false
    required_conversation_resolution = $true
    lock_branch = $false
    allow_fork_syncing = $true
}

$uri = "https://api.github.com/repos/$Owner/$Repo/branches/$Branch/protection"
$headers = @{
    Accept = 'application/vnd.github+json'
    Authorization = "Bearer $token"
    'X-GitHub-Api-Version' = '2022-11-28'
}

$payload = $body | ConvertTo-Json -Depth 10
$result = Invoke-RestMethod -Method Put -Uri $uri -Headers $headers -ContentType 'application/json' -Body $payload

[pscustomobject]@{
    Repo = "$Owner/$Repo"
    Branch = $Branch
    RequiredChecks = ($result.required_status_checks.checks | ForEach-Object { $_.context }) -join ', '
    EnforceAdmins = [bool]$result.enforce_admins.enabled
    RequireConversationResolution = [bool]$result.required_conversation_resolution.enabled
    RequireLinearHistory = [bool]$result.required_linear_history.enabled
} | Format-List
