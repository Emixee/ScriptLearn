// ============================================================================
// useCodeRunner — exécution + validation de code pour le mode jeu (MissionPlay).
//
//  - « Exécuter » (run) : écrit le code dans la session terminal AFFICHÉE (PTY) →
//    l'élève voit son code tourner dans un vrai terminal.
//  - « Valider » (validate) : exécute le code EN COULISSES via terminal.runValidation
//    (processus jetable, sans PTY donc sans écho), puis compare la sortie au résultat
//    attendu. Découpler la validation du terminal affiché évite que l'écho de la
//    commande (réaffichée par le PTY) ne fausse la comparaison, et rend la validation
//    déterministe (fin des soucis de REPL Python / sentinel).
//  - Langages statiques (kql, sql, regex…) : validation par mots-clés, sans exécution.
// ============================================================================

import { useCallback } from 'react'
import { isStatic, buildRunData } from './langs'
import { validateDom } from './validators/dom'

export function useCodeRunner(termId, lang) {
  // Exécute le code dans la session affichée (bouton « Exécuter »).
  const run = useCallback((code) => {
    if (!code.trim() || isStatic(lang)) return
    window.electronAPI.terminal.write({ id: termId, data: buildRunData(lang, code) })
  }, [termId, lang])

  // Validation des langages statiques (mots-clés requis présents dans le code).
  const validateStatic = useCallback((chapter, code) => {
    const lower = code.trim().toLowerCase()
    const requiredTable = chapter.requiredTable ?? ''
    const requiredKeywords = chapter.requiredKeywords ?? []
    let correct = true
    if (requiredTable && !lower.includes(requiredTable.toLowerCase())) correct = false
    if (correct) {
      for (const kw of requiredKeywords) {
        if (!lower.includes(kw.toLowerCase())) { correct = false; break }
      }
    }
    return { correct, output: '' }
  }, [])

  // Validation générale → { correct, output }.
  const validate = useCallback(async (chapter, code) => {
    const trimmed = code.trim()
    if (!trimmed) return { correct: false, output: '' } // anti-triche : éditeur vide → échec
    // Validation par MOTEUR RÉEL selon le type déclaré par l'acte (capstones).
    // Prioritaire sur le statut static/exec du langage : un acte HTML « dom » est
    // validé en construisant le vrai DOM (DOMParser), pas par mots-clés. Ces
    // moteurs tournent dans le renderer (offline, déterministes) — pas d'IPC.
    if (chapter.validationType === 'dom') {
      await new Promise(r => setTimeout(r, 150))
      return validateDom(chapter, trimmed)
    }
    if (isStatic(lang)) {
      await new Promise(r => setTimeout(r, 150))
      return validateStatic(chapter, trimmed)
    }
    // Exécution cachée déterministe (les fichiers de données ont été créés par runSetup).
    // Actes « projet » : project/args → le code est écrit dans un vrai fichier script
    // et exécuté avec ses arguments (apprentissage de l'écriture de scripts complets).
    const { output } = await window.electronAPI.terminal.runValidation({
      lang, code: trimmed, project: chapter.project, args: chapter.args,
    })
    const clean = output ?? ''
    const correct = chapter.validationType === 'output_nonempty'
      ? trimmed.length > 0
      : clean.toLowerCase().includes((chapter.expectedOutput ?? '').toLowerCase())
    return { correct, output: clean }
  }, [lang, validateStatic])

  return { run, validate }
}
