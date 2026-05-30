[CmdletBinding()]
param(
    [int]$SmokePort = 8123,
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

function Invoke-CheckedCommand {
    param(
        [Parameter(Mandatory = $true)][string]$Label,
        [Parameter(Mandatory = $true)][string]$FilePath,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    Write-Host "==> $Label"
    & $FilePath @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "$Label failed with exit code $LASTEXITCODE"
    }
}

$pythonExe = Resolve-PythonExecutable -ExplicitPath $PythonPath
Write-Host "Python: $pythonExe"

Invoke-CheckedCommand -Label 'Python compile check' -FilePath $pythonExe -Arguments @('-m', 'py_compile', 'src/server.py')
Invoke-CheckedCommand -Label 'JS syntax check (script.js)' -FilePath 'node' -Arguments @('--check', 'script.js')
Invoke-CheckedCommand -Label 'Static HTML sanity' -FilePath $pythonExe -Arguments @('src/scripts/static_sanity.py')
Invoke-CheckedCommand -Label 'Accessibility/performance sanity' -FilePath $pythonExe -Arguments @('src/scripts/accessibility_perf_sanity.py')
Invoke-CheckedCommand -Label 'API smoke tests' -FilePath $pythonExe -Arguments @('src/scripts/api_smoke_test.py', '--port', [string]$SmokePort)

if (Test-Path 'src/tests') {
    Invoke-CheckedCommand -Label 'Pytest integration tests' -FilePath $pythonExe -Arguments @('-m', 'pytest', '-q', 'src/tests')
}

Write-Host 'All checks passed.'

