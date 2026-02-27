[CmdletBinding()]
param(
    [string]$Token,
    [int]$Iterations = 390000,
    [switch]$StoreInCredentialManager,
    [switch]$UseHashOnly,
    [string]$CredentialTargetToken = 'portfolio/admin-token',
    [string]$CredentialTargetTokenHash = 'portfolio/admin-token-hash',
    [string]$PythonPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$repoRoot = Split-Path -Parent $scriptRoot

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
Set-Location $repoRoot

$args = @('scripts/generate_admin_token_hash.py', '--iterations', [string]$Iterations, '--json')
if ($Token) {
    $args += @('--token', $Token)
}

$json = & $pythonExe @args | Out-String
$data = $json | ConvertFrom-Json

if ($StoreInCredentialManager) {
    $credScript = Join-Path $repoRoot 'scripts\credential-manager.ps1'
    if (-not (Test-Path $credScript)) {
        throw "Credential manager helper not found: $credScript"
    }
    . $credScript

    Set-PortfolioSecret -Target $CredentialTargetTokenHash -Secret $data.token_hash
    if ($UseHashOnly) {
        Remove-PortfolioSecret -Target $CredentialTargetToken | Out-Null
    } else {
        Set-PortfolioSecret -Target $CredentialTargetToken -Secret $data.token
    }
}

[pscustomobject]@{
    Token = $data.token
    TokenHash = $data.token_hash
    StoredInCredentialManager = [bool]$StoreInCredentialManager
    HashOnlyMode = [bool]$UseHashOnly
    CredentialTargetToken = $CredentialTargetToken
    CredentialTargetTokenHash = $CredentialTargetTokenHash
} | Format-List
