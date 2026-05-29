import { useState, useId, useEffect, useRef, useMemo, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CodeMirror from '@uiw/react-codemirror'
import { python } from '@codemirror/lang-python'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import Terminal from '../components/Terminal'
import AIAssistant from '../components/AIAssistant'
import WindowControls from '../components/WindowControls'
import { getModule } from '../content/loader'
import { parseMarkdown } from '../utils/markdown'
import { useProfile } from '../contexts/ProfileContext'
import { askOllama } from '../utils/ollama'
import contentIndex from '../content/index.json'

const STATUS = { idle: 'idle', running: 'running', success: 'success', error: 'error' }
const SENTINEL_PREFIX = '__SL_DONE_'

const LANG_COLORS = { bash: '#22d3ee', python: '#f59e0b', powershell: '#6366f1', kql: '#e879f9', sql: '#34d399', regex: '#fb923c', git: '#60a5fa', spl: '#a78bfa', yaml: '#facc15' }
const LANG_LABELS = { bash: 'Bash', python: 'Python', powershell: 'PowerShell', kql: 'KQL', sql: 'SQL', regex: 'Regex', git: 'Git', spl: 'SPL', yaml: 'YAML' }
const STATIC_LANGS = ['kql', 'sql', 'spl', 'regex', 'git', 'yaml']

const KQL_REFERENCE = `Tables fréquentes
─────────────────
SecurityEvent   → logs Windows (EventID 4625, 4624…)
SigninLogs      → connexions Azure AD
Syslog          → logs Linux (auth, daemon…)
DnsEvents       → requêtes DNS
AuditLogs       → Azure AD audit
SecurityAlert   → alertes Defender / Sentinel

Structure
─────────────────
Table
| where TimeGenerated > ago(24h)
| where EventID == 4625
| project TimeGenerated, Computer, Account
| extend Col = expression
| summarize Count=count() by IpAddress
| sort by Count desc
| take 100

Fonctions utiles
─────────────────
ago(1h) / ago(7d) / ago(30m)
bin(TimeGenerated, 1h)        regrouper par intervalles
hourofday(TimeGenerated)       heure 0-23
dayofweek(TimeGenerated)       jour 0-6
strlen(col) / extract(regex, n, col)
make_set(col)                 liste unique
dcount(col)                   nb valeurs distinctes
has  / has_any / !in / contains

let threshold = 10;           variable réutilisable
join kind=inner (...)         jointure entre tables
  on $left.Col == $right.Col
render timechart               graphique temporel`

const SQL_REFERENCE = `Syntaxe de base
─────────────────
SELECT col1, col2 FROM table;
SELECT * FROM table;
SELECT DISTINCT col FROM table;
SELECT col AS alias FROM table;
SELECT * FROM table LIMIT 10;

Filtrage & Tri
─────────────────
WHERE col = 'valeur'
WHERE col > 100 AND col2 = 'x'
WHERE col BETWEEN 10 AND 50
WHERE col LIKE 'A%'          % = joker
WHERE col IN ('a', 'b', 'c')
WHERE col IS NULL
ORDER BY col ASC / DESC

Agrégations
─────────────────
COUNT(*)        nb de lignes
SUM(col)        somme
AVG(col)        moyenne
MAX(col) / MIN(col)
GROUP BY col
HAVING COUNT(*) > 5    (filtre sur groupe)

Jointures
─────────────────
INNER JOIN table2 ON t1.id = t2.fk
LEFT JOIN  → toutes les lignes de gauche
RIGHT JOIN → toutes les lignes de droite

Sous-requêtes & Vues
─────────────────
WHERE salary > (SELECT AVG(salary) FROM ...)
WHERE id IN (SELECT id FROM ...)
WHERE EXISTS (SELECT 1 FROM ... WHERE ...)
CREATE VIEW vue AS SELECT ...`

const REGEX_REFERENCE = `Métacaractères
─────────────────
.       n'importe quel caractère
\\d      chiffre  [0-9]
\\w      mot      [a-zA-Z0-9_]
\\s      espace blanc
\\D \\W \\S   inverses des précédents
[abc]   a, b ou c
[a-z]   minuscule
[^abc]  tout sauf a, b, c

Quantificateurs
─────────────────
*       0 ou plus (greedy)
+       1 ou plus
?       0 ou 1 (optionnel)
{n}     exactement n fois
{n,m}   entre n et m fois
*? +?   lazy (minimum)

Ancres
─────────────────
^       début de chaîne
$       fin de chaîne
\\b      word boundary

Groupes
─────────────────
(...)         groupe capturant
(?:...)       non-capturant
(?P<nom>...)  groupe nommé
(?=...)       lookahead positif
(?!...)       lookahead négatif
(?<=...)      lookbehind positif

Fonctions Python re
─────────────────
re.search(r'pat', s)     1er match
re.findall(r'pat', s)    liste des matchs
re.sub(r'pat', repl, s)  remplacer
re.split(r'pat', s)      découper
re.fullmatch(r'pat', s)  match total
re.compile(r'pat')       compiler`

const GIT_REFERENCE = `Dépôt local
─────────────────
git init                 initialiser
git status               état des fichiers
git add .               tout stager
git add fichier.txt      stager un fichier
git commit -m "msg"      commiter
git log --oneline        historique court
git diff                 changements non stagés

Branches
─────────────────
git branch               lister
git branch nom           créer
git switch nom           basculer
git switch -c nom        créer + basculer
git merge branche        fusionner
git branch -d nom        supprimer (fusionnée)
git log --graph --all    graphe des branches

Remote
─────────────────
git clone URL            cloner
git remote -v            voir les remotes
git push origin main     pousser
git push -u origin nom   push + tracking
git pull                 récupérer + merge
git fetch origin         récupérer seulement
git push origin --delete nom  supprimer remote

Avancé
─────────────────
git stash               mettre en pause
git stash pop           restaurer
git tag -a v1.0 -m ""   créer un tag
git rebase main         rebaser
git reset --soft HEAD~1  annuler commit (keep)
git reset --hard HEAD~1  annuler (DESTRUCTIF)
git revert abc123        annuler proprement
git cherry-pick abc123   copier un commit`

const SPL_REFERENCE = `Recherche de base
─────────────────
index=main
index=security sourcetype=wineventlog
index=web host=server01 status=404

Commandes fondamentales
─────────────────
| head 10 / | tail 10
| fields host, user, EventCode
| fields -_raw              (exclure)
| table col1, col2
| rename EventCode AS code
| sort -count               (décroissant)
| dedup user                (dédoublonner)

Filtrage
─────────────────
| where EventCode=4625
| where user!="SYSTEM"
| search "error" OR "failed"

Transformation
─────────────────
| eval statut = if(code<400, "OK", "ERR")
| eval ts = strftime(_time, "%Y-%m-%d")
| rex field=_raw "src=(?P<ip>[\\d.]+)"

Statistiques
─────────────────
| stats count BY user
| stats count, dc(host) AS hotes
| stats avg(duration) BY host
| top 10 src_ip
| rare user
| timechart span=1h count
| chart count BY host, EventCode

EventCodes Windows
─────────────────
4624  Connexion réussie
4625  Échec de connexion
4648  Connexion avec credentials explicites
4768  Ticket Kerberos TGT demandé
4769  Ticket Kerberos service demandé
4776  Auth NTLM tentée`

const YAML_REFERENCE = `Syntaxe de base
─────────────────
clé: valeur
nom: Alice
age: 30
actif: true
prix: 19.99
vide: null
# commentaire

Listes
─────────────────
items:
  - nginx
  - postgresql
  - redis
# inline
tags: [web, api, v2]

Mappings imbriqués
─────────────────
server:
  host: localhost
  port: 8080
  tls:
    enabled: true

Listes de mappings
─────────────────
services:
  - name: web
    port: 80
  - name: db
    port: 5432

Chaînes multi-lignes
─────────────────
# Littéral | — conserve les sauts de ligne
script: |
  apt update
  apt install nginx

# Replié > — fusionne les lignes
description: >
  Texte long sur
  plusieurs lignes.

Ancres & Alias
─────────────────
defaults: &defaults
  timeout: 30
  retries: 3

production:
  <<: *defaults    # merge key
  timeout: 5       # override

Multi-documents
─────────────────
---
kind: ConfigMap
metadata:
  name: app-config
---
kind: Service
metadata:
  name: app-svc

Types explicites
─────────────────
port: !!int "8080"
version: !!str 1.0
enabled: "true"    # string
version: "3.9"     # string`

function getStaticReference(lang) {
  if (lang === 'kql') return KQL_REFERENCE
  if (lang === 'sql') return SQL_REFERENCE
  if (lang === 'regex') return REGEX_REFERENCE
  if (lang === 'git') return GIT_REFERENCE
  if (lang === 'spl') return SPL_REFERENCE
  if (lang === 'yaml') return YAML_REFERENCE
  return ''
}

function stripAnsi(str) {
  return str.replace(/\x1b\[[^A-Za-z]*[A-Za-z]/g, '').replace(/\r/g, '')
}

function findNextModule(currentLang, currentLevelId, currentModuleId) {
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

// Choisit l'extension CodeMirror selon le langage
function getLangExtension(lang) {
  if (lang === 'python') return python()
  if (lang === 'bash' || lang === 'powershell') return StreamLanguage.define(shell)
  return []
}

const cmTheme = EditorView.theme({
  '&': { fontSize: '13px', backgroundColor: '#0d0f16' },
  '.cm-content': { padding: '8px', fontFamily: "'Fira Code', 'Cascadia Code', monospace" },
  '.cm-focused': { outline: 'none' },
  '.cm-editor': { borderRadius: '0' },
  '.cm-scroller': { fontFamily: "'Fira Code', 'Cascadia Code', monospace" },
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

  const [code, setCode] = useState('')
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

  const outputBuffer = useRef('')
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

  const nextModule = useMemo(() => findNextModule(lang, level, moduleId), [lang, level, moduleId])

  // Charger le brouillon au montage de l'exercice
  useEffect(() => {
    if (!profile || !exercise) return
    window.electronAPI.store.getDraft(profile.id, draftKey).then(draft => {
      if (draft) {
        setCode(draft)
      } else if (isDebug && exercise.buggyCode) {
        setCode(exercise.buggyCode)
      }
      setDraftLoaded(true)
    })
  }, [profile?.id, moduleId, exerciseIndex])

  // Sauvegarder le brouillon à chaque modification (avec debounce)
  const saveTimeout = useRef(null)
  useEffect(() => {
    if (!profile || !draftLoaded || status === STATUS.success) return
    clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      if (code.trim()) {
        window.electronAPI.store.saveDraft(profile.id, draftKey, code)
      }
    }, 800)
    return () => clearTimeout(saveTimeout.current)
  }, [code, profile?.id, draftLoaded, status])

  // Écouter la sortie terminal
  useEffect(() => {
    const cleanup = window.electronAPI.terminal.onData(({ id, chunk }) => {
      if (id === termId) outputBuffer.current += chunk
    })
    return cleanup
  }, [termId])

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
    outputBuffer.current = ''
  }, [moduleId, exerciseIndex])

  // Charger la note
  useEffect(() => {
    if (!profile || !noteKey) return
    window.electronAPI.store.getNote(profile.id, noteKey).then(n => setNoteText(n ?? ''))
  }, [profile?.id, noteKey])

  // Sauvegarder la note (debounce)
  const noteTimeout = useRef(null)
  useEffect(() => {
    if (!profile || !noteKey) return
    clearTimeout(noteTimeout.current)
    noteTimeout.current = setTimeout(() => {
      window.electronAPI.store.saveNote(profile.id, noteKey, noteText)
    }, 800)
    return () => clearTimeout(noteTimeout.current)
  }, [noteText, profile?.id, noteKey])

  // Raccourcis clavier globaux
  useEffect(() => {
    const handler = (e) => {
      if (e.ctrlKey && e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) { handleValidate() } else { handleRun() }
      }
      if (e.ctrlKey && e.key === 'r') {
        e.preventDefault()
        reset()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  })

  // Resize du panneau gauche
  const startDrag = useCallback((e) => {
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartW.current = panelWidth
    e.preventDefault()
  }, [panelWidth])

  useEffect(() => {
    const onMove = (e) => {
      if (!isDragging.current) return
      const delta = e.clientX - dragStartX.current
      const newW = Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, dragStartW.current + delta))
      setPanelWidth(newW)
    }
    const onUp = () => { isDragging.current = false }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [])

  if (!module || !exercise) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f1117]">
        <p className="text-slate-400">Exercice introuvable.</p>
      </div>
    )
  }

  const handleRun = () => {
    if (!code.trim() || isStaticLang) return
    outputBuffer.current = ''
    window.electronAPI.terminal.write({ id: termId, data: code + '\r' })
    setStatus(STATUS.idle)
    setFeedback(null)
  }

  const validateStatic = async () => {
    const trimmed = code.trim()
    if (!trimmed || status === STATUS.running) return
    setStatus(STATUS.running)
    setFeedback(null)
    await new Promise(r => setTimeout(r, 250))
    const lowerQuery = trimmed.toLowerCase()
    const requiredTable = exercise.requiredTable ?? ''
    const requiredKeywords = exercise.requiredKeywords ?? []
    let isCorrect = true
    if (requiredTable && !lowerQuery.includes(requiredTable.toLowerCase())) isCorrect = false
    if (isCorrect) {
      for (const kw of requiredKeywords) {
        if (!lowerQuery.includes(kw.toLowerCase())) { isCorrect = false; break }
      }
    }
    finalize(isCorrect, trimmed)
  }

  const validate = async () => {
    if (isStaticLang) return validateStatic()
    const trimmed = code.trim()
    if (!trimmed || status === STATUS.running) return
    setStatus(STATUS.running)
    setFeedback(null)
    const sentinelId = Date.now()
    const sentinel = `${SENTINEL_PREFIX}${sentinelId}__`
    const sentinelCmd = lang === 'powershell'
      ? `Write-Host "${sentinel}"`
      : lang === 'python'
      ? `print("${sentinel}")`
      : `echo "${sentinel}"`
    outputBuffer.current = ''
    window.electronAPI.terminal.write({ id: termId, data: trimmed + '\r' })
    await new Promise(r => setTimeout(r, 80))
    if (lang === 'python') {
      window.electronAPI.terminal.write({ id: termId, data: '\r' })
      await new Promise(r => setTimeout(r, 50))
    }
    window.electronAPI.terminal.write({ id: termId, data: sentinelCmd + '\r' })
    const maxWait = 20000
    const pollInterval = 120
    let elapsed = 0
    while (elapsed < maxWait) {
      if (stripAnsi(outputBuffer.current).includes(sentinel)) break
      await new Promise(r => setTimeout(r, pollInterval))
      elapsed += pollInterval
    }
    const cleanOutput = stripAnsi(outputBuffer.current)
    let isCorrect = false
    if (exercise.validationType === 'output_nonempty') {
      // Validation simple : le code n'est pas vide (exercices de type "exécute quelque chose")
      isCorrect = trimmed.length > 0
    } else {
      // Validation par correspondance : la sortie RÉELLE du terminal doit contenir l'attendu.
      // IMPORTANT : on NE vérifie PAS le code source (trimmed) comme fallback.
      // Ce fallback créait des faux positifs : si l'expectedOutput apparaît dans le code écrit
      // (ex: echo "$USER"), l'exercice était marqué correct sans que la commande ait produit
      // la bonne sortie. On valide uniquement sur ce que le terminal a réellement affiché.
      isCorrect = cleanOutput.toLowerCase().includes(exercise.expectedOutput.toLowerCase())
    }
    finalize(isCorrect, trimmed)
  }

  const finalize = (isCorrect, trimmed) => {
    if (isCorrect) {
      setStatus(STATUS.success)
      setFeedback({ type: 'success', title: 'Correct !', body: exercise.explanation, aiBody: null })
      if (profile) window.electronAPI.store.markExerciseDone(profile.id, exercise.id)
      // Supprimer le brouillon une fois réussi
      if (profile) window.electronAPI.store.deleteDraft(profile.id, draftKey)
      if (isLast) setTimeout(() => setShowCompletion(true), 900)
    } else {
      setStatus(STATUS.error)
      const errorBody = isStaticLang
        ? `Vérifiez ${exercise.requiredTable ? `la table/source (\`${exercise.requiredTable}\`) et ` : ''}les mots-clés requis.`
        : `Résultat attendu : \`${exercise.expectedOutput}\`\n\nVérifiez votre commande et réessayez.`
      setFeedback({ type: 'error', title: 'Pas tout à fait…', body: errorBody, aiBody: null })
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

  // Alias pour les raccourcis clavier
  const handleValidate = validate

  const reset = () => {
    setCode(isDebug && exercise.buggyCode ? exercise.buggyCode : '')
    setStatus(STATUS.idle)
    setFeedback(null)
    setShowCorrection(false)
    setShowCompletion(false)
    if (!isStaticLang) {
      const clearCmd = lang === 'powershell' ? 'Clear-Host\r'
        : lang === 'python' ? 'import os; os.system("cls")\r'
        : 'clear\r'
      window.electronAPI.terminal.write({ id: termId, data: clearCmd })
    }
  }

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
    <div className="flex flex-col h-screen bg-[#0f1117]">
      {/* Écran de complétion */}
      {showCompletion && (
        <div className="absolute inset-0 z-50 bg-[#0f1117]/95 flex items-center justify-center">
          <div className="bg-[#1a1d2e] border border-[#2d3748] rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="text-white text-2xl font-bold mb-2">Module terminé !</h2>
            <p className="text-slate-400 text-sm mb-1">{module.title}</p>
            {moduleProgress && (
              <p className="text-[#6366f1] font-semibold text-lg mt-3 mb-6">
                {moduleProgress.done} / {moduleProgress.total} exercices réussis
              </p>
            )}
            <div className="flex flex-col gap-3">
              {nextModule && (
                <button
                  onClick={() => navigate(`/course/${nextModule.lang}/${nextModule.levelId}/${nextModule.ref.id}`)}
                  className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white py-3 rounded-xl font-medium transition-colors"
                >
                  Module suivant : {nextModule.ref.title} →
                </button>
              )}
              <button onClick={() => navigate('/app/courses')}
                className="w-full bg-[#232640] hover:bg-[#2d3258] text-slate-300 py-3 rounded-xl transition-colors">
                Retour aux cours
              </button>
              <button onClick={() => setShowCompletion(false)}
                className="text-slate-500 hover:text-slate-300 text-sm transition-colors">
                Rester sur cet exercice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre du haut */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-[#1a1d2e] border-b border-[#2d3748] flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
          <button onClick={() => navigate('/app/courses')} className="text-slate-400 hover:text-white transition-colors text-sm">← Menu</button>
          <div className="w-px h-4 bg-[#2d3748]" />
          <button onClick={() => navigate(`/course/${lang}/${level}/${moduleId}`)} className="text-slate-400 hover:text-white transition-colors text-sm">Cours</button>
          <div className="w-px h-4 bg-[#2d3748]" />
          {isBoss && <span className="text-amber-400 text-xs font-bold uppercase tracking-wider">👑 Boss</span>}
          {isDebug && <span className="text-orange-400 text-xs font-bold uppercase tracking-wider">🐛 Débogage</span>}
          {!isBoss && !isDebug && <span className="text-slate-400 text-xs uppercase tracking-widest">Exercice</span>}
          <div className="w-px h-4 bg-[#2d3748]" />
          <h1 className="text-white font-medium text-sm truncate max-w-[200px]">{exercise.title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
          <div className="flex items-center gap-1.5">
            {module.exercises.map((_, i) => (
              <div key={i} className={`w-1.5 h-1.5 rounded-full transition-colors ${
                i < exIdx ? 'bg-[#6366f1]' : i === exIdx ? 'bg-white' : 'bg-[#374151]'
              }`} />
            ))}
          </div>
          <span className="text-slate-500 text-xs font-medium">{exIdx + 1} / {totalExercises}</span>
          <span className={`text-xs px-2 py-0.5 rounded font-medium`}
            style={{ backgroundColor: `${langAccent}20`, color: langAccent }}>
            {langLabel}
          </span>
          <button
            onClick={() => setShowAI(v => !v)}
            title="Assistant IA (Ctrl+I)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              showAI ? 'bg-[#6366f1] text-white' : 'bg-[#232640] text-slate-400 hover:text-white hover:bg-[#2d3258]'
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
        <div className="flex flex-col border-r border-[#2d3748] flex-shrink-0" style={{ width: panelWidth }}>
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
          <div className="p-5 border-b border-[#2d3748] overflow-y-auto flex-shrink-0 max-h-[32%]">
            <h2 className="text-white font-semibold mb-3">Instructions</h2>
            <div className="text-slate-300 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(exercise.instructions) }} />
            {!isBoss && exercise.hint && (
              <details className="mt-3">
                <summary className="text-slate-500 text-xs cursor-pointer hover:text-slate-300 transition-colors select-none">
                  💡 Afficher un indice
                </summary>
                <p className="text-slate-400 text-xs mt-1.5 pl-3 border-l border-[#2d3748]">{exercise.hint}</p>
              </details>
            )}
          </div>

          {/* Zone scrollable : éditeur + feedback + correction */}
          <div className="flex-1 overflow-y-auto min-h-0 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between flex-shrink-0">
              <span className="text-slate-400 text-xs uppercase tracking-widest">
                {isDebug ? 'Code à déboguer' : 'Votre script'}
              </span>
              <button onClick={reset} className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
                Réinitialiser
              </button>
            </div>

            {/* Éditeur CodeMirror */}
            <div className={`rounded-lg overflow-hidden border flex-shrink-0 border-[#2d3748] transition-colors`}
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

            {/* Feedback */}
            {feedback && (
              <div className={`rounded-lg p-3 text-sm border flex-shrink-0 ${
                feedback.type === 'success'
                  ? 'bg-green-500/10 border-green-500/30 text-green-300'
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
              <div className="bg-[#0d0f16] border border-[#2d3748] rounded-lg p-3 flex-shrink-0">
                <p className="text-slate-400 text-xs mb-2 uppercase tracking-widest">Correction</p>
                <pre className="text-[#4ade80] text-sm font-mono mb-2 whitespace-pre-wrap overflow-x-auto">{exercise.correction}</pre>
                <div className="text-slate-400 text-xs leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(exercise.explanation) }} />
              </div>
            )}
          </div>

          {/* Notes personnelles */}
          <div className="flex-shrink-0 border-t border-[#2d3748] px-4 pt-2 pb-1">
            <button
              onClick={() => setShowNote(v => !v)}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5"
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
                className="w-full mt-2 bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-xs text-slate-300 resize-none focus:outline-none focus:border-[#6366f1] transition-colors leading-relaxed"
              />
            )}
          </div>

          {/* Boutons */}
          <div className="flex-shrink-0 p-4 pt-3 border-t border-[#2d3748] flex flex-col gap-2">
            <div className="text-slate-600 text-[10px] mb-1">
              Ctrl+↵ Exécuter · Ctrl+Shift+↵ Valider · Ctrl+R Reset
            </div>
            <div className="flex gap-2">
              {!isStaticLang && (
                <button onClick={handleRun}
                  className="flex-1 bg-[#232640] hover:bg-[#2d3258] text-slate-300 text-sm py-2 rounded-lg transition-colors font-medium">
                  ▶ Exécuter
                </button>
              )}
              <button
                onClick={validate}
                disabled={status === STATUS.running}
                className="flex-1 disabled:opacity-60 text-white text-sm py-2 rounded-lg transition-colors font-medium"
                style={{ backgroundColor: isStaticLang ? `${langAccent}cc` : '#6366f1' }}
              >
                {status === STATUS.running ? '⏳ Validation…' : isStaticLang ? '✓ Valider' : '✓ Valider'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              {!isBoss ? (
                <button onClick={() => setShowCorrection(v => !v)}
                  className="text-slate-500 hover:text-slate-300 text-xs transition-colors">
                  {showCorrection ? 'Masquer' : 'Voir'} la correction
                </button>
              ) : (
                <span className="text-amber-600 text-xs">Pas de correction pour les boss</span>
              )}
              <div className="flex gap-3">
                <button onClick={goPrev} className="text-slate-500 hover:text-slate-300 text-xs transition-colors">← Préc.</button>
                <button
                  onClick={status === STATUS.success && isLast ? () => setShowCompletion(true) : goNext}
                  className={`text-xs font-medium transition-colors ${
                    status === STATUS.success ? 'text-[#6366f1] hover:text-[#4f46e5]' : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {isLast ? (status === STATUS.success ? 'Terminer ✓' : 'Terminer') : 'Suiv. →'}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Séparateur draggable */}
        <div
          onMouseDown={startDrag}
          className="w-1 bg-[#2d3748] hover:bg-[#6366f1] cursor-col-resize flex-shrink-0 transition-colors"
          title="Redimensionner"
        />

        {/* Terminal ou référence (langages statiques) */}
        <div className="flex flex-col overflow-hidden flex-1">
          <div className="flex items-center gap-2 px-4 py-2 bg-[#1a1d2e] border-b border-[#2d3748] flex-shrink-0">
            <div className="flex gap-1.5">
              {isStaticLang ? (
                <><div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${langAccent}99` }}/><div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${langAccent}50` }}/><div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${langAccent}25` }}/></>
              ) : (
                <><div className="w-3 h-3 rounded-full bg-red-500/70"/><div className="w-3 h-3 rounded-full bg-yellow-500/70"/><div className="w-3 h-3 rounded-full bg-green-500/70"/></>
              )}
            </div>
            <span className="text-slate-500 text-xs ml-2">
              {isStaticLang
                ? `Référence ${langLabel}`
                : lang === 'powershell' ? 'Windows PowerShell' : lang === 'python' ? 'Python' : 'Bash (WSL)'}
            </span>
            {!isStaticLang && status === STATUS.running && <span className="ml-auto text-slate-500 text-xs animate-pulse">en cours…</span>}
            {isStaticLang && <span className="ml-auto text-xs opacity-40" style={{ color: langAccent }}>{langLabel}</span>}
          </div>
          <div className="flex-1 overflow-hidden bg-[#0d0f16]">
            {isStaticLang ? (
              <pre className="h-full overflow-y-auto p-5 text-xs font-mono text-slate-400 leading-relaxed whitespace-pre">{getStaticReference(lang)}</pre>
            ) : (
              <Terminal id={termId} shell={lang} className="h-full" />
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
