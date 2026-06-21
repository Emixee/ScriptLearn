import { app, ipcMain } from 'electron'
import { join, dirname } from 'path'
import { createWriteStream, existsSync, unlinkSync } from 'fs'
import { get as httpsGet } from 'https'
import { get as httpGet } from 'http'
import { spawn } from 'child_process'

const GITHUB_OWNER = 'Emixee'
const GITHUB_REPO  = 'ScriptLearn'
// Pas de constante ASSET_NAME fixe : electron-builder génère un nom qui inclut le numéro de version
// (ex: "ScriptLearn.Setup.0.4.1.exe") et GitHub remplace les espaces par des points.
// On cherche donc dynamiquement le premier asset .exe qui n'est pas un .blockmap.

function isNewer(remote, current) {
  const r = remote.replace(/^v/, '').split('.').map(Number)
  const c = current.replace(/^v/, '').split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((r[i] ?? 0) > (c[i] ?? 0)) return true
    if ((r[i] ?? 0) < (c[i] ?? 0)) return false
  }
  return false
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    httpsGet(url, { headers: { 'User-Agent': 'ScriptLearn-Updater' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return resolve(fetchJson(res.headers.location))
      }
      let data = ''
      res.on('data', c => { data += c })
      res.on('end', () => {
        try { resolve(JSON.parse(data)) } catch (e) { reject(e) }
      })
    }).on('error', reject)
  })
}

function downloadFile(url, destPath, onProgress) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(destPath)
    file.on('error', reject)

    // Pour la vitesse : on échantillonne reçu/temps et on émet un objet riche
    // { percent, transferred, total, bytesPerSecond } (l'UI affiche %, Mo, vitesse, ETA).
    const startedAt = Date.now()
    let lastEmit = 0

    function request(targetUrl) {
      const getter = targetUrl.startsWith('https') ? httpsGet : httpGet
      getter(targetUrl, { headers: { 'User-Agent': 'ScriptLearn-Updater' } }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          request(res.headers.location)
          return
        }
        const total = parseInt(res.headers['content-length'] || '0', 10)
        let received = 0
        res.on('data', chunk => {
          file.write(chunk)
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
        res.on('end', () => { file.close(); resolve() })
        res.on('error', reject)
      }).on('error', reject)
    }

    request(url)
  })
}

export function setupUpdaterIPC(mainWindow) {
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

      return {
        available: true,
        currentVersion,
        remoteVersion,
        downloadUrl: asset.browser_download_url,
        assetName: asset.name,
        assetSize: asset.size,
        releaseNotes: release.body ?? ''
      }
    } catch (err) {
      return { available: false, error: err.message }
    }
  })

  ipcMain.handle('update:download', async (_, { downloadUrl, assetName }) => {
    const destPath = join(app.getPath('temp'), assetName)
    try { if (existsSync(destPath)) unlinkSync(destPath) } catch {}
    try {
      await downloadFile(downloadUrl, destPath, p => {
        mainWindow?.webContents.send('update:progress', p)
      })
      return { ok: true, path: destPath }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('update:install', (_, { path: installerPath }) => {
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
