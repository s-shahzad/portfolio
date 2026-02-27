[CmdletBinding()]
param(
    [string]$ServiceName = 'PortfolioPythonServer'
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

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
    return $null
}

$nssmPath = Resolve-NssmExecutable

sc.exe query $ServiceName 2>$null | Out-Null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Service '$ServiceName' was not found."
    exit 0
}

if ($nssmPath) {
    & $nssmPath stop $ServiceName | Out-Null
    & $nssmPath remove $ServiceName confirm | Out-Null
} else {
    sc.exe stop $ServiceName | Out-Null
    Start-Sleep -Seconds 2
    sc.exe delete $ServiceName | Out-Null
}

Write-Host "Service '$ServiceName' removed."
