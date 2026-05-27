// XP par exercice selon le niveau numérique (1=débutant … 6=expert)
// Les langages complémentaires utilisent un niveau sous-niveaux (ex: "sql-l2") — on extrait le chiffre
const XP_PER_LEVEL = { 1: 10, 2: 15, 3: 20, 4: 30, 5: 45, 6: 65 }
const FIRST_TRY_BONUS = 0.5   // +50% XP si réussi du 1er coup (encourage la rigueur)

export function xpForExercise(levelId, firstAttemptSuccess = false) {
  // levelId peut être un entier (niveaux standard : 1, 2, …) ou une chaîne (complémentaires : "sql-l1", "kql-l2")
  // On extrait le chiffre de sous-niveau pour les tracks complémentaires
  const numericLevel = typeof levelId === 'string'
    ? (parseInt(levelId.match(/l(\d+)/)?.[1] ?? '1', 10))
    : levelId
  const base = XP_PER_LEVEL[numericLevel] ?? 10
  return Math.round(base * (firstAttemptSuccess ? 1 + FIRST_TRY_BONUS : 1))
}

export function computeTotalXP(progress, contentIndex, getModule) {
  let total = 0

  // Niveaux standard (Bash, Python, PowerShell — niveaux 1 à 6)
  for (const level of contentIndex.levels) {
    for (const langs of Object.values(level.languages)) {
      for (const ref of langs) {
        const mod = getModule(ref.id)
        if (!mod) continue
        for (const ex of mod.exercises) {
          const entry = progress[ex.id]
          if (entry?.completed) {
            total += xpForExercise(level.id, entry.firstAttemptSuccess)
          }
        }
      }
    }
  }

  // Langages complémentaires — même logique, levelId est une chaîne ("sql-l1", etc.)
  const tracks = contentIndex.complementary?.tracks ?? {}
  for (const [, track] of Object.entries(tracks)) {
    for (const level of track.levels) {
      for (const modRef of level.modules) {
        const mod = getModule(modRef.id)
        if (!mod) continue
        for (const ex of mod.exercises) {
          const entry = progress[ex.id]
          if (entry?.completed) {
            total += xpForExercise(level.id, entry.firstAttemptSuccess)
          }
        }
      }
    }
  }

  return total
}

export function xpLevelInfo(totalXP) {
  // Paliers : 0, 100, 250, 500, 1000, 2000, 4000, 8000
  const thresholds = [0, 100, 250, 500, 1000, 2000, 4000, 8000]
  const titles = ['Novice', 'Apprenti', 'Junior', 'Intermédiaire', 'Confirmé', 'Expert', 'Maître', 'Légende']
  let lvl = 0
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (totalXP >= thresholds[i]) { lvl = i; break }
  }
  const next = thresholds[lvl + 1] ?? null
  const prev = thresholds[lvl]
  const pct  = next ? Math.round(((totalXP - prev) / (next - prev)) * 100) : 100
  return { level: lvl + 1, title: titles[lvl], xp: totalXP, nextThreshold: next, pct }
}
