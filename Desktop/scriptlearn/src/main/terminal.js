import { ipcMain, app } from 'electron'
import { execSync, execFileSync } from 'child_process'
import { existsSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { EventEmitter } from 'events'
// node-pty fournit un VRAI pseudo-terminal (PTY). Sans lui (ancien `spawn` à tubes),
// le shell ne voit pas de TTY et readline désactive la complétion Tab, l'historique
// et l'édition de ligne. Module natif : recompilé pour Electron au packaging
// (@electron/rebuild) et embarqué via asarUnpack (binaires .node hors de l'asar).
import nodePty from 'node-pty'

// Sur Windows 11 / WSL2 récent, bash.exe n'est plus créé.
// On détecte WSL via wsl.exe (toujours présent si WSL est installé).
function checkBashAvailable() {
  return existsSync('C:\\Windows\\System32\\wsl.exe')
}

function checkPythonAvailable() {
  try {
    execSync('python --version', { timeout: 3000, windowsHide: true, stdio: 'pipe' })
    return true
  } catch {
    try {
      execSync('python3 --version', { timeout: 3000, windowsHide: true, stdio: 'pipe' })
      return true
    } catch {
      return false
    }
  }
}

// Vérifie que PHP est disponible DANS WSL — pas le php.exe Windows natif.
function checkPhpAvailable() {
  try {
    execSync('wsl.exe -e php --version', { timeout: 5000, windowsHide: true, stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

// Vérifie qu'une toolchain (gcc, g++, javac, mono…) est installée DANS WSL.
// Allow-list : la valeur vient du renderer, on ne l'injecte jamais telle quelle.
const KNOWN_TOOLS = ['gcc', 'g++', 'javac', 'java', 'mcs', 'mono']
function checkToolAvailable(tool) {
  if (!KNOWN_TOOLS.includes(tool)) return false
  try {
    execSync(`wsl.exe -e ${tool} --version`, { timeout: 5000, windowsHide: true, stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

const sessions = new Map()
const emitter = new EventEmitter()

// Crée une session terminal interactive dans un vrai PTY (node-pty).
// cols/rows : taille initiale fournie par xterm (après fit) — le shell s'en sert
// pour le retour à la ligne et l'alignement de la complétion.
function createSession(id, shell, cols = 80, rows = 24) {
  let file, args
  if (shell === 'powershell') {
    file = 'powershell.exe'
    args = ['-NoLogo', '-NoExit']
  } else if (shell === 'python') {
    file = 'python'
    args = ['-i', '-u']
  } else if (shell === 'node') {
    // REPL Node interactif (JavaScript/TypeScript), comme le REPL Python.
    file = 'node'
    args = ['-i']
  } else {
    // wsl.exe lance le shell de la distro par défaut
    file = 'wsl.exe'
    args = ['--', 'bash', '--login', '-i']
  }

  const proc = nodePty.spawn(file, args, {
    name: 'xterm-256color',
    cols, rows,
    cwd: process.env.USERPROFILE || process.cwd(),
    env: { ...process.env, TERM: 'xterm-256color', PYTHONIOENCODING: 'utf-8' }
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
// Racine du SDK Go embarqué (resources/go).
function goRoot() {
  return join(resourcesRoot(), 'go')
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
  const out = runCapture('wsl.exe', ['-e', 'bash'], buildGitScript(commands, checks))
  // parts[0] = préambule (avant le 1er check) ; parts[i+1] = sortie du check i.
  const parts = out.split(GIT_SENTINEL)
  return (checks ?? []).map((_, i) => (parts[i + 1] ?? '').trim())
}

function runValidation(lang, code, project, args) {
  // Python / PowerShell natifs en mode projet : on écrit un vrai fichier puis on
  // l'exécute avec ses arguments (impossible via stdin, qui ne fournit pas argv).
  if (lang === 'python') {
    if (project) {
      const f = join(tmpdir(), 'sl_proj.py')
      writeFileSync(f, code, 'utf8')
      return runCapture('python', [f, ...(args ?? [])])
    }
    return runCapture('python', [], code)
  }
  if (lang === 'powershell') {
    if (project) {
      const f = join(tmpdir(), 'sl_proj.ps1')
      writeFileSync(f, code, 'utf8')
      return runCapture('powershell.exe', ['-NoProfile', '-NonInteractive', '-File', f, ...(args ?? [])])
    }
    return runCapture('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '-'], code)
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
      return runCapture('node', [f, ...(args ?? [])])
    }
    return runCapture('node', [], code)
  }
  // Go : compilateur EMBARQUÉ (resources/go), exécuté nativement sur Windows
  // (ni WSL ni installation). On écrit un .go et on lance `go run` avec l'env
  // dédié. Timeout élargi car la 1re compilation bâtit le cache (~15 s).
  if (lang === 'go') {
    const f = join(tmpdir(), 'sl_proj.go')
    writeFileSync(f, code, 'utf8')
    return runCapture(join(goRoot(), 'bin', 'go.exe'), ['run', f, ...(args ?? [])], undefined, { env: goEnv(), timeout: 90000 })
  }
  // bash, php, c, cpp, csharp, java → via une invocation bash WSL jetable
  return runCapture('wsl.exe', ['-e', 'bash'], buildBashScript(lang, code, project, args))
}

export function setupTerminalIPC(mainWindow) {
  ipcMain.handle('terminal:bashAvailable',   () => checkBashAvailable())
  ipcMain.handle('terminal:pythonAvailable', () => checkPythonAvailable())
  ipcMain.handle('terminal:phpAvailable',    () => checkPhpAvailable())
  ipcMain.handle('terminal:toolAvailable',   (_, { tool }) => checkToolAvailable(tool))

  // Mise en place d'un acte de mission EN COULISSES (création de fichiers /tmp),
  // dans une invocation WSL séparée et NON affichée — pour ne pas dévoiler les données.
  ipcMain.handle('terminal:runSetup', (_, { setup }) => {
    if (!setup) return { ok: true }
    try {
      execSync('wsl.exe -e bash', { input: setup, timeout: 10000, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
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
