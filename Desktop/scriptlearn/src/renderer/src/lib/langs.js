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

// Retire les séquences ANSI (couleurs xterm) et les \r pour comparer la sortie
// réelle au résultat attendu sans être pollué par les codes d'échappement.
export function stripAnsi(str) {
  return str.replace(/\x1b\[[^A-Za-z]*[A-Za-z]/g, '').replace(/\r/g, '')
}

// LANG_META : description de chaque langage.
//  - label    : nom affiché
//  - color    : couleur d'accent (badges, points, barres)
//  - static   : true => validation par mots-clés, pas d'exécution terminal
//  - exec     : stratégie d'exécution (voir buildRunData) — absent si static
//  - termShell: quel shell la session Terminal doit lancer pour ce langage
//               (les langages compilés tournent dans la session bash WSL)
export const LANG_META = {
  bash:       { label: 'Bash',       color: '#22d3ee', static: false, exec: 'direct',         termShell: 'bash' },
  python:     { label: 'Python',     color: '#f59e0b', static: false, exec: 'direct',         termShell: 'python' },
  // JavaScript / TypeScript : exécutés par Node NATIF (Windows), comme Python —
  // pas via WSL. Node 24 exécute aussi le TypeScript directement (dépouillement
  // des types), donc TS partage le même interpréteur et le même mode terminal.
  js:         { label: 'JavaScript', color: '#f7df1e', static: false, exec: 'direct',         termShell: 'node' },
  ts:         { label: 'TypeScript', color: '#3178c6', static: false, exec: 'direct',         termShell: 'node' },
  // Go : compilateur EMBARQUÉ dans l'app (resources/go), exécuté nativement —
  // aucune install utilisateur. Pas de REPL : la validation passe par « Valider »
  // (exécution réelle en coulisses). termShell powershell = simple session par défaut.
  go:         { label: 'Go',         color: '#00add8', static: false, exec: 'direct',         termShell: 'powershell' },
  // Rust : compilateur EMBARQUÉ (resources/rust) linké par MinGW. Pas de REPL :
  // validation via « Valider » (compilation + exécution en coulisses).
  rust:       { label: 'Rust',       color: '#dea584', static: false, exec: 'direct',         termShell: 'powershell' },
  powershell: { label: 'PowerShell', color: '#d97706', static: false, exec: 'direct',         termShell: 'powershell' },
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
function heredocWrite(path, code) {
  return `cat > ${path} <<'SLEOF'\n${code}\nSLEOF\n`
}

// buildRunData : construit la chaîne à écrire dans le terminal pour EXÉCUTER le
// code. Le \r final agit comme la touche Entrée (cohérent avec l'exécution PHP
// existante). Toolchains requises côté WSL : gcc, g++, default-jdk (javac/java),
// mono (mcs/mono) — détectées via terminal.toolAvailable.
export function buildRunData(lang, code) {
  const mode = LANG_META[lang]?.exec
  switch (mode) {
    case 'heredoc-php':
      // PHP : heredoc directement vers l'interpréteur php (pas de fichier).
      return `php << 'PHPEOF'\n${code}\nPHPEOF\r`
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

// Installateur « Tout-en-un » : toutes les toolchains sont EMBARQUÉES dans l'app
// (resources/). Plus aucune installation externe requise → table vide, la
// bannière « toolchain manquante » (ToolchainBanner) ne s'affiche jamais.
export const TOOLCHAINS = {}
