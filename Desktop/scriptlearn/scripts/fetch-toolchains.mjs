// ============================================================================
// fetch-toolchains.mjs — Télécharge et extrait les toolchains NATIVES Windows
// embarquées (installateur « Tout-en-un »). Idempotent : saute ce qui est déjà
// présent. À lancer AVANT le packaging (les fichiers vont dans resources/, qui
// est gitignoré — rien de volumineux n'est committé).
//
// Extraction : on s'appuie sur `tar.exe` (bsdtar, présent sur Windows 10+) qui
// gère .zip ET .tar.gz. Les self-extractors 7z (PortableGit) sont lancés avec
// leurs propres arguments d'extraction.
//
// Usage : node scripts/fetch-toolchains.mjs [nom1 nom2 ...]
//   sans argument : toutes les toolchains. Avec : seulement celles nommées.
// ============================================================================
import { existsSync, mkdirSync, rmSync, renameSync, readdirSync, createWriteStream } from 'fs'
import { execFileSync } from 'child_process'
import { join, resolve } from 'path'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

const ROOT = resolve('resources')
const DL = join(ROOT, '_dl')
mkdirSync(DL, { recursive: true })

// Registre des toolchains. `check` = chemin (relatif à resources/<name>) d'un
// binaire qui prouve l'extraction réussie. `strip` = remonter l'unique dossier
// de tête de l'archive au niveau de resources/<name>.
const TOOLCHAINS = {
  node: {
    // Node 24 : exécute le TypeScript nativement (dépouillement de types) — requis
    // pour la Voie TS. Node 22 ne le fait pas par défaut.
    url: 'https://nodejs.org/dist/v24.16.0/node-v24.16.0-win-x64.zip',
    type: 'zip', strip: true, check: 'node.exe',
  },
  python: {
    url: 'https://www.python.org/ftp/python/3.12.8/python-3.12.8-embed-amd64.zip',
    type: 'zip', strip: false, check: 'python.exe',
  },
  php: {
    url: 'https://windows.php.net/downloads/releases/php-8.3.31-nts-Win32-vs16-x64.zip',
    type: 'zip', strip: false, check: 'php.exe',
  },
  // MinGW-w64 (winlibs, UCRT) : gcc/g++ natifs Windows + linker GNU (réutilisé
  // par Rust). L'archive a un dossier de tête `mingw64/` → strip.
  mingw: {
    url: 'https://github.com/brechtsanders/winlibs_mingw/releases/download/16.1.0posix-14.0.0-ucrt-r3/winlibs-x86_64-posix-seh-gcc-16.1.0-mingw-w64ucrt-14.0.0-r3.zip',
    type: 'zip', strip: true, check: 'bin/gcc.exe',
  },
  // JDK (Temurin 21) : javac + java natifs. Dossier de tête `jdk-21.x/` → strip.
  jdk: {
    url: 'https://github.com/adoptium/temurin21-binaries/releases/download/jdk-21.0.9%2B10/OpenJDK21U-jdk_x64_windows_hotspot_21.0.9_10.zip',
    type: 'zip', strip: true, check: 'bin/javac.exe',
  },
  // PortableGit (Git for Windows) : fournit bash + coreutils ET git, en un seul
  // bundle. Self-extractor 7z → extraction via ses propres arguments.
  git: {
    url: 'https://github.com/git-for-windows/git/releases/download/v2.54.0.windows.1/PortableGit-2.54.0-64-bit.7z.exe',
    type: '7zexe', strip: false, check: 'bin/bash.exe',
  },
}

async function download(url, dest) {
  if (existsSync(dest)) { console.log('  (déjà téléchargé)'); return }
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest))
}

// IMPORTANT : on cible le bsdtar de Windows (libarchive) par chemin ABSOLU. Le
// `tar` du PATH (Git-bash) est GNU tar, incapable de lire les .zip. bsdtar gère
// .zip ET .tar.gz de façon uniforme.
const BSDTAR = 'C:\\Windows\\System32\\tar.exe'
function extract(archive, type, outDir) {
  mkdirSync(outDir, { recursive: true })
  if (type === '7zexe') {
    // Self-extractor 7z (PortableGit) : -y (oui à tout), -o<dir> (sans espace).
    execFileSync(archive, ['-y', `-o${outDir}`], { stdio: 'inherit' })
  } else {
    execFileSync(BSDTAR, ['-xf', archive, '-C', outDir], { stdio: 'inherit' })
  }
}

// Si l'archive a un unique dossier de tête, le remonter au niveau de outDir.
function stripTop(outDir) {
  const entries = readdirSync(outDir)
  if (entries.length === 1) {
    const inner = join(outDir, entries[0])
    const tmp = outDir + '_inner'
    renameSync(inner, tmp)
    rmSync(outDir, { recursive: true, force: true })
    renameSync(tmp, outDir)
  }
}

const wanted = process.argv.slice(2)
const names = wanted.length ? wanted : Object.keys(TOOLCHAINS)

for (const name of names) {
  const tc = TOOLCHAINS[name]
  if (!tc) { console.error(`! toolchain inconnue : ${name}`); continue }
  const out = join(ROOT, name)
  if (existsSync(join(out, tc.check))) { console.log(`✓ ${name} déjà présent`); continue }
  console.log(`→ ${name} : téléchargement ${tc.url}`)
  const archive = join(DL, `${name}.${tc.type === 'tgz' ? 'tar.gz' : tc.type}`)
  await download(tc.url, archive)
  console.log(`  extraction…`)
  rmSync(out, { recursive: true, force: true })
  extract(archive, tc.type, out)
  if (tc.strip) stripTop(out)
  if (!existsSync(join(out, tc.check))) throw new Error(`Extraction ${name} : ${tc.check} introuvable`)
  console.log(`✓ ${name} prêt (${tc.check})`)
}
console.log('Terminé.')
