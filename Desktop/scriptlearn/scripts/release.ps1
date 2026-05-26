# release.ps1 — Gestion des versions et publication de ScriptLearn
#
# Usage :
#   .\scripts\release.ps1              # bump patch (0.1.0 → 0.1.1)
#   .\scripts\release.ps1 minor        # bump minor (0.1.0 → 0.2.0)
#   .\scripts\release.ps1 major        # bump major (0.1.0 → 1.0.0)
#   .\scripts\release.ps1 -DryRun      # simule sans modifier ni publier
#   .\scripts\release.ps1 minor -DryRun

param(
  [ValidateSet('patch','minor','major')]
  [string]$Bump = 'patch',
  [switch]$DryRun
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$Root    = Split-Path $PSScriptRoot -Parent
$PkgJson = Join-Path $Root 'package.json'
$ISCC    = "$env:LOCALAPPDATA\Programs\Inno Setup 6\ISCC.exe"
$GH      = 'C:\Program Files\GitHub CLI\gh.exe'

function Step($msg) { Write-Host "`n==> $msg" -ForegroundColor Cyan }
function Ok($msg)   { Write-Host "    OK  $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "    >>  $msg" -ForegroundColor Yellow }

# ── 1. Lire et incrémenter la version ────────────────────────────────────────
Step "Lecture de package.json"
$pkg  = Get-Content $PkgJson -Raw | ConvertFrom-Json
$cur  = $pkg.version
if ($cur -notmatch '^(\d+)\.(\d+)\.(\d+)$') { throw "Version invalide : $cur" }
[int]$maj = $Matches[1]; [int]$min = $Matches[2]; [int]$pat = $Matches[3]

switch ($Bump) {
  'major' { $maj++; $min = 0; $pat = 0 }
  'minor' { $min++; $pat = 0 }
  'patch' { $pat++ }
}
$new = "$maj.$min.$pat"
Ok "Version : $cur  →  $new"

if ($DryRun) { Warn "DryRun : aucune modification appliquée."; exit 0 }

# ── 2. Mettre à jour package.json ────────────────────────────────────────────
Step "Mise à jour de package.json ($new)"
$raw = Get-Content $PkgJson -Raw
$raw = $raw -replace '"version":\s*"[^"]+"', "`"version`": `"$new`""
Set-Content $PkgJson -Value $raw -NoNewline
Ok "package.json mis à jour"

# ── 3. Build + package Electron ──────────────────────────────────────────────
Step "Build Electron"
Set-Location $Root
npm run build
if ($LASTEXITCODE -ne 0) { throw "npm run build a échoué" }

Step "Package Electron"
npm run package
if ($LASTEXITCODE -ne 0) { throw "npm run package a échoué" }
Ok "Electron packagé"

# ── 4. Compiler les installeurs Inno Setup ───────────────────────────────────
Step "Compilation de l'installeur Hybrid"
& $ISCC "/DAppVersion=$new" (Join-Path $Root 'installer\ScriptLearn-Hybrid.iss')
if ($LASTEXITCODE -ne 0) { throw "Compilation Hybrid échouée" }
Ok "ScriptLearn-Setup-Hybrid.exe compilé"

Step "Compilation de l'installeur Offline"
& $ISCC "/DAppVersion=$new" (Join-Path $Root 'installer\ScriptLearn-Offline.iss')
if ($LASTEXITCODE -ne 0) { throw "Compilation Offline échouée" }
Ok "ScriptLearn-Setup-Offline.exe compilé"

# ── 5. Commit + tag git ──────────────────────────────────────────────────────
Step "Commit et tag git v$new"
git -C $Root add package.json
git -C $Root commit -m "chore: version $new"
git -C $Root tag "v$new"
git -C $Root push origin main
git -C $Root push origin "v$new"
Ok "Poussé sur GitHub (main + tag v$new)"

# ── 6. Créer la release GitHub ───────────────────────────────────────────────
Step "Création de la release GitHub v$new"
$hybrid  = Join-Path $Root 'installer\output\ScriptLearn-Setup-Hybrid.exe'
$offline = Join-Path $Root 'installer\output\ScriptLearn-Setup-Offline.exe'

$assets = @($hybrid)
if (Test-Path $offline) { $assets += $offline }

& $GH release create "v$new" @assets `
    --repo "Emixee/ScriptLearn" `
    --title "ScriptLearn v$new" `
    --notes "## ScriptLearn v$new`n`n- ScriptLearn-Setup-Hybrid.exe : installation avec téléchargement WSL + Ollama`n- ScriptLearn-Setup-Offline.exe : installation 100% hors-ligne (si disponible)"

if ($LASTEXITCODE -ne 0) { throw "Création de la release GitHub échouée" }
Ok "Release GitHub v$new créée avec les installeurs"

Write-Host "`n Version $new publiée avec succès !" -ForegroundColor Green
