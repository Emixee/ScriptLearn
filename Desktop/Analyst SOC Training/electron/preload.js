const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Profils
  profiles: {
    list: () => ipcRenderer.invoke('profiles:list'),
    create: (profile) => ipcRenderer.invoke('profiles:create', profile),
    update: (id, data) => ipcRenderer.invoke('profiles:update', { id, data }),
    delete: (id) => ipcRenderer.invoke('profiles:delete', id),
    get: (id) => ipcRenderer.invoke('profiles:get', id),
  },

  // Progression
  progress: {
    saveLesson: (profileId, lessonId, xpGained) =>
      ipcRenderer.invoke('progress:save-lesson', { profileId, lessonId, xpGained }),
    saveQuiz: (profileId, quizId, score, total, xpGained) =>
      ipcRenderer.invoke('progress:save-quiz', { profileId, quizId, score, total, xpGained }),
    saveLab: (profileId, labId, xpGained) =>
      ipcRenderer.invoke('progress:save-lab', { profileId, labId, xpGained }),
    saveCTF: (profileId, ctfId, xpGained) =>
      ipcRenderer.invoke('progress:save-ctf', { profileId, ctfId, xpGained }),
    awardBadge: (profileId, badgeId) =>
      ipcRenderer.invoke('progress:award-badge', { profileId, badgeId }),
  },

  // Settings
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (settings) => ipcRenderer.invoke('settings:save', settings),
  },

  // Updater
  updater: {
    check: () => ipcRenderer.invoke('updater:check'),
    download: () => ipcRenderer.invoke('updater:download'),
    install: () => ipcRenderer.invoke('updater:install'),
    onStatus: (cb) => {
      ipcRenderer.on('updater:status', (_, data) => cb(data))
      return () => ipcRenderer.removeAllListeners('updater:status')
    },
  },

  // Logs
  log: {
    write: (level, message, data) => ipcRenderer.invoke('log:write', { level, message, data }),
    getPath: () => ipcRenderer.invoke('log:get-path'),
    open: () => ipcRenderer.invoke('log:open'),
  },

  // Infos Electron
  platform: process.platform,
  isPackaged: !process.env.NODE_ENV || process.env.NODE_ENV !== 'development',
})
