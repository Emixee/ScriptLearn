// ============================================================================
// validators/dom.js — Validation RÉELLE des actes capstone HTML.
//
// POURQUOI ce module : les actes HTML étaient validés par recherche de mots-clés
// (« le code contient-il "<header>" ? »). C'est fragile : un mot-clé présent mais
// mal imbriqué, dans le désordre ou commenté passe quand même. Ici, on construit
// le VRAI DOM avec DOMParser (natif au renderer Chromium) et on évalue des
// assertions structurelles (sélecteur CSS + contraintes). L'imbrication, l'ordre
// et les attributs comptent enfin — c'est ce que ferait un navigateur.
//
// On reste 100% hors-ligne et déterministe : DOMParser ne fait aucune requête
// réseau et ne charge pas les ressources (img/script) — il bâtit l'arbre, point.
//
// Forme d'une assertion (déclarée dans chapter.domAssertions) :
//   { doctype: true, label? }                       → <!DOCTYPE html> présent
//   { selector, count?, minCount?, text?, attr?, label? }
//     - selector : sélecteur CSS (ex. "nav ul > li", "html[lang]", "img[alt]")
//     - count    : nombre EXACT d'éléments attendus
//     - minCount : nombre MINIMUM (défaut 1 si ni count ni minCount)
//     - text     : au moins un élément trouvé contient ce texte (insensible casse)
//     - attr     : l'attribut nommé doit être présent ET non vide sur les éléments
// ============================================================================

// Évalue une assertion contre le document parsé → { ok, msg } (msg = libellé lisible).
function checkAssertion(doc, a) {
  // Cas spécial : présence de la déclaration <!DOCTYPE html>. querySelector ne
  // voit pas le doctype, on passe donc par doc.doctype (l'API DOM dédiée).
  if (a.doctype) {
    const ok = !!doc.doctype && doc.doctype.name.toLowerCase() === 'html'
    return { ok, msg: a.label ?? 'Déclaration <!DOCTYPE html>' }
  }

  const sel = a.selector
  const label = a.label ?? `<${sel}>`
  let els
  try {
    els = Array.from(doc.querySelectorAll(sel))
  } catch {
    // Sélecteur invalide = erreur d'auteur, pas de l'élève : on le signale.
    return { ok: false, msg: `Sélecteur invalide : ${sel}` }
  }

  // Filtre par texte si demandé : on ne garde que les éléments contenant le texte.
  if (a.text != null) {
    const needle = a.text.toLowerCase()
    els = els.filter(el => (el.textContent ?? '').toLowerCase().includes(needle))
  }
  // Filtre par attribut présent et non vide.
  if (a.attr != null) {
    els = els.filter(el => {
      const v = el.getAttribute(a.attr)
      return v != null && v.trim() !== ''
    })
  }

  const n = els.length
  if (a.count != null) {
    return { ok: n === a.count, msg: `${label} : ${a.count} attendu(s) — ${n} trouvé(s)` }
  }
  const min = a.minCount ?? 1
  return { ok: n >= min, msg: `${label} : au moins ${min} — ${n} trouvé(s)` }
}

// validateDom(chapter, code) → { correct, output }
//   - correct : toutes les assertions passent (et il y en a au moins une)
//   - output  : rapport ✅/❌ ligne par ligne (utile au débogage / futurs affichages)
export function validateDom(chapter, code) {
  const assertions = chapter.domAssertions ?? []
  if (assertions.length === 0) return { correct: false, output: 'Aucune assertion DOM définie.' }

  // text/html : le parseur tolère le HTML imparfait et reconstruit l'arbre comme
  // un navigateur (il crée <html>/<head>/<body> implicites). On valide donc la
  // STRUCTURE réelle obtenue, pas la frappe exacte de l'élève.
  const doc = new DOMParser().parseFromString(code, 'text/html')

  const lines = []
  let allOk = true
  for (const a of assertions) {
    const { ok, msg } = checkAssertion(doc, a)
    if (!ok) allOk = false
    lines.push((ok ? '✅ ' : '❌ ') + msg)
  }
  return { correct: allOk, output: lines.join('\n') }
}
