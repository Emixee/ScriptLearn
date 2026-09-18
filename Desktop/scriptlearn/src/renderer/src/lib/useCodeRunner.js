// ============================================================================
// useCodeRunner — exécution + validation de code, partagé par les COURS
// (pages/Exercise.jsx) et le mode jeu (pages/MissionPlay.jsx).
//
//  - « Exécuter » (run) : écrit le code dans la session terminal AFFICHÉE (PTY) →
//    l'élève voit son code tourner dans un vrai terminal.
//  - « Valider » (validate) : exécute le code EN COULISSES via terminal.runValidation
//    (processus jetable, sans PTY donc sans écho), puis compare la sortie au résultat
//    attendu. Découpler la validation du terminal affiché évite que l'écho de la
//    commande (réaffichée par le PTY) ne fausse la comparaison, et rend la validation
//    déterministe (fin des soucis de REPL Python / sentinel).
//  - Langages sans exécution possible (KQL, SPL…) : moteurs dédiés (validators/)
//    ou, à défaut, vérification de mots-clés — la plus faible des validations.
//
// IMPORTANT : ce hook est la SEULE implémentation de la validation. Exercise.jsx
// en avait une copie appauvrie (sans aucun des six moteurs réels) : toute
// correction devait être faite deux fois et les deux versions avaient divergé.
// ============================================================================

import { useCallback } from 'react'
import { isStatic, buildRunData, stripAnsi } from './langs'
import { validateDom } from './validators/dom'
import { validateSql } from './validators/sql'
import { validateRegex } from './validators/regex'
import { validateYaml } from './validators/yaml'
import { validateGit } from './validators/git'
import { validateStructured } from './validators/structured'

// Détection « terminal-auto » : la sortie réelle d'une commande (déjà isolée de
// l'écho par Terminal.jsx) contient-elle le résultat attendu ? Comparaison
// insensible à la casse, ANSI retiré par sécurité. Partagé par MissionPlay et
// Exercise pour ne pas dupliquer la logique (cf. handleOutput de MissionLab).
export function matchesExpected(outputBlock, expected) {
  // Garde-fou : sans résultat attendu, `includes('')` renvoyait TRUE — n'importe
  // quelle sortie validait l'acte. Un acte sans `expectedOutput` est un défaut de
  // contenu : il ne doit jamais se valider tout seul.
  const needle = (expected ?? '').trim()
  if (!needle) return false
  return stripAnsi(outputBlock ?? '').toLowerCase().includes(needle.toLowerCase())
}

// ── Vérification par mots-clés : la validation la plus faible ────────────────
// On ne peut pas exécuter KQL ou SPL hors-ligne, et une partie du contenu n'a pas
// encore de moteur dédié. Deux durcissements par rapport à la version d'origine :
//
// 1. Les COMMENTAIRES sont retirés avant la comparaison. POURQUOI : sans ça, la
//    ligne `-- select from employees e inner join departments d on e. d.` (un
//    commentaire SQL qui n'exécute RIEN) satisfaisait les dix mots-clés requis.
//    C'était la faille la plus facile à trouver pour un élève.
// 2. Les espaces sont normalisés des deux côtés : `stats count  BY src_ip` et
//    `stats count by src_ip` ne doivent pas différer pour une histoire d'espace
//    ou de casse.
//
// On NE compare PAS dans l'ordre : mesuré sur le contenu réel, 46 exercices ont
// une correction de référence dont les mots-clés n'apparaissent pas dans l'ordre
// déclaré — l'ordre aurait rejeté des réponses correctes.
const COMMENT_PATTERNS = {
  sql:   [/--[^\n]*/g, /\/\*[\s\S]*?\*\//g],
  kql:   [/\/\/[^\n]*/g],
  spl:   [/```[^\n]*/g, /\/\/[^\n]*/g],
  yaml:  [/(^|\s)#[^\n]*/g],
  git:   [/(^|\s)#[^\n]*/g],
  html:  [/<!--[\s\S]*?-->/g],
  regex: [],
}

function stripComments(code, lang) {
  const pats = COMMENT_PATTERNS[lang]
  if (!pats) return code
  return pats.reduce((acc, re) => acc.replace(re, ' '), code)
}

function normalizeForMatch(s) {
  return String(s).toLowerCase().replace(/\s+/g, ' ').trim()
}

export function validateKeywords(chapter, code, lang) {
  const requiredTable = chapter.requiredTable ?? ''
  const requiredKeywords = chapter.requiredKeywords ?? []

  // Certains exercices demandent explicitement d'ÉCRIRE un commentaire : dans ce
  // cas on ne peut pas les retirer, sinon la consigne devient impossible.
  const wantsComment = [requiredTable, ...requiredKeywords]
    .some(k => /^\s*(--|\/\/|#|<!--)/.test(String(k)))
  const body = wantsComment ? code : stripComments(code, lang)

  if (!body.trim()) {
    return { correct: false, output: 'Le code ne contient que des commentaires.' }
  }
  const hay = normalizeForMatch(body)

  const missing = []
  if (requiredTable && !hay.includes(normalizeForMatch(requiredTable))) missing.push(requiredTable)
  for (const kw of requiredKeywords) {
    if (!hay.includes(normalizeForMatch(kw))) missing.push(kw)
  }
  if (!requiredTable && requiredKeywords.length === 0) {
    // Aucun critère : l'exercice est mal configuré. Le signaler plutôt que de
    // renvoyer « correct » par défaut.
    return { correct: false, output: 'Exercice mal configuré : aucun mot-clé requis.' }
  }
  return {
    correct: missing.length === 0,
    output: missing.length === 0 ? '' : `Éléments manquants : ${missing.join(', ')}`
  }
}

// Détermine le moteur de validation à utiliser.
// POURQUOI cette fonction : le contenu déclare parfois un `validationType`
// explicite ('sql', 'dom'…), parfois seulement la CHARGE d'un moteur
// (regexTests, yamlAssertions…). Dans le second cas, l'ancien code retombait
// silencieusement sur les mots-clés alors qu'un moteur réel était disponible.
export function pickEngine(chapter) {
  const t = chapter.validationType
  if (t === 'dom' || t === 'sql' || t === 'regex' || t === 'yaml' || t === 'git' || t === 'structured') return t
  if (chapter.domAssertions)  return 'dom'
  if (chapter.sqlOrdered != null || chapter.sqlCheckColumns) return 'sql'
  if (chapter.regexTests)     return 'regex'
  if (chapter.yamlAssertions) return 'yaml'
  if (chapter.gitChecks)      return 'git'
  if (chapter.pipeline)       return 'structured'
  return null
}

export function useCodeRunner(termId, lang) {
  // Exécute le code dans la session affichée (bouton « Exécuter »).
  const run = useCallback((code) => {
    if (!code.trim() || isStatic(lang)) return
    window.electronAPI.terminal.write({ id: termId, data: buildRunData(lang, code) })
  }, [termId, lang])

  // Validation générale → { correct, output, error? }.
  const validate = useCallback(async (chapter, code) => {
    const trimmed = code.trim()
    if (!trimmed) return { correct: false, output: '' } // anti-triche : éditeur vide → échec

    // Validation par MOTEUR RÉEL. Prioritaire sur le statut static/exec du
    // langage : un acte HTML « dom » est validé en construisant le vrai DOM
    // (DOMParser), pas par mots-clés. Ces moteurs tournent dans le renderer
    // (offline, déterministes) — sauf `git`, qui exécute un vrai dépôt via IPC.
    const engine = pickEngine(chapter)
    // Petite latence artificielle pour les moteurs instantanés : sans elle,
    // l'état « Validation… » n'est jamais visible et le retour paraît douteux.
    const tick = () => new Promise(r => setTimeout(r, 150))
    try {
      if (engine === 'dom')        { await tick(); return validateDom(chapter, trimmed) }
      if (engine === 'sql')        { return await validateSql(chapter, trimmed) }
      if (engine === 'regex')      { await tick(); return validateRegex(chapter, trimmed) }
      if (engine === 'yaml')       { await tick(); return validateYaml(chapter, trimmed) }
      if (engine === 'git')        { return await validateGit(chapter, trimmed) }
      if (engine === 'structured') { await tick(); return validateStructured(chapter, trimmed) }
    } catch (e) {
      // Un moteur qui lève ne doit JAMAIS laisser l'UI bloquée sur « Validation… ».
      return { correct: false, output: 'Erreur du validateur : ' + String(e?.message ?? e), error: true }
    }

    if (isStatic(lang)) {
      await tick()
      return validateKeywords(chapter, trimmed, lang)
    }

    // Exécution cachée déterministe (les fichiers de données ont été créés par runSetup).
    // Actes « projet » : project/args → le code est écrit dans un vrai fichier script
    // et exécuté avec ses arguments (apprentissage de l'écriture de scripts complets).
    let res
    try {
      res = await window.electronAPI.terminal.runValidation({
        lang, code: trimmed, project: chapter.project, args: chapter.args,
      })
    } catch (e) {
      return { correct: false, output: String(e?.message ?? e), error: true }
    }
    // `error` est distinct de `output` depuis le durcissement du main : une
    // toolchain en panne n'est plus présentée à l'élève comme un simple
    // « Pas tout à fait… ».
    if (res?.error) return { correct: false, output: res.error, error: true }
    const clean = res?.output ?? ''

    if (chapter.validationType === 'output_nonempty') {
      // La consigne est « la commande doit produire une sortie » : on teste donc
      // la SORTIE. L'ancien code testait la longueur du CODE (`trimmed.length > 0`),
      // c'est-à-dire qu'un seul caractère tapé validait l'exercice.
      return { correct: clean.trim().length > 0, output: clean }
    }
    const expected = (chapter.expectedOutput ?? '').trim()
    if (!expected) {
      // Sans résultat attendu, `includes('')` validait tout. On refuse.
      return { correct: false, output: clean || 'Exercice mal configuré : aucun résultat attendu.' }
    }
    return { correct: clean.toLowerCase().includes(expected.toLowerCase()), output: clean }
  }, [lang])

  return { run, validate }
}
