# check-requirements.ps1
# Verifies Windows version supports WSL2 (requires Win10 1903+ / Build 18362+)

param(
    [string]$LogFile = "$env:TEMP\ScriptLearn-install.log"
)

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$ts  $Message" | Tee-Object -FilePath $LogFile -Append
}

Write-Log "=== ScriptLearn Requirements Check ==="

# Windows build check
$build = [System.Environment]::OSVersion.Version.Build
Write-Log "Windows build: $build"

if ($build -lt 18362) {
    Write-Log "ERROR: Windows build $build is too old. WSL2 requires Windows 10 build 18362 or later."
    exit 1
}

# Virtualization check
$virt = (Get-WmiObject -Class Win32_ComputerSystem).HypervisorPresent
Write-Log "Hypervisor present: $virt"

# Check if running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
Write-Log "Running as administrator: $isAdmin"

if (-not $isAdmin) {
    Write-Log "ERROR: Installer must run as Administrator to install WSL."
    exit 2
}

Write-Log "Requirements check passed."
exit 0
