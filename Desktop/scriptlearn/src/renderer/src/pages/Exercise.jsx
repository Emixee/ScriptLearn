import { useState, useId, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import Terminal from '../components/Terminal'
import PreviewPane from '../components/PreviewPane'
import AIAssistant from '../components/AIAssistant'
import WindowControls from '../components/WindowControls'
import ToolchainBanner from '../components/ToolchainBanner'
import { getModule } from '../content/loader'
import { parseMarkdown } from '../utils/markdown'
import { useProfile } from '../contexts/ProfileContext'
import { askOllama } from '../utils/ollama'
import contentIndex from '../content/index.json'
// Fiches de référence (KQL, SQL, Regex, Git, SPL, YAML, HTML) affichées dans le
// panneau droit des langages sans terminal.
// POURQUOI dans content/ : c'était 342 lignes de CONTENU pédagogique écrites en
// dur au milieu de cette page (qui en compte déjà 1200), et une SECONDE version,
// plus courte et divergente, vivait dans Sandbox.jsx. Les deux pages lisent
// maintenant le même fichier.
import references from '../content/references.json'
// Métadonnées langages centralisées (couleurs, labels, exécution, coloration).
// Avant, ces tables étaient dupliquées ici ET dans Sandbox — voir lib/langs.js.
import {
  LANG_COLORS, LANG_LABELS, STATIC_LANGS, getLangExtension,
  buildRunData, termShellFor, isRepl,
} from '../lib/langs'
// useCodeRunner est l'UNIQUE implémentation de la validation (les six moteurs
// réels + le repli par mots-clés). Cette page en avait sa propre copie, sans
// aucun moteur : les exercices SQL/Regex/YAML/Git/HTML étaient validés par
// simple recherche de mots-clés alors que les validateurs existaient déjà.
import { useCodeRunner, matchesExpected } from '../lib/useCodeRunner'

const STATUS = { idle: 'idle', running: 'running', success: 'success', error: 'error' }

// Module suivant, pour le bouton « Module suivant » de l'écran de complétion.
//
// POURQUOI deux branches : les niveaux STANDARD ont un id numérique (1…6) et
// regroupent plusieurs langues (`level.languages[lang]`), alors que les 12
// PARCOURS complémentaires ont des ids textuels (`sql-l1`, `java-l1`) et une
// structure différente (`complementary.tracks[lang].levels[].modules`).
// L'ancienne version ne gérait que la première : `parseInt('sql-l1')` valant NaN,
// elle renvoyait toujours null et le bouton ne s'affichait JAMAIS pour SQL, Git,
// KQL, SPL, YAML, HTML, PHP, C, C++, C#, Java — c'est-à-dire la majorité du contenu.
function findNextModule(currentLang, currentLevelId, currentModuleId) {
  // ── Parcours complémentaire : id de niveau de la forme « <track>-l<n> » ──
  if (/-l\d+$/.test(String(currentLevelId))) {
    const track = contentIndex.complementary?.tracks?.[currentLang]
    if (!track) return null
    const levels = track.levels ?? []
    const li = levels.findIndex(l => l.id === currentLevelId)
    if (li === -1) return null
    const mods = levels[li].modules ?? []
    const mi = mods.findIndex(m => m.id === currentModuleId)
    if (mi === -1) return null
    if (mi < mods.length - 1) {
      return { lang: currentLang, levelId: currentLevelId, ref: mods[mi + 1], sameLevel: true }
    }
    const nextLevel = levels[li + 1]
    if (!nextLevel || !(nextLevel.modules ?? []).length) return null
    return { lang: currentLang, levelId: nextLevel.id, ref: nextLevel.modules[0], sameLevel: false }
  }

  // ── Niveaux standard (ids numériques) ──
  const level = contentIndex.levels.find(l => l.id === parseInt(currentLevelId))
  if (!level) return null
  const refs = level.languages[currentLang] ?? []
  const idx = refs.findIndex(r => r.id === currentModuleId)
  if (idx === -1) return null
  if (idx < refs.length - 1) return { lang: currentLang, levelId: currentLevelId, ref: refs[idx + 1], sameLevel: true }
  const nextLevel = contentIndex.levels.find(l => l.id === parseInt(currentLevelId) + 1 && !l.locked)
  if (!nextLevel) return null
  const nextRefs = nextLevel.languages[currentLang] ?? []
  if (nextRefs.length === 0) return null
  return { lang: currentLang, levelId: nextLevel.id, ref: nextRefs[0], sameLevel: false }
}

const cmTheme = EditorView.theme({
  '&': { fontSize: '13px', backgroundColor: '#080807' },
  // JetBrains Mono en premier — cohérence avec le reste de l'UI (body, Terminal, code blocks)
  '.cm-content': { padding: '8px', fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" },
  '.cm-focused': { outline: 'none' },
  '.cm-editor': { borderRadius: '0' },
  '.cm-scroller': { fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" },
})

const MIN_PANEL_WIDTH = 300
const MAX_PANEL_WIDTH = 700
const DEFAULT_PANEL_WIDTH = 420

export default function Exercise() {
  const { lang, level, moduleId, exerciseIndex } = useParams()
  const navigate = useNavigate()
  const uid = useId().replace(/:/g, '')
  const termId = `term-${uid}`
  const { profile, settings } = useProfile()
  const isKQL = lang === 'kql'
  const isStaticLang = STATIC_LANGS.includes(lang)
  // Session PTY prête ? (Terminal.onReady) — « ▶ Exécuter » écrivait sinon dans une
  // session parfois inexistante, et l'ordre était jeté EN SILENCE côté main.
  const [termReady, setTermReady] = useState(false)
  // Validation partagée avec MissionPlay (six moteurs réels + repli mots-clés).
  const { validate: runnerValidate } = useCodeRunner(termId, lang)

  const [code, setCode] = useState('')
  // Garde anti-double-validation (mode terminal-auto) : les blocs de sortie
  // arrivent en flux ; on ne valide qu'UNE fois (les setState sont asynchrones).
  const succeededRef = useRef(false)
  const [status, setStatus] = useState(STATUS.idle)
  const [feedback, setFeedback] = useState(null)
  const [aiPending, setAiPending] = useState(false)
  const [showCorrection, setShowCorrection] = useState(false)
  const [showCompletion, setShowCompletion] = useState(false)
  const [moduleProgress, setModuleProgress] = useState(null)
  const [showAI, setShowAI] = useState(false)
  const [panelWidth, setPanelWidth] = useState(DEFAULT_PANEL_WIDTH)
  const [draftLoaded, setDraftLoaded] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [showNote, setShowNote] = useState(false)
  // previewSrc : contenu HTML rendu dans le PreviewPane pour les langages PHP
  // Pour HTML, le srcDoc est directement `code` (temps réel), pas cet état
  // Pour PHP, cet état est mis à jour après l'exécution (sortie terminal stripée)
  const [previewSrc, setPreviewSrc] = useState('')
  // Aperçu HTML DÉBOUNCÉ : `srcDoc={code}` rechargeait l'iframe à chaque caractère
  // tapé (scripts de l'élève réexécutés en boucle, état du rendu perdu).
  const [htmlPreview, setHtmlPreview] = useState('')

  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartW = useRef(DEFAULT_PANEL_WIDTH)

  // IMPORTANT : module et exercise doivent être déclarés AVANT noteKey.
  // En production (build Rollup), const respecte la Temporal Dead Zone (TDZ) :
  // accéder à une variable const avant sa déclaration lève ReferenceError,
  // même si c'est dans la même fonction. En dev (esbuild), const → var, pas de TDZ,
  // d'où une différence de comportement dev vs production (écran blanc en prod).
  const module = getModule(moduleId)
  const exIdx = Math.max(0, parseInt(exerciseIndex || '1', 10) - 1)
  const exercise = module?.exercises?.[exIdx] ?? null
  // noteKey dépend de exercise, donc déclaré après
  const noteKey = exercise ? `ex:${exercise.id}` : null
  const totalExercises = module?.exercises?.length ?? 0
  const isFirst = exIdx === 0
  const isLast = exIdx === totalExercises - 1
  const isBoss = exercise?.isBoss ?? false
  const isDebug = exercise?.exerciseType === 'debug'
  const draftKey = `${moduleId}:${exerciseIndex}`
  // Mode « terminal-auto » : langage à REPL/shell (bash/powershell/python) et
  // exercice non-projet → l'élève tape DIRECTEMENT dans le terminal, validé
  // automatiquement (pas d'éditeur, pas de bouton). Déclaré APRÈS `exercise`
  // pour éviter la TDZ (cf. correctif v0.4.4).
  const terminalAuto = isRepl(lang) && !isStaticLang && !exercise?.project

  const nextModule = useMemo(() => findNextModule(lang, level, moduleId), [lang, level, moduleId])

  // Charger le brouillon au montage de l'exercice
  useEffect(() => {
    if (!profile || !exercise) return
    // `cancelled` : la réponse d'un exercice qu'on a quitté ne doit pas écrire son
    // brouillon dans l'exercice suivant (le debounce de sauvegarde le
    // réenregistrerait alors sous la NOUVELLE clé).
    // .catch : sans lui, un rejet laissait draftLoaded à false — plus aucune
    // sauvegarde pour le reste de la session — et une « unhandled rejection ».
    let cancelled = false
    window.electronAPI.store.getDraft(profile.id, draftKey)
      .then(draft => {
        if (cancelled) return
        if (draft) {
          setCode(draft)
        } else if (isDebug && exercise.buggyCode) {
          setCode(exercise.buggyCode)
        }
        setDraftLoaded(true)
      })
      .catch(() => { if (!cancelled) setDraftLoaded(true) })
    return () => { cancelled = true }
  }, [profile?.id, moduleId, exerciseIndex])

  // Sauvegarder le brouillon à chaque modification (avec debounce)
  const saveTimeout = useRef(null)
  // Brouillon en attente d'écriture, lu par le nettoyage de démontage.
  const pendingDraft = useRef(null)
  useEffect(() => {
    if (!profile || !draftLoaded || status === STATUS.success) return
    clearTimeout(saveTimeout.current)
    pendingDraft.current = code.trim() ? { key: draftKey, code } : null
    saveTimeout.current = setTimeout(() => {
      pendingDraft.current = null
      if (code.trim()) {
        window.electronAPI.store.saveDraft(profile.id, draftKey, code).catch(() => {})
      }
    }, 800)
    return () => clearTimeout(saveTimeout.current)
  }, [code, profile?.id, draftLoaded, status])

  // Écrire le brouillon en attente au DÉMONTAGE.
  // POURQUOI : le cleanup du debounce se contentait d'annuler le minuteur — du
  // code tapé puis suivi d'une navigation en moins de 800 ms était perdu sans
  // aucun signal à l'élève.
  useEffect(() => () => {
    const p = pendingDraft.current
    if (p && profile) window.electronAPI.store.saveDraft(profile.id, p.key, p.code).catch(() => {})
  }, [profile?.id])

  // Charger le score du module pour l'écran de complétion
  useEffect(() => {
    if (!profile || !showCompletion || !module) return
    window.electronAPI.store.getProgress(profile.id).then(prog => {
      const done = module.exercises.filter(ex => prog[ex.id]?.completed).length
      setModuleProgress({ done, total: module.exercises.length })
    })
  }, [showCompletion, profile, module])

  // Réinitialiser l'état à chaque changement d'exercice
  useEffect(() => {
    setCode('')
    setStatus(STATUS.idle)
    setFeedback(null)
    setAiPending(false)
    setShowCorrection(false)
    setShowCompletion(false)
    setDraftLoaded(false)
    setNoteText('')
    setShowNote(false)
    setPreviewSrc('')
    succeededRef.current = false   // réarmer la détection terminal-auto
  }, [moduleId, exerciseIndex])

  // Charger la note
  const [noteLoaded, setNoteLoaded] = useState(false)
  useEffect(() => {
    if (!profile || !noteKey) return
    let cancelled = false
    setNoteLoaded(false)
    window.electronAPI.store.getNote(profile.id, noteKey)
      .then(n => { if (!cancelled) { setNoteText(n ?? ''); setNoteLoaded(true) } })
      .catch(() => { if (!cancelled) setNoteLoaded(true) })
    return () => { cancelled = true }
  }, [profile?.id, noteKey])

  // Sauvegarder la note (debounce).
  // `noteLoaded` évite d'écrire l'ANCIENNE note sous la NOUVELLE clé quand la
  // lecture IPC prend plus de 800 ms (même problème que pour les brouillons).
  const noteTimeout = useRef(null)
  const pendingNote = useRef(null)
  useEffect(() => {
    if (!profile || !noteKey || !noteLoaded) return
    clearTimeout(noteTimeout.current)
    pendingNote.current = { key: noteKey, text: noteText }
    noteTimeout.current = setTimeout(() => {
      pendingNote.current = null
      window.electronAPI.store.saveNote(profile.id, noteKey, noteText).catch(() => {})
    }, 800)
    return () => clearTimeout(noteTimeout.current)
  }, [noteText, profile?.id, noteKey, noteLoaded])

  // Écrire la note en attente au démontage (même raison que pour le brouillon).
  useEffect(() => () => {
    const p = pendingNote.current
    if (p && profile) window.electronAPI.store.saveNote(profile.id, p.key, p.text).catch(() => {})
  }, [profile?.id])

  // 300 ms de calme dans la frappe avant de recharger l'aperçu HTML.
  useEffect(() => {
    if (lang !== 'html') return
    const t = setTimeout(() => setHtmlPreview(code), 300)
    return () => clearTimeout(t)
  }, [code, lang])

  // Raccourcis clavier globaux.
  //
  // Deux corrections par rapport à la version d'origine :
  //  1. L'effet n'avait AUCUN tableau de dépendances : il se ré-exécutait après
  //     chaque rendu, donc retirait puis réattachait l'écouteur à chaque frappe
  //     dans CodeMirror. Les handlers passent par un ref, l'écouteur n'est posé
  //     qu'une fois.
  //  2. Ctrl+R était intercepté avec preventDefault() MÊME quand le focus était
  //     dans le terminal — ce qui volait la recherche d'historique (reverse-i-search)
  //     de bash et de PowerShell, essentielle en mode terminal-auto.
  // Le ref est créé VIDE ici et alimenté plus bas, APRÈS la déclaration des
  // handlers. POURQUOI : `useRef({ handleRun, … })` évaluerait l'objet
  // immédiatement, alors que handleRun/handleValidate/reset sont déclarés en
  // `const` plus loin dans le composant → « Cannot access 'handleRun' before
  // initialization » (zone morte temporelle) à chaque rendu, donc écran blanc sur
  // toute la page Exercice. Même piège que celui documenté plus haut pour
  // `module`/`exercise`/`noteKey`.
  const shortcutRef = useRef({})
  useEffect(() => {
    const handler = (e) => {
      // Le terminal xterm gère lui-même ses raccourcis : on ne lui prend rien.
      const inTerminal = e.target instanceof Element && e.target.closest('.xterm')
      if (inTerminal) return
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        // Appels optionnels : le ref reste vide si le composant est sorti par son
        // `return` précoce (« Exercice introuvable ») — l'écouteur, lui, est déjà posé.
        if (e.shiftKey) { shortcutRef.current.handleValidate?.() } else { shortcutRef.current.handleRun?.() }
      }
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault()
        shortcutRef.current.reset?.()
      }
      // Ctrl+I : ouverture/fermeture de l'assistant IA. Le bouton annonçait déjà ce
      // raccourci dans son title alors qu'aucun handler ne l'implémentait.
      if (e.ctrlKey && (e.key === 'i' || e.key === 'I')) {
        e.preventDefault()
        setShowAI(v => !v)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ── Redimensionnement du panneau gauche ──────────────────────────────────
  // Les écouteurs ne sont posés que PENDANT le glisser, et retirés dès le relâché.
  // POURQUOI : avant, mousemove/mouseup étaient attachés en permanence et le
  // handler s'exécutait à chaque mouvement de souris n'importe où dans la fenêtre.
  // Le nettoyage à la fin du drag est fait par le handler lui-même.
  const dragCleanup = useRef(null)

  const startDrag = useCallback((e) => {
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartW.current = panelWidth
    e.preventDefault()

    const onMove = (ev) => {
      if (!isDragging.current) return
      const delta = ev.clientX - dragStartX.current
      const newW = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, dragStartW.current + delta))
      setPanelWidth(newW)
    }
    const stop = () => {
      isDragging.current = false
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', stop)
      dragCleanup.current = null
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', stop)
    dragCleanup.current = stop
  }, [panelWidth])

  // Filet de sécurité : si le composant est démonté en plein glisser, les
  // écouteurs globaux doivent tout de même partir.
  useEffect(() => () => { dragCleanup.current?.() }, [])

  // Redimensionnement au CLAVIER : le séparateur est un simple <div>, donc
  // inatteignable autrement. Flèches ←/→ par pas de 20 px.
  const nudgePanel = useCallback((delta) => {
    setPanelWidth(w => Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, w + delta)))
  }, [])

  if (!module || !exercise) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a09]">
        <p className="text-stone-400">Exercice introuvable.</p>
      </div>
    )
  }

  const handleRun = () => {
    if (!code.trim() || isStaticLang) return
    setFeedback(null)
    setStatus(STATUS.idle)

    // buildRunData centralise la façon d'exécuter chaque langage :
    //  - PHP : heredoc vers l'interpréteur php
    //  - C/C++/C#/Java : écriture d'un fichier temporaire WSL + compilation + run
    //  - bash/python/powershell : envoi direct
    if (lang === 'php') setPreviewSrc('')
    window.electronAPI.terminal.write({ id: termId, data: buildRunData(lang, code) })
  }

  const validate = async () => {
    const trimmed = code.trim()
    if (!trimmed || status === STATUS.running) return
    setStatus(STATUS.running)
    setFeedback(null)
    if (lang === 'php') setPreviewSrc('')

    // Toute la logique est dans useCodeRunner : moteur réel si l'exercice en
    // déclare un (sql, dom, regex, yaml, git, structured), sinon exécution en
    // coulisses et comparaison de la sortie, sinon mots-clés.
    const { correct, output, error } = await runnerValidate(exercise, trimmed)
    const cleanOutput = output ?? ''

    // PHP : la sortie est déjà propre → on alimente directement l'aperçu HTML.
    if (lang === 'php' && !error) {
      const phpHtmlOut = cleanOutput.trim()
      const isFullHtml = phpHtmlOut.toLowerCase().startsWith('<!doctype') || phpHtmlOut.toLowerCase().startsWith('<html')
      setPreviewSrc(isFullHtml
        ? phpHtmlOut
        : `<body style="font-family:sans-serif;background:#fff;padding:16px;color:#222;white-space:pre-wrap">${phpHtmlOut}</body>`
      )
    }

    finalize(correct, trimmed, { detail: cleanOutput, execError: error })
  }

  // `info.detail` : rapport du moteur de validation (lignes ✅/❌, sortie réelle,
  // message d'erreur SQL…). Affiché en cas d'échec : sans lui, l'élève ne voyait
  // que « Résultat attendu : … » sans savoir ce que SON code avait produit.
  const finalize = (isCorrect, trimmed, info = {}) => {
    if (isCorrect) {
      setStatus(STATUS.success)
      setFeedback({ type: 'success', title: 'Correct !', body: exercise.explanation, aiBody: null })
      if (profile) window.electronAPI.store.markExerciseDone(profile.id, exercise.id)
      // Supprimer le brouillon une fois réussi
      if (profile) window.electronAPI.store.deleteDraft(profile.id, draftKey)
      if (isLast) setTimeout(() => setShowCompletion(true), 900)
    } else {
      setStatus(STATUS.error)
      // Une erreur d'EXÉCUTION (toolchain absente, moteur indisponible) n'est pas
      // une erreur de l'élève : on la distingue explicitement.
      const detail = (info.detail ?? '').trim()
      let errorBody
      if (info.execError) {
        errorBody = `Impossible d'exécuter le code :\n\n\`\`\`\n${detail}\n\`\`\``
      } else if (detail) {
        errorBody = `${exercise.expectedOutput ? `Résultat attendu : \`${exercise.expectedOutput}\`\n\n` : ''}Obtenu :\n\n\`\`\`\n${detail.slice(0, 1200)}\n\`\`\``
      } else if (isStaticLang) {
        errorBody = `Vérifiez ${exercise.requiredTable ? `la table/source (\`${exercise.requiredTable}\`) et ` : ''}les mots-clés requis.`
      } else {
        errorBody = `Résultat attendu : \`${exercise.expectedOutput}\`\n\nVérifiez votre commande et réessayez.`
      }
      setFeedback({
        type: 'error',
        title: info.execError ? 'Erreur d\'exécution' : 'Pas tout à fait…',
        body: errorBody,
        aiBody: null
      })
      if (profile) window.electronAPI.store.recordAttempt(profile.id, exercise.id)
    }
    if (settings?.aiEnabled && trimmed) {
      setAiPending(true)
      askOllama({ url: settings.aiUrl ?? 'http://localhost:11434', model: settings.aiModel ?? 'llama3.2',
        exercise, code: trimmed, isCorrect, lang })
        .then(aiText => {
          setAiPending(false)
          if (aiText) setFeedback(prev => prev ? { ...prev, aiBody: aiText } : prev)
        })
    }
  }

  // Mode terminal-auto : appelé pour chaque SORTIE de commande (écho déjà retiré
  // par Terminal.jsx). Dès que la sortie réelle contient le résultat attendu, on
  // déclenche le MÊME flux de succès que « Valider » (finalize → progression, IA…).
  const handleTerminalOutput = (block, cmd) => {
    if (succeededRef.current) return
    // Même garde-fou opt-in que dans MissionPlay : un exercice peut exiger que la
    // commande employée corresponde à `requiredCmd` (sinon `echo <résultat attendu>`
    // valide l'exercice, la comparaison portant sur la sortie).
    if (exercise.requiredCmd) {
      let cmdOk = false
      try { cmdOk = new RegExp(exercise.requiredCmd, 'i').test(cmd ?? '') } catch { cmdOk = true }
      if (!cmdOk) return
    }
    const isCorrect = exercise.validationType === 'output_nonempty'
      ? block.trim().length > 0
      : matchesExpected(block, exercise.expectedOutput)
    if (!isCorrect) return
    succeededRef.current = true
    finalize(true, block)
  }

  // Alias pour les raccourcis clavier
  const handleValidate = validate

  const reset = () => {
    setCode(isDebug && exercise.buggyCode ? exercise.buggyCode : '')
    setStatus(STATUS.idle)
    setFeedback(null)
    setShowCorrection(false)
    setShowCompletion(false)
    setPreviewSrc('')
    if (!isStaticLang) {
      const clearCmd = lang === 'powershell' ? 'Clear-Host\r'
        : lang === 'python' ? 'import os; os.system("cls")\r'
        : 'clear\r'
      window.electronAPI.terminal.write({ id: termId, data: clearCmd })
    }
  }

  // Mise à jour du ref des raccourcis : APRÈS la déclaration des handlers, à
  // chaque rendu, pour que l'écouteur clavier (posé une seule fois) appelle
  // toujours la version courante.
  shortcutRef.current = { handleRun, handleValidate, reset }

  const goNext = () => {
    if (isLast) navigate('/app/courses')
    else navigate(`/exercise/${lang}/${level}/${moduleId}/${exIdx + 2}`)
  }

  const goPrev = () => {
    if (isFirst) navigate(`/course/${lang}/${level}/${moduleId}`)
    else navigate(`/exercise/${lang}/${level}/${moduleId}/${exIdx}`)
  }

  const langAccent = LANG_COLORS[lang] ?? '#22d3ee'
  const langLabel = LANG_LABELS[lang] ?? lang

  return (
    <div className="flex flex-col h-screen bg-[#0a0a09]">
      {/* Écran de complétion */}
      {showCompletion && (
        <div className="absolute inset-0 z-50 bg-[#0a0a09]/95 flex items-center justify-center">
          <div className="bg-[#111110] border border-[#2e2b26] rounded p-10 max-w-md w-full text-center shadow-2xl">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-white text-2xl font-bold mb-2">Module terminé !</h2>
            <p className="text-stone-400 text-sm mb-1">{module.title}</p>
            {moduleProgress && (
              <p className="text-[#d97706] font-semibold text-lg mt-3 mb-6">
                {moduleProgress.done} / {moduleProgress.total} exercices réussis
              </p>
            )}
            <div className="flex flex-col gap-3">
              {nextModule && (
                <button
                  onClick={() => navigate(`/course/${nextModule.lang}/${nextModule.levelId}/${nextModule.ref.id}`)}
                  className="w-full bg-[#d97706] hover:bg-[#b45309] text-[#0a0a09] py-3 rounded font-medium transition-colors"
                >
                  Module suivant : {nextModule.ref.title} →
                </button>
              )}
              <button onClick={() => navigate('/app/courses')}
                className="w-full bg-[#1c1c1a] hover:bg-[#252520] text-stone-300 py-3 rounded transition-colors">
                Retour aux cours
              </button>
              <button onClick={() => setShowCompletion(false)}
                className="text-stone-500 hover:text-stone-300 text-sm transition-colors">
                Rester sur cet exercice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre du haut */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-[#111110] border-b border-[#2e2b26] flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
          <button onClick={() => navigate('/app/courses')} className="text-stone-400 hover:text-white transition-colors text-sm">← Menu</button>
          <div className="w-px h-4 bg-[#2e2b26]" />
          <button onClick={() => navigate(`/course/${lang}/${level}/${moduleId}`)} className="text-stone-400 hover:text-white transition-colors text-sm">Cours</button>
          <div className="w-px h-4 bg-[#2e2b26]" />
          {isBoss && <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">👑 Boss</span>}
          {isDebug && <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">🐛 Débogage</span>}
          {!isBoss && !isDebug && <span className="text-stone-400 text-xs uppercase tracking-widest">Exercice</span>}
          <div className="w-px h-4 bg-[#2e2b26]" />
          <h1 className="text-white font-medium text-sm truncate max-w-[200px]">{exercise.title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="flex items-center gap-1.5">
            {module.exercises.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i < exIdx ? 'bg-[#d97706]' : i === exIdx ? 'bg-white' : 'bg-[#2e2b26]'
              }`} />
            ))}
          </div>
          <span className="text-stone-500 text-xs font-medium">{exIdx + 1} / {totalExercises}</span>
          <span className={`text-xs px-2 py-0.5 rounded font-medium`}
            style={{ backgroundColor: `${langAccent}20`, color: langAccent }}>
            {langLabel}
          </span>
          <button
            onClick={() => setShowAI(v => !v)}
            title="Assistant IA (Ctrl+I)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-sm text-xs font-medium transition-colors ${
              showAI ? 'bg-[#d97706] text-[#0a0a09]' : 'bg-[#1c1c1a] text-stone-400 hover:text-white hover:bg-[#252520]'
            }`}
          >
            <span>✦</span><span>IA</span>
          </button>
          <WindowControls />
        </div>
      </div>

      {/* Corps principal */}
      <div className="flex flex-1 overflow-hidden">
        {/* Panneau gauche (redimensionnable) */}
        <div className="flex flex-col border-r border-[#2e2b26] flex-shrink-0" style={{ width: panelWidth }}>
          {/* Avertissement si la toolchain compilée (gcc/g++/javac/mono) manque dans WSL */}
          <ToolchainBanner lang={lang} />
          {/* Badge boss/debug */}
          {(isBoss || isDebug) && (
            <div className={`px-4 py-2 text-xs font-medium flex items-center gap-2 ${
              isBoss ? 'bg-amber-500/10 text-amber-300 border-b border-amber-500/20'
                     : 'bg-orange-500/10 text-orange-300 border-b border-orange-500/20'
            }`}>
              {isBoss
                ? '👑 Exercice boss — aucune correction disponible. Prouve que tu maîtrises le niveau !'
                : '🐛 Exercice de débogage — le code est volontairement cassé. Trouve et corrige les erreurs.'}
            </div>
          )}

          {/* Instructions */}
          <div className="p-5 border-b border-[#2e2b26] overflow-y-auto flex-shrink-0 max-h-[32%]">
            <h2 className="text-white font-semibold mb-3">Instructions</h2>
            <div className="text-stone-300 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(exercise.instructions) }} />
            {!isBoss && exercise.hint && (
              <details className="mt-3">
                <summary className="text-stone-500 text-xs cursor-pointer hover:text-stone-300 transition-colors select-none">
                  💡 Afficher un indice
                </summary>
                <p className="text-stone-400 text-xs mt-1.5 pl-3 border-l border-[#2e2b26]">{exercise.hint}</p>
              </details>
            )}
          </div>

          {/* Zone scrollable : éditeur + feedback + correction */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-3">
            {terminalAuto ? (
              /* Mode terminal-auto : pas d'éditeur — l'élève tape dans le terminal à droite. */
              <div className="rounded-sm border border-[#2e2b26] bg-[#111110] p-3 flex-shrink-0">
                <div className="text-stone-400 text-xs uppercase tracking-widest mb-1.5">⌨ Terminal interactif</div>
                <p className="text-stone-400 text-xs leading-relaxed">
                  Tape directement tes commandes dans le terminal à droite. L'exercice se
                  valide <span className="text-[#d97706]">automatiquement</span> dès que la sortie
                  correspond au résultat attendu.
                </p>
              </div>
            ) : (
            <>
            <div className="flex items-center justify-between flex-shrink-0">
              <span className="text-stone-400 text-xs uppercase tracking-widest">
                {isDebug ? 'Code à déboguer' : 'Votre script'}
              </span>
              <button onClick={reset} className="text-stone-500 hover:text-stone-300 text-xs transition-colors">
                Réinitialiser
              </button>
            </div>

            {/* Éditeur CodeMirror */}
            <div className={`rounded-sm overflow-hidden border flex-shrink-0 border-[#2e2b26] transition-colors`}
              style={{ minHeight: 150 }}>
              <CodeMirror
                value={code}
                onChange={setCode}
                extensions={[
                  getLangExtension(isKQL ? 'kql' : lang),
                  cmTheme,
                  EditorView.lineWrapping,
                ]}
                theme={oneDark}
                placeholder={
                  lang === 'powershell' ? 'Écrivez votre PowerShell ici…'
                  : lang === 'python'   ? 'Écrivez votre Python ici…'
                  : lang === 'kql'      ? 'Écrivez votre requête KQL ici…\n\nEx: SecurityEvent\n| where EventID == 4625\n| take 10'
                  : lang === 'sql'      ? 'Écrivez votre requête SQL ici…\n\nEx: SELECT * FROM employees\nWHERE salary > 50000;'
                  : lang === 'regex'    ? 'Écrivez votre pattern Python ici…\n\nimport re\nre.search(r\'\\d+\', texte)'
                  : lang === 'git'      ? 'Écrivez la commande Git ici…\n\nEx: git log --oneline'
                  : lang === 'spl'      ? 'Écrivez votre recherche SPL ici…\n\nEx: index=security EventCode=4625\n| stats count BY user'
                  : lang === 'html'     ? '<!DOCTYPE html>\n<html lang="fr">\n<head>\n  <meta charset="UTF-8">\n  <title>Ma page</title>\n</head>\n<body>\n  <!-- Votre HTML ici -->\n</body>\n</html>'
                  : lang === 'php'      ? '<?php\n// Votre code PHP ici\necho "Hello, PHP!";\n?>'
                  : 'Écrivez votre Bash ici…'
                }
                style={{ minHeight: '150px' }}
                basicSetup={{
                  lineNumbers: true,
                  foldGutter: false,
                  dropCursor: false,
                  allowMultipleSelections: false,
                  indentOnInput: true,
                  bracketMatching: true,
                  closeBrackets: true,
                  autocompletion: true,
                  highlightActiveLine: true,
                  highlightSelectionMatches: false,
                }}
              />
            </div>
            </>
            )}

            {/* Feedback */}
            {feedback && (
              <div className={`rounded-sm p-3 text-sm border flex-shrink-0 ${
                feedback.type === 'success'
                  ? 'bg-[#86efac]/10 border-[#86efac]/30 text-[#86efac]'
                  : 'bg-red-500/10 border-red-500/30 text-red-300'
              }`}>
                <p className="font-semibold mb-1">{feedback.title}</p>
                <div className="text-xs opacity-80 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(feedback.body) }} />
                {feedback.aiBody && (
                  <div className="mt-2 pt-2 border-t border-current/20">
                    <span className="text-xs opacity-50 uppercase tracking-widest">IA · </span>
                    <span className="text-xs opacity-80">{feedback.aiBody}</span>
                  </div>
                )}
                {aiPending && <p className="text-xs opacity-40 mt-1 animate-pulse">⏳ Analyse IA…</p>}
              </div>
            )}

            {/* Correction (masquée pour les boss exercises) */}
            {!isBoss && showCorrection && (
              <div className="bg-[#080807] border border-[#2e2b26] rounded-sm p-3 flex-shrink-0">
                <p className="text-stone-400 text-xs mb-2 uppercase tracking-widest">Correction</p>
                <pre className="text-[#4ade80] text-sm font-mono mb-2 whitespace-pre-wrap overflow-x-auto">{exercise.correction}</pre>
                <div className="text-stone-400 text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(exercise.explanation) }} />
              </div>
            )}
          </div>

          {/* Notes personnelles */}
          <div className="flex-shrink-0 border-t border-[#2e2b26] px-4 pt-2 pb-1">
            <button
              onClick={() => setShowNote(v => !v)}
              className="text-xs text-stone-500 hover:text-stone-300 transition-colors flex items-center gap-1.5"
            >
              <span>{showNote ? '▾' : '▸'}</span>
              <span>{noteText ? '📝 Note' : '+ Ajouter une note'}</span>
            </button>
            {showNote && (
              <textarea
                value={noteText}
                onChange={e => setNoteText(e.target.value)}
                placeholder="Vos notes personnelles sur cet exercice…"
                rows={3}
                className="w-full mt-2 bg-[#0a0a09] border border-[#2e2b26] rounded-sm px-3 py-2 text-xs text-stone-300 resize-none focus:outline-none focus:border-[#d97706] transition-colors leading-relaxed"
              />
            )}
          </div>

          {/* Boutons */}
          <div className="flex-shrink-0 p-4 pt-3 border-t border-[#2e2b26] flex flex-col gap-2">
            {terminalAuto ? (
              /* Mode terminal-auto : aucune action manuelle — la validation est automatique. */
              <div className="text-stone-500 text-xs py-1.5 text-center">
                Validation <span className="text-[#d97706]">automatique</span> · tape dans le terminal →
              </div>
            ) : (
            <>
            <div className="text-stone-600 text-[10px] mb-1">
              Ctrl+↵ Exécuter · Ctrl+Shift+↵ Valider · Ctrl+R Reset
            </div>
            <div className="flex gap-2">
              {!isStaticLang && (
                <button onClick={handleRun} disabled={!termReady}
                  title={termReady ? 'Exécuter dans le terminal' : 'Terminal en cours de démarrage…'}
                  className="flex-1 bg-[#1c1c1a] hover:bg-[#252520] text-stone-300 text-sm py-2 rounded-sm transition-colors font-medium disabled:opacity-40">
                  ▶ Exécuter
                </button>
              )}
              <button
                onClick={validate}
                disabled={status === STATUS.running}
                className="flex-1 disabled:opacity-60 text-white text-sm py-2 rounded-sm transition-colors font-medium"
                style={{ backgroundColor: isStaticLang ? `${langAccent}cc` : '#d97706' }}
              >
                {status === STATUS.running ? '⏳ Validation…' : isStaticLang ? '✓ Valider' : '✓ Valider'}
              </button>
            </div>
            </>
            )}
            <div className="flex items-center justify-between">
              {!isBoss ? (
                <button onClick={() => setShowCorrection(v => !v)}
                  className="text-stone-500 hover:text-stone-300 text-xs transition-colors">
                  {showCorrection ? 'Masquer' : 'Voir'} la correction
                </button>
              ) : (
                <span className="text-amber-600 text-xs">Pas de correction pour les boss</span>
              )}
              <div className="flex gap-3">
                <button onClick={goPrev} className="text-stone-500 hover:text-stone-300 text-xs transition-colors">← Préc.</button>
                <button
                  onClick={status === STATUS.success && isLast ? () => setShowCompletion(true) : goNext}
                  className={`text-xs font-medium transition-colors ${
                    status === STATUS.success ? 'text-[#d97706] hover:text-[#b45309]' : 'text-stone-500 hover:text-stone-300'
                  }`}
                >
                  {isLast ? (status === STATUS.success ? 'Terminer ✓' : 'Terminer') : 'Suiv. →'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Séparateur draggable — accessible au clavier.
            role="separator" + aria-valuenow décrivent la poignée aux lecteurs
            d'écran ; tabIndex + flèches permettent de la manipuler sans souris. */}
        <div
          onMouseDown={startDrag}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft')  { e.preventDefault(); nudgePanel(-20) }
            if (e.key === 'ArrowRight') { e.preventDefault(); nudgePanel(20) }
          }}
          role="separator"
          aria-orientation="vertical"
          aria-label="Redimensionner le panneau de l'énoncé"
          aria-valuenow={panelWidth}
          aria-valuemin={MIN_PANEL_WIDTH}
          aria-valuemax={MAX_PANEL_WIDTH}
          tabIndex={0}
          className="w-1 bg-[#2e2b26] hover:bg-[#d97706] focus-visible:bg-[#d97706] focus:outline-none cursor-col-resize flex-shrink-0 transition-colors"
          title="Redimensionner (← / → au clavier)"
        />

        {/* Panneau droit : terminal, référence ou aperçu selon le langage
            - HTML  → PreviewPane plein panneau (aperçu temps réel)
            - PHP   → Terminal bash (60%) + PreviewPane (40%) empilés
            - Autres terminaux (bash, python, powershell) → Terminal seul
            - Langages statiques (kql, sql, regex…) → Référence textuelle */}
        <div className="flex flex-col overflow-hidden flex-1">
          {/* Barre de titre du panneau droit — masquée pour PHP et HTML car
              PreviewPane et le Terminal ont leur propre barre */}
          {lang !== 'html' && lang !== 'php' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-[#111110] border-b border-[#2e2b26] flex-shrink-0">
              <div className="flex gap-1.5">
                {isStaticLang ? (
                  <><div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${langAccent}99` }}/><div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${langAccent}50` }}/><div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${langAccent}25` }}/></>
                ) : (
                  <><div className="w-3 h-3 rounded-full bg-red-500/70"/><div className="w-3 h-3 rounded-full bg-yellow-500/70"/><div className="w-3 h-3 rounded-full bg-[#86efac]/70"/></>
                )}
              </div>
              <span className="text-stone-500 text-xs ml-2">
                {isStaticLang
                  ? `Référence ${langLabel}`
                  : lang === 'powershell' ? 'Windows PowerShell' : lang === 'python' ? 'Python' : 'Bash'}
              </span>
              {!isStaticLang && status === STATUS.running && <span className="ml-auto text-stone-500 text-xs animate-pulse">en cours…</span>}
              {isStaticLang && <span className="ml-auto text-xs opacity-40" style={{ color: langAccent }}>{langLabel}</span>}
            </div>
          )}
          <div className="flex-1 overflow-hidden bg-[#080807]">
            {lang === 'html' ? (
              // HTML : l'aperçu occupe tout le panneau — le code est le srcdoc direct
              // (mise à jour en temps réel à chaque frappe sans délai)
              <PreviewPane srcDoc={htmlPreview} label="HTML" langColor={langAccent} />
            ) : lang === 'php' ? (
              // PHP : terminal bash WSL en haut (60 %) + aperçu HTML en bas (40 %)
              // Le terminal montre la sortie brute + les erreurs PHP
              // Le PreviewPane montre la sortie rendue après validation
              <div className="flex flex-col h-full">
                <div style={{ flex: '0 0 60%', overflow: 'hidden' }}>
                  <Terminal id={termId} shell="bash" className="h-full" onReady={setTermReady} />
                </div>
                <div className="border-t border-[#2e2b26] flex-shrink-0" style={{ flex: '0 0 40%', overflow: 'hidden' }}>
                  <PreviewPane srcDoc={previewSrc} label="PHP" langColor={langAccent} />
                </div>
              </div>
            ) : isStaticLang ? (
              <pre className="h-full overflow-y-auto p-5 text-xs font-mono text-stone-400 leading-relaxed whitespace-pre">{references[lang] ?? ''}</pre>
            ) : (
              // termShellFor : bash/python/powershell gardent leur interpréteur ;
              // C/C++/C#/Java passent par la session bash embarquée (compilation + run).
              // terminalAuto → onOutput valide automatiquement sur la sortie réelle.
              <Terminal id={termId} shell={termShellFor(lang)} onReady={setTermReady} className="h-full"
                onOutput={terminalAuto ? handleTerminalOutput : undefined} />
            )}
          </div>
        </div>

        {/* Panneau IA */}
        {showAI && (
          <AIAssistant
            context={`Exercice "${exercise.title}" (${lang}).\nInstructions : ${exercise.instructions.slice(0, 300)}`}
            onClose={() => setShowAI(false)}
          />
        )}
      </div>
    </div>
  )
}
