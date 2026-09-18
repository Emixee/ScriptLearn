import { app, ipcMain } from 'electron'
import { join, dirname, basename } from 'path'
import { createWriteStream, existsSync, unlinkSync, createReadStream, statSync } from 'fs'
import { createHash } from 'crypto'
import { pipeline } from 'stream/promises'
import { get as httpsGet } from 'https'
import { spawn } from 'child_process'

const GITHUB_OWNER = 'Emixee'
const GITHUB_REPO  = 'ScriptLearn'
// Pas de constante ASSET_NAME fixe : electron-builder génère un nom qui inclut le numéro de version
// (ex: "ScriptLearn.Setup.0.4.1.exe") et GitHub remplace les espaces par des points.
// On cherche donc dynamiquement le premier asset .exe qui n'est pas un .blockmap.

// Nombre maximal de redirections suivies : sans borne, un serveur qui renvoie
// une boucle de 302 ferait tourner la fonction indéfiniment (récursion infinie).
const MAX_REDIRECTS = 5

function isNewer(remote, current) {
  // Parsing STRICT : un tag non-SemVer (« v1.0.0-beta », « nightly ») donnerait
  // NaN et les deux comparaisons seraient fausses → la fonction renverrait false
  // silencieusement. On préfère le dire explicitement : seules les versions
  // X.Y.Z pures sont candidates à la mise à jour automatique.
  const parse = (v) => {
    const m = /^v?(\d+)\.(\d+)\.(\d+)$/.exec(String(v).trim())
    return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null
  }
  const r = parse(remote)
  const c = parse(current)
  if (!r || !c) return false
  for (let i = 0; i < 3; i++) {
    if (r[i] > c[i]) return true
    if (r[i] < c[i]) return false
  }
  return false
}

// Récupère une ressource en HTTPS UNIQUEMENT.
// POURQUOI refuser http:// même sur une redirection : le binaire téléchargé est
// ensuite EXÉCUTÉ (spawn de l'installateur). Accepter une redirection vers du
// HTTP en clair permettrait à quiconque sur le réseau de substituer l'exécutable.
function httpsOnlyGet(url, headers, redirectsLeft = MAX_REDIRECTS) {
  return new Promise((resolve, reject) => {
    let parsed
    try { parsed = new URL(url) } catch { return reject(new Error('URL invalide.')) }
    if (parsed.protocol !== 'https:') return reject(new Error(`Protocole refusé (${parsed.protocol}) — HTTPS obligatoire.`))

    httpsGet(url, { headers }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume() // libère le socket : sans ça la connexion reste ouverte
        if (redirectsLeft <= 0) return reject(new Error('Trop de redirections.'))
        const next = new URL(res.headers.location, url).toString()
        return httpsOnlyGet(next, headers, redirectsLeft - 1).then(resolve, reject)
      }
      if (res.statusCode !== 200) {
        res.resume()
        return reject(new Error(`HTTP ${res.statusCode} sur ${parsed.host}`))
      }
      resolve(res)
    }).on('error', reject)
  })
}

async function fetchText(url) {
  const res = await httpsOnlyGet(url, { 'User-Agent': 'ScriptLearn-Updater' })
  let data = ''
  for await (const chunk of res) data += chunk
  return data
}

async function fetchJson(url) {
  return JSON.parse(await fetchText(url))
}

async function downloadFile(url, destPath, onProgress) {
  const res = await httpsOnlyGet(url, { 'User-Agent': 'ScriptLearn-Updater' })
  const total = parseInt(res.headers['content-length'] || '0', 10)

  // Pour la vitesse : on échantillonne reçu/temps et on émet un objet riche
  // { percent, transferred, total, bytesPerSecond } (l'UI affiche %, Mo, vitesse, ETA).
  const startedAt = Date.now()
  let lastEmit = 0
  let received = 0
  res.on('data', (chunk) => {
    received += chunk.length
    const now = Date.now()
    // Throttle ~150 ms pour ne pas inonder le renderer d'événements IPC.
    if (now - lastEmit >= 150 || (total > 0 && received >= total)) {
      lastEmit = now
      const elapsed = (now - startedAt) / 1000
      onProgress({
        percent: total > 0 ? Math.round(received / total * 100) : 0,
        transferred: received,
        total,
        bytesPerSecond: elapsed > 0 ? Math.round(received / elapsed) : 0,
      })
    }
  })

  // POURQUOI `pipeline` et pas `res.on('data', c => file.write(c))` + resolve
  // sur 'end' : (1) l'ancien code ignorait la CONTRE-PRESSION (write() qui
  // renvoie false était ignoré → tout le fichier pouvait s'accumuler en
  // mémoire, ici ~800 Mo) ; (2) surtout, il résolvait la promesse sur 'end',
  // c'est-à-dire AVANT que le tampon disque soit vidé — l'installateur pouvait
  // donc être lancé tronqué. `pipeline` ne résout qu'après 'finish' et propage
  // les erreurs des deux flux.
  await pipeline(res, createWriteStream(destPath))
  return { total, received }
}

// Calcule le sha512 en base64 d'un fichier — c'est exactement le format publié
// par electron-builder dans latest.yml, on peut donc comparer sans conversion.
async function sha512Base64(filePath) {
  const hash = createHash('sha512')
  await pipeline(createReadStream(filePath), hash)
  return hash.digest('base64')
}

export function setupUpdaterIPC() {
  ipcMain.handle('update:check', async () => {
    try {
      const release = await fetchJson(
        `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`
      )
      if (release.message) return { available: false, currentVersion: app.getVersion() }

      const remoteVersion = release.tag_name?.replace(/^v/, '')
      const currentVersion = app.getVersion()

      if (!remoteVersion || !isNewer(remoteVersion, currentVersion)) {
        return { available: false, currentVersion }
      }

      // Trouver l'installateur .exe dans les assets de la release.
      // On exclut les .blockmap (fichiers de différence pour l'auto-updater) et on cherche le .exe.
      // electron-builder nomme l'asset "ScriptLearn.Setup.X.Y.Z.exe" (GitHub remplace les espaces par des points).
      const asset = release.assets?.find(
        a => a.name.endsWith('.exe') && !a.name.endsWith('.blockmap')
      )
      if (!asset) return { available: false, currentVersion }

      // latest.yml (généré par electron-builder) contient le sha512 de
      // l'installateur : c'est notre SEUL moyen de vérifier l'intégrité de ce
      // qu'on va exécuter. On remonte son URL ici pour la vérification.
      const metaAsset = release.assets?.find(a => a.name === 'latest.yml')

      return {
        available: true,
        currentVersion,
        remoteVersion,
        downloadUrl: asset.browser_download_url,
        assetName: asset.name,
        assetSize: asset.size,
        metaUrl: metaAsset?.browser_download_url ?? null,
        releaseNotes: release.body ?? ''
      }
    } catch (err) {
      return { available: false, error: err.message }
    }
  })

  ipcMain.handle('update:download', async (event, { downloadUrl, assetName, assetSize, metaUrl }) => {
    // basename() : `assetName` vient d'un JSON DISTANT. Un nom comme
    // « ..\..\Startup\x.exe » écrirait hors du dossier temporaire — et ce
    // fichier est ensuite exécuté. On ne garde donc que le nom de fichier.
    const safeName = basename(String(assetName || 'ScriptLearn-Setup.exe'))
    const destPath = join(app.getPath('temp'), safeName)
    try { if (existsSync(destPath)) unlinkSync(destPath) } catch { /* fichier verrouillé : le téléchargement écrasera */ }
    try {
      const sender = event.sender
      const { total, received } = await downloadFile(downloadUrl, destPath, p => {
        if (!sender.isDestroyed()) sender.send('update:progress', p)
      })

      // ── Vérifications d'intégrité AVANT de rendre le fichier exécutable ──
      // 1) Taille : détecte une coupure réseau silencieuse.
      const onDisk = statSync(destPath).size
      const expected = total || assetSize || 0
      if (expected && onDisk !== expected) {
        unlinkSync(destPath)
        return { ok: false, error: `Téléchargement incomplet (${onDisk} / ${expected} octets). Réessaie.` }
      }
      // 2) sha512 publié dans latest.yml : détecte une altération de l'asset.
      //    Si latest.yml est absent de la release (chaîne de build Inno Setup),
      //    on ne peut pas vérifier — on le DIT au renderer plutôt que de faire
      //    croire à une vérification qui n'a pas eu lieu.
      let verified = false
      if (metaUrl) {
        try {
          const yml = await fetchText(metaUrl)
          // latest.yml est un YAML plat : une regex suffit et évite d'embarquer
          // js-yaml dans le processus principal (le champ `files` de
          // package.json ne package QUE out/** et node-pty : toute dépendance
          // importée ici serait absente de l'app installée).
          const m = /^\s*sha512:\s*([A-Za-z0-9+/=]+)\s*$/m.exec(yml)
          if (m) {
            const actual = await sha512Base64(destPath)
            if (actual !== m[1]) {
              unlinkSync(destPath)
              return { ok: false, error: 'Empreinte sha512 invalide — fichier rejeté.' }
            }
            verified = true
          }
        } catch {
          // Échec de récupération de latest.yml : on n'échoue pas la mise à jour
          // pour autant (la taille a déjà été contrôlée), on signale juste que
          // l'empreinte n'a pas pu être vérifiée.
        }
      }

      return { ok: true, path: destPath, verified }
    } catch (err) {
      try { if (existsSync(destPath)) unlinkSync(destPath) } catch { /* ignore */ }
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('update:install', (_, { path: installerPath }) => {
    // Garde-fou : on n'exécute QUE le fichier qu'on a nous-même téléchargé dans
    // le dossier temporaire. Le chemin transite par le renderer ; s'il était
    // détourné, on lancerait un exécutable arbitraire avec les droits de l'app.
    const tempDir = app.getPath('temp')
    if (!installerPath || !String(installerPath).startsWith(tempDir)) {
      return { ok: false, error: 'Chemin d\'installateur refusé.' }
    }
    if (!existsSync(installerPath)) return { ok: false, error: 'Installateur introuvable.' }

    // Récupérer le répertoire d'installation ACTUEL de l'application.
    // app.getPath('exe') → ex: C:\Users\user\AppData\Local\Programs\ScriptLearn\ScriptLearn.exe
    // dirname(...) → C:\Users\user\AppData\Local\Programs\ScriptLearn
    //
    // POURQUOI c'est nécessaire :
    // Sans /D=, NSIS installe dans son chemin par défaut, qui peut différer du chemin
    // réel si l'utilisateur avait choisi un répertoire personnalisé lors de l'install initiale.
    // Résultat sans /D= : deux versions coexistent, les raccourcis pointent toujours vers l'ancienne.
    const installDir = dirname(app.getPath('exe'))

    // On lance l'installateur en mode VISIBLE (assistant NSIS) — PAS `/S` — pour que
    // l'utilisateur voie la barre de progression pendant la longue extraction
    // (~2,6 Go de toolchains embarquées). `/D=` pré-remplit le dossier cible (le
    // répertoire d'installation actuel) — DOIT être le dernier argument, sans
    // guillemets — afin que la mise à jour écrase bien l'installation existante.
    // ATTENTION : `/D=` est la syntaxe NSIS (electron-builder). Si la release est
    // produite par Inno Setup (installer/*.iss), l'argument attendu est `/DIR=`
    // et celui-ci est ignoré — les deux chaînes de build ne doivent pas coexister.
    spawn(installerPath, [`/D=${installDir}`], {
      detached: true,   // L'installeur survit à la fermeture du parent (app.quit)
      stdio: 'ignore'   // Pas de pipes — l'installeur tourne dans sa propre fenêtre
    }).unref()

    // Laisser 1,5s à l'installeur NSIS pour démarrer (il attend sur sa 1re page),
    // puis fermer l'app afin de libérer les locks sur ses propres binaires avant
    // que l'utilisateur n'atteigne l'étape de copie des fichiers.
    setTimeout(() => app.quit(), 1500)
    return { ok: true }
  })
}
