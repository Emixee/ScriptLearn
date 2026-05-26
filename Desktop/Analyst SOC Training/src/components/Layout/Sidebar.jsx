import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LayoutDashboard, BookOpen, FlaskConical, Flag, Settings, LogOut, ShieldCheck, Trophy } from 'lucide-react'
import useAppStore from '../../store/useAppStore'
import { ProgressBar } from '../UI'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentProfile, getLevelProgress, t } = useAppStore()
  const lvl = getLevelProgress()

  const levelNames = ['Fondamentaux', 'Sécurité', 'SOC Junior', 'SOC Confirmé', 'Expert']
  const levelColors = ['var(--level-0)', 'var(--level-1)', 'var(--level-2)', 'var(--level-3)', 'var(--level-4)']

  const navItems = [
    { path: '/dashboard',  icon: <LayoutDashboard size={18} />, label: t('nav.dashboard') },
    { path: '/curriculum', icon: <BookOpen size={18} />,         label: t('nav.curriculum') },
    { path: '/ctf',        icon: <Flag size={18} />,             label: 'CTF' },
    { path: '/settings',   icon: <Settings size={18} />,         label: t('nav.settings') },
  ]

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/')

  return (
    <aside style={{
      width: 240,
      minWidth: 240,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      overflow: 'hidden',
    }}>
      {/* Logo */}
      <div style={{
        padding: '1.2rem 1rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
      }}>
        <div style={{
          width: 36, height: 36,
          background: 'var(--accent-glow)',
          border: '1px solid var(--accent)',
          borderRadius: 'var(--radius-md)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
        }}>
          <ShieldCheck size={20} color="var(--accent)" />
        </div>
        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent)', letterSpacing: '0.05em' }}>SOC TRAINING</div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', letterSpacing: '0.08em' }}>ANALYST PATH</div>
        </div>
      </div>

      {/* Profile card */}
      {currentProfile && (
        <div style={{ padding: '0.8rem 1rem', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'var(--bg-active)',
              border: `2px solid ${levelColors[Math.min(4, Math.floor(lvl.level / 2))]}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1rem', flexShrink: 0,
            }}>
              {currentProfile.avatar || '🛡️'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {currentProfile.name}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                {currentProfile.xp?.toLocaleString() || 0} XP
              </div>
            </div>
          </div>

          {/* XP Bar */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: 4, fontFamily: 'var(--font-mono)' }}>
              <span>Nv. {lvl.level} — {levelNames[Math.min(4, lvl.level)]}</span>
              <span>{lvl.percent}%</span>
            </div>
            <ProgressBar value={lvl.xpCurrent} max={lvl.xpToNext} color={levelColors[Math.min(4, lvl.level)]} height={4} />
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '0.6rem 0.5rem', overflowY: 'auto' }}>
        {navItems.map(item => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.55rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: 'none',
              cursor: 'pointer',
              fontSize: '0.875rem',
              fontFamily: 'var(--font-sans)',
              fontWeight: isActive(item.path) ? 600 : 400,
              background: isActive(item.path) ? 'var(--accent-glow)' : 'transparent',
              color: isActive(item.path) ? 'var(--accent)' : 'var(--text-secondary)',
              marginBottom: 2,
              transition: 'all var(--transition)',
              textAlign: 'left',
              borderLeft: isActive(item.path) ? '2px solid var(--accent)' : '2px solid transparent',
            }}
            onMouseEnter={e => {
              if (!isActive(item.path)) {
                e.currentTarget.style.background = 'var(--bg-hover)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }
            }}
            onMouseLeave={e => {
              if (!isActive(item.path)) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }
            }}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Bottom — Badges & Logout */}
      <div style={{ padding: '0.75rem', borderTop: '1px solid var(--border)' }}>
        {currentProfile && currentProfile.badges?.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.5rem', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
            <Trophy size={13} color="var(--accent-yellow)" />
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              {currentProfile.badges.length} badge{currentProfile.badges.length > 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap', marginLeft: 'auto' }}>
              {currentProfile.badges.slice(0, 5).map(b => (
                <span key={b} style={{ fontSize: '0.75rem' }}>🏅</span>
              ))}
            </div>
          </div>
        )}
        <button
          onClick={() => navigate('/')}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            borderRadius: 'var(--radius-md)',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            fontSize: '0.8rem',
            fontFamily: 'var(--font-sans)',
            cursor: 'pointer',
            transition: 'all var(--transition)',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent-red)'; e.currentTarget.style.background = 'rgba(255,107,107,0.08)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.background = 'transparent' }}
        >
          <LogOut size={15} />
          {t('nav.logout')}
        </button>
      </div>
    </aside>
  )
}
