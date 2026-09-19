/**
 * Calcule le score de maîtrise d'un exercice selon le nombre de tentatives.
 *   1 tentative  → 100  (réussi du premier coup)
 *   2 tentatives → 80
 *   3 tentatives → 60
 *   4+           → 40
 *   non complété → 0
 */
export function exerciseScore(progressEntry) {
  if (!progressEntry?.completed) return 0
  const attempts = progressEntry.attempts ?? 1
  if (attempts === 1) return 100
  if (attempts === 2) return 80
  if (attempts === 3) return 60
  return 40
}

/**
 * Score de maîtrise d'un module.
 * Retourne { score 0-100, completed, total, stars 0-3 }
 */
export function moduleScore(exercises, progress) {
  if (!exercises?.length) return { score: 0, completed: 0, total: 0, stars: 0 }
  const scores = exercises.map(ex => exerciseScore(progress[ex.id]))
  const completed = scores.filter(s => s > 0).length
  const total = exercises.length
  // Moyenne sur TOUS les exercices (non complétés comptent 0)
  const score = Math.round(scores.reduce((a, b) => a + b, 0) / total)
  const stars = score === 0 ? 0 : score >= 85 ? 3 : score >= 55 ? 2 : 1
  return { score, completed, total, stars }
}

/**
 * Score moyen de maîtrise d'un niveau (toutes langues, tous modules).
 */
export function levelMasteryScore(levelRef, progress, getModule) {
  // TOUTES les langues du niveau, et pas seulement bash/powershell.
  // POURQUOI : la liste était codée en dur et Python — 6 modules par niveau — en
  // était absent, donc la barre « maîtrise X % » du Dashboard était fausse pour
  // tout apprenant Python (ses exercices ne comptaient simplement pas).
  const refs = Object.values(levelRef.languages ?? {}).flat()
  if (refs.length === 0) return 0
  const allExercises = refs.flatMap(r => getModule(r.id)?.exercises ?? [])
  if (allExercises.length === 0) return 0
  const scores = allExercises.map(ex => exerciseScore(progress[ex.id]))
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
}
