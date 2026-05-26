// XP par exercice selon le niveau (1=facile … 7=expert)
const XP_PER_LEVEL = { 1: 10, 2: 15, 3: 20, 4: 30, 5: 45, 6: 65, 7: 90 }
const FIRST_TRY_BONUS = 0.5   // +50% si réussi du premier coup

export function xpForExercise(levelId, firstAttemptSuccess = false) {
  const base = XP_PER_LEVEL[levelId] ?? 10
  return Math.round(base * (firstAttemptSuccess ? 1 + FIRST_TRY_BONUS : 1))
}

export function computeTotalXP(progress, contentIndex, getModule) {
  let total = 0
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
