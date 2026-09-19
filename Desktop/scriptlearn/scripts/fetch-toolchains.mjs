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
import { existsSync, mkdirSync, rmSync, renameSync, readdirSync, createWriteStream, createReadStream, statSync } from 'fs'
import { execFileSync } from 'child_process'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createHash } from 'crypto'
import { Readable } from 'stream'
import { pipeline } from 'stream/promises'

// ROOT ancré sur l'emplacement DU SCRIPT, pas sur le répertoire courant.
// POURQUOI : `resolve('resources')` dépend du dossier depuis lequel on lance la
// commande — lancé ailleurs, le script créait un `resources/` au mauvais endroit
// et le packaging échouait ensuite sur un `from` inexistant.
const ROOT = join(resolve(dirname(fileURLToPath(import.meta.url)), '..'), 'resources')
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
  // PHP : la SEULE toolchain dont l'URL se perime. windows.php.net DEPLACE chaque
  // correctif de /downloads/releases/ vers /downloads/releases/archives/ des qu'un
  // nouveau sort — une URL figee renvoie donc un 404 quelques semaines apres avoir
  // ete ecrite (c'est arrive avec 8.3.31). D'ou trois niveaux de repli :
  //   1. resolve() lit sha256sum.txt et trouve le correctif COURANT de la branche
  //      (et recupere son empreinte au passage, donc verification gratuite) ;
  //   2. l'URL figee dans /releases/ (valable tant que 8.3.31 est le courant) ;
  //   3. la MEME archive dans /releases/archives/ — ce chemin-la, lui, ne bouge
  //      plus jamais, c'est le filet de securite si php.net est injoignable
  //      autrement ou si son format de listing change.
  php: {
    resolve: resolvePhp,
    urls: [
      'https://windows.php.net/downloads/releases/php-8.3.31-nts-Win32-vs16-x64.zip',
      'https://windows.php.net/downloads/releases/archives/php-8.3.31-nts-Win32-vs16-x64.zip',
    ],
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
  // SDK Go : `go run` natif Windows, utilisé par la Voie Go (src/main/terminal.js
  // → goEnv). L'archive a un dossier de tête `go/` → strip.
  //
  // POURQUOI cette entrée a été ajoutée : package.json déclare `resources/go`
  // dans extraResources, mais AUCUN script ne le provisionnait — `npm run package`
  // échouait donc depuis un clone propre (resources/ est gitignoré).
  go: {
    url: 'https://go.dev/dl/go1.23.4.windows-amd64.zip',
    type: 'zip', strip: true, check: 'bin/go.exe',
  },
}

// Empreintes SHA-256 attendues, par toolchain (facultatif mais RECOMMANDÉ).
// POURQUOI : on télécharge plusieurs centaines de Mo de binaires qui finissent
// dans l'installateur distribué aux utilisateurs, sans aucune vérification
// d'intégrité. Renseigner une empreinte ici la rend obligatoire pour cette
// toolchain.
// Comment l'obtenir : page officielle de la release, ou, après un premier
// téléchargement réussi :  certutil -hashfile resources\_dl\<fichier> SHA256
const SHA256 = {
  // go: 'à renseigner depuis https://go.dev/dl/ (colonne SHA256)',
}

async function sha256(file) {
  const h = createHash('sha256')
  await pipeline(createReadStream(file), h)
  return h.digest('hex')
}

async function download(url, dest, expectedHash) {
  if (existsSync(dest)) {
    // Une archive déjà présente n'est réutilisée que si son empreinte est connue
    // ET correcte. POURQUOI : l'ancienne version réutilisait TOUT fichier
    // existant — une archive tronquée par un Ctrl+C était donc reprise telle
    // quelle au run suivant, et l'extraction échouait de façon incompréhensible.
    if (expectedHash) {
      const actual = await sha256(dest)
      if (actual === expectedHash) { console.log('  (déjà téléchargé, empreinte vérifiée)'); return }
      console.log('  archive existante invalide → nouveau téléchargement')
      rmSync(dest, { force: true })
    } else {
      console.log(`  (déjà téléchargé, ${(statSync(dest).size / 1e6).toFixed(0)} Mo — empreinte non vérifiée)`)
      return
    }
  }
  // Téléchargement vers un fichier .part renommé à la fin : un téléchargement
  // interrompu ne laisse jamais d'archive d'apparence complète.
  const part = dest + '.part'
  rmSync(part, { force: true })
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${url}`)
  await pipeline(Readable.fromWeb(res.body), createWriteStream(part))
  if (expectedHash) {
    const actual = await sha256(part)
    if (actual !== expectedHash) {
      rmSync(part, { force: true })
      throw new Error(`Empreinte SHA-256 incorrecte pour ${url}\n  attendue : ${expectedHash}\n  obtenue  : ${actual}`)
    }
  }
  renameSync(part, dest)
}

// Branche PHP visee. On reste sur une BRANCHE (8.3) et non sur un correctif
// precis : les correctifs d'une meme branche sont compatibles entre eux, et c'est
// le correctif qui disparait de /releases/, pas la branche.
const PHP_BRANCH = '8.3'

// Trouve le correctif courant de PHP_BRANCH sur windows.php.net.
// POURQUOI passer par sha256sum.txt plutot que par la page HTML : c'est un format
// stable (« <empreinte>  <fichier> » par ligne) qui donne le nom du fichier ET son
// empreinte SHA-256. On obtient donc la verification d'integrite sans avoir a
// maintenir une constante a la main dans SHA256 ci-dessus.
async function resolvePhp () {
  const listUrl = 'https://windows.php.net/downloads/releases/sha256sum.txt'
  const res = await fetch(listUrl)
  if (!res.ok) throw new Error(`HTTP ${res.status} pour ${listUrl}`)
  // nts = non thread safe (suffisant : on lance `php script.php` en CLI, jamais
  // de module serveur) ; vs\d+ car le compilateur change d'une branche a l'autre
  // (vs16, vs17…) et figer le numero reintroduirait exactement le bug corrige ici.
  const wanted = new RegExp(`^php-${PHP_BRANCH.replace('.', '\\.')}\\.(\\d+)-nts-Win32-vs\\d+-x64\\.zip$`)
  let best = null
  for (const line of (await res.text()).split(/\r?\n/)) {
    const m = line.trim().match(/^([0-9a-f]{64})\s+\*?(\S+)$/i)
    if (!m) continue
    const hit = m[2].match(wanted)
    if (!hit) continue
    const patch = Number(hit[1])
    if (!best || patch > best.patch) best = { patch, sha256: m[1].toLowerCase(), name: m[2] }
  }
  if (!best) throw new Error(`aucun build PHP ${PHP_BRANCH} nts x64 liste dans ${listUrl}`)
  return { url: `https://windows.php.net/downloads/releases/${best.name}`, sha256: best.sha256 }
}

// Essaie plusieurs URL dans l'ordre et s'arrete a la premiere qui aboutit.
// Chaque candidat porte SA propre empreinte : la version resolue dynamiquement et
// la version figee ne sont pas le meme fichier, appliquer l'empreinte de l'une a
// l'autre ferait echouer le repli pour de mauvaises raisons.
async function downloadFirst (candidates, dest) {
  const errors = []
  for (const c of candidates) {
    try {
      console.log(`  <- ${c.url}`)
      await download(c.url, dest, c.sha256)
      return c.url
    } catch (err) {
      // Une empreinte invalide n'est PAS un probleme d'URL : le fichier servi ne
      // correspond pas a ce qu'on attend, essayer l'URL suivante masquerait un
      // probleme d'integrite. On remonte immediatement.
      if (/Empreinte SHA-256/.test(err.message)) throw err
      errors.push(`${c.url} -> ${err.message}`)
    }
  }
  throw new Error(`aucune URL exploitable :\n      ${errors.join('\n      ')}`)
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

const requested = process.argv.slice(2)
const names = requested.length ? requested : Object.keys(TOOLCHAINS)

// POURQUOI un try/catch PAR toolchain et non un throw global : avant, la premiere
// URL morte (le 404 de php-8.3.31) interrompait tout le script — mingw, jdk, git
// et go n'etaient meme pas tentes, alors qu'ils n'avaient aucun probleme. On
// telecharge donc tout ce qui peut l'etre, on recapitule les echecs a la fin, et
// on sort en code 1 pour que `npm run prepackage` refuse quand meme de packager
// un installateur incomplet.
const failures = []

for (const name of names) {
  const tc = TOOLCHAINS[name]
  if (!tc) { console.error(`! toolchain inconnue : ${name}`); failures.push(`${name} : toolchain inconnue`); continue }
  const out = join(ROOT, name)
  if (existsSync(join(out, tc.check))) { console.log(`✓ ${name} déjà présent`); continue }

  try {
    // Candidats = [version resolue dynamiquement] + [URL figees], dans cet ordre.
    // Une empreinte renseignee a la main dans SHA256 prime toujours sur celle
    // annoncee par le serveur : c'est le seul moyen d'epingler une version.
    const candidates = []
    if (tc.resolve) {
      try {
        const r = await tc.resolve()
        console.log(`→ ${name} : version courante résolue (${r.url.split('/').pop()})`)
        candidates.push({ url: r.url, sha256: SHA256[name] ?? r.sha256 })
      } catch (err) {
        console.log(`  (résolution dynamique impossible : ${err.message} — repli sur les URL figées)`)
      }
    }
    for (const u of (tc.urls ?? [tc.url])) candidates.push({ url: u, sha256: SHA256[name] })

    console.log(`→ ${name} : téléchargement`)
    const archive = join(DL, `${name}.${tc.type === 'tgz' ? 'tar.gz' : tc.type}`)
    await downloadFirst(candidates, archive)
    console.log('  extraction…')
    rmSync(out, { recursive: true, force: true })
    extract(archive, tc.type, out)
    if (tc.strip) stripTop(out)
    if (!existsSync(join(out, tc.check))) throw new Error(`${tc.check} introuvable après extraction`)
    console.log(`✓ ${name} prêt (${tc.check})`)
  } catch (err) {
    console.error(`✗ ${name} : ${err.message}`)
    failures.push(`${name} : ${err.message}`)
  }
}

if (failures.length) {
  console.error(`\n${failures.length} toolchain(s) en échec :`)
  for (const f of failures) console.error(`  - ${f}`)
  console.error('\nLes autres sont installées. Pour réessayer une seule toolchain :')
  console.error('  node scripts/fetch-toolchains.mjs <nom>')
  process.exitCode = 1
} else {
  console.log('Terminé.')
}
