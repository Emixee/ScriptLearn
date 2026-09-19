// ============================================================================
// lib/langs.js — Source de vérité UNIQUE pour les langages de ScriptLearn.
//
// POURQUOI ce module : avant, chaque page (Exercise, Sandbox) dupliquait sa
// propre table de couleurs, ses labels, sa liste de langages "statiques" et sa
// fonction getLangExtension. Dès qu'on ajoutait un langage (ici C/C++/C#/Java),
// il fallait modifier plusieurs fichiers et les garder synchronisés — source de
// bugs. On centralise tout ici : Exercise, Sandbox et MissionPlay importent ce
// module. Ajouter un langage = une seule entrée dans LANG_META.
// ============================================================================

import { python } from '@codemirror/lang-python'
import { StreamLanguage } from '@codemirror/language'
import { shell } from '@codemirror/legacy-modes/mode/shell'
// html vit dans le module xml de legacy-modes ; pour PHP on réutilise le mode
// javascript (syntaxe C-like proche). Pour C/C++/C#/Java, le mode "clike" fournit
// des parseurs dédiés (c, cpp, java, csharp) déjà présents dans le package.
import { html as htmlMode } from '@codemirror/legacy-modes/mode/xml'
import { javascript as jsMode } from '@codemirror/legacy-modes/mode/javascript'
import { c as cMode, cpp as cppMode, java as javaMode, csharp as csharpMode } from '@codemirror/legacy-modes/mode/clike'
import { go as goMode } from '@codemirror/legacy-modes/mode/go'
import { rust as rustMode } from '@codemirror/legacy-modes/mode/rust'

// Marqueur de fin d'exécution injecté dans le terminal pour savoir quand la
// sortie d'une commande est complète (voir validate dans useCodeRunner/Exercise).
export const SENTINEL_PREFIX = '__SL_DONE_'

// Marqueur de PROMPT émis par le shell avant chaque invite (mode terminal-auto).
// Terminal.jsx s'en sert pour découper le flux du PTY en blocs « commande → sortie »
// et le RETIRE du flux avant de l'afficher (donc invisible à l'écran).
// IMPORTANT : le marqueur doit être ENTIÈREMENT IMPRIMABLE. ConPTY (le pseudo-terminal
// de Windows utilisé par node-pty) FILTRE les caractères de contrôle C0 (ex. 0x1f) :
// un marqueur à base de 0x1f n'arrive jamais intact côté renderer. On prend donc un
// jeton ASCII imprimable, long et distinctif, qui n'apparaît pas dans une sortie réelle.
// IMPORTANT : cette constante est DUPLIQUÉE dans src/main/terminal.js (le main ESM et
// le renderer ne peuvent pas s'importer mutuellement) — toute modification doit être
// répercutée aux deux endroits.
export const PROMPT_MARKER = '__SLPROMPTMARK__'

// Retire les séquences d'échappement ANSI et les \r pour comparer la sortie réelle
// au résultat attendu sans être pollué par les codes d'échappement.
// Trois familles sont traitées, et pas seulement la première :
//   1. CSI  : \x1b[…m  → couleurs, déplacements de curseur
//   2. OSC  : \x1b]0;titre\x07 → le prompt de MSYS2 en émet à CHAQUE invite (titre
//             de la fenêtre) ; sans ce nettoyage, ce texte se retrouvait dans la
//             sortie comparée par matchesExpected et dans l'aperçu PHP.
//   3. deux caractères : \x1b(B → jeu de caractères, émis par certains programmes.
export function stripAnsi(str) {
  return String(str)
    .replace(/\x1b\[[^A-Za-z]*[A-Za-z]/g, '')
    .replace(/\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)/g, '')
    .replace(/\x1b[()][0-9A-Za-z]/g, '')
    .replace(/\r/g, '')
}

// LANG_META : description de chaque langage.
//  - label    : nom affiché
//  - color    : couleur d'accent (badges, points, barres)
//  - static   : true => validation par mots-clés, pas d'exécution terminal
//  - exec     : stratégie d'exécution (voir buildRunData) — absent si static
//  - termShell: quel shell la session Terminal doit lancer pour ce langage
//               (les langages compilés tournent dans la session bash MSYS2)
//  - repl     : true => shell/REPL interactif où l'on TAPE directement les
//               commandes. Ces langages basculent en « terminal-auto » (cours +
//               missions) : plus d'éditeur, validation automatique sur la sortie
//               réelle du terminal (voir isRepl + Terminal.jsx onOutput). Les
//               compilés/PHP/statiques n'ont pas de frappe interactive naturelle.
export const LANG_META = {
  bash:       { label: 'Bash',       color: '#22d3ee', static: false, exec: 'direct',         termShell: 'bash',       repl: true },
  python:     { label: 'Python',     color: '#f59e0b', static: false, exec: 'direct',         termShell: 'python',     repl: true },
  // JavaScript / TypeScript : exécutés par Node NATIF (Windows), comme Python —
  // pas via WSL. Node 24 exécute aussi le TypeScript directement (dépouillement
  // des types), donc TS partage le même interpréteur et le même mode terminal.
  // NB : js/ts ne sont PAS marqués repl. Le REPL Node (`node -i`) n'offre ni hook
  // pré-exécution (type PS0/PROMPT_COMMAND) ni invite non ambiguë (`> ` se confond
  // avec la sortie) → impossible d'isoler proprement la sortie réelle. Ils restent
  // donc en mode éditeur + validation en coulisses.
  js:         { label: 'JavaScript', color: '#f7df1e', static: false, exec: 'direct',         termShell: 'node' },
  ts:         { label: 'TypeScript', color: '#3178c6', static: false, exec: 'direct',         termShell: 'node' },
  // Go : compilateur EMBARQUÉ dans l'app (resources/go), exécuté nativement —
  // aucune install utilisateur. Pas de REPL : la validation passe par « Valider »
  // (exécution réelle en coulisses). termShell powershell = simple session par défaut.
  go:         { label: 'Go',         color: '#00add8', static: false, exec: 'direct',         termShell: 'powershell' },
  // Rust : compilateur EMBARQUÉ (resources/rust) linké par MinGW. Pas de REPL :
  // validation via « Valider » (compilation + exécution en coulisses).
  rust:       { label: 'Rust',       color: '#dea584', static: false, exec: 'direct',         termShell: 'powershell' },
  powershell: { label: 'PowerShell', color: '#d97706', static: false, exec: 'direct',         termShell: 'powershell', repl: true },
  php:        { label: 'PHP',        color: '#8892bf', static: false, exec: 'heredoc-php',     termShell: 'bash' },
  c:          { label: 'C',          color: '#a8b9cc', static: false, exec: 'compile-c',       termShell: 'bash' },
  cpp:        { label: 'C++',        color: '#00599c', static: false, exec: 'compile-cpp',     termShell: 'bash' },
  csharp:     { label: 'C#',         color: '#178600', static: false, exec: 'compile-csharp',  termShell: 'bash' },
  java:       { label: 'Java',       color: '#b07219', static: false, exec: 'compile-java',    termShell: 'bash' },
  kql:        { label: 'KQL',        color: '#e879f9', static: true },
  sql:        { label: 'SQL',        color: '#34d399', static: true },
  regex:      { label: 'Regex',      color: '#fb923c', static: true },
  git:        { label: 'Git',        color: '#60a5fa', static: true },
  spl:        { label: 'SPL',        color: '#a78bfa', static: true },
  yaml:       { label: 'YAML',       color: '#facc15', static: true },
  html:       { label: 'HTML',       color: '#e34c26', static: true },
}

// Tables dérivées de LANG_META — pratique pour les composants existants qui
// indexaient par langage (rétrocompatibilité avec l'ancien code).
export const LANG_COLORS = Object.fromEntries(Object.entries(LANG_META).map(([k, v]) => [k, v.color]))
export const LANG_LABELS = Object.fromEntries(Object.entries(LANG_META).map(([k, v]) => [k, v.label]))
export const STATIC_LANGS = Object.keys(LANG_META).filter(k => LANG_META[k].static)

export const isStatic = (lang) => !!LANG_META[lang]?.static
// Langage à shell/REPL interactif : l'élève tape directement ses commandes dans
// le terminal, qui devient la source de vérité de la validation (mode terminal-auto).
export const isRepl = (lang) => !!LANG_META[lang]?.repl
// Quel shell ouvrir dans le composant Terminal pour ce langage.
// Les langages compilés et PHP s'exécutent dans bash (WSL) ; les autres gardent
// leur propre interpréteur. Fallback = le langage lui-même (Terminal.jsx route
// tout ce qui n'est ni powershell ni python vers bash WSL de toute façon).
export const termShellFor = (lang) => LANG_META[lang]?.termShell ?? lang

// Extension CodeMirror (coloration syntaxique) pour le langage donné.
export function getLangExtension(lang) {
  if (lang === 'python') return python()
  if (lang === 'bash' || lang === 'powershell') return StreamLanguage.define(shell)
  if (lang === 'html')   return StreamLanguage.define(htmlMode)
  if (lang === 'js')     return StreamLanguage.define(jsMode)
  if (lang === 'ts')     return StreamLanguage.define(jsMode)
  if (lang === 'go')     return StreamLanguage.define(goMode)
  if (lang === 'rust')   return StreamLanguage.define(rustMode)
  if (lang === 'php')    return StreamLanguage.define(jsMode)
  if (lang === 'c')      return StreamLanguage.define(cMode)
  if (lang === 'cpp')    return StreamLanguage.define(cppMode)
  if (lang === 'csharp') return StreamLanguage.define(csharpMode)
  if (lang === 'java')   return StreamLanguage.define(javaMode)
  return []
}

// Écrit le code source dans un fichier temporaire WSL via un heredoc bash.
// Le délimiteur 'SLEOF' en single-quotes empêche bash d'interpréter les
// variables ($x), les backticks et autres caractères spéciaux du code source
// avant que le compilateur ne les voie. Les lignes internes sont séparées par
// \n ; la commande suivante (compilation) est concaténée par l'appelant.
// Délimiteur UNIQUE par exécution.
// POURQUOI : avec un délimiteur fixe (« SLEOF », « PHPEOF »), un code contenant
// une ligne valant exactement ce mot fermait le heredoc trop tôt et le reste du
// code partait comme commandes shell — comportement incompréhensible pour l'élève.
function uniqueEof(prefix) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8).toUpperCase()}`
}

function heredocWrite(path, code) {
  const eof = uniqueEof('SLEOF')
  return `cat > ${path} <<'${eof}'\n${code}\n${eof}\n`
}

// buildRunData : construit la chaîne à écrire dans le terminal pour EXÉCUTER le
// code. Le \r final agit comme la touche Entrée (cohérent avec l'exécution PHP
// existante). Toolchains requises côté WSL : gcc, g++, default-jdk (javac/java),
// mono (mcs/mono) — détectées via terminal.toolAvailable.
export function buildRunData(lang, code) {
  const mode = LANG_META[lang]?.exec
  switch (mode) {
    case 'heredoc-php': {
      // PHP : heredoc directement vers l'interpréteur php (pas de fichier).
      const eof = uniqueEof('PHPEOF')
      return `php << '${eof}'\n${code}\n${eof}\r`
    }
    case 'compile-c':
      return heredocWrite('/tmp/sl.c', code) + 'gcc /tmp/sl.c -o /tmp/sl_bin 2>&1 && /tmp/sl_bin\r'
    case 'compile-cpp':
      return heredocWrite('/tmp/sl.cpp', code) + 'g++ /tmp/sl.cpp -o /tmp/sl_bin 2>&1 && /tmp/sl_bin\r'
    case 'compile-java':
      // Java impose que la classe publique == nom du fichier. On fige donc le
      // nom d'entrée à Main (les exercices fournissent `public class Main`).
      return heredocWrite('/tmp/Main.java', code) + 'cd /tmp && javac Main.java 2>&1 && java Main\r'
    case 'compile-csharp':
      // Mono (mcs + mono) compile/exécute un .cs autonome sans projet .csproj.
      return heredocWrite('/tmp/Main.cs', code) + 'cd /tmp && mcs Main.cs 2>&1 && mono Main.exe\r'
    default:
      // bash / python / powershell : on envoie le code tel quel.
      return code + '\r'
  }
}

// La commande qui imprime le sentinel, dans la syntaxe de l'interpréteur courant.
// Les langages compilés et PHP repassent par bash après exécution => echo.
export function sentinelCommand(lang, sentinel) {
  if (lang === 'powershell') return `Write-Host "${sentinel}"`
  if (lang === 'python')     return `print("${sentinel}")`
  return `echo "${sentinel}"`
}

// Outils NÉCESSAIRES par langage, pour le diagnostic d'installation.
//
// POURQUOI cette table est de nouveau remplie : depuis que les toolchains sont
// EMBARQUÉES (installateur « Tout-en-un »), elle avait été vidée et
// `terminal.toolAvailable` renvoyait `true` en dur — la bannière
// (components/ToolchainBanner.jsx) ne pouvait donc PLUS JAMAIS s'afficher. Or une
// installation peut être incomplète : ~2,6 Go extraits, un antivirus qui met un
// binaire en quarantaine, un dossier `resources/` déplacé. Dans ce cas, l'élève
// n'avait qu'un « command not found » incompréhensible au milieu du terminal.
// Le processus principal vérifie maintenant la PRÉSENCE RÉELLE du binaire embarqué
// (voir checkToolAvailable dans src/main/terminal.js).
export const TOOLCHAINS = {
  c:      { tools: ['gcc'],           label: 'compilateur C (MinGW)' },
  cpp:    { tools: ['g++'],           label: 'compilateur C++ (MinGW)' },
  java:   { tools: ['javac', 'java'], label: 'JDK (Java)' },
  csharp: { tools: ['csc'],           label: 'compilateur C# (.NET Framework, fourni par Windows)' },
  go:     { tools: ['go'],            label: 'SDK Go' },
  rust:   { tools: ['rustc'],         label: 'compilateur Rust' },
  php:    { tools: ['php'],           label: 'interpréteur PHP' },
  python: { tools: ['python'],        label: 'interpréteur Python' },
  js:     { tools: ['node'],          label: 'runtime Node.js' },
  ts:     { tools: ['node'],          label: 'runtime Node.js' },
}

// ── Mode « nano » : composer un vrai fichier script puis le lancer ────────────
// Les actes Expert (fonctions, classes, boucles/conditions, scripts complets) ne
// se tapent pas naturellement en one-liner. On les fait écrire dans nano (éditeur
// du terminal), sauvegarder, puis lancer avec l'interpréteur. Ces actes tournent
// dans une SESSION BASH (nano + interpréteurs y sont disponibles), quel que soit
// le langage enseigné.

// Nom du fichier script à composer, selon le langage.
export function scriptFileFor(lang) {
  if (lang === 'python') return 'solution.py'
  if (lang === 'powershell') return 'solution.ps1'
  return 'solution.sh' // bash (défaut)
}

// Commande de lancement du script (tapée dans le bash), + arguments éventuels
// (actes « projet » qui reçoivent un argument, ex. `python solution.py III`).
// PowerShell : `-File` est requis — `powershell solution.ps1` (nom nu) n'est PAS
// reconnu par PowerShell ; `-File` lance le script local et transmet ses arguments
// au `param(...)`.
export function scriptRunCmd(lang, file, args) {
  const a = (args && args.length) ? ' ' + args.join(' ') : ''
  if (lang === 'python') return `python ${file}${a}`
  if (lang === 'powershell') return `powershell -File ${file}${a}`
  return `bash ${file}${a}`
}

// Un acte se résout-il en composant un fichier script dans nano ? Vrai pour les
// langages à REPL/shell (bash/python/powershell) au palier Expert. Les actes
// Avancé (pipelines one-liner) et les autres paliers restent en terminal direct.
export function isNanoAct(lang, chapter) {
  return isRepl(lang) && chapter?.tier === 'expert' && chapter?.nano !== false
}
