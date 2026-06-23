import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import contentIndex from '../content/index.json'
import { getModule } from '../content/loader'
import { moduleScore, levelMasteryScore } from '../utils/score'
import { computeTotalXP, xpLevelInfo } from '../utils/xp'
import { computeStats, getUnlockedBadges, computeStreak, BADGE_DEFS } from '../utils/badges'

const ALL_LANGS = ['bash', 'python', 'powershell', 'kql', 'sql', 'regex', 'git', 'spl', 'yaml']
const LANG_LABELS = { bash: 'Bash', python: 'Python', powershell: 'PowerShell', kql: 'KQL', sql: 'SQL', regex: 'Regex', git: 'Git', spl: 'SPL', yaml: 'YAML', html: 'HTML', php: 'PHP' }
const LANG_COLORS = { bash: '#22d3ee', python: '#f59e0b', powershell: '#d97706', kql: '#e879f9', sql: '#34d399', regex: '#fb923c', git: '#60a5fa', spl: '#a78bfa', yaml: '#facc15', html: '#e34c26', php: '#8892bf' }

function getLevelExercises(levelId, lang) {
  const level = contentIndex.levels.find(l => l.id === levelId)
  if (!level) return []
  return (level.languages[lang] ?? []).flatMap(ref => getModule(ref.id)?.exercises ?? [])
}

function buildLevelStats(progress) {
  return contentIndex.levels.map(level => {
    const allEx   = ALL_LANGS.flatMap(lang => getLevelExercises(level.id, lang))
    const total   = allEx.length
    const done    = allEx.filter(ex => progress[ex.id]?.completed).length
    const percent = total > 0 ? Math.round((done / total) * 100) : 0
    const mastery = levelMasteryScore(level, progress, getModule)
    return { ...level, total, done, percent, mastery }
  })
}

function findResumeTarget(progress) {
  // Chercher d'abord dans les niveaux standard (Bash, Python, PowerShell)
  for (const level of contentIndex.levels) {
    if (level.locked) continue
    for (const lang of ALL_LANGS) {
      for (const ref of (level.languages[lang] ?? [])) {
        const mod = getModule(ref.id)
        if (!mod) continue
        const idx = mod.exercises.findIndex(ex => !progress[ex.id]?.completed)
        if (idx !== -1) return { lang, levelId: level.id, moduleId: ref.id, exIdx: idx + 1, moduleTitle: ref.title }
      }
    }
  }
  // Si tous les niveaux standard sont terminés, chercher dans les langages complémentaires
  const tracks = contentIndex.complementary?.tracks ?? {}
  for (const [trackKey, track] of Object.entries(tracks)) {
    for (const level of track.levels) {
      for (const modRef of level.modules) {
        const mod = getModule(modRef.id)
        if (!mod) continue
        const idx = mod.exercises.findIndex(ex => !progress[ex.id]?.completed)
        if (idx !== -1) return { lang: trackKey, levelId: level.id, moduleId: modRef.id, exIdx: idx + 1, moduleTitle: modRef.title }
      }
    }
  }
  return null
}

function findSpacedRepetition(progress) {
  const now = Date.now()
  // Plus d'attempts = révision plus fréquente (Ebbinghaus spacing effect)
  const INTERVALS = [1, 3, 7, 14] // jours entre révisions selon le nombre de tentatives
  const results = []

  // Fonction interne : évalue un module pour la révision espacée
  function checkModule(refId, lang, levelId) {
    const mod = getModule(refId)
    if (!mod) return
    for (const ex of mod.exercises) {
      const entry = progress[ex.id]
      if (!entry?.completed) continue
      const attempts = entry.attempts ?? 1
      const intervalDays = INTERVALS[Math.min(attempts - 1, INTERVALS.length - 1)]
      const completedAt = new Date(entry.completedAt).getTime()
      const daysSince = (now - completedAt) / 86400000
      if (daysSince >= intervalDays) {
        results.push({ ex, lang, levelId, moduleId: refId, daysSince: Math.floor(daysSince), attempts })
      }
    }
  }

  // Niveaux standard (non verrouillés)
  for (const level of contentIndex.levels) {
    if (level.locked) continue
    for (const lang of ALL_LANGS) {
      for (const ref of (level.languages[lang] ?? [])) {
        checkModule(ref.id, lang, level.id)
      }
    }
  }

  // Langages complémentaires — pas de notion de verrouillage dans les tracks
  const tracks = contentIndex.complementary?.tracks ?? {}
  for (const [trackKey, track] of Object.entries(tracks)) {
    for (const level of track.levels) {
      for (const modRef of level.modules) {
        checkModule(modRef.id, trackKey, level.id)
      }
    }
  }

  return results.sort((a, b) => b.daysSince - a.daysSince).slice(0, 5)
}

function MasteryBar({ score }) {
  const barColor = score === 0 ? '#2e2b26' : score >= 80 ? '#4ade80' : score >= 55 ? '#fbbf24' : '#f97316'
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1 bg-[#0a0a09] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${score}%`, backgroundColor: barColor }} />
      </div>
      {score > 0 && (
        <span className="text-xs font-medium flex-shrink-0" style={{ color: barColor }}>maîtrise {score}%</span>
      )}
    </div>
  )
}

// Calendrier de chaleur (52 semaines)
function ActivityCalendar({ dates }) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const dateSet = new Set(dates)

  // Générer 365 jours en arrière, organisés par semaine
  const weeks = []
  let week = []
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const iso = d.toISOString().slice(0, 10)
    const active = dateSet.has(iso)
    week.push({ iso, active, day: d.getDay() })
    if (week.length === 7 || i === 0) {
      weeks.push(week)
      week = []
    }
  }

  return (
    <div className="flex gap-0.5 overflow-x-auto pb-1">
      {weeks.map((w, wi) => (
        <div key={wi} className="flex flex-col gap-0.5">
          {w.map((d) => (
            <div
              key={d.iso}
              title={d.iso}
              className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
              // Case vide en #2e2b26 (et non #111110 = fond de la carte) : sinon la
              // grille du calendrier se fond dans le fond et devient invisible.
              style={{ backgroundColor: d.active ? '#d97706' : '#2e2b26' }}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

function getWeekDates() {
  const today = new Date()
  const day = today.getDay() // 0=Sun
  const monday = new Date(today)
  monday.setDate(today.getDate() - ((day + 6) % 7))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [progress, setProgress] = useState({})
  const [activity, setActivity] = useState([])
  const [bashAvailable, setBashAvailable] = useState(true)
  const [weeklyGoal, setWeeklyGoal] = useState(10)

  useEffect(() => {
    if (!profile) return
    window.electronAPI.store.getProgress(profile.id).then(setProgress)
    window.electronAPI.store.getActivity(profile.id).then(setActivity)
    window.electronAPI.store.getWeeklyGoal(profile.id).then(g => setWeeklyGoal(g ?? 10))
  }, [profile])

  useEffect(() => {
    window.electronAPI.terminal.bashAvailable?.()
      .then(ok => setBashAvailable(ok))
      .catch(() => setBashAvailable(true))
  }, [])

  const levelStats   = useMemo(() => buildLevelStats(progress), [progress])
  const resumeTarget = useMemo(() => findResumeTarget(progress), [progress])
  const reviewItems  = useMemo(() => findSpacedRepetition(progress), [progress])
  const stats        = useMemo(() => computeStats(progress, activity), [progress, activity])
  const xpInfo       = useMemo(() => computeTotalXP(progress, contentIndex, getModule), [progress])
  const xpLevel      = useMemo(() => xpLevelInfo(xpInfo), [xpInfo])
  const badges       = useMemo(() => getUnlockedBadges(stats), [stats])

  // totalDone compte TOUS les exercices complétés dans la store (standard + complémentaires)
  const totalDone = Object.values(progress).filter(p => p.completed).length

  // Total exercices = niveaux standard + langages complémentaires
  // On sépare les deux pour pouvoir afficher "X / Y exercices" correctement
  const compExercisesTotal = useMemo(() => {
    let total = 0
    const tracks = contentIndex.complementary?.tracks ?? {}
    for (const [, track] of Object.entries(tracks)) {
      for (const level of track.levels) {
        for (const modRef of level.modules) {
          total += getModule(modRef.id)?.exercises?.length ?? 0
        }
      }
    }
    return total
  }, [])
  const totalExercises = levelStats.reduce((s, l) => s + l.total, 0) + compExercisesTotal
  const globalPercent  = totalExercises > 0 ? Math.round((totalDone / totalExercises) * 100) : 0
  const isNewProfile   = totalDone === 0 && Object.keys(progress).length === 0
  const streak         = computeStreak(activity)

  const completedModules = useMemo(() => {
    let count = 0
    // Modules standard
    for (const level of contentIndex.levels) {
      for (const lang of ALL_LANGS) {
        for (const ref of (level.languages[lang] ?? [])) {
          const mod = getModule(ref.id)
          if (!mod) continue
          if (mod.exercises.length > 0 && mod.exercises.every(ex => progress[ex.id]?.completed)) count++
        }
      }
    }
    // Modules complémentaires — même critère : 100% des exercices réussis
    const tracks = contentIndex.complementary?.tracks ?? {}
    for (const [, track] of Object.entries(tracks)) {
      for (const level of track.levels) {
        for (const modRef of level.modules) {
          const mod = getModule(modRef.id)
          if (!mod) continue
          if (mod.exercises.length > 0 && mod.exercises.every(ex => progress[ex.id]?.completed)) count++
        }
      }
    }
    return count
  }, [progress])

  // Nombre total de modules (standard + complémentaires) — affiché dans l'onboarding et les stats
  const totalModules = useMemo(() => {
    const standardCount = contentIndex.levels.reduce((s, l) =>
      s + ALL_LANGS.reduce((a, lang) => a + (l.languages[lang]?.length ?? 0), 0), 0)
    const compCount = Object.values(contentIndex.complementary?.tracks ?? {})
      .reduce((s, track) => s + track.levels.reduce((a, l) => a + l.modules.length, 0), 0)
    return standardCount + compCount
  }, [])

  const weeklyDone = useMemo(() => {
    const { monday, sunday } = getWeekDates()
    return Object.values(progress).filter(e => {
      if (!e.completed || !e.completedAt) return false
      const d = new Date(e.completedAt)
      return d >= monday && d <= sunday
    }).length
  }, [progress])

  const handleResume = () => {
    if (!resumeTarget) { navigate('/app/courses'); return }
    if (totalDone === 0) {
      navigate(`/course/${resumeTarget.lang}/${resumeTarget.levelId}/${resumeTarget.moduleId}`)
      return
    }
    navigate(`/exercise/${resumeTarget.lang}/${resumeTarget.levelId}/${resumeTarget.moduleId}/${resumeTarget.exIdx}`)
  }

  return (
    <div className="p-8 overflow-y-auto h-full">
      {/* En-tête */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Bonjour, {profile?.name ?? '…'}</h1>
          <p className="text-stone-400">Continuez votre apprentissage du scripting.</p>
        </div>
        {/* XP + niveau */}
        <div className="bg-[#111110] border border-[#2e2b26] rounded px-4 py-3 text-right min-w-[160px]">
          <div className="flex items-center justify-end gap-2 mb-1">
            <span className="text-stone-400 text-xs">Niv. {xpLevel.level}</span>
            <span className="text-white font-bold text-sm">{xpLevel.title}</span>
          </div>
          <div className="h-1.5 bg-[#0a0a09] rounded-full overflow-hidden mb-1">
            <div className="h-full bg-[#d97706] rounded-full transition-all duration-700" style={{ width: `${xpLevel.pct}%` }} />
          </div>
          <span className="text-stone-500 text-xs">{xpInfo} XP{xpLevel.nextThreshold ? ` / ${xpLevel.nextThreshold}` : ''}</span>
        </div>
      </div>

      {/* Avertissement Bash (bloc inactif : le bash MSYS2 est embarqué depuis la
          v0.18.0, donc bashAvailable est toujours vrai — conservé par sécurité). */}
      {!bashAvailable && (
        <div className="mb-5 bg-amber-500/10 border border-amber-500/30 rounded p-4 flex items-start gap-3">
          <span className="text-amber-400 text-lg flex-shrink-0">⚠</span>
          <div>
            <p className="text-amber-300 text-sm font-medium">Bash introuvable</p>
            <p className="text-amber-200/60 text-xs mt-0.5">
              Le terminal Bash embarqué est indisponible. Réinstalle ScriptLearn pour
              restaurer les outils embarqués.
            </p>
          </div>
        </div>
      )}

      {/* Onboarding nouveau profil */}
      {isNewProfile && (
        <div className="mb-6 bg-[#d97706]/10 border border-[#d97706]/30 rounded p-6">
          <h2 className="text-white font-semibold mb-2">Bienvenue dans ScriptLearn !</h2>
          <p className="text-stone-300 text-sm mb-4">
            Apprenez Bash, Python, PowerShell et KQL du niveau débutant à l'expert grâce à des cours interactifs et des exercices validés dans un terminal réel.
          </p>
          <div className="grid grid-cols-3 gap-3 mb-5 text-center">
            <div className="bg-[#0a0a09]/60 rounded-sm p-3">
              <p className="text-2xl font-bold text-white">{totalModules}</p>
              <p className="text-stone-400 text-xs mt-0.5">modules</p>
            </div>
            <div className="bg-[#0a0a09]/60 rounded-sm p-3">
              <p className="text-2xl font-bold text-white">{totalExercises}</p>
              <p className="text-stone-400 text-xs mt-0.5">exercices</p>
            </div>
            <div className="bg-[#0a0a09]/60 rounded-sm p-3">
              <p className="text-2xl font-bold text-white">~150h</p>
              <p className="text-stone-400 text-xs mt-0.5">de contenu</p>
            </div>
          </div>
          <button onClick={handleResume}
            className="bg-[#d97706] hover:bg-[#b45309] text-[#0a0a09] px-6 py-2.5 rounded font-medium transition-colors text-sm">
            Commencer le premier module →
          </button>
        </div>
      )}

      {/* Progression globale + streak + objectif hebdo */}
      {!isNewProfile && (
        <div className="space-y-4 mb-5">
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-[#111110] rounded p-5 border border-[#2e2b26]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-stone-300 text-sm font-medium">Progression globale</span>
                <span className="text-white font-bold text-sm">{globalPercent}%</span>
              </div>
              <div className="h-2 bg-[#0a0a09] rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${globalPercent}%`, background: 'linear-gradient(90deg, #d97706, #fbbf24)' }} />
              </div>
              <p className="text-stone-500 text-xs mt-2">
                {totalDone} exercices réussis sur {totalExercises} — {completedModules}/{totalModules} modules
              </p>
            </div>
            <div className="bg-[#111110] rounded p-5 border border-[#2e2b26] flex flex-col items-center justify-center">
              <div className="text-3xl font-bold text-white mb-0.5">{streak}</div>
              <div className="text-stone-400 text-xs">
                {streak === 0 ? 'Aucun streak' : streak === 1 ? 'jour consécutif 🔥' : `jours consécutifs 🔥`}
              </div>
            </div>
          </div>
          {/* Objectif hebdomadaire */}
          <div className="bg-[#111110] rounded p-5 border border-[#2e2b26]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white font-medium text-sm">Objectif de la semaine</span>
              <span className="text-stone-400 text-xs">
                {weeklyDone >= weeklyGoal
                  ? <span className="text-[#86efac] font-medium">Objectif atteint ✓</span>
                  : <span>{weeklyDone} / {weeklyGoal} exercices</span>}
              </span>
            </div>
            <div className="h-2 bg-[#0a0a09] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, Math.round((weeklyDone / weeklyGoal) * 100))}%`,
                  backgroundColor: weeklyDone >= weeklyGoal ? '#4ade80' : '#d97706'
                }} />
            </div>
            <p className="text-stone-600 text-xs mt-1.5">
              {weeklyGoal - weeklyDone > 0
                ? `Encore ${weeklyGoal - weeklyDone} exercice${weeklyGoal - weeklyDone > 1 ? 's' : ''} pour atteindre votre objectif`
                : `Bravo ! Continuez sur votre lancée.`}
            </p>
          </div>
        </div>
      )}

      {/* Stats + Reprendre */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-[#111110] rounded p-5 border border-[#2e2b26]">
          <p className="text-stone-400 text-sm mb-1">Modules complétés</p>
          <p className="text-2xl font-bold text-white">
            {completedModules}{' '}
            <span className="text-stone-500 text-base font-normal">/ {totalModules}</span>
          </p>
        </div>
        <div className="bg-[#111110] rounded p-5 border border-[#2e2b26]">
          <p className="text-stone-400 text-sm mb-1">Exercices réussis</p>
          <p className="text-2xl font-bold text-white">
            {totalDone}{' '}
            <span className="text-stone-500 text-base font-normal">/ {totalExercises}</span>
          </p>
        </div>
        <button
          onClick={handleResume}
          className="bg-[#111110] rounded p-5 border border-[#2e2b26] text-left hover:border-[#d97706] transition-colors group"
        >
          <p className="text-stone-400 text-sm mb-1">
            {!resumeTarget ? 'Tout terminé !' : totalDone === 0 ? 'Commencer' : 'Continuer'}
          </p>
          {resumeTarget ? (
            <>
              <p className="text-[#d97706] text-sm font-semibold group-hover:text-[#fbbf24] transition-colors truncate">
                → {resumeTarget.moduleTitle}
              </p>
              <p className="text-stone-600 text-xs mt-0.5 uppercase tracking-wide">
                {LANG_LABELS[resumeTarget.lang] ?? resumeTarget.lang}
              </p>
            </>
          ) : (
            <p className="text-[#86efac] text-sm font-semibold">Tous les exercices réussis 🎉</p>
          )}
        </button>
      </div>

      {/* Calendrier d'activité */}
      {activity.length > 0 && (
        <div className="bg-[#111110] rounded p-5 border border-[#2e2b26] mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold text-sm">Activité (365 jours)</span>
            <span className="text-stone-500 text-xs">{activity.length} jours actifs</span>
          </div>
          <ActivityCalendar dates={activity} />
        </div>
      )}

      {/* Badges */}
      {badges.length > 0 && (
        <div className="bg-[#111110] rounded p-5 border border-[#2e2b26] mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="text-white font-semibold text-sm">Badges débloqués</span>
            <span className="text-stone-500 text-xs">{badges.length} / {BADGE_DEFS.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {badges.map(b => (
              <div key={b.id} title={b.desc}
                className="flex items-center gap-1.5 bg-[#1c1c1a] px-3 py-1.5 rounded-sm border border-[#2e2b26]">
                <span className="text-base">{b.icon}</span>
                <span className="text-stone-300 text-xs font-medium">{b.label}</span>
              </div>
            ))}
          </div>
          {/* Badges non encore débloqués */}
          {BADGE_DEFS.length - badges.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {BADGE_DEFS.filter(b => !badges.find(u => u.id === b.id)).map(b => (
                <div key={b.id} title={`À débloquer : ${b.desc}`}
                  className="flex items-center gap-1.5 bg-[#0a0a09] px-3 py-1.5 rounded-sm border border-[#111110] opacity-40">
                  <span className="text-base grayscale">{b.icon}</span>
                  <span className="text-stone-500 text-xs">{b.label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Révision espacée */}
      {reviewItems.length > 0 && (
        <div className="bg-[#111110] rounded p-5 border border-amber-500/20 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-amber-400">🔄</span>
            <span className="text-white font-semibold text-sm">À réviser</span>
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{reviewItems.length}</span>
          </div>
          <div className="space-y-2">
            {reviewItems.map(({ ex, lang, levelId, moduleId }) => (
              <button
                key={ex.id}
                onClick={() => {
                  const mod = getModule(moduleId)
                  const idx = mod?.exercises.findIndex(e => e.id === ex.id) ?? 0
                  navigate(`/exercise/${lang}/${levelId}/${moduleId}/${idx + 1}`)
                }}
                className="w-full flex items-center justify-between bg-[#0a0a09] hover:bg-[#1c1c1a] px-3 py-2.5 rounded-sm transition-colors text-left group"
              >
                <div>
                  <span className="text-stone-300 text-sm group-hover:text-white transition-colors">{ex.title}</span>
                  <span className="ml-2 text-xs px-1.5 py-0.5 rounded font-medium"
                    style={{ backgroundColor: `${LANG_COLORS[lang]}20`, color: LANG_COLORS[lang] }}>
                    {LANG_LABELS[lang]}
                  </span>
                </div>
                <span className="text-stone-500 text-xs flex-shrink-0 ml-2">Réviser →</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Progression par niveau */}
      <h2 className="text-white font-semibold mb-4">Progression par niveau</h2>
      <div className="space-y-3">
        {levelStats.map((level) => (
          <button
            key={level.id}
            disabled={level.locked}
            onClick={() => !level.locked && navigate('/app/courses')}
            className={`w-full bg-[#111110] rounded p-5 border border-[#2e2b26] text-left transition-all ${
              level.locked ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#3d3a34]'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className="w-3 h-3 rounded-full flex-shrink-0 mt-0.5" style={{ backgroundColor: level.color }} />
                <div className="min-w-0 flex-1">
                  <span className="text-white font-medium text-sm">Niveau {level.id} — {level.name}</span>
                  {level.description && (
                    <p className="text-stone-500 text-xs mt-0.5 leading-snug truncate">{level.description}</p>
                  )}
                </div>
                {level.locked && (
                  <span className="text-xs text-stone-500 bg-[#1c1c1a] px-2 py-0.5 rounded flex-shrink-0">Verrouillé</span>
                )}
              </div>
              <span className="text-stone-400 text-xs flex-shrink-0 ml-4 mt-0.5">
                {level.done}/{level.total} — {level.percent}%
              </span>
            </div>
            <div className="h-1.5 bg-[#0a0a09] rounded-full overflow-hidden mb-1">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${level.percent}%`, backgroundColor: level.color }} />
            </div>
            {level.done > 0 && <MasteryBar score={level.mastery} />}
          </button>
        ))}
      </div>
    </div>
  )
}
