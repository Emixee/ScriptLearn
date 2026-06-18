import { ipcMain } from 'electron'
import { spawn, execSync } from 'child_process'
import { existsSync } from 'fs'
import { EventEmitter } from 'events'

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
// Les exercices PHP utilisent le terminal WSL bash (wsl php ...).
// Tester le php.exe natif donnerait un faux positif si PHP n'est pas dans WSL.
function checkPhpAvailable() {
  try {
    execSync('wsl.exe -e php --version', { timeout: 5000, windowsHide: true, stdio: 'pipe' })
    return true
  } catch {
    return false
  }
}

// Vérifie qu'une toolchain (gcc, g++, javac, mono…) est installée DANS WSL.
// Les langages compilés (C/C++/C#/Java) sont compilés et exécutés via la session
// bash WSL — on teste donc l'outil côté WSL, pas son équivalent Windows natif,
// pour éviter un faux positif (ex: un gcc MinGW Windows alors que WSL ne l'a pas).
// On valide le nom de l'outil avec une allow-list : la valeur vient du renderer,
// on ne veut surtout pas l'injecter telle quelle dans une commande shell.
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

function createSession(id, shell) {
  let cmd, args
  if (shell === 'powershell') {
    cmd = 'powershell.exe'
    args = ['-NoLogo', '-NoExit', '-Command', '-']
  } else if (shell === 'python') {
    cmd = 'python'
    args = ['-i', '-u']
  } else {
    // wsl.exe lance le shell de la distro par défaut (Ubuntu-24.04 / Ubuntu-22.04)
    cmd = 'wsl.exe'
    args = ['--', 'bash', '--login', '-i']
  }

  const proc = spawn(cmd, args, {
    env: { ...process.env, TERM: 'xterm-256color', PYTHONIOENCODING: 'utf-8' },
    windowsHide: true
  })

  sessions.set(id, proc)

  proc.stdout.on('data', (data) => {
    emitter.emit(`data:${id}`, data.toString())
  })
  proc.stderr.on('data', (data) => {
    emitter.emit(`data:${id}`, data.toString())
  })
  proc.on('exit', () => {
    sessions.delete(id)
    emitter.emit(`exit:${id}`)
  })

  return proc
}

export function setupTerminalIPC(mainWindow) {
  ipcMain.handle('terminal:bashAvailable',   () => checkBashAvailable())
  ipcMain.handle('terminal:pythonAvailable', () => checkPythonAvailable())
  ipcMain.handle('terminal:phpAvailable',    () => checkPhpAvailable())
  ipcMain.handle('terminal:toolAvailable',   (_, { tool }) => checkToolAvailable(tool))

  // Exécute la « mise en place » (setup) d'un acte de mission EN COULISSES, dans une
  // invocation WSL séparée et NON affichée — pas dans la session bash du terminal.
  // POURQUOI : si on envoyait le setup dans la session interactive affichée, bash
  // l'écho à l'écran et dévoile les données (le fichier que l'élève doit découvrir).
  // Comme /tmp est partagé au sein de la même instance WSL, les fichiers créés ici
  // restent accessibles à la session du terminal — mais la commande reste invisible.
  // Le script est passé via stdin (input) pour éviter tout problème de guillemets.
  ipcMain.handle('terminal:runSetup', (_, { setup }) => {
    if (!setup) return { ok: true }
    try {
      execSync('wsl.exe -e bash', { input: setup, timeout: 10000, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  ipcMain.handle('terminal:create', (_, { id, shell }) => {
    if (sessions.has(id)) return { ok: true }
    createSession(id, shell)
    return { ok: true }
  })

  ipcMain.handle('terminal:write', (_, { id, data }) => {
    const proc = sessions.get(id)
    if (proc) proc.stdin.write(data)
  })

  ipcMain.handle('terminal:kill', (_, { id }) => {
    const proc = sessions.get(id)
    if (proc) proc.kill()
    sessions.delete(id)
  })

  // Réémettre avec l'id encodé dans le nom d'événement
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
