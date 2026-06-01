import { useState, useEffect, useMemo } from 'react'
import { useProfile } from '../contexts/ProfileContext'
import { useNavigate } from 'react-router-dom'
import contentIndex from '../content/index.json'
import { getModule } from '../content/loader'
import { computeTotalXP, xpLevelInfo } from '../utils/xp'
import { computeStats, BADGE_DEFS, getUnlockedBadges } from '../utils/badges'

const ALL_LANGS = ['bash', 'python', 'powershell', 'kql', 'sql', 'regex', 'git', 'spl', 'yaml']
const LANG_LABELS  = { bash: 'Bash', python: 'Python', powershell: 'PowerShell', kql: 'KQL', sql: 'SQL', regex: 'Regex', git: 'Git', spl: 'SPL', yaml: 'YAML', html: 'HTML', php: 'PHP' }
const LANG_COLORS  = { bash: '#22d3ee', python: '#f59e0b', powershell: '#6366f1', kql: '#e879f9', sql: '#34d399', regex: '#fb923c', git: '#60a5fa', spl: '#a78bfa', yaml: '#facc15', html: '#e34c26', php: '#8892bf' }

function StatCard({ label, value, sub, color }) {
  return (
    <div className="bg-[#1a1d2e] rounded-xl p-5 border border-[#2d3748]">
      <p className="text-slate-400 text-sm mb-1">{label}</p>
      <p className="text-2xl font-bold" style={{ color: color ?? 'white' }}>{value}</p>
      {sub && <p className="text-slate-500 text-xs mt-0.5">{sub}</p>}
    </div>
  )
}

function Bar({ label, value, max, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <span className="text-slate-400 text-sm w-24 flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-[#0f1117] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-slate-300 text-sm w-8 text-right flex-shrink-0">{value}</span>
    </div>
  )
}

export default function Stats() {
  const { profile } = useProfile()
  const navigate = useNavigate()
  const [progress, setProgress] = useState({})
  const [activity, setActivity] = useState([])

  useEffect(() => {
    if (!profile) return
    window.electronAPI.store.getProgress(profile.id).then(setProgress)
    window.electronAPI.store.getActivity(profile.id).then(setActivity)
  }, [profile])

  const stats   = useMemo(() => computeStats(progress, activity), [progress, activity])
  const xpTotal = useMemo(() => computeTotalXP(progress, contentIndex, getModule), [progress])
  const xpInfo  = useMemo(() => xpLevelInfo(xpTotal), [xpTotal])
  const badges  = useMemo(() => getUnlockedBadges(stats), [stats])

  // Exercices par langage totaux (niveaux standard + langages complémentaires)
  const exByLang = useMemo(() => {
    // Initialiser tous les langages à 0 pour éviter les undefined dans rateByLang
    const res = Object.fromEntries(ALL_LANGS.map(l => [l, 0]))

    // Niveaux standard (Bash, Python, PowerShell — niveaux 1 à 6)
    for (const level of contentIndex.levels) {
      for (const lang of ALL_LANGS) {
        for (const ref of (level.languages[lang] ?? [])) {
          const mod = getModule(ref.id)
          if (mod) res[lang] += mod.exercises.length
        }
      }
    }

    // Langages complémentaires (SQL, Git, Regex, KQL, SPL, YAML)
    const tracks = contentIndex.complementary?.tracks ?? {}
    for (const [trackKey, track] of Object.entries(tracks)) {
      for (const level of track.levels) {
        for (const modRef of level.modules) {
          const mod = getModule(modRef.id)
          if (mod) res[trackKey] = (res[trackKey] ?? 0) + mod.exercises.length
        }
      }
    }

    return res
  }, [])

  // Total exercices (inclut les deux sections)
  const totalExercises = Object.values(exByLang).reduce((a, b) => a + b, 0)

  // Taux de réussite par langage
  const rateByLang = useMemo(() => {
    const res = {}
    for (const lang of ALL_LANGS) {
      const done = stats.completedByLang[lang] ?? 0
      const total = exByLang[lang]
      res[lang] = { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
    }
    return res
  }, [stats, exByLang])

  // Exercices avec le plus de tentatives (standard + complémentaires)
  const hardExercises = useMemo(() => {
    const list = []

    // Niveaux standard
    for (const level of contentIndex.levels) {
      for (const lang of ALL_LANGS) {
        for (const ref of (level.languages[lang] ?? [])) {
          const mod = getModule(ref.id)
          if (!mod) continue
          for (const ex of mod.exercises) {
            const entry = progress[ex.id]
            if (entry && (entry.attempts ?? 0) > 1) {
              list.push({ ex, attempts: entry.attempts, completed: entry.completed, lang })
            }
          }
        }
      }
    }

    // Langages complémentaires — même logique, on cherche les exercices difficiles partout
    const tracks = contentIndex.complementary?.tracks ?? {}
    for (const [trackKey, track] of Object.entries(tracks)) {
      for (const level of track.levels) {
        for (const modRef of level.modules) {
          const mod = getModule(modRef.id)
          if (!mod) continue
          for (const ex of mod.exercises) {
            const entry = progress[ex.id]
            if (entry && (entry.attempts ?? 0) > 1) {
              list.push({ ex, attempts: entry.attempts, completed: entry.completed, lang: trackKey })
            }
          }
        }
      }
    }

    return list.sort((a, b) => b.attempts - a.attempts).slice(0, 5)
  }, [progress])

  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-white">Statistiques</h1>
        <button
          onClick={() => navigate('/app/dashboard')}
          className="ml-auto text-slate-400 hover:text-white text-sm transition-colors"
        >
          ← Tableau de bord
        </button>
      </div>

      {/* XP & Niveau */}
      <div className="bg-[#1a1d2e] rounded-xl p-6 border border-[#6366f1]/30 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-white font-bold text-xl">Niveau {xpInfo.level} — {xpInfo.title}</p>
            <p className="text-slate-400 text-sm">{xpTotal} XP accumulés</p>
          </div>
          <div className="text-4xl font-black text-[#6366f1]">Niv.{xpInfo.level}</div>
        </div>
        <div className="h-3 bg-[#0f1117] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-[#6366f1] to-[#22d3ee] rounded-full transition-all duration-700"
            style={{ width: `${xpInfo.pct}%` }} />
        </div>
        {xpInfo.nextThreshold && (
          <p className="text-slate-500 text-xs mt-1.5">
            {xpTotal} / {xpInfo.nextThreshold} XP pour le niveau suivant
          </p>
        )}
      </div>

      {/* Chiffres clés */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Exercices réussis" value={stats.totalDone} sub={`sur ${totalExercises}`} />
        <StatCard label="Taux global" value={`${totalExercises > 0 ? Math.round((stats.totalDone / totalExercises) * 100) : 0}%`} />
        <StatCard label="1er coup" value={stats.firstTryCount} sub="réussis sans erreur" color="#4ade80" />
        <StatCard label="Streak" value={`${stats.streak}j`} sub="jours consécutifs" color="#f59e0b" />
      </div>

      {/* Progression par langage */}
      <div className="bg-[#1a1d2e] rounded-xl p-6 border border-[#2d3748] mb-6">
        <h2 className="text-white font-semibold mb-4">Progression par langage</h2>
        <div className="space-y-4">
          {ALL_LANGS.map(lang => (
            <div key={lang}>
              <div className="flex justify-between mb-1">
                <span className="text-sm font-medium" style={{ color: LANG_COLORS[lang] }}>{LANG_LABELS[lang]}</span>
                <span className="text-slate-400 text-xs">{rateByLang[lang].done} / {rateByLang[lang].total} — {rateByLang[lang].pct}%</span>
              </div>
              <div className="h-2 bg-[#0f1117] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${rateByLang[lang].pct}%`, backgroundColor: LANG_COLORS[lang] }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Exercices difficiles */}
      {hardExercises.length > 0 && (
        <div className="bg-[#1a1d2e] rounded-xl p-6 border border-[#2d3748] mb-6">
          <h2 className="text-white font-semibold mb-4">Exercices les plus difficiles</h2>
          <div className="space-y-2">
            {hardExercises.map(({ ex, attempts, completed, lang }) => (
              <div key={ex.id} className="flex items-center justify-between py-2 border-b border-[#2d3748] last:border-0">
                <div className="flex items-center gap-3">
                  {/* L'emoji ne doit pas être dans className — les emojis ne sont pas des classes CSS valides */}
                  <span className="text-base">{completed ? '✅' : '❌'}</span>
                  <div>
                    <p className="text-slate-300 text-sm">{ex.title}</p>
                    <span className="text-xs px-1.5 py-0.5 rounded" style={{ backgroundColor: `${LANG_COLORS[lang]}20`, color: LANG_COLORS[lang] }}>
                      {LANG_LABELS[lang]}
                    </span>
                  </div>
                </div>
                <span className="text-slate-400 text-sm flex-shrink-0 ml-4">{attempts} tentatives</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="bg-[#1a1d2e] rounded-xl p-6 border border-[#2d3748]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-white font-semibold">Badges</h2>
          <span className="text-slate-500 text-sm">{badges.length} / {BADGE_DEFS.length}</span>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {BADGE_DEFS.map(b => {
            const unlocked = badges.some(u => u.id === b.id)
            return (
              <div key={b.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                unlocked
                  ? 'bg-[#232640] border-[#2d3748]'
                  : 'bg-[#0f1117] border-[#1a1d2e] opacity-50'
              }`}>
                <span className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>{b.icon}</span>
                <div>
                  <p className={`text-sm font-medium ${unlocked ? 'text-white' : 'text-slate-500'}`}>{b.label}</p>
                  <p className="text-slate-500 text-xs">{b.desc}</p>
                </div>
                {unlocked && <span className="ml-auto text-green-400 text-xs">✓</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
