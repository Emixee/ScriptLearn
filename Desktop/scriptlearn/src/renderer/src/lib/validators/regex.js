// ============================================================================
// validators/regex.js — Validation RÉELLE des actes capstone Regex.
//
// POURQUOI ce module : les actes Regex étaient validés par mots-clés (« le motif
// contient-il "\\d" ? »). C'est absurde pour une regex : un motif peut contenir
// les bons morceaux et ne RIEN matcher de correct. Ici on construit la vraie
// `RegExp` de l'élève et on la confronte à un jeu de cas : des chaînes qu'elle
// DOIT reconnaître, d'autres qu'elle doit REJETER, et éventuellement des groupes
// de capture attendus. C'est exactement l'usage réel d'une regex.
//
// 100% natif (moteur RegExp de JavaScript) — aucune dépendance, aucun WASM.
//
// Forme attendue (chapter.regexTests) :
//   {
//     flags?: 'i'…           // drapeaux passés à RegExp (défaut '')
//     mustMatch: [ '...' ]   // chaînes que le motif doit reconnaître (test())
//     mustReject: [ '...' ]  // chaînes que le motif ne doit PAS reconnaître
//     captures?: [ { input, groups: ['g1','g2'] } ]  // groupes via exec()
//   }
// ============================================================================

export function validateRegex(chapter, code) {
  const t = chapter.regexTests ?? {}
  const flags = t.flags ?? ''

  // 1) Le motif doit d'abord être une regex valide.
  let rx
  try {
    rx = new RegExp(code, flags)
  } catch (e) {
    return { correct: false, output: 'Motif invalide : ' + String(e?.message ?? e) }
  }

  const lines = []
  let ok = true

  // 2) Chaînes à reconnaître. On utilise test() (correspondance de sous-chaîne) :
  //    les ancres ^ $ du motif imposent d'elles-mêmes une correspondance totale
  //    quand la consigne l'exige.
  for (const s of (t.mustMatch ?? [])) {
    const pass = new RegExp(code, flags).test(s)
    if (!pass) ok = false
    lines.push(`${pass ? '✅' : '❌'} reconnaît ${JSON.stringify(s)}`)
  }
  // 3) Chaînes à rejeter.
  for (const s of (t.mustReject ?? [])) {
    const pass = !new RegExp(code, flags).test(s)
    if (!pass) ok = false
    lines.push(`${pass ? '✅' : '❌'} rejette ${JSON.stringify(s)}`)
  }
  // 4) Groupes de capture (exec → match[1], match[2], …).
  for (const cap of (t.captures ?? [])) {
    const m = new RegExp(code, flags).exec(cap.input)
    const got = m ? m.slice(1) : null
    const pass = !!got && JSON.stringify(got) === JSON.stringify(cap.groups)
    if (!pass) ok = false
    lines.push(`${pass ? '✅' : '❌'} capture ${JSON.stringify(cap.groups)} dans ${JSON.stringify(cap.input)}${got ? ' (obtenu ' + JSON.stringify(got) + ')' : ''}`)
  }

  // Garde-fou : un acte sans aucun cas de test ne peut pas être « réussi ».
  if (lines.length === 0) return { correct: false, output: 'Aucun cas de test défini.' }

  return { correct: ok, output: lines.join('\n') }
}
