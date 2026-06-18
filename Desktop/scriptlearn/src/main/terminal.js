import { ipcMain } from 'electron'
import { execSync, execFileSync } from 'child_process'
import { existsSync } from 'fs'
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

// Exécute un programme en lui passant le code par stdin, et renvoie stdout+stderr
// quel que soit le code de sortie (les erreurs de compilation sont ainsi visibles).
function runCapture(fileName, args, input) {
  try {
    return execFileSync(fileName, args, {
      input, timeout: 30000, windowsHide: true, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024
    }) ?? ''
  } catch (e) {
    return String((e.stdout ?? '') + (e.stderr ?? '')) || String(e.message ?? e)
  }
}

// Construit le script bash one-shot pour les langages de la famille bash (WSL).
// Mêmes recettes que buildRunData côté renderer (heredoc PHP, compilation C/C++/C#/Java).
function buildBashScript(lang, code) {
  const heredoc = (path, c) => `cat > ${path} <<'SLEOF'\n${c}\nSLEOF\n`
  switch (lang) {
    case 'php':    return `php << 'PHPEOF'\n${code}\nPHPEOF`
    case 'c':      return heredoc('/tmp/sl.c', code) + 'gcc /tmp/sl.c -o /tmp/sl_bin 2>&1 && /tmp/sl_bin'
    case 'cpp':    return heredoc('/tmp/sl.cpp', code) + 'g++ /tmp/sl.cpp -o /tmp/sl_bin 2>&1 && /tmp/sl_bin'
    case 'java':   return heredoc('/tmp/Main.java', code) + 'cd /tmp && javac Main.java 2>&1 && java Main'
    case 'csharp': return heredoc('/tmp/Main.cs', code) + 'cd /tmp && mcs Main.cs 2>&1 && mono Main.exe'
    default:       return code // bash : le code tel quel
  }
}

function runValidation(lang, code) {
  if (lang === 'python')     return runCapture('python', [], code)
  if (lang === 'powershell') return runCapture('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '-'], code)
  // bash, php, c, cpp, csharp, java → via une invocation bash WSL jetable
  return runCapture('wsl.exe', ['-e', 'bash'], buildBashScript(lang, code))
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
  ipcMain.handle('terminal:runValidation', (_, { lang, code }) => {
    try {
      return { output: runValidation(lang, code) }
    } catch (e) {
      return { output: String(e?.message ?? e) }
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
