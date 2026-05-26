# install-ollama-offline.ps1
# Installs Ollama from bundled OllamaSetup.exe and restores pre-bundled model blobs.

param(
    [string]$AssetsDir = "$PSScriptRoot\..\assets",
    [string]$LogFile   = "$env:TEMP\ScriptLearn-install.log"
)

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$ts  $Message" | Tee-Object -FilePath $LogFile -Append
}

Write-Log "=== Ollama Installation (offline) ==="
Write-Log "Assets dir: $AssetsDir"

# ── 1. Install Ollama if not present ─────────────────────────────────────────
$ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
if (-not (Test-Path $ollamaExe)) {
    $bundledInstaller = Join-Path $AssetsDir "OllamaSetup.exe"
    if (-not (Test-Path $bundledInstaller)) {
        Write-Log "ERROR: Bundled OllamaSetup.exe not found at $bundledInstaller"
        exit 1
    }
    Write-Log "Installing Ollama from bundled installer..."
    $proc = Start-Process -FilePath $bundledInstaller -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-" -Wait -PassThru
    Write-Log "OllamaSetup exit code: $($proc.ExitCode)"
    if ($proc.ExitCode -ne 0) {
        Write-Log "ERROR: Ollama installer failed."
        exit 1
    }
    Start-Sleep -Seconds 8
} else {
    Write-Log "Ollama already installed."
}

# ── 2. Restore model blobs ───────────────────────────────────────────────────
$modelArchive = Join-Path $AssetsDir "ollama-models.zip"
if (Test-Path $modelArchive) {
    $ollamaModelsDir = "$env:USERPROFILE\.ollama\models"
    Write-Log "Extracting model blobs to $ollamaModelsDir ..."
    New-Item -ItemType Directory -Force -Path $ollamaModelsDir | Out-Null

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    try {
        # .NET 6+ supporte le paramètre overwrite ; sinon extraction manuelle fichier par fichier
        $zip = [System.IO.Compression.ZipFile]::OpenRead($modelArchive)
        foreach ($entry in $zip.Entries) {
            $destPath = Join-Path $ollamaModelsDir $entry.FullName
            $destDir  = Split-Path $destPath -Parent
            if (-not (Test-Path $destDir)) {
                New-Item -ItemType Directory -Force -Path $destDir | Out-Null
            }
            if ($entry.Name -ne '') {   # ignorer les entrées de répertoires
                [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $destPath, $true)
            }
        }
        $zip.Dispose()
        Write-Log "Model blobs extracted."
    } catch {
        Write-Log "ERROR: Failed to extract model blobs — $_"
        exit 1
    }
} else {
    Write-Log "WARNING: No bundled model archive found at $modelArchive"
}

# ── 3. Start Ollama server briefly to register the model ─────────────────────
$running = $false
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $running = $true
} catch {}

if (-not $running) {
    Write-Log "Starting Ollama server to register model..."
    Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 6
}

Write-Log "Ollama offline installation complete."
exit 0
