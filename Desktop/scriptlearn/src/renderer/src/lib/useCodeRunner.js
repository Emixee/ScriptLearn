// ============================================================================
// useCodeRunner — hook qui encapsule l'exécution + la validation de code dans
// une session terminal, partagé par le mode jeu (MissionPlay) et réutilisable
// ailleurs. Il reprend EXACTEMENT la mécanique éprouvée d'Exercise.jsx :
//  - exécuté : on écrit le code, on imprime un "sentinel" unique, on attend que
//    ce sentinel réapparaisse dans la sortie (= fin d'exécution), puis on compare
//    la sortie réelle au résultat attendu ;
//  - statique : validation par présence de mots-clés (kql, sql, regex…).
//
// POURQUOI un sentinel : la sortie du terminal arrive par morceaux asynchrones.
// Sans marqueur de fin, on ne saurait pas quand la commande a fini d'écrire —
// on risquerait de valider trop tôt sur une sortie incomplète.
// ============================================================================

import { useEffect, useRef, useCallback } from 'react'
import { SENTINEL_PREFIX, stripAnsi, isStatic, buildRunData, sentinelCommand } from './langs'

export function useCodeRunner(termId, lang) {
  // Buffer de sortie accumulée — un ref (pas un state) car on l'écrit à chaque
  // chunk reçu sans vouloir déclencher de re-render.
  const outputBuffer = useRef('')

  useEffect(() => {
    const cleanup = window.electronAPI.terminal.onData(({ id, chunk }) => {
      if (id === termId) outputBuffer.current += chunk
    })
    return cleanup
  }, [termId])

  // Prépend la « mise en place » cachée (création des fichiers de données d'un acte)
  // au code de l'apprenant. Le setup n'est JAMAIS montré dans l'éditeur — il évite
  // d'encombrer et surtout de dévoiler la réponse (les données qu'on doit découvrir
  // avec ls/cat/grep). Comme le setup n'imprime rien, il ne pollue pas la sortie.
  const withSetup = (code, setup) => (setup ? `${setup}\n${code}` : code)

  // Exécute le code sans valider (bouton « Exécuter »).
  const run = useCallback((code, setup = '') => {
    if (!code.trim() || isStatic(lang)) return
    outputBuffer.current = ''
    window.electronAPI.terminal.write({ id: termId, data: buildRunData(lang, withSetup(code, setup)) })
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

  // Validation générale → renvoie { correct, output }.
  const validate = useCallback(async (chapter, code) => {
    const trimmed = code.trim()
    if (!trimmed) return { correct: false, output: '' }
    if (isStatic(lang)) {
      await new Promise(r => setTimeout(r, 200))
      return validateStatic(chapter, trimmed)
    }

    const sentinel = `${SENTINEL_PREFIX}${Date.now()}__`
    outputBuffer.current = ''
    // L'anti-triche reste basé sur le code APPRENANT (trimmed) : si l'éditeur est
    // vide, on a déjà échoué plus haut. Le setup n'est ajouté que pour l'exécution.
    window.electronAPI.terminal.write({ id: termId, data: buildRunData(lang, withSetup(trimmed, chapter.setup)) })
    await new Promise(r => setTimeout(r, 80))
    // En REPL Python, une ligne vide ferme un bloc indenté resté ouvert.
    if (lang === 'python') {
      window.electronAPI.terminal.write({ id: termId, data: '\r' })
      await new Promise(r => setTimeout(r, 50))
    }
    window.electronAPI.terminal.write({ id: termId, data: sentinelCommand(lang, sentinel) + '\r' })

    // Les langages compilés (gcc/javac/mono) peuvent prendre plusieurs secondes —
    // on tolère jusqu'à 25 s avant d'abandonner l'attente du sentinel.
    const maxWait = 25000, pollInterval = 120
    let elapsed = 0
    while (elapsed < maxWait) {
      if (stripAnsi(outputBuffer.current).includes(sentinel)) break
      await new Promise(r => setTimeout(r, pollInterval))
      elapsed += pollInterval
    }

    const clean = stripAnsi(outputBuffer.current)
    const sentinelIdx = clean.indexOf(sentinel)
    const output = sentinelIdx !== -1 ? clean.slice(0, sentinelIdx) : clean

    let correct
    if (chapter.validationType === 'output_nonempty') correct = trimmed.length > 0
    else correct = clean.toLowerCase().includes((chapter.expectedOutput ?? '').toLowerCase())
    return { correct, output }
  }, [termId, lang, validateStatic])

  return { run, validate }
}
