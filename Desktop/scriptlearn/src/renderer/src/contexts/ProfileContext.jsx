import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const DEFAULT_SETTINGS = { aiEnabled: false, aiModel: 'llama3.2', aiUrl: 'http://localhost:11434' }

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  // Infos complètes de la MAJ détectée (version, downloadUrl, assetName, taille,
  // notes) — nécessaires à l'overlay global pour lancer le téléchargement.
  const [updateInfo, setUpdateInfo] = useState(null)

  const refresh = useCallback(async () => {
    const [p, s] = await Promise.all([
      window.electronAPI.store.getActiveProfile(),
      window.electronAPI.store.getSettings()
    ])
    setProfile(p)
    setSettings(s ?? DEFAULT_SETTINGS)
    setLoading(false)
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const switchProfile = useCallback(async (id) => {
    await window.electronAPI.store.setActiveProfile(id)
    await refresh()
  }, [refresh])

  const saveSettings = useCallback(async (incoming) => {
    const saved = await window.electronAPI.store.saveSettings(incoming)
    setSettings(saved ?? incoming)
  }, [])

  // Auto-check update 5s après le démarrage
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const info = await window.electronAPI.update.check()
        if (info?.available) { setUpdateAvailable(true); setUpdateInfo(info) }
      } catch {}
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <ProfileContext.Provider value={{ profile, settings, loading, refresh, switchProfile, saveSettings, updateAvailable, setUpdateAvailable, updateInfo, setUpdateInfo }}>
      {!loading && children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
