import { NavLink, useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'

// Labels seuls — les indicateurs ASCII (▸ / ·) sont gérés dynamiquement dans le rendu
const navItems = [
  { to: '/app/dashboard',   label: 'tableau de bord'  },
  { to: '/app/courses',     label: 'cours'             },
  { to: '/app/missions',    label: 'missions'          },
  { to: '/app/roadmap',     label: 'parcours'          },
  { to: '/app/flashcards',  label: 'révision'          },
  { to: '/app/sandbox',     label: 'sandbox'           },
  { to: '/app/map',         label: 'carte'             },
  { to: '/app/stats',       label: 'statistiques'      },
  { to: '/app/cheatsheets', label: 'aide-mémoire'      },
  { to: '/app/settings',    label: 'paramètres',       updateBadge: true },
]

function Sidebar({ onSearch }) {
  const navigate = useNavigate()
  const { profile, updateAvailable } = useProfile()

  return (
    <aside className="w-56 bg-[#111110] border-r border-[#2e2b26] flex flex-col flex-shrink-0">

      {/* ── En-tête : marque ─────────────────────────────────────────────
          WebkitAppRegion:'drag' rend la zone draggable pour déplacer la fenêtre
          (nécessaire car frame:false supprime la barre de titre native).
          Le logo doit être no-drag pour rester cliquable.
          Les contrôles fenêtre (réduire/agrandir/fermer) sont désormais en haut
          à DROITE de la fenêtre (convention Windows), gérés par AppLayout. */}
      <div
        className="px-4 py-4 border-b border-[#2e2b26] flex items-center flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: 'no-drag' }}>
          {/* Carré ambre avec >_ — évoque un prompt terminal, identité forte */}
          <div className="w-7 h-7 bg-[#d97706] flex items-center justify-center text-[10px] font-bold text-[#0a0a09] flex-shrink-0 rounded-sm select-none">
            &gt;_
          </div>
          <div>
            <div className="text-[#f5f0e8] text-sm font-semibold leading-none tracking-tight">
              ScriptLearn
            </div>
            {/* Tagline commentaire — clin d'œil au code source, ton authentique */}
            <div className="text-[#3d3a34] text-[10px] leading-none mt-0.5 tracking-wide">
              // scripting
            </div>
          </div>
        </div>
      </div>

      {/* ── Recherche (Ctrl+K) ─────────────────────────────────────────── */}
      <div className="px-3 pt-3 pb-1 flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={onSearch}
          className="w-full flex items-center gap-2 px-3 py-1.5 bg-[#0a0a09] border border-[#2e2b26] rounded-sm text-[#3d3a34] hover:text-[#78716c] hover:border-[#3d3a34] transition-colors text-xs"
        >
          <span className="text-[#3d3a34]">/</span>
          <span className="flex-1 text-left">rechercher…</span>
          <kbd className="text-[10px] border border-[#2e2b26] px-1 py-0.5 rounded-sm text-[#3d3a34]">⌃K</kbd>
        </button>
      </div>

      {/* ── Navigation ────────────────────────────────────────────────────
          ▸ = item actif (triangle ASCII), · = inactif
          Labels en minuscules pour le style terminal */}
      <nav className="flex-1 px-2 py-2 space-y-px overflow-y-auto" style={{ WebkitAppRegion: 'no-drag' }}>
        {navItems.map(({ to, label, updateBadge }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs transition-colors ${
                isActive
                  ? 'bg-[#d97706] text-[#0a0a09] font-semibold'
                  : 'text-[#78716c] hover:text-[#f5f0e8] hover:bg-[#1c1c1a]'
              }`
            }
          >
            {({ isActive }) => (
              <>
                {/* Indicateur ASCII : ▸ actif, · inactif — plus sobre que les icônes emoji */}
                <span className="w-3 text-center flex-shrink-0 text-[10px]">
                  {isActive ? '▸' : '·'}
                </span>
                <span className="flex-1 tracking-wide">{label}</span>
                {updateBadge && updateAvailable && (
                  /* Pastille mise à jour : vert ambre-adjacent, discret */
                  <span className="w-1.5 h-1.5 rounded-full bg-[#86efac] flex-shrink-0" title="Mise à jour disponible" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Profil actif ──────────────────────────────────────────────────
          Juste emoji + nom + indicateur de changement — épuré, pas de fond coloré */}
      <div className="px-2 pb-3 pt-2 border-t border-[#2e2b26] flex-shrink-0" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={() => navigate('/')}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-sm text-xs text-[#78716c] hover:text-[#f5f0e8] hover:bg-[#1c1c1a] transition-colors"
        >
          <span className="text-base flex-shrink-0">{profile?.emoji ?? '🧑'}</span>
          <div className="text-left overflow-hidden flex-1 min-w-0">
            <div className="text-[#d6d0c8] text-xs font-medium truncate leading-tight">
              {profile?.name ?? '…'}
            </div>
            <div className="text-[#3d3a34] text-[10px] leading-tight tracking-wide">
              changer ▸
            </div>
          </div>
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
