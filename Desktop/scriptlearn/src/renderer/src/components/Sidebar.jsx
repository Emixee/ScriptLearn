import { NavLink, useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import WindowControls from './WindowControls'

const navItems = [
  { to: '/app/dashboard',   label: 'Tableau de bord', icon: '▦' },
  { to: '/app/courses',     label: 'Cours',            icon: '◫' },
  { to: '/app/roadmap',     label: 'Parcours',         icon: '◉' },
  { to: '/app/flashcards',  label: 'Révision',         icon: '◪' },
  { to: '/app/sandbox',     label: 'Sandbox',          icon: '◌' },
  { to: '/app/map',         label: 'Carte',            icon: '◈' },
  { to: '/app/stats',       label: 'Statistiques',     icon: '◑' },
  { to: '/app/cheatsheets', label: 'Aide-mémoire',     icon: '◧' },
  { to: '/app/settings',    label: 'Paramètres',       icon: '◎', updateBadge: true },
]

function Sidebar({ onSearch }) {
  const navigate = useNavigate()
  const { profile, updateAvailable } = useProfile()

  return (
    <aside className="w-64 bg-[#1a1d2e] border-r border-[#2d3748] flex flex-col flex-shrink-0">
      {/* Logo + contrôles fenêtre */}
      <div
        className="px-4 py-4 border-b border-[#2d3748] flex items-center justify-between"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="w-8 h-8 bg-[#6366f1] rounded-lg flex items-center justify-center text-sm font-bold text-white">
            S
          </div>
          <span className="text-white font-semibold text-lg">ScriptLearn</span>
        </div>
        <WindowControls />
      </div>

      {/* Recherche (Ctrl+K) */}
      <div className="px-3 pt-3 pb-1" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={onSearch}
          className="w-full flex items-center gap-2 px-3 py-2 bg-[#0f1117] border border-[#2d3748] rounded-lg text-slate-500 hover:text-slate-300 hover:border-[#3d4756] transition-colors text-sm"
        >
          <span>🔍</span>
          <span className="flex-1 text-left text-xs">Rechercher…</span>
          <kbd className="text-xs border border-[#374151] px-1 py-0.5 rounded text-slate-600">Ctrl K</kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1">
        {navItems.map(({ to, label, icon, updateBadge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-[#6366f1] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-[#232640]'
              }`
            }
          >
            <span className="text-base">{icon}</span>
            <span className="flex-1">{label}</span>
            {updateBadge && updateAvailable && (
              <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" title="Mise à jour disponible" />
            )}
          </NavLink>
        ))}
      </nav>

      {/* Profil actif */}
      <div className="px-3 pb-4 border-t border-[#2d3748] pt-4">
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-[#232640] transition-colors"
        >
          <div className="w-8 h-8 bg-[#1a1d2e] border border-[#2d3748] rounded-lg flex items-center justify-center text-lg flex-shrink-0">
            {profile?.emoji ?? '🧑'}
          </div>
          <div className="text-left overflow-hidden">
            <div className="text-white text-sm font-medium truncate">{profile?.name ?? '…'}</div>
            <div className="text-slate-500 text-xs">Changer de profil</div>
          </div>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
