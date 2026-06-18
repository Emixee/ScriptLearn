// Loader des campagnes du mode jeu « Missions ».
// On le garde SÉPARÉ du loader de cours (../loader.js) car une campagne a une
// forme différente d'un module de cours (chapitres narratifs au lieu de leçons +
// exercices). Mélanger les deux dans la même MODULE_MAP créerait de la confusion.
const files = import.meta.glob('./*.json', { eager: true })

const MISSIONS = {}
for (const path in files) {
  const c = files[path].default ?? files[path]
  if (c?.id) MISSIONS[c.id] = c
}

// Ordre des niveaux pour le catalogue : débutant d'abord, avancé en dernier.
const DIFF_RANK = { debutant: 0, intermediaire: 1, avance: 2, expert: 3 }

// Liste triée par niveau puis par `order` (défaut 99) — le catalogue présente
// ainsi naturellement les campagnes du plus accessible au plus exigeant.
export function listCampaigns() {
  return Object.values(MISSIONS).sort((a, b) => {
    const d = (DIFF_RANK[a.difficulty] ?? 1) - (DIFF_RANK[b.difficulty] ?? 1)
    return d !== 0 ? d : (a.order ?? 99) - (b.order ?? 99)
  })
}

export function getCampaign(id) {
  return MISSIONS[id] ?? null
}
