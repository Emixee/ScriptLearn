import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import GlobalSearch from './GlobalSearch'

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
      {/* min-w-0 empêche le débordement horizontal quand un enfant a une largeur fixe
          ou un contenu large (tableaux, blocs de code) — comportement par défaut de flex */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <Outlet />
      </main>
      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
    </div>
  )
}

export default AppLayout
