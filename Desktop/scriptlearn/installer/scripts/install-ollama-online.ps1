# install-ollama-online.ps1
# Downloads and installs Ollama, then pulls the chosen model.

param(
    [string]$Model   = "llama3.2:3b",
    [string]$LogFile = "$env:TEMP\ScriptLearn-install.log"
)

function Write-Log {
    param([string]$Message)
    $ts = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    "$ts  $Message" | Tee-Object -FilePath $LogFile -Append
}

Write-Log "=== Ollama Installation (online) — model: $Model ==="

# ── 1. Check if Ollama already installed ─────────────────────────────────────
$ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
if (-not (Test-Path $ollamaExe)) {
    $ollamaExe = (Get-Command ollama -ErrorAction SilentlyContinue)?.Source
}

if ($ollamaExe) {
    Write-Log "Ollama already installed at: $ollamaExe"
} else {
    # ── 2. Download OllamaSetup.exe ──────────────────────────────────────────
    $installer = "$env:TEMP\OllamaSetup.exe"
    $url = "https://ollama.com/download/OllamaSetup.exe"
    Write-Log "Downloading Ollama from $url..."

    try {
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile($url, $installer)
        Write-Log "Download complete: $installer"
    } catch {
        Write-Log "ERROR: Download failed — $_"
        exit 1
    }

    # ── 3. Silent install (OllamaSetup.exe est un installeur Inno Setup → /VERYSILENT) ──
    Write-Log "Running silent install..."
    $proc = Start-Process -FilePath $installer -ArgumentList "/VERYSILENT /SUPPRESSMSGBOXES /NORESTART /SP-" -Wait -PassThru
    Write-Log "OllamaSetup exit code: $($proc.ExitCode)"

    if ($proc.ExitCode -ne 0) {
        Write-Log "ERROR: Ollama installer failed with exit code $($proc.ExitCode)"
        exit 1
    }

    # Give Ollama service time to start
    Start-Sleep -Seconds 8
    $ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
}

# ── 4. Start Ollama server in background if not running ──────────────────────
$running = $null
try {
    $resp = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop
    $running = $true
} catch { $running = $false }

if (-not $running) {
    Write-Log "Starting Ollama server..."
    Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 6
}

# ── 5. Pull model ─────────────────────────────────────────────────────────────
Write-Log "Pulling model: $Model (this may take several minutes)..."
& $ollamaExe pull $Model 2>&1 | ForEach-Object { Write-Log $_ }

if ($LASTEXITCODE -ne 0) {
    Write-Log "ERROR: ollama pull $Model failed with exit code $LASTEXITCODE"
    exit 1
}

Write-Log "Model '$Model' ready."
exit 0
