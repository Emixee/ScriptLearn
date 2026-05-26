const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const Store = require('electron-store')
const { autoUpdater } = require('electron-updater')

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

// ─── Logging ──────────────────────────────────────────────────────────────────

let logPath = null

function initLog() {
  logPath = path.join(app.getPath('userData'), 'app.log')
  // Garde les 500 dernières lignes si le fichier dépasse 1 Mo
  try {
    if (fs.existsSync(logPath) && fs.statSync(logPath).size > 1_000_000) {
      const lines = fs.readFileSync(logPath, 'utf8').split('\n')
      fs.writeFileSync(logPath, lines.slice(-500).join('\n'))
    }
  } catch {}
}

function writeLog(level, message, data) {
  if (!logPath) return
  const ts = new Date().toISOString()
  const extra = data ? ' ' + JSON.stringify(data) : ''
  const line = `[${ts}] [${level}] ${message}${extra}\n`
  try { fs.appendFileSync(logPath, line) } catch {}
}

process.on('uncaughtException', (err) => {
  writeLog('FATAL', 'Main process uncaught exception', { message: err.message, stack: err.stack })
})

// Schéma de validation du store
const schema = {
  profiles: {
    type: 'array',
    default: [],
  },
  settings: {
    type: 'object',
    default: {
      lang: 'fr',
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'llama3',
      theme: 'dark',
      notifications: true,
    },
  },
}

const store = new Store({ schema })

let mainWindow

// ─── Auto-updater ─────────────────────────────────────────────────────────────

function setupAutoUpdater() {
  if (isDev) return // Pas d'update en dev

  autoUpdater.autoDownload = false       // L'utilisateur choisit quand télécharger
  autoUpdater.autoInstallOnAppQuit = true // Installe automatiquement à la fermeture

  function sendStatus(event, data = {}) {
    mainWindow?.webContents?.send('updater:status', { event, ...data })
    writeLog('INFO', `Updater: ${event}`, data)
  }

  autoUpdater.on('checking-for-update', () => {
    sendStatus('checking')
  })

  autoUpdater.on('update-available', (info) => {
    sendStatus('available', { version: info.version, releaseDate: info.releaseDate })
  })

  autoUpdater.on('update-not-available', () => {
    sendStatus('not-available')
  })

  autoUpdater.on('download-progress', (progress) => {
    sendStatus('downloading', {
      percent: Math.round(progress.percent),
      speed: Math.round(progress.bytesPerSecond / 1024), // Ko/s
      transferred: Math.round(progress.transferred / 1024 / 1024 * 10) / 10, // Mo
      total: Math.round(progress.total / 1024 / 1024 * 10) / 10, // Mo
    })
  })

  autoUpdater.on('update-downloaded', (info) => {
    sendStatus('ready', { version: info.version })
  })

  autoUpdater.on('error', (err) => {
    const msg = err?.message || String(err)
    // Ignore l'erreur "no published releases" au premier lancement
    if (!msg.includes('No published releases')) {
      sendStatus('error', { message: msg })
      writeLog('ERROR', 'Auto-updater error', { message: msg })
    } else {
      sendStatus('not-available')
    }
  })

  // Vérifier 5 secondes après le démarrage, puis toutes les 4 heures
  setTimeout(() => autoUpdater.checkForUpdates(), 5000)
  setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1000)
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0d1117',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0d1117',
      symbolColor: '#00ff88',
      height: 36,
    },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    icon: path.join(__dirname, '../../public/icon.png'),
    show: false,
  })

  if (isDev) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  initLog()
  writeLog('INFO', 'App starting', { version: app.getVersion(), isDev })
  createWindow()
  setupAutoUpdater()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ─── IPC — Profils ────────────────────────────────────────────────────────────

ipcMain.handle('profiles:list', () => {
  return store.get('profiles', [])
})

ipcMain.handle('profiles:create', (_, profile) => {
  const profiles = store.get('profiles', [])
  const newProfile = {
    id: Date.now().toString(),
    name: profile.name,
    avatar: profile.avatar || '🛡️',
    createdAt: new Date().toISOString(),
    xp: 0,
    level: 0,
    progress: {},
    badges: [],
    completedLessons: [],
    completedQuizzes: {},
    completedLabs: [],
    completedCTFs: [],
    streak: 0,
    lastActivity: new Date().toISOString(),
  }
  profiles.push(newProfile)
  store.set('profiles', profiles)
  return newProfile
})

ipcMain.handle('profiles:update', (_, { id, data }) => {
  const profiles = store.get('profiles', [])
  const idx = profiles.findIndex(p => p.id === id)
  if (idx === -1) return null
  profiles[idx] = { ...profiles[idx], ...data, lastActivity: new Date().toISOString() }
  store.set('profiles', profiles)
  return profiles[idx]
})

ipcMain.handle('profiles:delete', (_, id) => {
  const profiles = store.get('profiles', []).filter(p => p.id !== id)
  store.set('profiles', profiles)
  return true
})

ipcMain.handle('profiles:get', (_, id) => {
  const profiles = store.get('profiles', [])
  return profiles.find(p => p.id === id) || null
})

// ─── IPC — Progression ────────────────────────────────────────────────────────

ipcMain.handle('progress:save-lesson', (_, { profileId, lessonId, xpGained }) => {
  const profiles = store.get('profiles', [])
  const idx = profiles.findIndex(p => p.id === profileId)
  if (idx === -1) return null

  const profile = profiles[idx]
  if (!profile.completedLessons.includes(lessonId)) {
    profile.completedLessons.push(lessonId)
    profile.xp += xpGained
    profile.level = computeLevel(profile.xp)
  }
  profile.lastActivity = new Date().toISOString()
  store.set('profiles', profiles)
  return profile
})

ipcMain.handle('progress:save-quiz', (_, { profileId, quizId, score, total, xpGained }) => {
  const profiles = store.get('profiles', [])
  const idx = profiles.findIndex(p => p.id === profileId)
  if (idx === -1) return null

  const profile = profiles[idx]
  const existing = profile.completedQuizzes[quizId]
  if (!existing || score > existing.score) {
    profile.completedQuizzes[quizId] = { score, total, date: new Date().toISOString() }
    if (!existing) profile.xp += xpGained
    profile.level = computeLevel(profile.xp)
  }
  profile.lastActivity = new Date().toISOString()
  store.set('profiles', profiles)
  return profile
})

ipcMain.handle('progress:save-lab', (_, { profileId, labId, xpGained }) => {
  const profiles = store.get('profiles', [])
  const idx = profiles.findIndex(p => p.id === profileId)
  if (idx === -1) return null

  const profile = profiles[idx]
  if (!profile.completedLabs.includes(labId)) {
    profile.completedLabs.push(labId)
    profile.xp += xpGained
    profile.level = computeLevel(profile.xp)
  }
  profile.lastActivity = new Date().toISOString()
  store.set('profiles', profiles)
  return profile
})

ipcMain.handle('progress:save-ctf', (_, { profileId, ctfId, xpGained }) => {
  const profiles = store.get('profiles', [])
  const idx = profiles.findIndex(p => p.id === profileId)
  if (idx === -1) return null

  const profile = profiles[idx]
  if (!profile.completedCTFs.includes(ctfId)) {
    profile.completedCTFs.push(ctfId)
    profile.xp += xpGained
    profile.level = computeLevel(profile.xp)
  }
  store.set('profiles', profiles)
  return profile
})

ipcMain.handle('progress:award-badge', (_, { profileId, badgeId }) => {
  const profiles = store.get('profiles', [])
  const idx = profiles.findIndex(p => p.id === profileId)
  if (idx === -1) return null

  const profile = profiles[idx]
  if (!profile.badges.includes(badgeId)) {
    profile.badges.push(badgeId)
    store.set('profiles', profiles)
  }
  return profile
})

// ─── IPC — Settings ───────────────────────────────────────────────────────────

ipcMain.handle('settings:get', () => {
  return store.get('settings')
})

ipcMain.handle('settings:save', (_, settings) => {
  store.set('settings', { ...store.get('settings'), ...settings })
  return store.get('settings')
})

// ─── IPC — Updater ────────────────────────────────────────────────────────────

ipcMain.handle('updater:check', async () => {
  if (isDev) return { status: 'dev' }
  try {
    await autoUpdater.checkForUpdates()
    return { status: 'ok' }
  } catch (err) {
    return { status: 'error', message: err.message }
  }
})

ipcMain.handle('updater:download', () => {
  autoUpdater.downloadUpdate()
})

ipcMain.handle('updater:install', () => {
  autoUpdater.quitAndInstall(false, true)
})

// ─── IPC — Logs ───────────────────────────────────────────────────────────────

ipcMain.handle('log:write', (_, { level, message, data }) => {
  writeLog(level, message, data)
  return true
})

ipcMain.handle('log:get-path', () => logPath)

ipcMain.handle('log:open', () => {
  if (logPath && fs.existsSync(logPath)) shell.openPath(logPath)
})

// ─── Utilitaires ──────────────────────────────────────────────────────────────

function computeLevel(xp) {
  // Progression exponentielle : chaque niveau requiert plus d'XP
  const thresholds = [0, 500, 1500, 3500, 7000, 12000, 20000, 32000, 50000, 75000, 110000]
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i]) return i
  }
  return 0
}
