# build-offline.ps1
# Prepares assets and builds the ScriptLearn offline installer (100% hors-ligne).
#
# Step 1: Download OllamaSetup.exe
# Step 2: Pull llama3.2:3b + zip les blobs du modèle
# Step 3: Exporter Ubuntu-24.04 depuis WSL (doit être installé sur cette machine)
# Step 4: Build l'app Electron
# Step 5: Compiler Inno Setup → ScriptLearn-Setup-Offline.exe (~5 Go)
#
# Run from the installer\ directory or provide -ProjectRoot.

param(
    [string]$ProjectRoot  = (Resolve-Path "$PSScriptRoot\..").Path,
    [string]$InnoCompiler = "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe",
    [string]$Model        = "llama3.2:3b"
)

$AssetsDir = Join-Path $ProjectRoot "installer\assets"
New-Item -ItemType Directory -Force -Path $AssetsDir | Out-Null

Write-Host "=== ScriptLearn Offline Installer Build ===" -ForegroundColor Cyan
Write-Host "Project root : $ProjectRoot"
Write-Host "Model        : $Model"
Write-Host "Assets dir   : $AssetsDir"

# ── Step 1: Download OllamaSetup.exe ─────────────────────────────────────────
$ollamaInstaller = Join-Path $AssetsDir "OllamaSetup.exe"
if (-not (Test-Path $ollamaInstaller)) {
    Write-Host "`n[1/5] Downloading OllamaSetup.exe..." -ForegroundColor Yellow
    $url = "https://ollama.com/download/OllamaSetup.exe"
    $wc = New-Object System.Net.WebClient
    $wc.DownloadFile($url, $ollamaInstaller)
    Write-Host "Downloaded: $ollamaInstaller" -ForegroundColor Green
} else {
    Write-Host "[1/5] OllamaSetup.exe already present, skipping download."
}

# ── Step 2: Ensure Ollama is installed on this machine and pull the model ────
$ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
if (-not (Test-Path $ollamaExe)) {
    Write-Host "`n[2/5] Installing Ollama locally to pull model blobs..." -ForegroundColor Yellow
    $proc = Start-Process -FilePath $ollamaInstaller -ArgumentList "/S" -Wait -PassThru
    Start-Sleep -Seconds 8
}

# Start server if not running
$running = $false
try {
    Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 3 -ErrorAction Stop | Out-Null
    $running = $true
} catch {}

if (-not $running) {
    Write-Host "Starting Ollama server..." -ForegroundColor Yellow
    Start-Process -FilePath $ollamaExe -ArgumentList "serve" -WindowStyle Hidden
    Start-Sleep -Seconds 6
}

Write-Host "`n[2/5] Pulling model $Model (this will take several minutes)..." -ForegroundColor Yellow
& $ollamaExe pull $Model
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to pull model $Model"
    exit 1
}
Write-Host "Model $Model ready." -ForegroundColor Green

# ── Step 3a: Zip les blobs du modèle spécifique seulement ────────────────────
$modelZip = Join-Path $AssetsDir "ollama-models.zip"
if (-not (Test-Path $modelZip)) {
    Write-Host "`n[3/5] Identification et zip des blobs de $Model ..." -ForegroundColor Yellow
    $manifestBase = "$env:USERPROFILE\.ollama\models\manifests\registry.ollama.ai\library"
    $modelName    = ($Model -split ":")[0]
    $modelTag     = if ($Model -contains ":") { ($Model -split ":")[1] } else { "latest" }
    $manifestPath = "$manifestBase\$modelName\$modelTag"

    if (-not (Test-Path $manifestPath)) {
        Write-Error "Manifest introuvable pour $Model. Assurez-vous que le modèle est pulléé."
        exit 1
    }

    $manifest = Get-Content $manifestPath -Raw | ConvertFrom-Json
    $digests  = @($manifest.config.digest) + ($manifest.layers | ForEach-Object { $_.digest })

    $tmpModels = "$env:TEMP\sl-ollama-pack"
    Remove-Item $tmpModels -Recurse -Force -ErrorAction SilentlyContinue
    New-Item -ItemType Directory -Force -Path "$tmpModels\blobs" | Out-Null
    $manifestDst = "$tmpModels\manifests\registry.ollama.ai\library\$modelName"
    New-Item -ItemType Directory -Force -Path $manifestDst | Out-Null
    Copy-Item $manifestPath "$manifestDst\$modelTag"

    foreach ($digest in $digests) {
        $blobName = $digest -replace ":", "-"
        $src = "$env:USERPROFILE\.ollama\models\blobs\$blobName"
        if (Test-Path $src) {
            $sizeMB = [math]::Round((Get-Item $src).Length / 1MB, 0)
            Write-Host "  Blob $blobName ($sizeMB MB)" -ForegroundColor DarkGray
            Copy-Item $src "$tmpModels\blobs\$blobName"
        }
    }

    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::CreateFromDirectory($tmpModels, $modelZip)
    Remove-Item $tmpModels -Recurse -Force
    $zipSize = [math]::Round((Get-Item $modelZip).Length / 1MB, 0)
    Write-Host "Created: $modelZip ($zipSize MB)" -ForegroundColor Green
} else {
    Write-Host "[3/5] ollama-models.zip already present, skipping."
}

# ── Step 3b: Exporter Ubuntu-24.04 depuis WSL ────────────────────────────────
$ubuntuTar = Join-Path $AssetsDir "ubuntu-24.04-wsl.tar"
if (-not (Test-Path $ubuntuTar)) {
    Write-Host "`n[3b/5] Export Ubuntu-24.04 depuis WSL..." -ForegroundColor Yellow
    $distros = wsl --list --quiet 2>$null | Out-String
    if ($distros -notmatch "Ubuntu-24.04") {
        Write-Error "Ubuntu-24.04 n'est pas installé dans WSL sur cette machine.`nInstallez-le d'abord avec : wsl --install -d Ubuntu-24.04"
        exit 1
    }
    wsl --export Ubuntu-24.04 $ubuntuTar 2>&1
    $tarSize = [math]::Round((Get-Item $ubuntuTar).Length / 1MB, 0)
    Write-Host "Ubuntu-24.04 exporté : $ubuntuTar ($tarSize MB)" -ForegroundColor Green
} else {
    Write-Host "[3b/5] ubuntu-24.04-wsl.tar already present, skipping."
}

# ── Step 4: Build Electron app ────────────────────────────────────────────────
Write-Host "`n[4/5] Building Electron app..." -ForegroundColor Yellow
Set-Location $ProjectRoot
npm run package
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm run package failed."
    exit 1
}
Write-Host "App built." -ForegroundColor Green

# ── Step 5: Compile Inno Setup ────────────────────────────────────────────────
Write-Host "`n[5/5] Compiling offline installer..." -ForegroundColor Yellow
if (-not (Test-Path $InnoCompiler)) {
    Write-Error "Inno Setup not found at: $InnoCompiler"
    exit 1
}

$issScript = Join-Path $ProjectRoot "installer\ScriptLearn-Offline.iss"
& $InnoCompiler $issScript
if ($LASTEXITCODE -ne 0) {
    Write-Error "Inno Setup compilation failed."
    exit 1
}

$exePath = Join-Path $ProjectRoot "installer\output\ScriptLearn-Setup-Offline.exe"
if (Test-Path $exePath) {
    $size = [math]::Round((Get-Item $exePath).Length / 1MB, 0)
    Write-Host "`n=== BUILD SUCCESSFUL ===" -ForegroundColor Green
    Write-Host "Output : $exePath"
    Write-Host "Size   : ~$size MB"
    Write-Host "`nYou can now distribute ScriptLearn-Setup-Offline.exe as a single file."
} else {
    Write-Warning "Build complete but output file not found."
}
