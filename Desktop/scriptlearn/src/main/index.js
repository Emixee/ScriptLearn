import { app, shell, BrowserWindow, ipcMain, Notification, session, dialog } from 'electron'
import { writeFile } from 'fs/promises'
import { join } from 'path'
import { setupTerminalIPC, killAllSessions } from './terminal.js'
import { setupStoreIPC } from './storeIPC.js'
import { setupUpdaterIPC } from './updater.js'
import { setupOllamaIPC } from './ollama.js'
import { getSettings, getActiveProfileId, getLastActivityDate } from './store.js'

let mainWindow = null

// Résout la fenêtre courante AU MOMENT de l'appel.
// POURQUOI ne pas se contenter de la variable `mainWindow` : elle peut pointer
// une fenêtre déjà détruite (macOS ferme la fenêtre sans quitter l'app, puis
// « activate » en recrée une). Les handlers IPC sont enregistrés une seule fois
// au démarrage, ils doivent donc retrouver la fenêtre vivante à chaque appel.
function currentWindow() {
  if (mainWindow && !mainWindow.isDestroyed()) return mainWindow
  return BrowserWindow.getAllWindows().find(w => !w.isDestroyed()) ?? null
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    title: 'ScriptLearn',
    backgroundColor: '#0f1117',
    frame: false,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true
    }
  })

  mainWindow.on('ready-to-show', () => mainWindow.show())

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Verrou de navigation : le renderer ne doit JAMAIS quitter l'app locale.
  // POURQUOI : un lien (ou une injection dans du contenu rendu) qui ferait
  // naviguer la fenêtre vers un site distant donnerait à cette page distante
  // l'accès au pont `window.electronAPI` (terminal, écriture de fichiers).
  // Les URL externes légitimes passent par setWindowOpenHandler → navigateur.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env.ELECTRON_RENDERER_URL
    const allowed = devUrl ? url.startsWith(devUrl) : url.startsWith('file://')
    if (!allowed) {
      event.preventDefault()
      shell.openExternal(url)
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  // ─── Handlers IPC : enregistrés UNE SEULE FOIS ──────────────────────────────
  // POURQUOI ici et non dans createWindow() : ipcMain.handle LÈVE si le même
  // canal est enregistré deux fois (« Attempted to register a second handler
  // for 'terminal:create' »). Comme createWindow() est rappelé par l'événement
  // « activate » (macOS), l'enregistrement dans la fonction de création plantait
  // à la réouverture. Les handlers n'ont plus besoin de la fenêtre : ils
  // répondent à `event.sender`, c'est-à-dire au renderer qui les a appelés.
  setupStoreIPC()
  setupTerminalIPC()
  setupUpdaterIPC()
  // Ollama IPC : appels depuis le processus principal pour contourner
  // la restriction Private Network Access de Chromium (voir src/main/ollama.js)
  setupOllamaIPC()

  // ─── Correctif CORS pour Ollama ──────────────────────────────────────────────
  // Problème : Ollama 0.5+ a durci ses règles CORS et peut rejeter les requêtes
  // POST depuis le renderer Electron (origin = file:// en prod).
  // Même en passant par IPC/main process, certaines requêtes check (GET /api/tags)
  // peuvent être faites depuis le renderer.
  //
  // Solution : intercepter les RÉPONSES des URLs Ollama et y injecter les headers
  // CORS permissifs. Le filtre `urls` limite STRICTEMENT cette permissivité au
  // service Ollama local — aucune autre origine n'est concernée.
  session.defaultSession.webRequest.onHeadersReceived(
    { urls: ['http://localhost:11434/*', 'http://127.0.0.1:11434/*'] },
    (details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'access-control-allow-origin' : ['*'],
          'access-control-allow-methods': ['GET, POST, PUT, DELETE, OPTIONS'],
          'access-control-allow-headers': ['Content-Type, Authorization'],
        }
      })
    }
  )

  createWindow()
  setupReminder()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Tuer les PTY avant de quitter. POURQUOI : les bash.exe/python.exe lancés par
// ConPTY ne meurent pas toujours avec leur parent sur Windows et gardent alors
// des fichiers de l'installation verrouillés — ce qui fait échouer la mise à
// jour, qui doit écraser ces mêmes binaires.
app.on('before-quit', () => { killAllSessions() })

// Daily reminder notification
function setupReminder() {
  // Jour où la notification a déjà été envoyée (format AAAA-MM-JJ) : la
  // vérification tourne toutes les 5 minutes et la fenêtre de déclenchement
  // dure 5 minutes — sans ce garde-fou, un décalage d'horloge pouvait produire
  // deux notifications pour la même journée.
  let notifiedOn = null
  setInterval(() => {
    try {
      const settings = getSettings()
      if (!settings.remindersEnabled) return
      if (!Notification.isSupported()) return
      const now = new Date()
      const today = localDateKey(now)
      if (notifiedOn === today) return
      const [rHour, rMin] = (settings.reminderTime ?? '20:00').split(':').map(Number)
      // Comparaison en MINUTES DEPUIS MINUIT. POURQUOI : l'ancien test
      // `now.getMinutes() > rMin + 4` comparait des minutes isolées — pour une
      // heure de rappel comme 20:58, rMin+4 valait 62, condition jamais vraie,
      // donc la notification se déclenchait pendant TOUTE l'heure. Ici la
      // fenêtre est bien de [rappel, rappel+5 min[.
      const target = (rHour || 0) * 60 + (rMin || 0)
      const nowMin = now.getHours() * 60 + now.getMinutes()
      if (nowMin < target || nowMin >= target + 5) return
      const profileId = getActiveProfileId()
      const lastActive = getLastActivityDate(profileId)
      if (lastActive === today) return
      notifiedOn = today
      new Notification({
        title: 'ScriptLearn',
        body: 'Tu n\'as pas encore pratiqué aujourd\'hui. 5 minutes suffisent ! 💪',
        icon: undefined
      }).show()
    } catch { /* silently ignore */ }
  }, 5 * 60 * 1000) // check every 5 minutes
}

// Date du jour en heure LOCALE (AAAA-MM-JJ).
// POURQUOI pas toISOString().slice(0,10) : celui-ci renvoie la date UTC. En
// France (UTC+1/+2), tout ce qui se passe entre minuit et 2 h est daté de la
// VEILLE — le calendrier d'activité et le rappel quotidien se décalaient d'un
// jour. Cette fonction est dupliquée dans src/main/store.js (même raison que
// PROMPT_MARKER : main et renderer ne partagent pas de module).
function localDateKey(d) {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

ipcMain.handle('window:minimize',    () => currentWindow()?.minimize())
ipcMain.handle('window:maximize',    () => {
  const w = currentWindow()
  if (!w) return
  return w.isMaximized() ? w.unmaximize() : w.maximize()
})
ipcMain.handle('window:close',       () => currentWindow()?.close())
ipcMain.handle('window:isMaximized', () => currentWindow()?.isMaximized() ?? false)
ipcMain.handle('app:getVersion',     () => app.getVersion())

// Export d'un script écrit par l'apprenant (acte « projet ») vers un vrai fichier.
// L'apprenant garde ainsi un artefact réutilisable (portfolio). Boîte « Enregistrer sous ».
ipcMain.handle('app:saveScript', async (_, { filename, content }) => {
  try {
    const win = currentWindow()
    const res = await dialog.showSaveDialog(win ?? undefined, {
      title: 'Exporter le script',
      defaultPath: filename || 'script.txt',
    })
    if (res.canceled || !res.filePath) return { ok: false, canceled: true }
    // writeFile asynchrone : un writeFileSync ici gèle l'UI le temps de l'écriture
    // (réseau, antivirus, gros fichier). Même règle que pour terminal.js.
    await writeFile(res.filePath, content ?? '', 'utf8')
    return { ok: true, path: res.filePath }
  } catch (e) {
    return { ok: false, error: String(e?.message ?? e) }
  }
})
