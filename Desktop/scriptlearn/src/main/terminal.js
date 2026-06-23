import { ipcMain, app } from 'electron'
import { execSync, execFileSync } from 'child_process'
import { existsSync, writeFileSync, rmSync, mkdtempSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { EventEmitter } from 'events'
// node-pty fournit un VRAI pseudo-terminal (PTY). Sans lui (ancien `spawn` à tubes),
// le shell ne voit pas de TTY et readline désactive la complétion Tab, l'historique
// et l'édition de ligne. Module natif : recompilé pour Electron au packaging
// (@electron/rebuild) et embarqué via asarUnpack (binaires .node hors de l'asar).
import nodePty from 'node-pty'

// Installateur « Tout-en-un » : tous les interpréteurs/compilateurs sont EMBARQUÉS
// dans l'app — aucun n'exige WSL ni installation utilisateur. Ces vérifications
// renvoient donc « disponible » (les bannières d'avertissement sont désactivées).
function checkBashAvailable() { return true }
function checkPythonAvailable() { return true }
function checkPhpAvailable() { return true }
function checkToolAvailable() { return true }

const sessions = new Map()
const emitter = new EventEmitter()

// Marqueur de PROMPT invisible, émis par le shell AVANT chaque invite (mode
// terminal-auto). Doit être IDENTIQUE à PROMPT_MARKER dans src/renderer/src/lib/langs.js
// (main ESM et renderer ne peuvent pas s'importer mutuellement → constante dupliquée).
// On émet 0x1f (Unit Separator) — un caractère de contrôle absent d'une sortie
// normale — autour d'un libellé. Terminal.jsx s'en sert pour découper le flux du PTY
// en blocs « commande → sortie » et le RETIRE avant affichage (donc invisible).
const PROMPT_MARKER = '\x1f__SLP__\x1f'

// Crée une session terminal interactive dans un vrai PTY (node-pty).
// cols/rows : taille initiale fournie par xterm (après fit) — le shell s'en sert
// pour le retour à la ligne et l'alignement de la complétion.
function createSession(id, shell, cols = 80, rows = 24) {
  let file, args
  // Variables d'env additionnelles (selon le shell) pour faire émettre le marqueur
  // de prompt. Le marqueur est TOUJOURS émis (et toujours retiré côté renderer) :
  // inoffensif pour les terminaux en mode éditeur, exploité en mode terminal-auto.
  const extraEnv = {}
  // Tous les interpréteurs/compilateurs sont EMBARQUÉS (resources/) — aucun
  // recours à WSL ni à un outil système (hors PowerShell, natif Windows).
  if (shell === 'powershell') {
    file = 'powershell.exe'
    // On (re)définit la fonction `prompt` pour préfixer chaque invite du marqueur.
    // -NoExit garde la session interactive après l'exécution du -Command.
    // [char]0x1f = l'octet du marqueur ; on reconstruit une invite « PS <chemin>> ».
    const psPrompt = 'function prompt { "$([char]0x1f)__SLP__$([char]0x1f)PS $((Get-Location).Path)> " }'
    args = ['-NoLogo', '-NoExit', '-Command', psPrompt]
  } else if (shell === 'python') {
    file = pyBin()
    args = ['-i', '-u']
    // PYTHONSTARTUP : fichier exécuté au lancement du REPL interactif. On y préfixe
    // l'invite primaire (sys.ps1) du marqueur → il précède chaque « >>> ».
    extraEnv.PYTHONSTARTUP = pyStartupFile()
  } else if (shell === 'node') {
    file = nodeBin()
    args = ['-i']
  } else {
    // bash MSYS2 EMBARQUÉ (PortableGit), interactif + login (environnement MSYS).
    file = bashBin()
    args = ['-i', '-l']
    // PROMPT_COMMAND est exécuté par bash AVANT chaque invite. Le prompt MSYS2 est
    // défini via PS1 (jamais via PROMPT_COMMAND, et aucun script d'init de /etc ne
    // le touche) → on peut l'injecter par l'env sans abîmer le joli prompt git.
    // \037 = 0x1f en octal (printf bash l'interprète de façon portable).
    extraEnv.PROMPT_COMMAND = "printf '\\037__SLP__\\037'"
  }

  // PATH augmenté de TOUTES les toolchains embarquées → dans le terminal bash,
  // gcc/g++/javac/java/go/php/node/python sont directement utilisables.
  const toolPath = [
    mingwBinDir(), join(embedRoot('jdk'), 'bin'), join(embedRoot('go'), 'bin'),
    embedRoot('php'), embedRoot('node'), embedRoot('python'),
  ].join(';')

  const proc = nodePty.spawn(file, args, {
    name: 'xterm-256color',
    cols, rows,
    cwd: process.env.USERPROFILE || process.cwd(),
    env: { ...process.env, ...extraEnv, TERM: 'xterm-256color', PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', PATH: toolPath + ';' + (process.env.PATH || '') }
  })

  sessions.set(id, proc)
  // node-pty fusionne stdout/stderr dans un seul flux onData.
  proc.onData((data) => emitter.emit(`data:${id}`, data))
  proc.onExit(() => { sessions.delete(id); emitter.emit(`exit:${id}`) })
  return proc
}

// ── Validation EN COULISSES (one-shot, sans PTY donc sans écho) ──────────────
// POURQUOI : avec un PTY, le shell réaffiche la commande tapée. Si on validait en
// lisant la sortie de la session affichée, l'écho de la commande fausserait la
// comparaison (ex. `echo SESAME` contient déjà « SESAME »). On exécute donc le code
// dans un processus jetable, non affiché : sortie propre et déterministe.

// Exécute un programme et renvoie stdout+stderr quel que soit le code de sortie
// (les erreurs de compilation/exécution sont ainsi visibles). `input` optionnel :
// si fourni, c'est le code passé par stdin ; sinon le programme lit ses propres
// fichiers/arguments (mode « projet »).
function runCapture(fileName, args, input, extraOpts) {
  try {
    // extraOpts permet de surcharger l'environnement (toolchains embarquées) et
    // le timeout (la 1re compilation Go bâtit le cache, plus longue).
    const opts = { timeout: 30000, windowsHide: true, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024, ...extraOpts }
    if (input !== undefined) opts.input = input
    return execFileSync(fileName, args, opts) ?? ''
  } catch (e) {
    return String((e.stdout ?? '') + (e.stderr ?? '')) || String(e.message ?? e)
  }
}

// ── Toolchains NATIVES EMBARQUÉES (installateur « Tout-en-un ») ──────────────
// POURQUOI : pour qu'aucun langage n'exige d'installation externe (ni WSL, ni
// SDK utilisateur), on EMBARQUE les compilateurs/runtimes dans l'app via
// electron-builder `extraResources` (copiés hors-asar dans resources/). En prod
// ils vivent sous process.resourcesPath ; en dev, sous <projet>/resources.
function resourcesRoot() {
  return app.isPackaged ? process.resourcesPath : join(app.getAppPath(), 'resources')
}
// Racine d'une toolchain embarquée (resources/<nom>) et binaires usuels.
function embedRoot(name) {
  return join(resourcesRoot(), name)
}
const nodeBin = () => join(embedRoot('node'), 'node.exe')
const pyBin   = () => join(embedRoot('python'), 'python.exe')
// Fichier de démarrage du REPL Python (PYTHONSTARTUP) : préfixe l'invite primaire
// du marqueur de prompt invisible (voir PROMPT_MARKER) → il précède chaque « >>> ».
// On écrit l'échappement `\x1f` en TEXTE dans le fichier ; c'est Python qui le
// transforme en octet 0x1f, ce qui évite tout souci d'encodage à l'écriture.
function pyStartupFile() {
  const f = join(tmpdir(), 'sl_py_startup.py')
  writeFileSync(f, "import sys\nsys.ps1 = '\\x1f__SLP__\\x1f>>> '\nsys.ps2 = '... '\n", 'utf8')
  return f
}
const phpBin  = () => join(embedRoot('php'), 'php.exe')
const gccBin  = () => join(embedRoot('mingw'), 'bin', 'gcc.exe')
const gppBin  = () => join(embedRoot('mingw'), 'bin', 'g++.exe')
const mingwBinDir = () => join(embedRoot('mingw'), 'bin')
const javacBin = () => join(embedRoot('jdk'), 'bin', 'javac.exe')
const javaBin  = () => join(embedRoot('jdk'), 'bin', 'java.exe')
// Bash MSYS2 + Git EMBARQUÉS (PortableGit) : bash.exe fournit bash + coreutils,
// et `git` est sur le PATH de ce bash (utilisé par la validation Git).
const bashBin  = () => join(embedRoot('git'), 'bin', 'bash.exe')
// Rust EMBARQUÉ (cible windows-gnu) : rustc utilise le linker gcc de MinGW. Le
// PATH doit inclure rust/bin (DLLs de rustc) ET mingw/bin (linker + runtime).
const rustcBin = () => join(embedRoot('rust'), 'bin', 'rustc.exe')
const rustEnv = () => ({ ...process.env, PATH: join(embedRoot('rust'), 'bin') + ';' + mingwBinDir() + ';' + (process.env.PATH || '') })
// C# : compilateur Roslyn/csc INTÉGRÉ à Windows (.NET Framework, toujours présent
// sur Windows 10/11 — comme PowerShell). Aucun embarquement, C# 5. Produit un
// .exe natif exécutable directement.
const cscBin = () => join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe')

// Compile une source vers un .exe puis l'exécute avec ses arguments. Renvoie la
// sortie de compilation si l'exe n'a pas été produit (erreurs visibles).
function compileExeThenRun(compileBin, compileArgs, exe, runArgs, runEnv) {
  try { rmSync(exe, { force: true }) } catch { /* ignore */ }
  const comp = runCapture(compileBin, compileArgs, undefined, { timeout: 60000 })
  if (!existsSync(exe)) return comp || 'Erreur de compilation.'
  return runCapture(exe, runArgs ?? [], undefined, runEnv ? { env: runEnv } : undefined)
}
// Racine du SDK Go embarqué (resources/go).
function goRoot() {
  return embedRoot('go')
}
// Environnement d'exécution Go : GOROOT pointe le SDK embarqué ; GOCACHE/GOPATH
// dans les données utilisateur (écriture interdite dans resources en prod) ;
// GOTOOLCHAIN=local + GOPROXY=off → aucune tentative réseau (100% hors-ligne).
function goEnv() {
  return {
    ...process.env,
    GOROOT: goRoot(),
    GOCACHE: join(app.getPath('userData'), 'gocache'),
    GOPATH: join(app.getPath('userData'), 'gopath'),
    GOTOOLCHAIN: 'local',
    GOPROXY: 'off',
    GOFLAGS: '',
  }
}

// Échappe des arguments pour une ligne de commande bash (single-quotes).
function shArgs(args) {
  if (!args || !args.length) return ''
  return ' ' + args.map(a => `'${String(a).replace(/'/g, `'\\''`)}'`).join(' ')
}

// Construit le script bash one-shot pour les langages de la famille bash (WSL).
// Mode `project` : on écrit un VRAI fichier (le shebang compte) qu'on rend
// exécutable et qu'on lance AVEC ses arguments (`$1`/argv) — apprentissage de
// l'écriture de scripts complets, pas juste de one-liners.
function buildBashScript(lang, code, project, args) {
  const heredoc = (path, c) => `cat > ${path} <<'SLEOF'\n${c}\nSLEOF\n`
  const a = shArgs(args)
  if (project) {
    switch (lang) {
      case 'php':    return heredoc('/tmp/sl_proj.php', code) + `php /tmp/sl_proj.php${a}`
      case 'c':      return heredoc('/tmp/sl.c', code) + `gcc /tmp/sl.c -o /tmp/sl_bin 2>&1 && /tmp/sl_bin${a}`
      case 'cpp':    return heredoc('/tmp/sl.cpp', code) + `g++ /tmp/sl.cpp -o /tmp/sl_bin 2>&1 && /tmp/sl_bin${a}`
      case 'java':   return heredoc('/tmp/Main.java', code) + `cd /tmp && javac Main.java 2>&1 && java Main${a}`
      case 'csharp': return heredoc('/tmp/Main.cs', code) + `cd /tmp && mcs Main.cs 2>&1 && mono Main.exe${a}`
      default:       return heredoc('/tmp/sl_proj.sh', code) + `chmod +x /tmp/sl_proj.sh\n/tmp/sl_proj.sh${a}` // bash
    }
  }
  switch (lang) {
    case 'php':    return `php << 'PHPEOF'\n${code}\nPHPEOF`
    case 'c':      return heredoc('/tmp/sl.c', code) + 'gcc /tmp/sl.c -o /tmp/sl_bin 2>&1 && /tmp/sl_bin'
    case 'cpp':    return heredoc('/tmp/sl.cpp', code) + 'g++ /tmp/sl.cpp -o /tmp/sl_bin 2>&1 && /tmp/sl_bin'
    case 'java':   return heredoc('/tmp/Main.java', code) + 'cd /tmp && javac Main.java 2>&1 && java Main'
    case 'csharp': return heredoc('/tmp/Main.cs', code) + 'cd /tmp && mcs Main.cs 2>&1 && mono Main.exe'
    default:       return code // bash : le code tel quel
  }
}

// ── Validation Git : exécution RÉELLE dans un dépôt jetable (WSL) ───────────
// POURQUOI : valider Git par mots-clés est vide de sens. Ici on exécute les
// commandes de l'élève dans un VRAI dépôt git temporaire, puis on lance des
// commandes d'inspection (« checks ») dont la sortie prouve l'état obtenu
// (nombre de commits, branche courante, fichiers suivis…).
const GIT_SENTINEL = '__SLGITCHK__'

function buildGitScript(commands, checks) {
  // Config git ISOLÉE dans un fichier temporaire (GIT_CONFIG_GLOBAL) : identité
  // fournie (sinon `git commit` échoue) et branche par défaut `main`, le tout
  // SANS toucher au ~/.gitconfig de l'utilisateur. GIT_CONFIG_SYSTEM=/dev/null
  // neutralise aussi la config système.
  const setup =
    'GC=$(mktemp)\n' +
    "printf '[user]\\n  name = ScriptLearn\\n  email = sl@local\\n[init]\\n  defaultBranch = main\\n' > \"$GC\"\n" +
    'export GIT_CONFIG_GLOBAL="$GC" GIT_CONFIG_SYSTEM=/dev/null\n' +
    'W=$(mktemp -d)\ncd "$W" || exit 1\n'
  // Les commandes de l'élève : sortie ignorée (on ne juge que l'ÉTAT final).
  const student = `{\n${commands}\n} > /dev/null 2>&1\n`
  // Chaque check est précédé d'un sentinel pour découper proprement la sortie.
  const checkCmds = (checks ?? [])
    .map((ch) => `printf '\\n${GIT_SENTINEL}\\n'\n${ch} 2>&1`)
    .join('\n')
  const cleanup = '\ncd /; rm -rf "$W" "$GC"\n'
  return setup + student + checkCmds + cleanup
}

function runGit(commands, checks) {
  const out = runCapture(bashBin(), [], buildGitScript(commands, checks))
  // parts[0] = préambule (avant le 1er check) ; parts[i+1] = sortie du check i.
  const parts = out.split(GIT_SENTINEL)
  return (checks ?? []).map((_, i) => (parts[i + 1] ?? '').trim())
}

function runValidation(lang, code, project, args) {
  // Python : interpréteur EMBARQUÉ (resources/python). En mode projet, fichier +
  // arguments (sys.argv) ; sinon le code passe par stdin.
  if (lang === 'python') {
    // PYTHONUTF8=1 force la sortie en UTF-8 (sinon le Python embarqué encode en
    // codepage Windows → les accents ressortent mojibakés et la comparaison échoue).
    const env = { ...process.env, PYTHONUTF8: '1' }
    if (project) {
      const f = join(tmpdir(), 'sl_proj.py')
      writeFileSync(f, code, 'utf8')
      return runCapture(pyBin(), [f, ...(args ?? [])], undefined, { env })
    }
    return runCapture(pyBin(), [], code, { env })
  }
  // PHP : interpréteur EMBARQUÉ (resources/php). Projet → fichier + $argv ;
  // sinon le code (`<?php …`) passe par stdin.
  if (lang === 'php') {
    if (project) {
      const f = join(tmpdir(), 'sl_proj.php')
      writeFileSync(f, code, 'utf8')
      return runCapture(phpBin(), [f, ...(args ?? [])])
    }
    return runCapture(phpBin(), [], code)
  }
  if (lang === 'powershell') {
    // Forcer la sortie en UTF-8 : sinon Write-Output encode les accents en
    // codepage console (« reconstitué » → mojibake) et la comparaison échoue.
    const enc = '[Console]::OutputEncoding=[System.Text.Encoding]::UTF8;'
    if (project) {
      // On passe par `-Command "& 'fichier' args"` (et non `-File`) pour pouvoir
      // préfixer l'encodage SANS casser un éventuel `param()` en 1re ligne du script.
      const f = join(tmpdir(), 'sl_proj.ps1')
      // BOM UTF-8 : sans lui, PowerShell 5.1 lit le .ps1 en codepage ANSI et les
      // accents de la SOURCE sont déjà corrompus avant même l'affichage.
      writeFileSync(f, '﻿' + code, 'utf8')
      const a = (args ?? []).map(x => `'${String(x).replace(/'/g, "''")}'`).join(' ')
      const fp = f.replace(/'/g, "''")
      return runCapture('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `${enc} & '${fp}' ${a}`])
    }
    return runCapture('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '-'], enc + '\n' + code)
  }
  // JavaScript / TypeScript : Node natif. Node 24 exécute le TypeScript en
  // dépouillant les types (à la volée, y compris depuis stdin). En mode projet,
  // on écrit un fichier avec la bonne extension (.js / .ts) et on l'exécute avec
  // ses arguments (process.argv) ; sinon le code passe par stdin.
  if (lang === 'js' || lang === 'ts') {
    if (project) {
      const ext = lang === 'ts' ? 'ts' : 'js'
      const f = join(tmpdir(), `sl_proj.${ext}`)
      writeFileSync(f, code, 'utf8')
      return runCapture(nodeBin(), [f, ...(args ?? [])])
    }
    return runCapture(nodeBin(), [], code)
  }
  // Go : compilateur EMBARQUÉ (resources/go), exécuté nativement sur Windows
  // (ni WSL ni installation). On écrit un .go et on lance `go run` avec l'env
  // dédié. Timeout élargi car la 1re compilation bâtit le cache (~15 s).
  if (lang === 'go') {
    const f = join(tmpdir(), 'sl_proj.go')
    writeFileSync(f, code, 'utf8')
    return runCapture(join(goRoot(), 'bin', 'go.exe'), ['run', f, ...(args ?? [])], undefined, { env: goEnv(), timeout: 90000 })
  }
  // C / C++ : compilateurs MinGW EMBARQUÉS (resources/mingw). C++ lié en statique
  // (-static) pour ne dépendre d'aucune DLL runtime MinGW à l'exécution.
  if (lang === 'c') {
    const dir = tmpdir(); const src = join(dir, 'sl.c'); const exe = join(dir, 'sl_c.exe')
    writeFileSync(src, code, 'utf8')
    return compileExeThenRun(gccBin(), [src, '-o', exe], exe, args, { ...process.env, PATH: mingwBinDir() + ';' + (process.env.PATH || '') })
  }
  if (lang === 'cpp') {
    const dir = tmpdir(); const src = join(dir, 'sl.cpp'); const exe = join(dir, 'sl_cpp.exe')
    writeFileSync(src, code, 'utf8')
    return compileExeThenRun(gppBin(), [src, '-static', '-o', exe], exe, args, { ...process.env, PATH: mingwBinDir() + ';' + (process.env.PATH || '') })
  }
  // Java : JDK EMBARQUÉ (resources/jdk). Compilation dans un dossier temporaire
  // DÉDIÉ (sinon un Main.class périmé ferait croire à une compilation réussie).
  if (lang === 'java') {
    const dir = mkdtempSync(join(tmpdir(), 'sljava-'))
    writeFileSync(join(dir, 'Main.java'), code, 'utf8')
    // -encoding UTF-8 : lire la source UTF-8 ; -Dstdout.encoding=UTF-8 : émettre
    // la sortie en UTF-8 (sinon les accents sortent en codepage console → mojibake).
    const comp = runCapture(javacBin(), ['-encoding', 'UTF-8', join(dir, 'Main.java')], undefined, { timeout: 60000 })
    if (!existsSync(join(dir, 'Main.class'))) return comp || 'Erreur de compilation.'
    return runCapture(javaBin(), ['-Dstdout.encoding=UTF-8', '-cp', dir, 'Main', ...(args ?? [])])
  }
  // C# : csc INTÉGRÉ à Windows (.NET Framework). Produit un .exe natif exécuté direct.
  if (lang === 'csharp') {
    const dir = tmpdir(); const src = join(dir, 'Main.cs'); const exe = join(dir, 'sl_cs.exe')
    writeFileSync(src, code, 'utf8')
    return compileExeThenRun(cscBin(), ['/nologo', '/out:' + exe, src], exe, args)
  }
  // Rust : rustc EMBARQUÉ, linké par le gcc de MinGW. Compile vers un .exe puis
  // l'exécute (l'env Rust est requis à la compilation ET à l'exécution — DLLs).
  if (lang === 'rust') {
    const dir = tmpdir(); const src = join(dir, 'sl.rs'); const exe = join(dir, 'sl_rs.exe')
    writeFileSync(src, code, 'utf8')
    const env = rustEnv()
    try { rmSync(exe, { force: true }) } catch { /* ignore */ }
    const comp = runCapture(rustcBin(), [src, '-o', exe, '-C', 'linker=' + gccBin()], undefined, { env, timeout: 90000 })
    if (!existsSync(exe)) return comp || 'Erreur de compilation.'
    return runCapture(exe, args ?? [], undefined, { env })
  }
  // bash : bash MSYS2 EMBARQUÉ (PortableGit). Le script est passé par stdin —
  // /tmp, coreutils, heredocs, $1 et accents (UTF-8) fonctionnent nativement.
  return runCapture(bashBin(), [], buildBashScript(lang, code, project, args))
}

export function setupTerminalIPC(mainWindow) {
  ipcMain.handle('terminal:bashAvailable',   () => checkBashAvailable())
  ipcMain.handle('terminal:pythonAvailable', () => checkPythonAvailable())
  ipcMain.handle('terminal:phpAvailable',    () => checkPhpAvailable())
  ipcMain.handle('terminal:toolAvailable',   (_, { tool }) => checkToolAvailable(tool))

  // Mise en place d'un acte de mission EN COULISSES (création de fichiers /tmp),
  // via le bash EMBARQUÉ (PortableGit), non affiché — pour ne pas dévoiler les données.
  ipcMain.handle('terminal:runSetup', (_, { setup }) => {
    if (!setup) return { ok: true }
    try {
      execFileSync(bashBin(), [], { input: setup, timeout: 15000, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  // Validation : exécute le code en coulisses et renvoie la sortie à comparer.
  // `project` (+ `args`) → mode « fichier script exécuté avec arguments ».
  ipcMain.handle('terminal:runValidation', (_, { lang, code, project, args }) => {
    try {
      return { output: runValidation(lang, code, project, args) }
    } catch (e) {
      return { output: String(e?.message ?? e) }
    }
  })

  // Validation Git : exécute les commandes de l'élève dans un dépôt jetable WSL
  // puis renvoie la sortie de chaque commande d'inspection (à comparer côté renderer).
  ipcMain.handle('terminal:runGit', (_, { commands, checks }) => {
    try {
      return { outputs: runGit(commands ?? '', checks ?? []) }
    } catch (e) {
      return { outputs: [], error: String(e?.message ?? e) }
    }
  })

  ipcMain.handle('terminal:create', (_, { id, shell, cols, rows }) => {
    if (sessions.has(id)) return { ok: true }
    createSession(id, shell, cols, rows)
    return { ok: true }
  })

  ipcMain.handle('terminal:write', (_, { id, data }) => {
    const proc = sessions.get(id)
    if (proc) proc.write(data)
  })

  ipcMain.handle('terminal:resize', (_, { id, cols, rows }) => {
    const proc = sessions.get(id)
    if (proc && cols > 0 && rows > 0) {
      try { proc.resize(cols, rows) } catch { /* session en cours de fermeture */ }
    }
  })

  ipcMain.handle('terminal:kill', (_, { id }) => {
    const proc = sessions.get(id)
    if (proc) { try { proc.kill() } catch { /* déjà mort */ } }
    sessions.delete(id)
  })

  // Réémettre les données avec l'id encodé dans le nom d'événement → renderer.
  const originalEmit = emitter.emit.bind(emitter)
  emitter.emit = (event, ...args) => {
    if (event.startsWith('data:')) {
      const id = event.slice(5)
      if (!mainWindow.isDestroyed()) {
        mainWindow.webContents.send('terminal:data', { id, chunk: args[0] })
      }
    }
    return originalEmit(event, ...args)
  }
}
