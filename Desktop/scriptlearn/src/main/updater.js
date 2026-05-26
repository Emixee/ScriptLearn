import { app, ipcMain } from 'electron'
import { join } from 'path'
import { createWriteStream, existsSync, unlinkSync } from 'fs'
import { get as httpsGet } from 'https'
import { get as httpGet } from 'http'
import { spawn } from 'child_process'

const GITHUB_OWNER = 'Emixee'
const GITHUB_REPO  = 'ScriptLearn'
const ASSET_NAME   = 'ScriptLearn-Setup-Hybrid.exe'

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
          if (total > 0) onProgress(Math.round(received / total * 100))
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

      const asset = release.assets?.find(a => a.name === ASSET_NAME)
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
      await downloadFile(downloadUrl, destPath, pct => {
        mainWindow?.webContents.send('update:progress', pct)
      })
      return { ok: true, path: destPath }
    } catch (err) {
      return { ok: false, error: err.message }
    }
  })

  ipcMain.handle('update:install', (_, { path: installerPath }) => {
    spawn(installerPath, [], { detached: true, stdio: 'ignore' }).unref()
    setTimeout(() => app.quit(), 800)
    return { ok: true }
  })
}
