import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import contentIndex from '../content/index.json'
import { getModule } from '../content/loader'
import { useProfile } from '../contexts/ProfileContext'
import { moduleScore } from '../utils/score'

// Langages standards (Bash, Python, PowerShell) sur les 6 niveaux
const ALL_LANGS = ['bash', 'python', 'powershell', 'kql', 'sql', 'regex', 'git', 'spl', 'yaml']
const LANG_LABELS = { bash: 'Bash', python: 'Python', powershell: 'PowerShell', kql: 'KQL', sql: 'SQL', regex: 'Regex', git: 'Git', spl: 'SPL', yaml: 'YAML' }
const LANG_COLORS = {
  bash:       { active: 'bg-[#22d3ee] text-[#0f1117]',  badge: 'text-[#22d3ee]' },
  python:     { active: 'bg-[#f59e0b] text-[#0f1117]',  badge: 'text-[#f59e0b]' },
  powershell: { active: 'bg-[#6366f1] text-white',       badge: 'text-[#6366f1]' },
  kql:        { active: 'bg-[#e879f9] text-[#0f1117]',  badge: 'text-[#e879f9]' },
  sql:        { active: 'bg-[#3b82f6] text-white',       badge: 'text-[#3b82f6]' },
  regex:      { active: 'bg-[#8b5cf6] text-white',       badge: 'text-[#8b5cf6]' },
  git:        { active: 'bg-[#f97316] text-white',       badge: 'text-[#f97316]' },
  spl:        { active: 'bg-[#10b981] text-white',       badge: 'text-[#10b981]' },
  yaml:       { active: 'bg-[#f59e0b] text-[#0f1117]',  badge: 'text-[#f59e0b]' },
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

// Composant d'une carte de module, réutilisé pour standards et complémentaires
function ModuleCard({ ref: modRef, lang, levelId, navigate, progress }) {
  const mod = getModule(modRef.id)
  const exercises = mod?.exercises ?? []
  const { score, completed, total, stars } = moduleScore(exercises, progress)

  const getResume = () => {
    if (!mod) return null
    const idx = mod.exercises.findIndex(ex => !progress[ex.id]?.completed)
    return idx === -1 ? null : idx + 1
  }

  const resumeIdx = mod ? getResume() : null
  const isComplete = completed === total && total > 0
  const isStarted = completed > 0 && !isComplete
  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0
  const isTheory = total === 0
  const langColor = LANG_COLORS[lang] ?? { active: 'bg-[#6366f1] text-white', badge: 'text-[#6366f1]' }

  return (
    <div className="bg-[#1a1d2e] border border-[#2d3748] rounded-xl p-5 hover:border-[#6366f1] transition-colors group">
      {/* En-tête carte */}
      <div className="flex items-start justify-between mb-3">
        <span className={`text-xs font-medium px-2 py-0.5 rounded ${langColor.badge} bg-current/10`}>
          {LANG_LABELS[lang]} · M{modRef.order}
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
        onClick={() => navigate(`/course/${lang}/${levelId}/${modRef.id}`)}
      >
        {modRef.title}
      </h3>
      <p className="text-slate-500 text-xs">
        {LANG_LABELS[lang]} · {isTheory ? 'Cours théorique' : `${total} exercices`} · {modRef.estimatedMinutes} min
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
            <p className="text-slate-600 text-xs mt-1">{completed}/{total} exercices complétés</p>
          )}
          {isComplete && (
            <p className="text-green-500/70 text-xs mt-1">✓ Module terminé</p>
          )}
        </>
      )}

      {/* Boutons */}
      <div className="flex gap-2 mt-3">
        <button
          onClick={() => navigate(`/course/${lang}/${levelId}/${modRef.id}`)}
          className="flex-1 bg-[#232640] hover:bg-[#2d3258] text-slate-300 text-xs py-1.5 rounded-lg transition-colors"
        >
          {isTheory ? '📖 Lire le cours' : 'Cours'}
        </button>
        {!isTheory && (
          <button
            onClick={() => {
              if (!isStarted && !isComplete) {
                navigate(`/course/${lang}/${levelId}/${modRef.id}`)
              } else {
                const idx = resumeIdx ?? 1
                navigate(`/exercise/${lang}/${levelId}/${modRef.id}/${idx}`)
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
}

export default function CourseList() {
  const navigate = useNavigate()
  const { profile } = useProfile()

  // Mode d'affichage : 'standard' (niveaux 1-6) ou 'complementary' (langages complémentaires)
  const [viewMode, setViewMode] = useState('standard')

  // État pour le mode standard
  const [lang, setLang] = useState('bash')
  const [selectedLevel, setSelectedLevel] = useState(1)

  // État pour le mode complémentaire
  // selectedTrack : clé du track (ex: 'sql')
  // selectedCompLevelId : id du sous-niveau (ex: 'sql-l1')
  const [selectedTrack, setSelectedTrack] = useState(null)
  const [selectedCompLevelId, setSelectedCompLevelId] = useState(null)
  const [expandedTracks, setExpandedTracks] = useState({})

  const [progress, setProgress] = useState({})
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!profile) return
    window.electronAPI.store.getProgress(profile.id).then(setProgress)
  }, [profile])

  const levels = contentIndex.levels
  const complementary = contentIndex.complementary
  const levelData = levels.find(l => l.id === selectedLevel)

  // Modules à afficher pour le mode standard
  const moduleRefs = (levelData?.languages?.[lang] ?? []).filter(ref =>
    search === '' || ref.title.toLowerCase().includes(search.toLowerCase())
  )

  // Modules à afficher pour le mode complémentaire
  const compTrack = selectedTrack ? complementary.tracks[selectedTrack] : null
  const compLevel = compTrack?.levels?.find(l => l.id === selectedCompLevelId)
  const compModuleRefs = (compLevel?.modules ?? []).filter(ref =>
    search === '' || ref.title.toLowerCase().includes(search.toLowerCase())
  )

  // Auto-switch vers la première langue disponible quand le niveau change (mode standard)
  useEffect(() => {
    if (viewMode !== 'standard') return
    const available = ALL_LANGS.filter(
      l => (levelData?.languages?.[l]?.length ?? 0) > 0
    )
    if (available.length > 0 && !available.includes(lang)) {
      setLang(available[0])
    }
  }, [selectedLevel, viewMode])

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

  // Langues disponibles pour le niveau sélectionné (mode standard)
  const availableLangsForLevel = ALL_LANGS.filter(
    l => (levelData?.languages?.[l]?.length ?? 0) > 0
  )

  // Calculer le % de complétion d'un sous-niveau complémentaire
  const getCompLevelPct = (trackKey, levelObj) => {
    const allEx = levelObj.modules.flatMap(m => getModule(m.id)?.exercises ?? [])
    if (allEx.length === 0) return 0
    const done = allEx.filter(ex => progress[ex.id]?.completed).length
    return Math.round((done / allEx.length) * 100)
  }

  // Sélectionner un track complémentaire — ouvre le premier sous-niveau automatiquement
  const handleSelectTrack = (trackKey) => {
    setSelectedTrack(trackKey)
    const track = complementary.tracks[trackKey]
    if (track?.levels?.length > 0) {
      setSelectedCompLevelId(track.levels[0].id)
    }
    setExpandedTracks(prev => ({ ...prev, [trackKey]: true }))
  }

  // Basculer l'expansion d'un track dans la sidebar
  const toggleTrack = (trackKey) => {
    setExpandedTracks(prev => ({ ...prev, [trackKey]: !prev[trackKey] }))
  }

  return (
    <div className="flex h-full">
      {/* ── Sidebar ── */}
      <div className="w-60 bg-[#1a1d2e] border-r border-[#2d3748] p-3 flex-shrink-0 overflow-y-auto">

        {/* Onglets Standard / Complémentaires */}
        <div className="flex gap-1 mb-3">
          <button
            onClick={() => setViewMode('standard')}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'standard'
                ? 'bg-[#6366f1] text-white'
                : 'text-slate-400 hover:text-white hover:bg-[#232640]'
            }`}
          >
            Scripting
          </button>
          <button
            onClick={() => setViewMode('complementary')}
            className={`flex-1 text-xs py-1.5 rounded-lg font-medium transition-colors ${
              viewMode === 'complementary'
                ? 'bg-[#6366f1] text-white'
                : 'text-slate-400 hover:text-white hover:bg-[#232640]'
            }`}
          >
            Complémentaires
          </button>
        </div>

        {/* ── Niveaux standard (1-6) ── */}
        {viewMode === 'standard' && (
          <div className="space-y-1">
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
        )}

        {/* ── Langages complémentaires ── */}
        {viewMode === 'complementary' && (
          <div className="space-y-1">
            {Object.entries(complementary.tracks).map(([trackKey, track]) => {
              const isActive = selectedTrack === trackKey
              const isExpanded = expandedTracks[trackKey]
              // Couleur du track depuis LANG_COLORS
              const trackColor = LANG_COLORS[trackKey]?.badge ?? 'text-[#6366f1]'

              return (
                <div key={trackKey}>
                  {/* En-tête du track */}
                  <button
                    onClick={() => {
                      handleSelectTrack(trackKey)
                      toggleTrack(trackKey)
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-center justify-between ${
                      isActive
                        ? 'bg-[#232640] text-white border border-[#6366f1]/40'
                        : 'text-slate-400 hover:text-white hover:bg-[#232640]'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{track.icon}</span>
                      <span className="font-medium">{track.name}</span>
                    </span>
                    <span className={`text-xs transition-transform ${isExpanded ? 'rotate-90' : ''}`}>▶</span>
                  </button>

                  {/* Sous-niveaux du track */}
                  {isExpanded && (
                    <div className="ml-3 mt-1 space-y-0.5">
                      {track.levels.map((level) => {
                        const pct = getCompLevelPct(trackKey, level)
                        const isLevelActive = selectedCompLevelId === level.id
                        return (
                          <button
                            key={level.id}
                            onClick={() => {
                              setSelectedTrack(trackKey)
                              setSelectedCompLevelId(level.id)
                            }}
                            className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                              isLevelActive
                                ? `${LANG_COLORS[trackKey]?.active ?? 'bg-[#6366f1] text-white'}`
                                : 'text-slate-500 hover:text-white hover:bg-[#232640]'
                            }`}
                          >
                            <span>{level.name}</span>
                            {pct > 0 && (
                              <span className={`text-xs font-medium ${isLevelActive ? 'opacity-70' : 'text-slate-500'}`}>
                                {pct}%
                              </span>
                            )}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Contenu principal ── */}
      <div className="flex-1 p-8 overflow-y-auto">

        {/* ════ Mode standard ════ */}
        {viewMode === 'standard' && (
          <>
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
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">⌕</span>
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

            {/* Grille modules standard */}
            {(levelData?.languages?.[lang] ?? []).length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-12 h-12 rounded-full bg-[#1a1d2e] flex items-center justify-center mb-4 text-2xl">📝</div>
                <p className="text-slate-400 text-lg mb-2">Contenu en cours de rédaction</p>
                <p className="text-slate-600 text-sm">Ce niveau sera disponible prochainement.</p>
              </div>
            ) : moduleRefs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-slate-400 text-lg mb-2">Aucun module trouvé</p>
                <button onClick={() => setSearch('')} className="text-[#6366f1] text-sm hover:underline">Effacer la recherche</button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {moduleRefs.map((ref) => {
                  const allRefs = levelData?.languages?.[lang] ?? []
                  const realIndex = allRefs.findIndex(r => r.id === ref.id)
                  const mod = getModule(ref.id)
                  const exercises = mod?.exercises ?? []
                  const { score, completed, total, stars } = moduleScore(exercises, progress)

                  const getResume = () => {
                    if (!mod) return null
                    const idx = mod.exercises.findIndex(ex => !progress[ex.id]?.completed)
                    return idx === -1 ? null : idx + 1
                  }
                  const resumeIdx = mod ? getResume() : null
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
                      <h3
                        className="text-white font-medium mb-1 group-hover:text-[#6366f1] transition-colors cursor-pointer leading-snug"
                        onClick={() => navigate(`/course/${lang}/${selectedLevel}/${ref.id}`)}
                      >
                        {ref.title}
                      </h3>
                      <p className="text-slate-500 text-xs">
                        {LANG_LABELS[lang]} · {isTheory ? 'Cours théorique' : `${total} exercices`} · {ref.estimatedMinutes} min
                      </p>
                      {!isTheory && (
                        <>
                          <div className="mt-3 h-1 bg-[#0f1117] rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-green-500' : 'bg-[#6366f1]'}`}
                              style={{ width: `${completionPct}%` }}
                            />
                          </div>
                          {isStarted && <p className="text-slate-600 text-xs mt-1">{completed}/{total} exercices complétés</p>}
                          {isComplete && <p className="text-green-500/70 text-xs mt-1">✓ Module terminé</p>}
                        </>
                      )}
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
          </>
        )}

        {/* ════ Mode complémentaire ════ */}
        {viewMode === 'complementary' && (
          <>
            {/* Prompt : sélectionner un track si aucun n'est actif */}
            {!selectedTrack ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="text-4xl mb-4">🗂️</div>
                <h2 className="text-xl font-bold text-white mb-2">Langages complémentaires</h2>
                <p className="text-slate-500 text-sm">Sélectionnez un langage dans la sidebar pour commencer.</p>
                {/* Grille des tracks disponibles */}
                <div className="grid grid-cols-3 gap-4 mt-8 max-w-xl">
                  {Object.entries(complementary.tracks).map(([key, track]) => (
                    <button
                      key={key}
                      onClick={() => handleSelectTrack(key)}
                      className="bg-[#1a1d2e] border border-[#2d3748] rounded-xl p-4 hover:border-[#6366f1] transition-colors text-center"
                    >
                      <div className="text-3xl mb-2">{track.icon}</div>
                      <div className="text-white font-medium text-sm">{track.name}</div>
                      <div className="text-slate-500 text-xs mt-1">{track.levels.length} niveaux</div>
                    </button>
                  ))}
                </div>
              </div>
            ) : !selectedCompLevelId ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-slate-400">Sélectionnez un niveau dans la sidebar.</p>
              </div>
            ) : (
              <>
                {/* En-tête mode complémentaire */}
                <div className="flex items-start gap-4 mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="text-2xl">{compTrack?.icon}</span>
                      <h1 className="text-2xl font-bold text-white">{compTrack?.name}</h1>
                      <span
                        className="text-sm px-2 py-0.5 rounded font-medium"
                        style={{ color: compTrack?.color, background: `${compTrack?.color}20` }}
                      >
                        {compLevel?.name}
                      </span>
                    </div>
                    <p className="text-slate-500 text-sm">{compTrack?.description}</p>
                  </div>
                  {/* Navigation sous-niveaux (tabs horizontaux) */}
                  <div className="flex bg-[#1a1d2e] rounded-lg p-1 border border-[#2d3748] gap-0.5">
                    {compTrack?.levels.map((level) => (
                      <button
                        key={level.id}
                        onClick={() => setSelectedCompLevelId(level.id)}
                        className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          selectedCompLevelId === level.id
                            ? LANG_COLORS[selectedTrack]?.active ?? 'bg-[#6366f1] text-white'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        N{level.order}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Barre de recherche (mode complémentaire) */}
                <div className="relative mb-6">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 text-sm pointer-events-none">⌕</span>
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher un module…"
                    className="bg-[#1a1d2e] border border-[#2d3748] rounded-lg pl-7 pr-3 py-1.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#6366f1] w-60 transition-colors"
                  />
                </div>

                {/* Grille modules complémentaires */}
                {compModuleRefs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <p className="text-slate-400 text-lg mb-2">Aucun module trouvé</p>
                    <button onClick={() => setSearch('')} className="text-[#6366f1] text-sm hover:underline">Effacer la recherche</button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    {compModuleRefs.map((modRef) => (
                      <ModuleCard
                        key={modRef.id}
                        ref={modRef}
                        lang={selectedTrack}
                        levelId={selectedCompLevelId}
                        navigate={navigate}
                        progress={progress}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
