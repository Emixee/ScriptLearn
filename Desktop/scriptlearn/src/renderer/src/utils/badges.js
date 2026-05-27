import contentIndex from '../content/index.json'
import { getModule } from '../content/loader'

const ALL_LANGS = ['bash', 'python', 'powershell', 'kql', 'sql', 'regex', 'git', 'spl', 'yaml']

export const BADGE_DEFS = [
  // Progression
  { id: 'first_exercise',   icon: '🌱', label: 'Premier pas',       desc: 'Réussir son 1er exercice',          check: (s) => s.totalDone >= 1 },
  { id: 'ten_exercises',    icon: '📚', label: 'En route',           desc: '10 exercices réussis',              check: (s) => s.totalDone >= 10 },
  { id: 'fifty_exercises',  icon: '🔥', label: 'Sérieux',            desc: '50 exercices réussis',              check: (s) => s.totalDone >= 50 },
  { id: 'hundred_exercises',icon: '💯', label: 'Centurion',          desc: '100 exercices réussis',             check: (s) => s.totalDone >= 100 },
  { id: 'all_done',         icon: '🏆', label: 'Champion',           desc: 'Tous les exercices réussis',        check: (s) => s.totalDone >= s.totalExercises && s.totalExercises > 0 },

  // Qualité
  { id: 'first_try',        icon: '⚡', label: 'Précision',          desc: 'Réussir 10 exercices du 1er coup',  check: (s) => s.firstTryCount >= 10 },
  { id: 'perfect_module',   icon: '✨', label: 'Perfectionniste',    desc: 'Finir un module sans erreur',        check: (s) => s.perfectModules >= 1 },
  { id: 'persistent',       icon: '💪', label: 'Persévérant',        desc: 'Réussir après 5+ tentatives',        check: (s) => s.maxAttempts >= 5 && s.totalDone >= 1 },

  // Langages
  { id: 'bash_module',      icon: '🐚', label: 'Basheur',            desc: 'Finir 3 modules Bash',              check: (s) => s.completedByLang.bash >= 3 },
  { id: 'python_module',    icon: '🐍', label: 'Pythoniste',         desc: 'Finir 3 modules Python',            check: (s) => s.completedByLang.python >= 3 },
  { id: 'powershell_module',icon: '⚙️', label: 'Admin PS',           desc: 'Finir 3 modules PowerShell',        check: (s) => s.completedByLang.powershell >= 3 },
  { id: 'kql_module',       icon: '🔍', label: 'Chasseur de menaces',desc: 'Finir 1 module KQL',                check: (s) => s.completedByLang.kql >= 1 },
  { id: 'sql_module',       icon: '🗄️', label: 'Data Analyst',       desc: 'Finir 2 modules SQL',               check: (s) => (s.completedByLang.sql ?? 0) >= 2 },
  { id: 'git_module',       icon: '🌿', label: 'Versionneur',        desc: 'Finir 2 modules Git',               check: (s) => (s.completedByLang.git ?? 0) >= 2 },
  { id: 'yaml_module',      icon: '📋', label: 'Config Master',      desc: 'Finir 2 modules YAML',              check: (s) => (s.completedByLang.yaml ?? 0) >= 2 },
  { id: 'polyglot',         icon: '🌐', label: 'Polyglotte',         desc: 'Réussir des exercices dans 5 langages', check: (s) => s.langsWithProgress >= 5 },

  // Streak
  { id: 'streak_3',         icon: '📅', label: 'Régulier',           desc: '3 jours consécutifs',               check: (s) => s.streak >= 3 },
  { id: 'streak_7',         icon: '🗓️', label: 'Hebdomadaire',       desc: '7 jours consécutifs',               check: (s) => s.streak >= 7 },
  { id: 'streak_30',        icon: '🌟', label: 'Marathonien',        desc: '30 jours consécutifs',              check: (s) => s.streak >= 30 },
]

export function computeStats(progress, activityDates = []) {
  let totalDone = 0, firstTryCount = 0, maxAttempts = 0
  const completedByLang = { bash: 0, python: 0, powershell: 0, kql: 0, sql: 0, regex: 0, git: 0, spl: 0, yaml: 0 }
  const langsSet = new Set()
  let perfectModules = 0

  // Fonction interne : traite tous les exercices d'un module et cumule les stats
  // Factorisée car appelée à la fois pour les niveaux standard et les tracks complémentaires
  function processModuleRef(refId, lang) {
    const mod = getModule(refId)
    if (!mod) return
    let modDone = 0, modTotal = mod.exercises.length, modPerfect = true
    for (const ex of mod.exercises) {
      const entry = progress[ex.id]
      if (entry?.completed) {
        totalDone++
        modDone++
        langsSet.add(lang)
        if (entry.firstAttemptSuccess) firstTryCount++
        if ((entry.attempts ?? 0) > maxAttempts) maxAttempts = entry.attempts
        completedByLang[lang] = (completedByLang[lang] ?? 0) + 1
      }
      if (!entry?.firstAttemptSuccess) modPerfect = false
    }
    if (modTotal > 0 && modDone === modTotal && modPerfect) perfectModules++
  }

  // Niveaux standard (Bash, Python, PowerShell — niveaux 1 à 6)
  for (const level of contentIndex.levels) {
    for (const lang of ALL_LANGS) {
      for (const ref of (level.languages[lang] ?? [])) {
        processModuleRef(ref.id, lang)
      }
    }
  }

  // Langages complémentaires (SQL, Git, Regex, KQL, SPL, YAML — structure tracks)
  // Les deux sections sont traitées identiquement pour les badges de progression
  const tracks = contentIndex.complementary?.tracks ?? {}
  for (const [trackKey, track] of Object.entries(tracks)) {
    for (const level of track.levels) {
      for (const mod of level.modules) {
        processModuleRef(mod.id, trackKey)
      }
    }
  }

  // Total exercices = standard + complémentaires — utilisé pour le badge "all_done"
  let totalExercises = 0
  for (const level of contentIndex.levels) {
    for (const lang of ALL_LANGS) {
      for (const ref of (level.languages[lang] ?? [])) {
        totalExercises += getModule(ref.id)?.exercises?.length ?? 0
      }
    }
  }
  for (const [, track] of Object.entries(contentIndex.complementary?.tracks ?? {})) {
    for (const level of track.levels) {
      for (const mod of level.modules) {
        totalExercises += getModule(mod.id)?.exercises?.length ?? 0
      }
    }
  }

  const streak = computeStreak(activityDates)

  return { totalDone, totalExercises, firstTryCount, maxAttempts, completedByLang, langsWithProgress: langsSet.size, perfectModules, streak }
}

export function computeStreak(dates) {
  if (!dates || dates.length === 0) return 0
  const sorted = [...new Set(dates)].sort().reverse()
  const today = new Date().toISOString().slice(0, 10)
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  if (sorted[0] !== today && sorted[0] !== yesterday) return 0
  let streak = 1
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1])
    const curr = new Date(sorted[i])
    const diff = Math.round((prev - curr) / 86400000)
    if (diff === 1) streak++
    else break
  }
  return streak
}

export function getUnlockedBadges(stats) {
  return BADGE_DEFS.filter(b => b.check(stats))
}
