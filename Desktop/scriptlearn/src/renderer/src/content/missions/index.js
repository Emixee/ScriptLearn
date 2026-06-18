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

// Liste triée par ordre d'affichage (champ `order`, défaut 99) pour le catalogue.
export function listCampaigns() {
  return Object.values(MISSIONS).sort((a, b) => (a.order ?? 99) - (b.order ?? 99))
}

export function getCampaign(id) {
  return MISSIONS[id] ?? null
}
