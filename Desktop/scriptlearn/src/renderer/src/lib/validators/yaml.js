// ============================================================================
// validators/yaml.js — Validation RÉELLE des actes capstone YAML via js-yaml.
//
// POURQUOI ce module : un YAML était validé par mots-clés (« contient-il
// "image:" ? »). Or YAML décrit une STRUCTURE : ce qui compte, c'est l'objet
// obtenu après parsing (bonne imbrication, bons types, alias résolus), pas la
// présence de tel texte. Ici on PARSE réellement le YAML de l'élève (js-yaml,
// pur JS, hors-ligne) et on évalue des assertions sur l'objet produit.
//
// Forme attendue (chapter.yamlAssertions) — chaque assertion vise un `path`
// pointé en notation pointée (ex. "services.web.image") :
//   { path, equals: v }     // valeur exacte (comparaison profonde)
//   { path, exists: true }  // la clé existe (valeur non undefined)
//   { path, length: n }     // tableau/chaîne de longueur n
//   { path, contains: v }   // tableau contenant la valeur v
//   { path, hasKeys: [...] }// objet possédant toutes ces clés
//   { path, type: 'number' }// typeof === type
// ============================================================================

import { load } from 'js-yaml'

// Résout un chemin pointé dans l'objet. Les segments numériques indexent les
// tableaux (ex. "services.web.ports.0"). Renvoie undefined si le chemin casse.
function resolve(obj, path) {
  if (path == null || path === '') return obj
  let cur = obj
  for (const seg of String(path).split('.')) {
    if (cur == null) return undefined
    const key = /^\d+$/.test(seg) ? Number(seg) : seg
    cur = cur[key]
  }
  return cur
}

function deepEqual(a, b) {
  return JSON.stringify(a) === JSON.stringify(b)
}

// Évalue une assertion → { ok, msg }.
function checkAssertion(root, a) {
  const v = resolve(root, a.path)
  const label = a.label ?? a.path
  if ('equals' in a) return { ok: deepEqual(v, a.equals), msg: `${label} = ${JSON.stringify(a.equals)} (obtenu ${JSON.stringify(v)})` }
  if ('exists' in a) return { ok: (v !== undefined) === a.exists, msg: `${label} ${a.exists ? 'défini' : 'absent'}` }
  if ('length' in a) return { ok: v != null && v.length === a.length, msg: `${label} de longueur ${a.length} (obtenu ${v?.length})` }
  if ('contains' in a) return { ok: Array.isArray(v) && v.some(x => deepEqual(x, a.contains)), msg: `${label} contient ${JSON.stringify(a.contains)}` }
  if ('hasKeys' in a) {
    const ok = v && typeof v === 'object' && a.hasKeys.every(k => k in v)
    return { ok, msg: `${label} possède les clés ${JSON.stringify(a.hasKeys)}` }
  }
  if ('type' in a) return { ok: typeof v === a.type, msg: `${label} de type ${a.type} (obtenu ${typeof v})` }
  return { ok: false, msg: `Assertion inconnue sur ${label}` }
}

// validateYaml(chapter, code) → { correct, output }
export function validateYaml(chapter, code) {
  const assertions = chapter.yamlAssertions ?? []
  if (assertions.length === 0) return { correct: false, output: 'Aucune assertion YAML définie.' }

  // Parsing réel : un YAML mal indenté ou mal typé lèvera ici → échec lisible.
  let root
  try {
    root = load(code)
  } catch (e) {
    return { correct: false, output: 'YAML invalide : ' + String(e?.message ?? e) }
  }

  const lines = []
  let allOk = true
  for (const a of assertions) {
    const { ok, msg } = checkAssertion(root, a)
    if (!ok) allOk = false
    lines.push((ok ? '✅ ' : '❌ ') + msg)
  }
  return { correct: allOk, output: lines.join('\n') }
}
