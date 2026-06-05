import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import { getModule } from '../content/loader'
import contentIndex from '../content/index.json'

const LANG_COLORS = { bash: '#22d3ee', python: '#f59e0b', powershell: '#d97706', kql: '#e879f9', sql: '#34d399', regex: '#fb923c', git: '#60a5fa', spl: '#a78bfa', yaml: '#facc15', html: '#e34c26', php: '#8892bf' }
const LANG_LABELS = { bash: 'Bash', python: 'Python', powershell: 'PowerShell', kql: 'KQL', sql: 'SQL', regex: 'Regex', git: 'Git', spl: 'SPL', yaml: 'YAML', html: 'HTML', php: 'PHP' }

const CAREER_PATHS = {
  sysadmin: {
    label: 'Administrateur système',
    icon: '🖥️',
    color: '#22d3ee',
    desc: 'Automatisation, gestion de serveurs, scripting système',
    phases: [
      { label: 'Shell & navigation', ids: ['bash-l1-m1', 'bash-l1-m2', 'bash-l1-m3', 'bash-l1-m4', 'bash-l1-m5', 'bash-l1-m6'] },
      { label: 'Bash intermédiaire', ids: ['bash-l2-m1', 'bash-l2-m2', 'bash-l2-m3', 'bash-l2-m4', 'bash-l2-m5', 'bash-l2-m6'] },
      { label: 'PowerShell', ids: ['ps-l1-m1', 'ps-l1-m2', 'ps-l1-m3', 'ps-l1-m4', 'ps-l2-m1', 'ps-l2-m2', 'ps-l2-m5'] },
      { label: 'Automatisation avancée', ids: ['bash-l3-m1', 'bash-l3-m2', 'bash-l3-m3', 'bash-l3-m4', 'bash-l3-m5'] },
      { label: 'Git & YAML', ids: ['git-l1-m1', 'git-l2-m1', 'yaml-l1-m1', 'yaml-l1-m2', 'yaml-l2-m2'] },
    ]
  },
  devops: {
    label: 'DevOps',
    icon: '⚙️',
    color: '#facc15',
    desc: 'CI/CD, Infrastructure as Code, conteneurs, automatisation',
    phases: [
      { label: 'Shell fondations', ids: ['bash-l1-m1', 'bash-l1-m4', 'bash-l1-m5', 'bash-l2-m2'] },
      { label: 'Git', ids: ['git-l1-m1', 'git-l2-m1', 'git-l3-m1', 'git-l4-m1'] },
      { label: 'YAML', ids: ['yaml-l1-m1', 'yaml-l1-m2', 'yaml-l1-m3', 'yaml-l2-m1', 'yaml-l2-m2', 'yaml-l2-m3'] },
      { label: 'Bash avancé', ids: ['bash-l3-m3', 'bash-l3-m5', 'bash-l4-m1', 'bash-l4-m5'] },
      { label: 'PowerShell IaC', ids: ['ps-l4-m6', 'ps-l3-m3', 'ps-l4-m2'] },
    ]
  },
  soc: {
    label: 'Analyste SOC',
    icon: '🔒',
    color: '#e879f9',
    desc: 'Détection de menaces, analyse de logs, threat hunting',
    phases: [
      { label: 'Fondations shell', ids: ['bash-l1-m1', 'bash-l1-m2', 'bash-l1-m6'] },
      { label: 'KQL / Sentinel', ids: ['kql-l1-m1', 'kql-l1-m2', 'kql-l1-m3', 'kql-l2-m2', 'kql-l2-m3', 'kql-l3-m3'] },
      { label: 'SPL / Splunk', ids: ['spl-l1-m1', 'spl-l2-m1', 'spl-l3-m2'] },
      { label: 'Python sécurité', ids: ['py-l3-m1', 'py-l3-m2', 'py-l4-m1', 'py-l4-m2', 'py-l4-m3'] },
      { label: 'SOC avancé', ids: ['bash-l6-m1', 'bash-l6-m3', 'ps-l6-m1', 'ps-l6-m2'] },
    ]
  },
  datascience: {
    label: 'Data Scientist',
    icon: '📊',
    color: '#34d399',
    desc: 'Analyse de données, Python, SQL, expressions régulières',
    phases: [
      { label: 'Python fondations', ids: ['py-l1-m1', 'py-l1-m2', 'py-l1-m3', 'py-l1-m4', 'py-l1-m5', 'py-l1-m6'] },
      { label: 'Python données', ids: ['py-l2-m1', 'py-l2-m2', 'py-l2-m3', 'py-l2-m4', 'py-l2-m5'] },
      { label: 'SQL', ids: ['sql-l1-m1', 'sql-l1-m2', 'sql-l2-m1', 'sql-l2-m3'] },
      { label: 'Expressions régulières', ids: ['regex-l1-m1', 'regex-l1-m2', 'regex-l2-m1', 'regex-l2-m4'] },
      { label: 'Git', ids: ['git-l1-m1', 'git-l2-m1', 'yaml-l1-m1'] },
    ]
  },
  developer: {
    label: 'Développeur',
    icon: '💻',
    color: '#60a5fa',
    desc: 'Scripting, versioning, automatisation de build',
    phases: [
      { label: 'Python fondations', ids: ['py-l1-m1', 'py-l1-m2', 'py-l1-m3', 'py-l1-m4'] },
      { label: 'Git', ids: ['git-l1-m1', 'git-l2-m1', 'git-l3-m1', 'git-l4-m1'] },
      { label: 'Regex', ids: ['regex-l1-m1', 'regex-l1-m2', 'regex-l2-m1'] },
      { label: 'Bash & automatisation', ids: ['bash-l1-m1', 'bash-l2-m2', 'bash-l3-m5'] },
      { label: 'YAML & CI/CD', ids: ['yaml-l1-m1', 'yaml-l1-m2', 'yaml-l2-m2', 'yaml-l2-m3'] },
    ]
  },
  general: {
    label: 'Généraliste',
    icon: '🌐',
    color: '#a78bfa',
    desc: 'Tour d\'horizon complet des langages de scripting',
    phases: [
      { label: 'Bash', ids: ['bash-l1-m1', 'bash-l1-m2', 'bash-l1-m3', 'bash-l1-m4', 'bash-l1-m5', 'bash-l1-m6'] },
      { label: 'Python', ids: ['py-l1-m1', 'py-l1-m2', 'py-l1-m3', 'py-l1-m4'] },
      { label: 'PowerShell', ids: ['ps-l1-m1', 'ps-l1-m2', 'ps-l1-m3', 'ps-l1-m4'] },
      { label: 'SQL & Regex', ids: ['sql-l1-m1', 'sql-l1-m2', 'regex-l1-m1', 'regex-l1-m2'] },
      { label: 'Git & YAML', ids: ['git-l1-m1', 'git-l2-m1', 'yaml-l1-m1', 'yaml-l1-m2'] },
    ]
  }
}

function findModuleMeta(moduleId) {
  // Recherche dans les niveaux standard (Bash, Python, PowerShell, niveaux 1-6)
  for (const level of contentIndex.levels) {
    for (const [lang, refs] of Object.entries(level.languages)) {
      const ref = refs.find(r => r.id === moduleId)
      if (ref) return { lang, levelId: level.id, ref }
    }
  }
  // Recherche dans les langages complémentaires (SQL, Git, Regex, KQL, SPL, YAML)
  // Les IDs de modules complémentaires suivent le pattern {lang}-l{level}-m{num}
  const tracks = contentIndex.complementary?.tracks ?? {}
  for (const [trackKey, track] of Object.entries(tracks)) {
    for (const level of track.levels) {
      const mod = level.modules.find(m => m.id === moduleId)
      if (mod) return { lang: trackKey, levelId: level.id, ref: mod }
    }
  }
  return null
}

export default function Roadmap() {
  const navigate = useNavigate()
  const { profile, refresh } = useProfile()
  const [progress, setProgress] = useState({})
  const [changing, setChanging] = useState(false)
  const career = profile?.career ?? null

  useEffect(() => {
    if (!profile) return
    window.electronAPI.store.getProgress(profile.id).then(setProgress)
  }, [profile?.id])

  const selectCareer = async (key) => {
    await window.electronAPI.store.updateCareer(profile.id, key)
    await refresh()
    setChanging(false)
  }

  const path = career ? CAREER_PATHS[career] : null

  const phaseStats = useMemo(() => {
    if (!path) return []
    return path.phases.map(phase => {
      let done = 0, total = 0
      for (const id of phase.ids) {
        const mod = getModule(id)
        if (!mod) continue
        for (const ex of mod.exercises) {
          total++
          if (progress[ex.id]?.completed) done++
        }
      }
      return { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 }
    })
  }, [path, progress])

  if (!career || changing) {
    return (
      <div className="p-8 overflow-y-auto h-full">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Parcours guidé</h1>
            <p className="text-stone-400 text-sm mt-1">
              {changing ? 'Choisissez un nouveau parcours' : 'Choisissez votre parcours selon votre objectif professionnel'}
            </p>
          </div>
          {changing && (
            <button onClick={() => setChanging(false)} className="text-stone-400 hover:text-white text-sm transition-colors">
              ← Annuler
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-4 max-w-3xl">
          {Object.entries(CAREER_PATHS).map(([key, cp]) => (
            <button
              key={key}
              onClick={() => selectCareer(key)}
              className="bg-[#111110] hover:bg-[#1c1c1a] border border-[#2e2b26] hover:border-[#3d3a34] rounded p-5 text-left transition-all group"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{cp.icon}</span>
                <span className="text-white font-semibold">{cp.label}</span>
              </div>
              <p className="text-stone-400 text-sm">{cp.desc}</p>
              <div className="flex gap-1.5 mt-3 flex-wrap">
                {cp.phases.map((phase, i) => (
                  <span key={i} className="text-xs px-2 py-0.5 rounded-full bg-[#0a0a09] text-stone-500">
                    {phase.label}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  const totalDone  = phaseStats.reduce((s, p) => s + p.done, 0)
  const totalItems = phaseStats.reduce((s, p) => s + p.total, 0)
  const globalPct  = totalItems > 0 ? Math.round((totalDone / totalItems) * 100) : 0

  return (
    <div className="p-8 overflow-y-auto h-full">
      {/* En-tête */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-3xl">{path.icon}</span>
            <h1 className="text-2xl font-bold text-white">{path.label}</h1>
          </div>
          <p className="text-stone-400 text-sm">{path.desc}</p>
        </div>
        <button
          onClick={() => setChanging(true)}
          className="text-xs text-stone-400 hover:text-white bg-[#111110] hover:bg-[#1c1c1a] border border-[#2e2b26] px-3 py-2 rounded-sm transition-colors"
        >
          Changer de parcours
        </button>
      </div>

      {/* Progression globale */}
      <div className="bg-[#111110] border border-[#2e2b26] rounded p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-white">Progression globale</span>
          <span className="text-sm text-stone-400">{totalDone} / {totalItems} exercices · {globalPct}%</span>
        </div>
        <div className="h-2 bg-[#0a0a09] rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${globalPct}%`, backgroundColor: path.color }}
          />
        </div>
      </div>

      {/* Phases */}
      <div className="space-y-6">
        {path.phases.map((phase, phaseIdx) => {
          const stats = phaseStats[phaseIdx]
          const isUnlocked = phaseIdx === 0 || phaseStats[phaseIdx - 1].pct >= 50
          return (
            <div key={phaseIdx} className={`${isUnlocked ? '' : 'opacity-50'}`}>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{ backgroundColor: stats.pct === 100 ? '#4ade80' : path.color + '30', color: stats.pct === 100 ? '#0a0a09' : path.color }}>
                  {stats.pct === 100 ? '✓' : phaseIdx + 1}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium text-sm">{phase.label}</span>
                    <span className="text-stone-500 text-xs">{stats.done}/{stats.total} · {stats.pct}%</span>
                  </div>
                  <div className="h-1 bg-[#0a0a09] rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${stats.pct}%`, backgroundColor: stats.pct === 100 ? '#4ade80' : path.color }} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 ml-10">
                {phase.ids.map(id => {
                  const meta = findModuleMeta(id)
                  const mod = getModule(id)
                  if (!meta || !mod) return null
                  const done = mod.exercises.filter(ex => progress[ex.id]?.completed).length
                  const total = mod.exercises.length
                  const pct = total > 0 ? Math.round((done / total) * 100) : 0
                  const langColor = LANG_COLORS[meta.lang] ?? '#d97706'
                  const langLabel = LANG_LABELS[meta.lang] ?? meta.lang
                  return (
                    <button
                      key={id}
                      disabled={!isUnlocked}
                      onClick={() => navigate(`/course/${meta.lang}/${meta.levelId}/${id}`)}
                      className="bg-[#111110] hover:bg-[#1c1c1a] border border-[#2e2b26] hover:border-[#3d3a34] rounded-sm p-3 text-left transition-all group disabled:cursor-not-allowed"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-stone-200 text-xs font-medium leading-snug flex-1">{meta.ref.title}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 font-medium"
                          style={{ backgroundColor: `${langColor}20`, color: langColor }}>
                          {langLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1 bg-[#0a0a09] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-300"
                            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#4ade80' : langColor }} />
                        </div>
                        <span className="text-[10px] text-stone-500 flex-shrink-0">{done}/{total}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
