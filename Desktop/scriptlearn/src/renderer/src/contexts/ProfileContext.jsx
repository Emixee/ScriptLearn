import { createContext, useContext, useState, useEffect, useCallback } from 'react'

const DEFAULT_SETTINGS = { aiEnabled: false, aiModel: 'llama3.2', aiUrl: 'http://localhost:11434' }

const ProfileContext = createContext(null)

export function ProfileProvider({ children }) {
  const [profile, setProfile] = useState(null)
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [loading, setLoading] = useState(true)
  // Erreur de chargement initial. POURQUOI cet état existe : le provider rend
  // `{!loading && children}`. Si getActiveProfile()/getSettings() rejetait
  // (fichier de données corrompu, handler IPC absent), `loading` restait true
  // POUR TOUJOURS → fenêtre entièrement noire, et ErrorBoundary ne voit pas les
  // rejets de promesse. On affiche donc un écran d'erreur avec une action.
  const [loadError, setLoadError] = useState(null)
  const [updateAvailable, setUpdateAvailable] = useState(false)
  // Infos complètes de la MAJ détectée (version, downloadUrl, assetName, taille,
  // notes) — nécessaires à l'overlay global pour lancer le téléchargement.
  const [updateInfo, setUpdateInfo] = useState(null)

  const refresh = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        window.electronAPI.store.getActiveProfile(),
        window.electronAPI.store.getSettings()
      ])
      setProfile(p)
      setSettings(s ?? DEFAULT_SETTINGS)
      setLoadError(null)
    } catch (e) {
      setLoadError(String(e?.message ?? e))
    } finally {
      // finally : quelle que soit l'issue, on SORT de l'état de chargement.
      // C'est ce qui garantit qu'on n'aboutit jamais à une fenêtre noire.
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const switchProfile = useCallback(async (id) => {
    await window.electronAPI.store.setActiveProfile(id)
    await refresh()
  }, [refresh])

  // Rechargement des réglages seuls (utilisé après un import de profil).
  const saveSettingsSafe = useCallback(async (incoming) => {
    try {
      const saved = await window.electronAPI.store.saveSettings(incoming)
      setSettings(saved ?? incoming)
    } catch {
      // On applique quand même localement : l'utilisateur voit son choix pris en
      // compte, et la prochaine écriture réussie persistera l'ensemble.
      setSettings(prev => ({ ...prev, ...incoming }))
    }
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

  if (loadError) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-[#0a0a09] px-8 text-center">
        <div className="text-3xl">⚠</div>
        <div className="text-stone-200 text-sm max-w-md">
          Impossible de charger ton profil.
          <div className="mt-2 font-mono text-xs text-stone-500 break-all">{loadError}</div>
        </div>
        <button
          onClick={() => { setLoading(true); refresh() }}
          className="bg-[#1c1c1a] hover:bg-[#252520] text-stone-200 text-sm px-4 py-2 rounded-sm transition-colors"
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <ProfileContext.Provider value={{ profile, settings, loading, refresh, switchProfile, saveSettings: saveSettingsSafe, updateAvailable, setUpdateAvailable, updateInfo, setUpdateInfo }}>
      {!loading && children}
    </ProfileContext.Provider>
  )
}

export function useProfile() {
  return useContext(ProfileContext)
}
