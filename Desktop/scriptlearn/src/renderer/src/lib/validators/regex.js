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

// ── Garde-fou ReDoS ─────────────────────────────────────────────────────────
// Le motif est écrit par l'ÉLÈVE et exécuté sur le thread du renderer : un motif
// « catastrophique » comme (a+)+$ confronté à une chaîne de quelques dizaines de
// caractères peut geler la fenêtre Electron pendant des minutes — le moteur
// RegExp de JavaScript n'est pas interruptible, il n'y a donc AUCUN moyen
// d'annuler une fois le test lancé.
//
// Détecter tous les motifs dangereux est indécidable ; on refuse donc uniquement
// la forme la plus explosive et sans usage légitime : un quantificateur appliqué
// à un groupe qui ne contient QU'UN atome déjà quantifié — (a+)+, (\w+)*, ([0-9]*)+.
// Un groupe à plusieurs atomes comme (?:\s+\w+)* reste autorisé : c'est un motif
// enseigné dans le parcours (ex-regex-l3-m2-1) et les chaînes de test, écrites par
// l'auteur, sont courtes.
//
// LIMITE ASSUMÉE : un motif pathologique à alternation (a|aa)+ passe encore. La
// vraie parade serait d'exécuter les tests dans un Web Worker terminé par un
// minuteur — à faire si le cas se présente.
const MAX_PATTERN_LENGTH = 500
const MAX_CASE_LENGTH = 200
const NESTED_SINGLE_ATOM = /\((?:\?:)?(?:\\?[^()|\\]|\\.|\[[^\]]*\])[+*]\)\s*[+*]/

function rejectIfDangerous(code) {
  if (code.length > MAX_PATTERN_LENGTH) {
    return `Motif trop long (${code.length} caractères, ${MAX_PATTERN_LENGTH} maximum).`
  }
  if (NESTED_SINGLE_ATOM.test(code)) {
    return 'Motif refusé : un quantificateur (+ ou *) appliqué à un groupe qui ne contient qu\'un élément déjà quantifié — par exemple (a+)+ — provoque une explosion combinatoire (ReDoS) capable de figer l\'application. Reformule sans imbriquer les quantificateurs.'
  }
  return null
}

export function validateRegex(chapter, code) {
  const t = chapter.regexTests ?? {}
  const flags = t.flags ?? ''

  const danger = rejectIfDangerous(code)
  if (danger) return { correct: false, output: danger }

  // 1) Le motif doit d'abord être une regex valide. On COMPILE UNE FOIS et on
  //    réutilise l'objet : l'ancienne version recompilait une RegExp à chaque cas
  //    de test (et la variable `rx` compilée ici n'était jamais utilisée).
  let rx
  try {
    rx = new RegExp(code, flags)
  } catch (e) {
    return { correct: false, output: 'Motif invalide : ' + String(e?.message ?? e) }
  }
  // lastIndex doit être remis à zéro entre deux appels si le drapeau g est posé,
  // sinon test() reprend là où il s'était arrêté et renvoie false à tort.
  const test = (s) => { rx.lastIndex = 0; return rx.test(s) }
  const exec = (s) => { rx.lastIndex = 0; return rx.exec(s) }

  const lines = []
  let ok = true
  // Chaînes de test tronquées : elles viennent du contenu, mais une chaîne
  // anormalement longue multiplierait le coût de chaque test.
  const cap = (x) => String(x).slice(0, MAX_CASE_LENGTH)

  // 2) Chaînes à reconnaître. On utilise test() (correspondance de sous-chaîne) :
  //    les ancres ^ $ du motif imposent d'elles-mêmes une correspondance totale
  //    quand la consigne l'exige.
  for (const raw of (t.mustMatch ?? [])) {
    const s = cap(raw)
    const pass = test(s)
    if (!pass) ok = false
    lines.push(`${pass ? '✅' : '❌'} reconnaît ${JSON.stringify(s)}`)
  }
  // 3) Chaînes à rejeter.
  for (const raw of (t.mustReject ?? [])) {
    const s = cap(raw)
    const pass = !test(s)
    if (!pass) ok = false
    lines.push(`${pass ? '✅' : '❌'} rejette ${JSON.stringify(s)}`)
  }
  // 4) Groupes de capture (exec → match[1], match[2], …).
  for (const cap of (t.captures ?? [])) {
    const m = exec(cap.input)
    const got = m ? m.slice(1) : null
    const pass = !!got && JSON.stringify(got) === JSON.stringify(cap.groups)
    if (!pass) ok = false
    lines.push(`${pass ? '✅' : '❌'} capture ${JSON.stringify(cap.groups)} dans ${JSON.stringify(cap.input)}${got ? ' (obtenu ' + JSON.stringify(got) + ')' : ''}`)
  }

  // Garde-fou : un acte sans aucun cas de test ne peut pas être « réussi ».
  if (lines.length === 0) return { correct: false, output: 'Aucun cas de test défini.' }

  return { correct: ok, output: lines.join('\n') }
}
