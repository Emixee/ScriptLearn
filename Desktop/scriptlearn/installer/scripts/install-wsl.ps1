# install-wsl.ps1
# Enables WSL2 and installs Ubuntu 22.04 LTS

param(
    [string]$LogFile = "$env:TEMP\ScriptLearn-install.log"
)

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$ts  $Message" | Tee-Object -FilePath $LogFile -Append
}

Write-Log "=== WSL2 + Ubuntu 22.04 Installation ==="

# ── 1. Check if WSL + bash.exe already present ──────────────────────────────
if (Test-Path "C:\Windows\System32\bash.exe") {
    Write-Log "bash.exe already present — checking Ubuntu 22.04..."
    $distros = wsl --list --quiet 2>$null
    if ($distros -match "Ubuntu-24.04") {
        Write-Log "Ubuntu-24.04 already installed. Skipping WSL install."
        exit 0
    }
}

# ── 2. Enable Windows optional features ─────────────────────────────────────
Write-Log "Enabling Microsoft-Windows-Subsystem-Linux feature..."
$wslFeature = dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart 2>&1
Write-Log $wslFeature

Write-Log "Enabling VirtualMachinePlatform feature..."
$vmFeature = dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart 2>&1
Write-Log $vmFeature

# ── 3. Set WSL2 as default ───────────────────────────────────────────────────
Write-Log "Setting WSL default version to 2..."
wsl --set-default-version 2 2>&1 | ForEach-Object { Write-Log $_ }

# ── 4. Install Ubuntu 22.04 via wsl --install ────────────────────────────────
Write-Log "Installing Ubuntu-24.04 (no interactive launch)..."
$result = wsl --install -d Ubuntu-24.04 --no-launch 2>&1
Write-Log $result

if ($LASTEXITCODE -ne 0) {
    # Fallback: try winget
    Write-Log "wsl --install returned $LASTEXITCODE — trying winget fallback..."
    winget install --id Canonical.Ubuntu.2204 --silent --accept-source-agreements --accept-package-agreements 2>&1 | ForEach-Object { Write-Log $_ }
}

# ── 5. Verify ────────────────────────────────────────────────────────────────
Start-Sleep -Seconds 5
$distros = wsl --list --quiet 2>$null
if ($distros -match "Ubuntu-24.04") {
    Write-Log "Ubuntu-24.04 installed successfully."
    exit 0
} else {
    Write-Log "WARNING: Could not confirm Ubuntu-24.04 installation. A system restart may be required."
    # Créer un fichier marqueur pour que l'installeur Inno Setup affiche le popup de redémarrage
    "restart_needed" | Out-File "$env:TEMP\sl-wsl-restart.flag" -Encoding ascii -NoNewline
    exit 3
}
