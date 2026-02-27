[CmdletBinding(DefaultParameterSetName = 'None')]
param(
    [Parameter(ParameterSetName = 'Set', Mandatory = $true)][string]$SetTarget,
    [Parameter(ParameterSetName = 'Set', Mandatory = $true)][string]$SetSecret,
    [Parameter(ParameterSetName = 'Set')][string]$SetUsername = 'portfolio',
    [Parameter(ParameterSetName = 'Get', Mandatory = $true)][string]$GetTarget,
    [Parameter(ParameterSetName = 'Remove', Mandatory = $true)][string]$RemoveTarget
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function Resolve-Cmdkey {
    $cmd = Get-Command cmdkey.exe -ErrorAction SilentlyContinue
    if (-not $cmd -or -not $cmd.Source) {
        throw 'cmdkey.exe not found. Credential Manager operations are unavailable.'
    }
    return $cmd.Source
}

function Initialize-CredentialInterop {
    if (-not ([System.Management.Automation.PSTypeName]'PortfolioCredMan.Native').Type) {
        Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

namespace PortfolioCredMan {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct CREDENTIAL {
        public UInt32 Flags;
        public UInt32 Type;
        public string TargetName;
        public string Comment;
        public System.Runtime.InteropServices.ComTypes.FILETIME LastWritten;
        public UInt32 CredentialBlobSize;
        public IntPtr CredentialBlob;
        public UInt32 Persist;
        public UInt32 AttributeCount;
        public IntPtr Attributes;
        public string TargetAlias;
        public string UserName;
    }

    public static class Native {
        [DllImport("Advapi32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
        public static extern bool CredRead(string target, uint type, int reservedFlag, out IntPtr credentialPtr);

        [DllImport("Advapi32.dll", SetLastError = true)]
        public static extern void CredFree(IntPtr cred);
    }
}
"@
    }
}

function Set-PortfolioSecret {
    param(
        [Parameter(Mandatory = $true)][string]$Target,
        [Parameter(Mandatory = $true)][string]$Secret,
        [string]$Username = 'portfolio'
    )

    if ([string]::IsNullOrWhiteSpace($Target)) {
        throw 'Target must not be empty.'
    }

    $cmdkey = Resolve-Cmdkey
    & $cmdkey /generic:$Target /user:$Username /pass:$Secret | Out-Null
    if ($LASTEXITCODE -ne 0) {
        throw "Failed to store credential for target '$Target'."
    }
}

function Get-PortfolioSecret {
    param([Parameter(Mandatory = $true)][string]$Target)

    Initialize-CredentialInterop

    $ptr = [IntPtr]::Zero
    $ok = [PortfolioCredMan.Native]::CredRead($Target, 1, 0, [ref]$ptr)
    if (-not $ok -or $ptr -eq [IntPtr]::Zero) {
        return ''
    }

    try {
        $cred = [System.Runtime.InteropServices.Marshal]::PtrToStructure($ptr, [type][PortfolioCredMan.CREDENTIAL])
        if ($cred.CredentialBlobSize -le 0 -or $cred.CredentialBlob -eq [IntPtr]::Zero) {
            return ''
        }

        $bytes = New-Object byte[] $cred.CredentialBlobSize
        [System.Runtime.InteropServices.Marshal]::Copy($cred.CredentialBlob, $bytes, 0, $cred.CredentialBlobSize)
        return ([Text.Encoding]::Unicode.GetString($bytes)).Trim([char]0)
    }
    finally {
        [PortfolioCredMan.Native]::CredFree($ptr)
    }
}

function Remove-PortfolioSecret {
    param([Parameter(Mandatory = $true)][string]$Target)

    $cmdkey = Resolve-Cmdkey
    & $cmdkey /delete:$Target | Out-Null
}

switch ($PSCmdlet.ParameterSetName) {
    'Set' {
        Set-PortfolioSecret -Target $SetTarget -Secret $SetSecret -Username $SetUsername
        Write-Host "Stored secret in Credential Manager: $SetTarget"
    }
    'Get' {
        $value = Get-PortfolioSecret -Target $GetTarget
        if ($value) {
            Write-Output $value
        }
    }
    'Remove' {
        Remove-PortfolioSecret -Target $RemoveTarget
        Write-Host "Removed secret from Credential Manager: $RemoveTarget"
    }
    default {
        # Imported as helper module
    }
}
