import { app, shell, BrowserWindow, ipcMain, Notification } from 'electron'
import { join } from 'path'
import { setupTerminalIPC } from './terminal.js'
import { setupStoreIPC } from './storeIPC.js'
import { setupUpdaterIPC } from './updater.js'
import { setupOllamaIPC } from './ollama.js'
import { getSettings, getActiveProfileId, getLastActivityDate } from './store.js'

let mainWindow = null

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

  setupTerminalIPC(mainWindow)
  setupUpdaterIPC(mainWindow)
  // Ollama IPC : appels depuis le processus principal pour contourner
  // la restriction Private Network Access de Chromium (voir src/main/ollama.js)
  setupOllamaIPC()

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  setupStoreIPC()
  createWindow()
  setupReminder()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Daily reminder notification
function setupReminder() {
  setInterval(() => {
    try {
      const settings = getSettings()
      if (!settings.remindersEnabled) return
      if (!Notification.isSupported()) return
      const now = new Date()
      const [rHour, rMin] = (settings.reminderTime ?? '20:00').split(':').map(Number)
      if (now.getHours() !== rHour || now.getMinutes() > rMin + 4) return
      const today = now.toISOString().slice(0, 10)
      const profileId = getActiveProfileId()
      const lastActive = getLastActivityDate(profileId)
      if (lastActive === today) return
      new Notification({
        title: 'ScriptLearn',
        body: 'Tu n\'as pas encore pratiqué aujourd\'hui. 5 minutes suffisent ! 💪',
        icon: undefined
      }).show()
    } catch { /* silently ignore */ }
  }, 5 * 60 * 1000) // check every 5 minutes
}

ipcMain.handle('window:minimize',    () => mainWindow?.minimize())
ipcMain.handle('window:maximize',    () => mainWindow?.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize())
ipcMain.handle('window:close',       () => mainWindow?.close())
ipcMain.handle('window:isMaximized', () => mainWindow?.isMaximized() ?? false)
ipcMain.handle('app:getVersion',     () => app.getVersion())
