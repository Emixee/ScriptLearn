# build-hybrid.ps1
# Builds the ScriptLearn hybrid installer (.exe) using Inno Setup.
# Run this script from the installer\ directory.
#
# Requirements:
#   - Node.js + npm installed
#   - Inno Setup 6+ installed (https://jrsoftware.org/isdl.php)
#   - Run from the repository root or provide -ProjectRoot

param(
    [string]$ProjectRoot  = (Resolve-Path "$PSScriptRoot\..").Path,
    [string]$InnoCompiler = "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
)

Set-Location $ProjectRoot
Write-Host "=== ScriptLearn Hybrid Installer Build ===" -ForegroundColor Cyan
Write-Host "Project root: $ProjectRoot"

# ── 1. Build the Electron app ─────────────────────────────────────────────────
Write-Host "`n[1/3] Building Electron app (npm run package)..." -ForegroundColor Yellow
npm run package
if ($LASTEXITCODE -ne 0) {
    Write-Error "npm run package failed."
    exit 1
}

$winUnpacked = Join-Path $ProjectRoot "dist\win-unpacked"
if (-not (Test-Path $winUnpacked)) {
    Write-Error "Expected dist\win-unpacked not found after build."
    exit 1
}
Write-Host "App built: $winUnpacked" -ForegroundColor Green

# ── 2. Create output dir ─────────────────────────────────────────────────────
$outputDir = Join-Path $ProjectRoot "installer\output"
New-Item -ItemType Directory -Force -Path $outputDir | Out-Null

# ── 3. Compile Inno Setup script ─────────────────────────────────────────────
Write-Host "`n[2/3] Checking Inno Setup compiler..." -ForegroundColor Yellow
if (-not (Test-Path $InnoCompiler)) {
    Write-Error "Inno Setup not found at: $InnoCompiler`nInstall it from https://jrsoftware.org/isdl.php"
    exit 1
}

$issScript = Join-Path $ProjectRoot "installer\ScriptLearn-Hybrid.iss"
Write-Host "[3/3] Compiling $issScript ..." -ForegroundColor Yellow
& $InnoCompiler $issScript
if ($LASTEXITCODE -ne 0) {
    Write-Error "Inno Setup compilation failed."
    exit 1
}

$exePath = Join-Path $ProjectRoot "installer\output\ScriptLearn-Setup-Hybrid.exe"
if (Test-Path $exePath) {
    $size = [math]::Round((Get-Item $exePath).Length / 1MB, 1)
    Write-Host "`n=== BUILD SUCCESSFUL ===" -ForegroundColor Green
    Write-Host "Output: $exePath ($size MB)"
} else {
    Write-Warning "Build complete but output file not found at expected path."
}
