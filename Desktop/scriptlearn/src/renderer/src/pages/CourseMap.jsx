import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import contentIndex from '../content/index.json'
import { getModule } from '../content/loader'

const ALL_LANGS = ['bash', 'python', 'powershell', 'kql', 'sql', 'regex', 'git', 'spl', 'yaml']
const LANG_LABELS = { bash: 'Bash', python: 'Python', powershell: 'PowerShell', kql: 'KQL', sql: 'SQL', regex: 'Regex', git: 'Git', spl: 'SPL', yaml: 'YAML', html: 'HTML', php: 'PHP' }
const LANG_COLORS = {
  bash: '#22d3ee', python: '#f59e0b', powershell: '#6366f1',
  kql: '#e879f9', sql: '#3b82f6', regex: '#8b5cf6',
  git: '#f97316', spl: '#10b981', yaml: '#f59e0b',
  html: '#e34c26', php: '#8892bf'
}

export default function CourseMap() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [progress, setProgress] = useState({})
  const [selectedLang, setSelectedLang] = useState('bash')
  // Mode d'affichage : 'standard' (niveaux 1-6) ou 'complementary' (langages complémentaires)
  const [viewMode, setViewMode] = useState('standard')
  // Track complémentaire sélectionné pour la vue détaillée
  const [selectedTrack, setSelectedTrack] = useState(null)

  useEffect(() => {
    if (!profile) return
    window.electronAPI.store.getProgress(profile.id).then(setProgress)
  }, [profile])

  // Données pour la vue standard — calcul du % de progression par module
  const langData = useMemo(() => {
    return contentIndex.levels.map(level => {
      const refs = level.languages[selectedLang] ?? []
      const modules = refs.map(ref => {
        const mod = getModule(ref.id)
        const exercises = mod?.exercises ?? []
        const done = exercises.filter(ex => progress[ex.id]?.completed).length
        const total = exercises.length
        const pct = total > 0 ? Math.round((done / total) * 100) : 0
        return { ...ref, done, total, pct, locked: level.locked }
      })
      return { ...level, modules }
    })
  }, [selectedLang, progress])

  // Données pour la vue complémentaire — calcul du % par niveau par track
  const compData = useMemo(() => {
    const tracks = contentIndex.complementary.tracks
    return Object.entries(tracks).map(([key, track]) => {
      const levels = track.levels.map(level => {
        const allEx = level.modules.flatMap(m => getModule(m.id)?.exercises ?? [])
        const done = allEx.filter(ex => progress[ex.id]?.completed).length
        const total = allEx.length
        const pct = total > 0 ? Math.round((done / total) * 100) : 0
        const modulesWithPct = level.modules.map(m => {
          const mod = getModule(m.id)
          const exs = mod?.exercises ?? []
          const d = exs.filter(ex => progress[ex.id]?.completed).length
          const t = exs.length
          return { ...m, done: d, total: t, pct: t > 0 ? Math.round((d / t) * 100) : 0 }
        })
        return { ...level, done, total, pct, modules: modulesWithPct }
      })
      const totalDone = levels.reduce((s, l) => s + l.done, 0)
      const totalAll = levels.reduce((s, l) => s + l.total, 0)
      const overallPct = totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 0
      return { key, ...track, levels, overallPct }
    })
  }, [progress])

  const activeTrackData = selectedTrack ? compData.find(t => t.key === selectedTrack) : null

  return (
    <div className="p-8 overflow-y-auto h-full">
      {/* En-tête avec sélecteurs */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold text-white">Carte du parcours</h1>
          {/* Toggle Standard / Complémentaires */}
          <div className="flex bg-[#1a1d2e] border border-[#2d3748] rounded-lg p-1 gap-1">
            <button
              onClick={() => setViewMode('standard')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'standard'
                  ? 'bg-[#6366f1] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Scripting
            </button>
            <button
              onClick={() => setViewMode('complementary')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                viewMode === 'complementary'
                  ? 'bg-[#6366f1] text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Complémentaires
            </button>
          </div>
        </div>

        {/* Sélecteur de langage (mode standard uniquement) */}
        {viewMode === 'standard' && (
          <div className="flex gap-2 flex-wrap">
            {ALL_LANGS.map(lang => (
              <button
                key={lang}
                onClick={() => setSelectedLang(lang)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedLang === lang
                    ? 'text-white'
                    : 'bg-[#1a1d2e] text-slate-400 hover:text-white border border-[#2d3748]'
                }`}
                style={selectedLang === lang
                  ? { backgroundColor: LANG_COLORS[lang] }
                  : {}}
              >
                {LANG_LABELS[lang]}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ════ Vue standard — timeline verticale ════ */}
      {viewMode === 'standard' && (
        <div className="relative">
          {/* Ligne verticale de connexion */}
          <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-[#2d3748]" />

          <div className="space-y-8">
            {langData.map((level) => (
              <div key={level.id} className="relative pl-16">
                {/* Nœud niveau */}
                <div
                  className="absolute left-3.5 top-3 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                  style={{
                    backgroundColor: level.locked ? '#1a1d2e' : level.color,
                    borderColor: level.locked ? '#374151' : level.color
                  }}
                >
                  {level.locked && <span className="text-slate-600 text-xs">🔒</span>}
                </div>

                {/* En-tête niveau */}
                <div className="mb-4">
                  <h2 className="text-white font-bold">Niveau {level.id} — {level.name}</h2>
                  {level.description && <p className="text-slate-500 text-xs mt-0.5">{level.description}</p>}
                </div>

                {level.modules.length === 0 ? (
                  <p className="text-slate-600 text-sm italic">Aucun module {LANG_LABELS[selectedLang]} à ce niveau.</p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {level.modules.map((mod) => (
                      <button
                        key={mod.id}
                        disabled={level.locked}
                        onClick={() => !level.locked && navigate(`/course/${selectedLang}/${level.id}/${mod.id}`)}
                        className={`bg-[#1a1d2e] rounded-xl p-4 border text-left transition-all ${
                          level.locked
                            ? 'border-[#2d3748] opacity-50 cursor-not-allowed'
                            : mod.pct === 100
                            ? 'border-green-500/40 hover:border-green-500/70'
                            : mod.pct > 0
                            ? 'border-[#6366f1]/40 hover:border-[#6366f1]'
                            : 'border-[#2d3748] hover:border-[#3d4756]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <span className="text-white text-sm font-medium leading-snug">{mod.title}</span>
                          {mod.pct === 100 && <span className="text-green-400 text-xs flex-shrink-0">✓</span>}
                        </div>
                        <div className="h-1 bg-[#0f1117] rounded-full overflow-hidden mb-1">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${mod.pct}%`,
                              backgroundColor: mod.pct === 100 ? '#4ade80' : LANG_COLORS[selectedLang]
                            }}
                          />
                        </div>
                        <p className="text-slate-500 text-xs">{mod.done}/{mod.total} exercices</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ════ Vue complémentaire — grille de tracks ════ */}
      {viewMode === 'complementary' && (
        <div>
          {/* Grille des tracks (vue d'ensemble) */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            {compData.map((track) => (
              <button
                key={track.key}
                onClick={() => setSelectedTrack(selectedTrack === track.key ? null : track.key)}
                className={`bg-[#1a1d2e] rounded-xl p-4 border text-left transition-all ${
                  selectedTrack === track.key
                    ? 'border-[#6366f1]'
                    : 'border-[#2d3748] hover:border-[#3d4756]'
                }`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{track.icon}</span>
                  <div>
                    <div className="text-white font-bold">{track.name}</div>
                    <div className="text-slate-500 text-xs">{track.levels.length} niveaux</div>
                  </div>
                  <div className="ml-auto text-right">
                    <div
                      className="text-sm font-bold"
                      style={{ color: track.key in LANG_COLORS ? LANG_COLORS[track.key] : '#6366f1' }}
                    >
                      {track.overallPct}%
                    </div>
                  </div>
                </div>
                <div className="h-1.5 bg-[#0f1117] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${track.overallPct}%`,
                      backgroundColor: track.key in LANG_COLORS ? LANG_COLORS[track.key] : '#6366f1'
                    }}
                  />
                </div>
                <p className="text-slate-500 text-xs mt-2">{track.description}</p>
              </button>
            ))}
          </div>

          {/* Détail du track sélectionné — niveaux et modules */}
          {activeTrackData && (
            <div className="relative">
              {/* Ligne verticale */}
              <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-[#2d3748]" />

              <h2 className="text-lg font-bold text-white mb-6 pl-16">
                {activeTrackData.icon} {activeTrackData.name} — Progression par niveau
              </h2>

              <div className="space-y-8">
                {activeTrackData.levels.map((level) => {
                  const trackColor = LANG_COLORS[activeTrackData.key] ?? '#6366f1'
                  return (
                    <div key={level.id} className="relative pl-16">
                      {/* Nœud niveau */}
                      <div
                        className="absolute left-3.5 top-3 w-5 h-5 rounded-full border-2"
                        style={{
                          backgroundColor: level.pct > 0 ? trackColor : '#1a1d2e',
                          borderColor: level.pct > 0 ? trackColor : '#374151'
                        }}
                      />

                      {/* En-tête sous-niveau */}
                      <div className="mb-4 flex items-center gap-3">
                        <h3 className="text-white font-bold">{level.name}</h3>
                        <span
                          className="text-xs font-medium px-2 py-0.5 rounded"
                          style={{ color: trackColor, background: `${trackColor}20` }}
                        >
                          {level.pct}%
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {level.modules.map((mod) => (
                          <button
                            key={mod.id}
                            onClick={() => navigate(`/course/${activeTrackData.key}/${level.id}/${mod.id}`)}
                            className={`bg-[#1a1d2e] rounded-xl p-4 border text-left transition-all ${
                              mod.pct === 100
                                ? 'border-green-500/40 hover:border-green-500/70'
                                : mod.pct > 0
                                ? 'border-[#6366f1]/40 hover:border-[#6366f1]'
                                : 'border-[#2d3748] hover:border-[#3d4756]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <span className="text-white text-sm font-medium leading-snug">{mod.title}</span>
                              {mod.pct === 100 && <span className="text-green-400 text-xs flex-shrink-0">✓</span>}
                            </div>
                            <div className="h-1 bg-[#0f1117] rounded-full overflow-hidden mb-1">
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{
                                  width: `${mod.pct}%`,
                                  backgroundColor: mod.pct === 100 ? '#4ade80' : trackColor
                                }}
                              />
                            </div>
                            <p className="text-slate-500 text-xs">{mod.done}/{mod.total} exercices</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
