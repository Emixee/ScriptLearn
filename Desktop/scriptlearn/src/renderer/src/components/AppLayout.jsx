import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'
import WindowControls from './WindowControls'

function AppLayout() {
  const [showSearch, setShowSearch] = useState(false)

  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'k') {
        e.preventDefault()
        setShowSearch(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  return (
    <div className="flex h-screen bg-[#0a0a09]">
      <Sidebar onSearch={() => setShowSearch(true)} />
      {/* Colonne de droite : fine barre de titre (drag + contrôles fenêtre à droite)
          puis le contenu. min-w-0 empêche le débordement horizontal quand un enfant
          a une largeur fixe ou un contenu large (tableaux, blocs de code). */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barre de titre : zone draggable pour déplacer la fenêtre, contrôles à droite
            (réduire/agrandir/fermer) — position conventionnelle en haut à droite. */}
        <div
          className="h-9 flex-shrink-0 flex items-center justify-end pr-1 border-b border-[#2e2b26]"
          style={{ WebkitAppRegion: 'drag' }}
        >
          <WindowControls />
        </div>
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
    </div>
  )
}

export default AppLayout
