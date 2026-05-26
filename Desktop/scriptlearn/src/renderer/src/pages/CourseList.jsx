import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import contentIndex from '../content/index.json'
import { getModule } from '../content/loader'
import { useProfile } from '../contexts/ProfileContext'
import { moduleScore } from '../utils/score'

const ALL_LANGS = ['bash', 'python', 'powershell', 'kql', 'sql', 'regex', 'git', 'spl', 'yaml']
const LANG_LABELS = { bash: 'Bash', python: 'Python', powershell: 'PowerShell', kql: 'KQL', sql: 'SQL', regex: 'Regex', git: 'Git', spl: 'SPL', yaml: 'YAML' }
const LANG_COLORS = {
  bash:       { active: 'bg-[#22d3ee] text-[#0f1117]',  badge: 'text-[#22d3ee]' },
  python:     { active: 'bg-[#f59e0b] text-[#0f1117]',  badge: 'text-[#f59e0b]' },
  powershell: { active: 'bg-[#6366f1] text-white',       badge: 'text-[#6366f1]' },
  kql:        { active: 'bg-[#e879f9] text-[#0f1117]',  badge: 'text-[#e879f9]' },
  sql:        { active: 'bg-[#34d399] text-[#0f1117]',  badge: 'text-[#34d399]' },
  regex:      { active: 'bg-[#fb923c] text-[#0f1117]',  badge: 'text-[#fb923c]' },
  git:        { active: 'bg-[#60a5fa] text-[#0f1117]',  badge: 'text-[#60a5fa]' },
  spl:        { active: 'bg-[#a78bfa] text-[#0f1117]',  badge: 'text-[#a78bfa]' },
  yaml:       { active: 'bg-[#facc15] text-[#0f1117]',  badge: 'text-[#facc15]' },
}

function Stars({ count, max = 3 }) {
  return (
    <span className="flex gap-0.5 items-center">
      {Array.from({ length: max }, (_, i) => (
        <span key={i} className={`text-sm leading-none ${i < count ? 'text-yellow-400' : 'text-[#374151]'}`}>
          ★
        </span>
      ))}
    </span>
  )
}

function ScoreBadge({ score, started }) {
  if (!started) return null
  const color = score >= 80 ? 'text-green-400 bg-green-400/10' :
                score >= 55 ? 'text-yellow-400 bg-yellow-400/10' :
                              'text-orange-400 bg-orange-400/10'
  return (
    <span className={`text-xs font-semibold px-1.5 py-0.5 rounded ${color}`}>
      {score}%
    </span>
  )
}

export default function CourseList() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [lang, setLang] = useState('bash')
  const [selectedLevel, setSelectedLevel] = useState(1)
  const [progress, setProgress] = useState({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!profile) return
    window.electronAPI.store.getProgress(profile.id).then(setProgress)
  }, [profile])

  const levels = contentIndex.levels
  const levelData = levels.find(l => l.id === selectedLevel)
  const moduleRefs = (levelData?.languages?.[lang] ?? []).filter(ref =>
    search === '' || ref.title.toLowerCase().includes(search.toLowerCase())
  )

  // Auto-switch vers la première langue disponible quand le niveau change
  useEffect(() => {
    const available = ALL_LANGS.filter(
      l => (levelData?.languages?.[l]?.length ?? 0) > 0
    )
    if (available.length > 0 && !available.includes(lang)) {
      setLang(available[0])
    }
  }, [selectedLevel])

  // Langue par défaut : celle avec le plus d'activité
  useEffect(() => {
    if (!profile || Object.keys(progress).length === 0) return
    const counts = Object.fromEntries(ALL_LANGS.map(l => [l, 0]))
    for (const level of contentIndex.levels) {
      for (const l of ALL_LANGS) {
        for (const ref of (level.languages[l] ?? [])) {
          const mod = getModule(ref.id)
          if (mod) counts[l] += mod.exercises.filter(ex => progress[ex.id]?.completed).length
        }
      }
    }
    const max = Math.max(...Object.values(counts))
    if (max > 0) {
      const best = Object.entries(counts).find(([, v]) => v === max)?.[0]
      if (best) setLang(best)
    }
  }, [progress, profile])

  const getResume = (mod) => {
    if (!mod) return null
    const idx = mod.exercises.findIndex(ex => !progress[ex.id]?.completed)
    return idx === -1 ? null : idx + 1
  }

  // Langues disponibles pour le niveau sélectionné
  const availableLangsForLevel = ALL_LANGS.filter(
    l => (levelData?.languages?.[l]?.length ?? 0) > 0
  )

  return (
    <div className="flex h-full">
      {/* Sidebar niveaux */}
      <div className="w-56 bg-[#1a1d2e] border-r border-[#2d3748] p-3 space-y-1 flex-shrink-0 overflow-y-auto">
        {levels.map((level) => {
          const refs = level.languages[lang] ?? []
          const allEx = refs.flatMap(r => getModule(r.id)?.exercises ?? [])
          const done = allEx.filter(ex => progress[ex.id]?.completed).length
          const pct = allEx.length > 0 ? Math.round((done / allEx.length) * 100) : 0
          return (
            <button
              key={level.id}
              disabled={level.locked}
              onClick={() => !level.locked && setSelectedLevel(level.id)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                selectedLevel === level.id && !level.locked
                  ? 'bg-[#6366f1] text-white'
                  : level.locked
                  ? 'text-slate-600 cursor-not-allowed'
                  : 'text-slate-400 hover:text-white hover:bg-[#232640]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span>{level.locked ? '🔒 ' : ''}Niv. {level.id} — {level.name}</span>
                {!level.locked && allEx.length > 0 && (
                  <span className={`text-xs font-medium ml-1 ${
                    selectedLevel === level.id ? 'text-white/70' : 'text-slate-500'
                  }`}>
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>

      {/* Contenu principal */}
      <div className="flex-1 p-8 overflow-y-auto">
        {/* En-tête */}
        <div className="flex items-start gap-4 mb-6">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Cours disponibles</h1>
            {levelData?.description && (
              <p className="text-slate-500 text-sm mt-1">{levelData.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Barre de recherche */}
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">
                ⌕
              </span>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Rechercher…"
                className="bg-[#1a1d2e] border border-[#2d3748] rounded-lg pl-7 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#6366f1] w-40 transition-colors"
              />
            </div>
            {/* Toggle langue */}
            <div className="flex bg-[#1a1d2e] rounded-lg p-1 border border-[#2d3748] gap-0.5 flex-wrap">
              {availableLangsForLevel.map((l) => (
                <button
                  key={l}
                  onClick={() => setLang(l)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    lang === l
                      ? LANG_COLORS[l].active
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {LANG_LABELS[l]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Indicateur langue sans contenu dans ce niveau */}
        {availableLangsForLevel.length > 0 && !availableLangsForLevel.includes(lang) && (
          <div className="mb-4 flex gap-2 flex-wrap">
            <span className="text-slate-500 text-sm">Pas de contenu {LANG_LABELS[lang]} à ce niveau. Disponible :</span>
            {availableLangsForLevel.map(l => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`text-xs px-2 py-0.5 rounded font-medium ${LANG_COLORS[l].badge} bg-current/10`}
              >
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
        )}

        {/* Grille de modules ou message vide */}
        {(levelData?.languages?.[lang] ?? []).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-12 h-12 rounded-full bg-[#1a1d2e] flex items-center justify-center mb-4 text-2xl">
              {lang === 'kql' ? '📊' : '🔒'}
            </div>
            <p className="text-slate-400 text-lg mb-2">Contenu en cours de rédaction</p>
            <p className="text-slate-600 text-sm">Ce niveau sera disponible prochainement.</p>
          </div>
        ) : moduleRefs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-slate-400 text-lg mb-2">Aucun module trouvé</p>
            <button onClick={() => setSearch('')} className="text-[#6366f1] text-sm hover:underline">
              Effacer la recherche
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {moduleRefs.map((ref) => {
              const allRefs = levelData?.languages?.[lang] ?? []
              const realIndex = allRefs.findIndex(r => r.id === ref.id)
              const mod = getModule(ref.id)
              const exercises = mod?.exercises ?? []
              const { score, completed, total, stars } = moduleScore(exercises, progress)
              const resumeIdx = mod ? getResume(mod) : null
              const isComplete = completed === total && total > 0
              const isStarted = completed > 0 && !isComplete
              const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0
              const isTheory = total === 0
              const langColor = LANG_COLORS[lang]

              return (
                <div
                  key={ref.id}
                  className="bg-[#1a1d2e] border border-[#2d3748] rounded-xl p-5 hover:border-[#6366f1] transition-colors group"
                >
                  {/* En-tête carte */}
                  <div className="flex items-start justify-between mb-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded ${langColor.badge} bg-current/10`}>
                      Module {realIndex + 1}
                    </span>
                    <div className="flex items-center gap-2">
                      {isTheory ? (
                        <span className="text-xs text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded font-medium">Cours</span>
                      ) : isStarted || isComplete ? (
                        <>
                          <Stars count={stars} />
                          <ScoreBadge score={score} started={isStarted || isComplete} />
                        </>
                      ) : (
                        <span className="text-xs text-slate-500">Non commencé</span>
                      )}
                    </div>
                  </div>

                  {/* Titre */}
                  <h3
                    className="text-white font-medium mb-1 group-hover:text-[#6366f1] transition-colors cursor-pointer leading-snug"
                    onClick={() => navigate(`/course/${lang}/${selectedLevel}/${ref.id}`)}
                  >
                    {ref.title}
                  </h3>
                  <p className="text-slate-500 text-xs">
                    {LANG_LABELS[lang]} · {isTheory ? 'Cours théorique' : `${total} exercices`} · {ref.estimatedMinutes} min
                  </p>

                  {/* Barre de progression */}
                  {!isTheory && (
                    <>
                      <div className="mt-3 h-1 bg-[#0f1117] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            isComplete ? 'bg-green-500' : 'bg-[#6366f1]'
                          }`}
                          style={{ width: `${completionPct}%` }}
                        />
                      </div>
                      {isStarted && (
                        <p className="text-slate-600 text-xs mt-1">
                          {completed}/{total} exercices complétés
                        </p>
                      )}
                      {isComplete && (
                        <p className="text-green-500/70 text-xs mt-1">✓ Module terminé</p>
                      )}
                    </>
                  )}

                  {/* Boutons */}
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => navigate(`/course/${lang}/${selectedLevel}/${ref.id}`)}
                      className="flex-1 bg-[#232640] hover:bg-[#2d3258] text-slate-300 text-xs py-1.5 rounded-lg transition-colors"
                    >
                      {isTheory ? '📖 Lire le cours' : 'Cours'}
                    </button>
                    {!isTheory && (
                      <button
                        onClick={() => {
                          if (!isStarted && !isComplete) {
                            // Pas encore commencé → lire le cours d'abord
                            navigate(`/course/${lang}/${selectedLevel}/${ref.id}`)
                          } else {
                            const idx = resumeIdx ?? 1
                            navigate(`/exercise/${lang}/${selectedLevel}/${ref.id}/${idx}`)
                          }
                        }}
                        className={`flex-1 text-xs py-1.5 rounded-lg transition-colors font-medium ${
                          isComplete
                            ? 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                            : isStarted
                            ? 'bg-[#6366f1] text-white hover:bg-[#4f46e5]'
                            : 'bg-[#6366f1]/20 text-[#6366f1] hover:bg-[#6366f1]/30'
                        }`}
                      >
                        {isComplete ? '↺ Revoir' : isStarted ? '▶ Continuer' : '📖 Commencer'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
