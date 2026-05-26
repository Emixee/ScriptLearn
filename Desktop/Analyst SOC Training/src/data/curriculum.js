import niveau0 from './content/niveau0'
import niveau1 from './content/niveau1'
import niveau2 from './content/niveau2'
import niveau3 from './content/niveau3'
import niveau4 from './content/niveau4'
import { ctfs } from './ctfs'

export const curriculum = [niveau0, niveau1, niveau2, niveau3, niveau4]

export const ctfChallenges = ctfs

// ─── Utilitaires ──────────────────────────────────────────────────────────────

export function findLesson(id) {
  for (const level of curriculum) {
    for (const module of level.modules) {
      const lesson = module.lessons.find(l => l.id === id)
      if (lesson) return { lesson: { ...lesson, module: module.title }, level }
    }
  }
  return { lesson: null, level: null }
}

export function getAdjacentLessons(id) {
  const allLessons = curriculum.flatMap(l => l.modules.flatMap(m => m.lessons))
  const idx = allLessons.findIndex(l => l.id === id)
  return {
    prev: idx > 0 ? allLessons[idx - 1] : null,
    next: idx < allLessons.length - 1 ? allLessons[idx + 1] : null,
  }
}
