import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  app: {
    getVersion: () => ipcRenderer.invoke('app:getVersion'),
  },
  window: {
    minimize:    () => ipcRenderer.invoke('window:minimize'),
    maximize:    () => ipcRenderer.invoke('window:maximize'),
    close:       () => ipcRenderer.invoke('window:close'),
    isMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  },
  terminal: {
    create: (opts) => ipcRenderer.invoke('terminal:create', opts),
    write: (opts) => ipcRenderer.invoke('terminal:write', opts),
    resize: (opts) => ipcRenderer.invoke('terminal:resize', opts),
    kill: (opts) => ipcRenderer.invoke('terminal:kill', opts),
    // Validation en coulisses : exécute le code (one-shot, sans écho) et renvoie { output }.
    runValidation: (opts) => ipcRenderer.invoke('terminal:runValidation', opts),
    bashAvailable:   () => ipcRenderer.invoke('terminal:bashAvailable'),
    pythonAvailable: () => ipcRenderer.invoke('terminal:pythonAvailable'),
    phpAvailable:    () => ipcRenderer.invoke('terminal:phpAvailable'),
    // Vérifie une toolchain compilée (gcc, g++, javac, java, mcs, mono) côté WSL.
    toolAvailable:   (tool) => ipcRenderer.invoke('terminal:toolAvailable', { tool }),
    // Exécute la mise en place d'un acte (création de fichiers /tmp) en coulisses,
    // hors de la session terminal affichée — pour ne pas dévoiler les données.
    runSetup:        (setup) => ipcRenderer.invoke('terminal:runSetup', { setup }),
    onData: (cb) => {
      const handler = (_, payload) => cb(payload)
      ipcRenderer.on('terminal:data', handler)
      return () => ipcRenderer.removeListener('terminal:data', handler)
    }
  },
  update: {
    check:      ()     => ipcRenderer.invoke('update:check'),
    download:   (info) => ipcRenderer.invoke('update:download', info),
    install:    (info) => ipcRenderer.invoke('update:install', info),
    onProgress: (cb)   => {
      const handler = (_, pct) => cb(pct)
      ipcRenderer.on('update:progress', handler)
      return () => ipcRenderer.removeListener('update:progress', handler)
    }
  },
  // Pont IPC vers Ollama — les requêtes sont faites depuis le processus principal
  // (Node.js) pour éviter les blocages CORS/Private Network Access du renderer.
  // Le renderer ne fait JAMAIS de fetch direct vers localhost:11434.
  ollama: {
    check:    (url)                    => ipcRenderer.invoke('ollama:check',    { url }),
    generate: ({ url, model, prompt }) => ipcRenderer.invoke('ollama:generate', { url, model, prompt }),
    // pull : télécharge un modèle depuis le registre Ollama.
    // Les événements de progression sont reçus via onPullProgress / onPullDone.
    pull:     ({ url, model })         => ipcRenderer.invoke('ollama:pull',     { url, model }),
    // Abonnements aux événements de progression du pull (envoyés par le main process)
    onPullProgress: (cb) => {
      const handler = (_, data) => cb(data)
      ipcRenderer.on('ollama:pull-progress', handler)
      return () => ipcRenderer.removeListener('ollama:pull-progress', handler)
    },
    onPullDone: (cb) => {
      const handler = (_, data) => cb(data)
      ipcRenderer.on('ollama:pull-done', handler)
      return () => ipcRenderer.removeListener('ollama:pull-done', handler)
    }
  },
  store: {
    listProfiles:        ()                         => ipcRenderer.invoke('store:listProfiles'),
    getActiveProfile:    ()                         => ipcRenderer.invoke('store:getActiveProfile'),
    createProfile:       (name, emoji, career)      => ipcRenderer.invoke('store:createProfile', { name, emoji, career }),
    deleteProfile:       (id)                       => ipcRenderer.invoke('store:deleteProfile', { id }),
    setActiveProfile:    (id)                       => ipcRenderer.invoke('store:setActiveProfile', { id }),
    updateCareer:        (id, career)               => ipcRenderer.invoke('store:updateCareer', { id, career }),
    getProgress:         (profileId)                => ipcRenderer.invoke('store:getProgress', { profileId }),
    getActivity:         (profileId)                => ipcRenderer.invoke('store:getActivity', { profileId }),
    markExerciseDone:    (profileId, exerciseId)    => ipcRenderer.invoke('store:markExerciseDone', { profileId, exerciseId }),
    recordAttempt:       (profileId, exerciseId)    => ipcRenderer.invoke('store:recordAttempt', { profileId, exerciseId }),
    getSettings:         ()                         => ipcRenderer.invoke('store:getSettings'),
    saveSettings:        (settings)                 => ipcRenderer.invoke('store:saveSettings', { settings }),
    resetProgress:       (profileId)                => ipcRenderer.invoke('store:resetProgress', { profileId }),
    getDraft:            (profileId, key)           => ipcRenderer.invoke('store:getDraft', { profileId, key }),
    saveDraft:           (profileId, key, code)     => ipcRenderer.invoke('store:saveDraft', { profileId, key, code }),
    deleteDraft:         (profileId, key)           => ipcRenderer.invoke('store:deleteDraft', { profileId, key }),
    // Notes
    getNote:             (profileId, key)           => ipcRenderer.invoke('store:getNote', { profileId, key }),
    saveNote:            (profileId, key, text)     => ipcRenderer.invoke('store:saveNote', { profileId, key, text }),
    getAllNotes:          (profileId)               => ipcRenderer.invoke('store:getAllNotes', { profileId }),
    // Weekly goal
    getWeeklyGoal:       (profileId)               => ipcRenderer.invoke('store:getWeeklyGoal', { profileId }),
    setWeeklyGoal:       (profileId, goal)          => ipcRenderer.invoke('store:setWeeklyGoal', { profileId, goal }),
    // Import / Export
    exportProfileJSON:   (profileId)               => ipcRenderer.invoke('store:exportProfileJSON', { profileId }),
    importProfileJSON:   (payload)                 => ipcRenderer.invoke('store:importProfileJSON', { payload }),
    // Notifications
    getLastActivityDate: (profileId)               => ipcRenderer.invoke('store:getLastActivityDate', { profileId }),
  }
})
