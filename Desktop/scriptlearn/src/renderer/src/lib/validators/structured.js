// ============================================================================
// validators/structured.js — Validation STRUCTURELLE des langages de requête en
// pipeline (KQL, SPL). Partagé entre les deux Voies (validationType:'structured').
//
// POURQUOI ce module (et pas une exécution réelle) : KQL (Kusto/Sentinel) et SPL
// (Splunk) n'ont AUCUN moteur exécutable hors-ligne — impossible de lancer la
// requête localement. À défaut, on valide la STRUCTURE du pipeline, ce qui reste
// bien plus fiable qu'un sac de mots-clés : on découpe la requête sur `|` et on
// exige que chaque étape attendue apparaisse, avec tous ses tokens, et DANS LE
// BON ORDRE (sous-séquence ordonnée des segments). Ainsi `summarize ... | where`
// ne passe pas pour `where ... | summarize` : l'ordre et le découpage comptent.
//
// Forme attendue (chapter.pipeline) : une liste d'étapes, dans l'ordre voulu :
//   { all: ['summarize', 'count', 'by'], label: 'agrégation count() by ...' }
// Chaque étape doit correspondre à UN segment (entre deux `|`) contenant TOUS
// ses tokens (insensible à la casse). Le segment source (avant le 1er `|`) est
// le premier segment — une étape peut donc le cibler (ex. token 'securityevent').
// ============================================================================

export function validateStructured(chapter, code) {
  const pipeline = chapter.pipeline ?? []
  if (pipeline.length === 0) return { correct: false, output: 'Aucune structure de pipeline définie.' }

  // Segments du pipeline, normalisés en minuscules.
  const segments = code.toLowerCase().split('|').map((s) => s.trim()).filter(Boolean)

  const lines = []
  let segIdx = 0 // garantit l'ordre : on ne revient jamais en arrière
  let allOk = true
  for (const stage of pipeline) {
    const tokens = (stage.all ?? []).map((t) => String(t).toLowerCase())
    let found = -1
    for (let i = segIdx; i < segments.length; i++) {
      if (tokens.every((t) => segments[i].includes(t))) { found = i; break }
    }
    const ok = found !== -1
    if (ok) segIdx = found + 1
    else allOk = false
    lines.push(`${ok ? '✅' : '❌'} ${stage.label ?? tokens.join(' ')}`)
  }
  return { correct: allOk, output: lines.join('\n') }
}
