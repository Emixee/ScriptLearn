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

# ── 0. Vérifications PRÉALABLES ──────────────────────────────────────────────
# POURQUOI en tête : ces deux chemins sont codés en dur et n'étaient vérifiés
# nulle part. En cas d'absence (Inno Setup non installé, gh installé ailleurs),
# l'échec survenait à l'étape 4, APRÈS `npm run build` + `npm run package`, soit
# plusieurs minutes de build et ~2,6 Go d'extraction perdus.
Step "Vérification de l'outillage"
if (-not (Test-Path $ISCC)) {
  throw "ISCC.exe introuvable : $ISCC`nInstalle Inno Setup 6, ou corrige le chemin en tete de ce script."
}
if (-not (Test-Path $GH)) {
  # gh peut aussi etre sur le PATH (winget, scoop) : on tente de le resoudre.
  # NB : pas d'operateur `?.` ici — il n'existe pas en Windows PowerShell 5.1,
  # qui est l'interpreteur par defaut sur Windows.
  $ghCmd = Get-Command gh -ErrorAction SilentlyContinue
  if ($ghCmd) { $GH = $ghCmd.Source }
  else { throw "gh.exe introuvable : $GH`nInstalle GitHub CLI, ou corrige le chemin en tete de ce script." }
}
# Le depot racine pointe sur un autre remote par defaut : on verifie AVANT de
# publier quoi que ce soit (cf. consigne permanente du projet).
$remote = (git -C $Root remote get-url origin)
if ($remote -notmatch 'Emixee/ScriptLearn(\.git)?$') {
  throw "Le remote origin ne pointe pas sur Emixee/ScriptLearn : $remote"
}
# La branche compte autant que le remote : l'etape 5 fait `git push origin main`.
# Lance depuis une branche de travail, ce push publiait le main LOCAL (souvent en
# retard) sans que rien ne le signale.
$branch = (git -C $Root rev-parse --abbrev-ref HEAD).Trim()
if ($branch -ne 'main') {
  throw "Branche courante : $branch. Fusionne d'abord dans main : cette procedure tague et pousse main."
}
Ok "ISCC, gh, remote origin et branche main verifies"

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
# `npm version` écrit la version de façon fiable (et met aussi à jour
# package-lock.json). POURQUOI ce changement : l'ancien `-replace` était une
# substitution GLOBALE sur le fichier brut — inoffensive tant que package.json n'a
# qu'une seule clé "version", mais toute dépendance ou champ ajouté portant ce nom
# aurait été réécrit silencieusement.
Step "Mise à jour de package.json ($new)"
Set-Location $Root
npm version $new --no-git-tag-version --allow-same-version | Out-Null
if ($LASTEXITCODE -ne 0) { throw "npm version a échoué" }
Ok "package.json mis à jour"

# ── 3. Build + package Electron ──────────────────────────────────────────────
# `npm run package` = electron-vite build && electron-builder : l'appel a
# `npm run build` qui precedait refaisait donc le build complet pour rien.
# electron-builder produit maintenant la cible `dir` (dist\win-unpacked) et non
# plus un installateur NSIS que personne ne publiait — les installateurs sont
# ceux d'Inno Setup, compiles juste apres.
Step "Package Electron (dist\win-unpacked)"
npm run package
if ($LASTEXITCODE -ne 0) { throw "npm run package a échoué" }
Ok "Electron packagé"

# ── 4. Compiler les installeurs Inno Setup ───────────────────────────────────
Step "Compilation de l'installeur Hybrid"
& $ISCC "/DAppVersion=$new" (Join-Path $Root 'installer\ScriptLearn-Hybrid.iss')
if ($LASTEXITCODE -ne 0) { throw "Compilation Hybrid échouée" }
Ok "ScriptLearn-Setup-Hybrid.exe compilé"

# La variante Offline embarque OllamaSetup.exe et les blobs du modele : ces deux
# fichiers ne sont PAS dans le depot (installer/assets/ est gitignore, ~2,7 Go) et
# doivent etre produits par installer\build-offline.ps1.
# POURQUOI on teste au lieu de compiler directement : ISCC echouait sur un Source
# introuvable et release.ps1 mourait ici, APRES le build complet et la
# compilation reussie du Hybrid — plusieurs minutes et un installateur utilisable
# perdus pour une variante optionnelle. On previent et on continue.
$assetsDir = Join-Path $Root 'installer\assets'
$offlineReady = (Test-Path (Join-Path $assetsDir 'OllamaSetup.exe')) -and
                (Test-Path (Join-Path $assetsDir 'ollama-models.zip'))
if ($offlineReady) {
  Step "Compilation de l'installeur Offline"
  & $ISCC "/DAppVersion=$new" (Join-Path $Root 'installer\ScriptLearn-Offline.iss')
  if ($LASTEXITCODE -ne 0) { throw "Compilation Offline échouée" }
  Ok "ScriptLearn-Setup-Offline.exe compilé (tranches incluses)"
} else {
  Warn "installer\assets incomplet (OllamaSetup.exe et/ou ollama-models.zip absents)."
  Warn "Variante Offline ignoree. Pour la produire : .\installer\build-offline.ps1"
}

# ── 5. Commit + tag git ──────────────────────────────────────────────────────
Step "Commit et tag git v$new"
git -C $Root add package.json package-lock.json
git -C $Root commit -m "chore: version $new"
git -C $Root tag "v$new"
git -C $Root push origin main
git -C $Root push origin "v$new"
Ok "Poussé sur GitHub (main + tag v$new)"

# ── 6. Créer la release GitHub ───────────────────────────────────────────────
Step "Création de la release GitHub v$new"
$hybrid = Join-Path $Root 'installer\output\ScriptLearn-Setup-Hybrid.exe'
if (-not (Test-Path $hybrid)) { throw "Installateur Hybrid introuvable : $hybrid" }

# L'Offline est decoupe en tranches (DiskSpanning) : un .exe lanceur + un ou
# plusieurs .bin de donnees. POURQUOI les lister toutes : l'ancienne version ne
# televersait que le .exe. L'utilisateur telechargeait donc un lanceur sans ses
# donnees, et l'installation echouait en reclamant un fichier absent.
$offlineParts = @(Get-ChildItem (Join-Path $Root 'installer\output') -Filter 'ScriptLearn-Setup-Offline*' -File -ErrorAction SilentlyContinue)

# ── latest.yml : empreinte de l'installateur, LUE PAR L'APPLICATION ──────────
# POURQUOI ce fichier : src/main/updater.js télécharge l'installateur puis
# l'EXÉCUTE. Sans empreinte publiée, rien ne permet de vérifier que le binaire
# téléchargé est bien celui publié ici (fichier tronqué, asset altéré). L'app lit
# la ligne `sha512:` de latest.yml et refuse d'exécuter en cas d'écart.
# Format : sha512 en BASE64 (même convention qu'electron-updater).
Step "Calcul de l'empreinte sha512 de l'installateur"
$sha512 = [System.Security.Cryptography.SHA512]::Create()
$stream = [System.IO.File]::OpenRead($hybrid)
try { $hashBytes = $sha512.ComputeHash($stream) } finally { $stream.Dispose() }
$hashB64 = [Convert]::ToBase64String($hashBytes)
$hybridName = Split-Path $hybrid -Leaf
$size = (Get-Item $hybrid).Length
$latestYml = Join-Path $Root 'installer\output\latest.yml'
@(
  "version: $new",
  "files:",
  "  - url: $hybridName",
  "    sha512: $hashB64",
  "    size: $size",
  "path: $hybridName",
  "sha512: $hashB64",
  "releaseDate: '$(Get-Date -Format o)'"
) | Set-Content $latestYml -Encoding UTF8
Ok "latest.yml genere (sha512 $($hashB64.Substring(0,12))...)"

# L'ordre des assets compte peu depuis que l'updater choisit explicitement
# l'installateur « Hybrid », mais on le garde en premier par lisibilite.
$assets = @($hybrid, $latestYml)
if ($offlineParts.Count -gt 0) {
  $assets += $offlineParts.FullName
  Ok "Offline : $($offlineParts.Count) fichier(s) a televerser ($($offlineParts.Name -join ', '))"
} else {
  Warn "Aucun ScriptLearn-Setup-Offline* dans installer\output — release publiee sans la variante hors-ligne."
  Warn "Pour la produire : .\installer\build-offline.ps1 (necessite installer\assets\OllamaSetup.exe et ollama-models.zip)."
}

# ATTENTION : latest.yml DOIT être téléversé par le CLI gh — l'interface web de
# GitHub refuse les .yml.
& $GH release create "v$new" @assets `
    --repo "Emixee/ScriptLearn" `
    --title "ScriptLearn v$new" `
    --notes "## ScriptLearn v$new`n`n- ScriptLearn-Setup-Hybrid.exe : installation avec téléchargement WSL + Ollama`n- ScriptLearn-Setup-Offline.exe : installation 100% hors-ligne (si disponible)`n- latest.yml : empreinte sha512 verifiee par la mise a jour automatique"

if ($LASTEXITCODE -ne 0) { throw "Création de la release GitHub échouée" }
Ok "Release GitHub v$new créée avec les installeurs"

Write-Host "`n Version $new publiée avec succès !" -ForegroundColor Green
Warn "Reste a faire a la main : mettre a jour docs/CONVERSATION.md (version + changements) puis committer.
