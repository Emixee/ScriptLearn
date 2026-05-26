# install-wsl-offline.ps1
# Installe Ubuntu 22.04 pour WSL2 entièrement hors-ligne via wsl --import.
# Si les features WSL doivent être activées, un redémarrage est nécessaire ;
# un RunOnce Registry est alors enregistré pour finaliser l'import après reboot.

param(
    [string]$UbuntuTar,                                    # Chemin vers ubuntu-22.04-wsl.tar.gz
    [string]$LogFile = "$env:TEMP\ScriptLearn-install.log"
)

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$ts  $Message" | Tee-Object -FilePath $LogFile -Append
}

Write-Log "=== WSL2 + Ubuntu 22.04 (offline via wsl --import) ==="
Write-Log "UbuntuTar: $UbuntuTar"

# ── 1. Déjà installé ? ────────────────────────────────────────────────────────
$distros = wsl --list --quiet 2>$null | Out-String
if ($distros -match "Ubuntu-24.04") {
    Write-Log "Ubuntu-24.04 already present. Skipping."
    exit 0
}

# ── 2. Copier le tarball vers un emplacement permanent ───────────────────────
# (l'emplacement {tmp} de l'installeur est supprimé après install)
$slDir  = "$env:LOCALAPPDATA\ScriptLearn"
$permTar = "$slDir\ubuntu-22.04-wsl.tar.gz"
$wslInstallDir = "$slDir\Ubuntu-24.04"

New-Item -ItemType Directory -Force -Path $slDir | Out-Null
New-Item -ItemType Directory -Force -Path $wslInstallDir | Out-Null

if (-not (Test-Path $permTar)) {
    Write-Log "Copie tarball vers $permTar ..."
    Copy-Item $UbuntuTar $permTar -Force
}

# ── 3. Activer les features Windows ──────────────────────────────────────────
Write-Log "Activation Microsoft-Windows-Subsystem-Linux..."
dism.exe /online /enable-feature /featurename:Microsoft-Windows-Subsystem-Linux /all /norestart 2>&1 | ForEach-Object { Write-Log $_ }

Write-Log "Activation VirtualMachinePlatform..."
dism.exe /online /enable-feature /featurename:VirtualMachinePlatform /all /norestart 2>&1 | ForEach-Object { Write-Log $_ }

# ── 4. Enregistrer un RunOnce pour finaliser l'import après reboot ────────────
# Ce script s'exécutera automatiquement après le prochain redémarrage.
$postRebootScript = "$slDir\complete-wsl-import.ps1"

$scriptContent = @"
# complete-wsl-import.ps1 — exécuté automatiquement après reboot par RunOnce
`$logFile = "`$env:TEMP\ScriptLearn-wsl-import.log"
"Starting Ubuntu-24.04 import after reboot..." | Out-File `$logFile
wsl --set-default-version 2 2>&1 | Out-File `$logFile -Append
wsl --import Ubuntu-24.04 "$wslInstallDir" "$permTar" --version 2 2>&1 | Out-File `$logFile -Append
Start-Sleep -Seconds 3
Remove-Item "$permTar" -Force -ErrorAction SilentlyContinue
Remove-Item "`$MyInvocation.MyCommand.Path" -Force -ErrorAction SilentlyContinue
"@

$scriptContent | Set-Content $postRebootScript -Encoding UTF8
Write-Log "Script post-reboot créé : $postRebootScript"

# Enregistrer dans RunOnce (s'exécute une seule fois après le prochain login)
$runOnceValue = "powershell.exe -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$postRebootScript`""
Set-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce" `
    -Name "ScriptLearn-WSL-Import" -Value $runOnceValue
Write-Log "RunOnce enregistré."

# ── 5. Tenter l'import immédiatement (fonctionne si WSL déjà activé) ─────────
Write-Log "Tentative wsl --set-default-version 2..."
wsl --set-default-version 2 2>&1 | ForEach-Object { Write-Log $_ }

Write-Log "Tentative wsl --import Ubuntu-24.04 ..."
wsl --import Ubuntu-24.04 $wslInstallDir $permTar --version 2 2>&1 | ForEach-Object { Write-Log $_ }

Start-Sleep -Seconds 4

$distrosAfter = wsl --list --quiet 2>$null | Out-String
if ($distrosAfter -match "Ubuntu-24.04") {
    Write-Log "Import réussi immédiatement — pas de reboot nécessaire."
    # Nettoyer : supprimer RunOnce et tarball
    Remove-ItemProperty -Path "HKCU:\Software\Microsoft\Windows\CurrentVersion\RunOnce" `
        -Name "ScriptLearn-WSL-Import" -ErrorAction SilentlyContinue
    Remove-Item $permTar -Force -ErrorAction SilentlyContinue
    Remove-Item $postRebootScript -Force -ErrorAction SilentlyContinue
    exit 0
} else {
    Write-Log "Import différé — reboot requis. RunOnce finalisera après le redémarrage."
    "restart_needed" | Out-File "$env:TEMP\sl-wsl-restart.flag" -Encoding ascii -NoNewline
    exit 3
}
