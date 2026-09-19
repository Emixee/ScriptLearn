import { ipcMain, app } from 'electron'
import { spawn } from 'child_process'
import { existsSync, writeFileSync, rmSync, mkdtempSync, mkdirSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { randomBytes } from 'crypto'
// node-pty fournit un VRAI pseudo-terminal (PTY). Sans lui (ancien `spawn` à tubes),
// le shell ne voit pas de TTY et readline désactive la complétion Tab, l'historique
// et l'édition de ligne. Module natif : recompilé pour Electron au packaging
// (@electron/rebuild) et embarqué via asarUnpack (binaires .node hors de l'asar).
import nodePty from 'node-pty'

// ── Diagnostic d'installation ────────────────────────────────────────────────
// Installateur « Tout-en-un » : tous les interpréteurs/compilateurs sont EMBARQUÉS
// dans l'app (resources/). Ces fonctions ne testent donc pas une installation
// utilisateur, mais la PRÉSENCE RÉELLE du binaire embarqué.
//
// POURQUOI ce n'est pas `return true` : c'était le cas avant, et la bannière
// d'avertissement du renderer (ToolchainBanner) ne pouvait donc plus jamais
// s'afficher. Une installation peut pourtant être incomplète (~2,6 Go extraits,
// antivirus qui met un binaire en quarantaine, dossier resources/ déplacé) — et
// l'élève n'avait alors qu'un « command not found » au milieu du terminal.
function checkBashAvailable()   { return existsSync(bashBin()) }
function checkPythonAvailable() { return existsSync(pyBin()) }
function checkPhpAvailable()    { return existsSync(phpBin()) }

// Chemin du binaire embarqué attendu, par nom d'outil (cf. TOOLCHAINS dans
// src/renderer/src/lib/langs.js — les deux listes doivent rester cohérentes).
function toolPathFor(tool) {
  switch (tool) {
    case 'gcc':    return gccBin()
    case 'g++':    return gppBin()
    case 'javac':  return javacBin()
    case 'java':   return javaBin()
    case 'go':     return join(goRoot(), 'bin', 'go.exe')
    case 'rustc':  return rustcBin()
    case 'php':    return phpBin()
    case 'python': return pyBin()
    case 'node':   return nodeBin()
    case 'bash':   return bashBin()
    // csc est fourni par Windows (.NET Framework), pas embarqué.
    case 'csc':    return cscBin()
    default:       return null
  }
}

function checkToolAvailable(tool) {
  const p = toolPathFor(tool)
  // Outil inconnu : on ne prétend PAS qu'il manque (pas de fausse alerte).
  if (!p) return true
  return existsSync(p)
}
// id de session → processus PTY. POURQUOI pas un EventEmitter global
// monkey-patché comme avant : le patch de `emitter.emit` capturait la fenêtre du
// moment dans une closure, donc une fenêtre recréée (macOS « activate »)
// recevait… l'ancienne référence, détruite. Ici le destinataire est celui qui a
// demandé la session (webContents passé à createSession).
const sessions = new Map()

// ── Trace du cycle de vie des sessions (DÉVELOPPEMENT UNIQUEMENT) ────────────
// POURQUOI : quand le terminal reste muet, la seule question qui compte est
// « qui a tué le shell, et dans quel ordre ? » — et c'est précisément ce que
// l'interface ne montre pas. Ces lignes sortent dans la console du processus
// PRINCIPAL, c'est-à-dire la fenêtre qui a lancé `npm run dev` : lisibles sans
// ouvrir les DevTools, et absentes de l'application installée.
// app.isPackaged est lu à CHAQUE appel et non une fois au chargement du module :
// ce fichier est importé avant `app.whenReady()`, et figer la valeur trop tôt
// est le genre de détail qui se retourne contre soi au premier refactoring.
function trace(...args) {
  if (!app.isPackaged) console.log('[terminal]', ...args)
}

// ── Sérialisation des opérations par terminal ────────────────────────────────
// Toutes les opérations d'un MÊME id (create / kill) sont enchaînées dans une
// file d'attente. POURQUOI cette file plutôt qu'un simple drapeau « création en
// cours » : les deux handlers sont asynchrones, donc entrelaçables. Séquence
// réelle en développement (React StrictMode monte, démonte, remonte chaque
// composant) :
//     create(A) -> kill(A) -> create(A)
// Le kill faisait `await` (attente de la création en vol) et RENDAIT LA MAIN ;
// le second create s'exécutait alors, voyait la session encore inscrite dans la
// Map et répondait « ok, elle existe déjà » SANS rien créer ; puis le kill
// reprenait et tuait cette session. Résultat : le renderer croyait avoir un
// terminal opérationnel alors que son shell venait d'être tué — d'où un panneau
// où taper ne produit rien, et un code de sortie 0xC000013A
// (STATUS_CONTROL_C_EXIT, la signature d'un ConPTY fermé sous le processus).
// Avec la file, kill(A) est TERMINÉ avant que create(A) ne commence : la course
// n'existe plus par construction, sans dépendre d'un ordre d'arrivée.
const queues = new Map()

function enqueue(id, fn) {
  const prev = queues.get(id) ?? Promise.resolve()
  // `.then(fn, fn)` : l'échec d'une opération ne doit pas bloquer la file pour
  // toujours — l'opération suivante s'exécute dans les deux cas.
  const next = prev.then(fn, fn)
  // La file mémorise une version « qui ne rejette jamais », sinon un rejet non
  // traité remonterait comme unhandledRejection au premier maillon en échec.
  queues.set(id, next.then(() => {}, () => {}))
  return next
}

// Processus dont la fermeture est VOLONTAIRE (kill explicite). Sert uniquement à
// ne pas afficher « le shell s'est arrêté » quand c'est nous qui l'avons tué.
//
// POURQUOI un WeakSet de PROCESSUS et non un Set d'ids : plusieurs sessions
// peuvent se succéder sur le même id (StrictMode, changement d'acte). Avec des
// ids, le premier `exit` consommait la marque et le second était signalé « NON
// demandé » — un message d'erreur rouge affiché à l'élève pour une fermeture
// parfaitement normale. La marque suit désormais l'objet tué, sans ambiguïté
// possible, et le WeakSet n'empêche pas sa libération mémoire.
const killedProcs = new WeakSet()

// Marqueur de PROMPT émis par le shell AVANT chaque invite (mode terminal-auto).
// Doit être IDENTIQUE à PROMPT_MARKER dans src/renderer/src/lib/langs.js (main ESM et
// renderer ne peuvent pas s'importer mutuellement → constante dupliquée).
// IMPORTANT : ENTIÈREMENT IMPRIMABLE — ConPTY (pseudo-terminal Windows de node-pty)
// FILTRE les caractères de contrôle C0 (0x1f & co), donc un marqueur de contrôle
// n'arrive pas intact côté renderer. Terminal.jsx le retire du flux avant affichage.
const PROMPT_MARKER = '__SLPROMPTMARK__'

// ── Exécution de processus, TOUJOURS ASYNCHRONE ──────────────────────────────
// POURQUOI c'est critique : tout ce fichier utilisait execFileSync/execSync, avec
// des délais d'attente allant jusqu'à 90 s (Go, Rust). Or ce code tourne dans le
// PROCESSUS PRINCIPAL, qui est aussi celui qui traite les IPC et les événements
// de fenêtre : pendant une compilation, l'app entière était gelée (« ScriptLearn
// ne répond pas »). Avec spawn + promesse, la boucle d'événements reste libre.
//
// POURQUOI spawn et pas promisify(execFile) : execFile en version asynchrone
// n'accepte PAS d'option `input` — or la moitié des langages reçoit le code de
// l'élève par stdin. spawn est le seul à permettre stdin + async.
const MAX_OUTPUT = 4 * 1024 * 1024 // 4 Mo : au-delà, une boucle infinie de
                                   // l'élève saturerait la mémoire du process.

function runProc(file, args = [], { input, env, timeout = 30000, cwd } = {}) {
  return new Promise((resolve) => {
    let out = ''
    let settled = false
    let child
    try {
      child = spawn(file, args, { env, cwd, windowsHide: true })
    } catch (e) {
      return resolve(String(e?.message ?? e))
    }
    const push = (buf) => { if (out.length < MAX_OUTPUT) out += buf.toString('utf8') }
    child.stdout?.on('data', push)
    child.stderr?.on('data', push)

    const timer = setTimeout(() => {
      try { child.kill() } catch { /* déjà mort */ }
      out += `\n[ScriptLearn] Exécution interrompue : délai de ${Math.round(timeout / 1000)} s dépassé.`
      // On RÉSOUT ici, sans attendre l'événement 'close'. POURQUOI : un arbre de
      // processus lancé depuis bash peut survivre au kill() du parent — la
      // promesse restait alors en attente indéfiniment et la validation ne
      // rendait jamais la main à l'élève.
      finish()
    }, timeout)

    const finish = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(out)
    }
    // 'error' = binaire introuvable (toolchain absente) : on renvoie le message
    // plutôt que de laisser échouer l'IPC, sinon l'élève ne voit rien du tout.
    child.on('error', (e) => { out += String(e?.message ?? e); finish() })
    child.on('close', finish)

    if (input !== undefined) {
      // EPIPE : si le programme se termine avant d'avoir tout lu (ex. `head`),
      // l'écriture sur stdin lève. Sans ce handler, l'exception remonte et tue
      // le processus principal.
      child.stdin?.on('error', () => {})
      child.stdin?.end(input, 'utf8')
    } else {
      child.stdin?.end()
    }
  })
}

// Alias historique : renvoie stdout+stderr quel que soit le code de sortie
// (les erreurs de compilation/exécution sont ainsi visibles). `input` optionnel :
// si fourni, c'est le code passé par stdin ; sinon le programme lit ses propres
// fichiers/arguments (mode « projet »).
function runCapture(fileName, args, input, extraOpts) {
  return runProc(fileName, args ?? [], { input, ...(extraOpts ?? {}) })
}

// Dossier temporaire UNIQUE par exécution, supprimé à la fin.
// POURQUOI : toutes les validations écrivaient dans des fichiers à noms FIXES
// (sl_proj.py, sl.c, sl_c.exe, Main.cs…) au même endroit. Deux validations
// simultanées (validation + bac à sable, ou double-clic sur « Valider ») se
// écrasaient mutuellement et l'élève voyait la sortie de l'autre exécution.
async function withTempDir(fn) {
  const dir = mkdtempSync(join(tmpdir(), 'slrun-'))
  try {
    return await fn(dir)
  } finally {
    try { rmSync(dir, { recursive: true, force: true }) } catch { /* verrouillé : nettoyé au reboot */ }
  }
}

// Crée une session terminal interactive dans un vrai PTY (node-pty).
// cols/rows : taille initiale fournie par xterm (après fit) — le shell s'en sert
// pour le retour à la ligne et l'alignement de la complétion.
async function createSession(id, shell, cols = 80, rows = 24, setup, webContents) {
  // Préparation des données de l'acte (mkdir/printf…) exécutée ICI, et AWAITÉE
  // AVANT de lancer le shell interactif. POURQUOI ici et pas en
  // « fire-and-forget » côté renderer : ainsi les fichiers sont garantis présents
  // dans le MÊME /tmp (%TEMP%) et AVANT toute frappe de l'élève, à chaque création
  // de session (chaque acte, reprise, recréation) — le mode terminal-auto n'a plus
  // de bouton Valider pour relancer le setup, il ne faut donc aucune course. Le
  // setup est toujours du bash (mkdir/printf), quel que soit le shell de la session.
  // (Avant : execFileSync → l'app gelait jusqu'à 15 s à chaque ouverture d'acte.)
  if (setup) {
    trace(id, 'setup en cours (bash, 15 s max)')
    await runProc(bashBin(), [], { input: setup, timeout: 15000 })
    trace(id, 'setup termine')
  }
  let file, args
  // Variables d'env additionnelles (selon le shell) pour faire émettre le marqueur
  // de prompt. Le marqueur est TOUJOURS émis (et toujours retiré côté renderer) :
  // inoffensif pour les terminaux en mode éditeur, exploité en mode terminal-auto.
  const extraEnv = {}
  // Tous les interpréteurs/compilateurs sont EMBARQUÉS (resources/) — aucun
  // recours à WSL ni à un outil système (hors PowerShell, natif Windows).
  if (shell === 'powershell') {
    file = 'powershell.exe'
    // On (re)définit la fonction `prompt` pour préfixer chaque invite du marqueur
    // (imprimable, retiré côté renderer). -NoExit garde la session interactive
    // après l'exécution du -Command. On reconstruit une invite « PS <chemin>> ».
    const psPrompt = `function prompt { "${PROMPT_MARKER}PS $((Get-Location).Path)> " }`
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
    // Marqueur imprimable (ConPTY filtrerait un caractère de contrôle).
    extraEnv.PROMPT_COMMAND = `printf '${PROMPT_MARKER}'`
  }

  // PATH augmenté de TOUTES les toolchains embarquées → dans le terminal bash,
  // gcc/g++/javac/java/go/php/node/python sont directement utilisables.
  const toolPath = [
    mingwBinDir(), join(embedRoot('jdk'), 'bin'), join(embedRoot('go'), 'bin'),
    embedRoot('php'), embedRoot('node'), embedRoot('python'),
  ].join(';')

  // Le binaire existe-t-il VRAIMENT avant de lancer le PTY ?
  // POURQUOI ce garde-fou : node-pty sous Windows passe par ConPTY, qui CRÉE le
  // pseudo-terminal puis tente la création du processus. Si le .exe est absent
  // (installation incomplète, resources/ pas encore téléchargé, binaire en
  // quarantaine antivirus), l'échec ne remonte pas toujours sous forme
  // d'exception : on obtient une session « vivante » sur un shell mort. Symptôme
  // côté élève : un terminal noir où RIEN ne s'affiche quand il tape — car c'est
  // le shell, pas xterm, qui fait l'écho des caractères. Un existsSync ici
  // transforme ce silence en message explicite affiché dans le terminal.
  // powershell.exe est natif Windows et résolu via le PATH : on ne le teste pas.
  if (file !== 'powershell.exe' && !existsSync(file)) {
    throw new Error(`interpréteur introuvable : ${file}`)
  }

  const proc = nodePty.spawn(file, args, {
    name: 'xterm-256color',
    cols, rows,
    cwd: process.env.USERPROFILE || process.cwd(),
    env: { ...process.env, ...extraEnv, TERM: 'xterm-256color', PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1', PATH: toolPath + ';' + (process.env.PATH || '') }
  })

  sessions.set(id, proc)
  trace(id, 'spawn OK', shell, '->', file, '| pid', proc.pid, '|', cols + 'x' + rows)
  // node-pty fusionne stdout/stderr dans un seul flux onData. On renvoie les
  // données au webContents qui a demandé la session (et seulement s'il vit
  // encore : écrire dans un renderer détruit lève).
  proc.onData((data) => {
    if (webContents && !webContents.isDestroyed()) {
      webContents.send('terminal:data', { id, chunk: data })
    }
  })
  proc.onExit(({ exitCode, signal } = {}) => {
    sessions.delete(id)
    trace(id, 'EXIT code', exitCode, signal ? 'signal ' + signal : '', killedProcs.has(proc) ? '(kill demande par nous)' : '(NON demande)')
    // Sortie NON demandée (le shell est mort tout seul : binaire corrompu, DLL
    // manquante, `exit` tapé par l'élève) → on le DIT dans le terminal. Sans ça,
    // le panneau se figeait sans explication et paraissait « bloqué ».
    // `killedProcs` distingue ce cas d'un kill volontaire (changement d'exercice,
    // fermeture de l'app), qui ne doit évidemment rien afficher.
    if (killedProcs.has(proc)) return
    if (webContents && !webContents.isDestroyed()) {
      const why = signal ? `signal ${signal}` : `code ${exitCode ?? '?'}`
      webContents.send('terminal:data', {
        id,
        chunk: `\r\n\x1b[31m# Le shell s'est arrêté (${why}). Recharge l'exercice pour repartir.\x1b[0m\r\n`,
      })
    }
  })
  return proc
}

// Tue toutes les sessions PTY. Appelé sur 'before-quit' (voir index.js) :
// sans ça, les bash.exe/python.exe lancés par ConPTY peuvent survivre à la
// fermeture de l'app et garder des fichiers verrouillés (ce qui fait échouer
// la mise à jour, qui doit écraser ces binaires).
export function killAllSessions() {
  for (const [id, proc] of sessions) {
    killedProcs.add(proc)
    try { proc.kill() } catch { /* déjà mort */ }
    sessions.delete(id)
  }
}

// ── Validation EN COULISSES (one-shot, sans PTY donc sans écho) ──────────────
// POURQUOI : avec un PTY, le shell réaffiche la commande tapée. Si on validait en
// lisant la sortie de la session affichée, l'écho de la commande fausserait la
// comparaison (ex. `echo SESAME` contient déjà « SESAME »). On exécute donc le code
// dans un processus jetable, non affiché : sortie propre et déterministe.

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
// du marqueur de prompt (imprimable, retiré côté renderer) → il précède chaque « >>> ».
function pyStartupFile() {
  const f = join(tmpdir(), 'sl_py_startup.py')
  writeFileSync(f, `import sys\nsys.ps1 = '${PROMPT_MARKER}>>> '\nsys.ps2 = '... '\n`, 'utf8')
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
async function compileExeThenRun(compileBin, compileArgs, exe, runArgs, runEnv) {
  const comp = await runCapture(compileBin, compileArgs, undefined, { timeout: 60000 })
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

// Construit le script bash one-shot pour les langages de la famille bash.
// Mode `project` : on écrit un VRAI fichier (le shebang compte) qu'on rend
// exécutable et qu'on lance AVEC ses arguments (`$1`/argv) — apprentissage de
// l'écriture de scripts complets, pas juste de one-liners.
//
// NOTE : les branches c/cpp/java/csharp qui existaient ici (gcc/mcs/mono via WSL)
// ont été supprimées — elles étaient MORTES depuis l'abandon de WSL (v0.18.0) :
// runValidation() traite ces langages avant d'arriver jusqu'ici, avec les
// toolchains embarquées. Les garder laissait croire que `mcs`/`mono` étaient
// encore utilisés.
function buildBashScript(lang, code, project, args) {
  // Délimiteur de heredoc UNIQUE par exécution. POURQUOI : avec un délimiteur
  // fixe (« SLEOF »), un code contenant une ligne valant exactement SLEOF
  // fermait le heredoc trop tôt et le reste du code partait comme commandes
  // shell — comportement incompréhensible pour l'élève.
  const eof = 'SLEOF_' + randomBytes(4).toString('hex').toUpperCase()
  const heredoc = (path, c) => `cat > ${path} <<'${eof}'\n${c}\n${eof}\n`
  const a = shArgs(args)
  // Nom de fichier unique aussi : deux validations simultanées ne doivent pas
  // se marcher dessus dans /tmp (partagé par toutes les sessions bash).
  const stamp = randomBytes(3).toString('hex')
  if (project) {
    if (lang === 'php') return heredoc(`/tmp/sl_proj_${stamp}.php`, code) + `php /tmp/sl_proj_${stamp}.php${a}`
    return heredoc(`/tmp/sl_proj_${stamp}.sh`, code) + `chmod +x /tmp/sl_proj_${stamp}.sh\n/tmp/sl_proj_${stamp}.sh${a}`
  }
  if (lang === 'php') return `php << '${eof}'\n${code}\n${eof}`
  return code // bash : le code tel quel
}

// ── Validation Git : exécution RÉELLE dans un dépôt jetable ─────────────────
// POURQUOI : valider Git par mots-clés est vide de sens. Ici on exécute les
// commandes de l'élève dans un VRAI dépôt git temporaire, puis on lance des
// commandes d'inspection (« checks ») dont la sortie prouve l'état obtenu
// (nombre de commits, branche courante, fichiers suivis…).
const GIT_SENTINEL = '__SLGITCHK__'

// Convertit un chemin Windows en forme utilisable dans un script bash MSYS2 :
// les « \ » sont des caractères d'échappement entre guillemets, donc C:\a\b
// deviendrait C:ab. MSYS accepte parfaitement les « / ».
function toShPath(p) {
  return String(p).replace(/\\/g, '/')
}

function buildGitScript(workDir, commands, checks) {
  // POURQUOI le dossier de travail est créé par Node et NON par `mktemp -d` dans
  // le script : avant, le script faisait `W=$(mktemp -d)` … puis `rm -rf "$W"` à
  // la fin, AVEC les commandes de l'élève exécutées entre les deux dans le MÊME
  // shell. Un exercice où l'élève écrit `W=$HOME` (ou `export W=...`) faisait
  // donc supprimer son dossier personnel. Désormais le chemin n'existe que côté
  // Node, le script ne contient plus aucun `rm -rf`, et le nettoyage est fait
  // par fs.rmSync — impossible à détourner depuis le code de l'élève.
  const w = toShPath(workDir)
  const setup = `cd '${w}' || exit 1\n`
  // Les commandes de l'élève : sortie ignorée (on ne juge que l'ÉTAT final).
  const student = `{\n${commands}\n} > /dev/null 2>&1\n`
  // Chaque check est précédé d'un sentinel pour découper proprement la sortie.
  // `cd` de nouveau avant chaque check : si le code de l'élève a changé de
  // dossier, les inspections doivent quand même viser le dépôt de l'exercice.
  const checkCmds = (checks ?? [])
    .map((ch) => `printf '\\n${GIT_SENTINEL}\\n'\ncd '${w}' 2>/dev/null\n${ch} 2>&1`)
    .join('\n')
  return setup + student + checkCmds + '\n'
}

async function runGit(commands, checks) {
  // base/ contient repo/ (le dépôt de l'exercice) et gitconfig (l'identité
  // isolée) : tout est jeté ensemble à la fin.
  const base = mkdtempSync(join(tmpdir(), 'slgit-'))
  const work = join(base, 'repo')
  const cfg  = join(base, 'gitconfig')
  try {
    mkdirSync(work, { recursive: true })
    // Config git ISOLÉE dans un fichier temporaire (GIT_CONFIG_GLOBAL) : identité
    // fournie (sinon `git commit` échoue) et branche par défaut `main`, le tout
    // SANS toucher au ~/.gitconfig de l'utilisateur. GIT_CONFIG_SYSTEM=/dev/null
    // neutralise aussi la config système.
    writeFileSync(cfg, '[user]\n  name = ScriptLearn\n  email = sl@local\n[init]\n  defaultBranch = main\n', 'utf8')
    const env = {
      ...process.env,
      GIT_CONFIG_GLOBAL: cfg,
      GIT_CONFIG_SYSTEM: '/dev/null',
      // Le dossier de travail n'appartient pas forcément « proprement » à
      // l'utilisateur aux yeux de git (droits Windows) : sans ça, git refuse
      // parfois d'opérer avec « dubious ownership ».
      GIT_CEILING_DIRECTORIES: toShPath(base),
    }
    const out = await runProc(bashBin(), [], {
      input: buildGitScript(work, commands, checks),
      env,
      timeout: 30000,
    })
    // parts[0] = préambule (avant le 1er check) ; parts[i+1] = sortie du check i.
    const parts = out.split(GIT_SENTINEL)
    return (checks ?? []).map((_, i) => (parts[i + 1] ?? '').trim())
  } finally {
    try { rmSync(base, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}

async function runValidation(lang, code, project, args) {
  // Python : interpréteur EMBARQUÉ (resources/python). En mode projet, fichier +
  // arguments (sys.argv) ; sinon le code passe par stdin.
  if (lang === 'python') {
    // PYTHONUTF8=1 force la sortie en UTF-8 (sinon le Python embarqué encode en
    // codepage Windows → les accents ressortent mojibakés et la comparaison échoue).
    const env = { ...process.env, PYTHONUTF8: '1' }
    if (project) {
      return withTempDir(async (dir) => {
        const f = join(dir, 'sl_proj.py')
        writeFileSync(f, code, 'utf8')
        return runCapture(pyBin(), [f, ...(args ?? [])], undefined, { env })
      })
    }
    return runCapture(pyBin(), [], code, { env })
  }
  // PHP : interpréteur EMBARQUÉ (resources/php). Projet → fichier + $argv ;
  // sinon le code (`<?php …`) passe par stdin.
  if (lang === 'php') {
    if (project) {
      return withTempDir(async (dir) => {
        const f = join(dir, 'sl_proj.php')
        writeFileSync(f, code, 'utf8')
        return runCapture(phpBin(), [f, ...(args ?? [])])
      })
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
      return withTempDir(async (dir) => {
        const f = join(dir, 'sl_proj.ps1')
        // BOM UTF-8 : sans lui, PowerShell 5.1 lit le .ps1 en codepage ANSI et les
        // accents de la SOURCE sont déjà corrompus avant même l'affichage.
        writeFileSync(f, '\uFEFF' + code, 'utf8')
        const a = (args ?? []).map(x => `'${String(x).replace(/'/g, "''")}'`).join(' ')
        const fp = f.replace(/'/g, "''")
        return runCapture('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `${enc} & '${fp}' ${a}`])
      })
    }
    return runCapture('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '-'], enc + '\n' + code)
  }
  // JavaScript / TypeScript : Node natif. Node 24 exécute le TypeScript en
  // dépouillant les types (à la volée, y compris depuis stdin). En mode projet,
  // on écrit un fichier avec la bonne extension (.js / .ts) et on l'exécute avec
  // ses arguments (process.argv) ; sinon le code passe par stdin.
  if (lang === 'js' || lang === 'ts') {
    if (project) {
      return withTempDir(async (dir) => {
        const ext = lang === 'ts' ? 'ts' : 'js'
        const f = join(dir, `sl_proj.${ext}`)
        writeFileSync(f, code, 'utf8')
        return runCapture(nodeBin(), [f, ...(args ?? [])])
      })
    }
    return runCapture(nodeBin(), [], code)
  }
  // Go : compilateur EMBARQUÉ (resources/go), exécuté nativement sur Windows
  // (ni WSL ni installation). On écrit un .go et on lance `go run` avec l'env
  // dédié. Timeout élargi car la 1re compilation bâtit le cache (~15 s).
  if (lang === 'go') {
    return withTempDir(async (dir) => {
      const f = join(dir, 'sl_proj.go')
      writeFileSync(f, code, 'utf8')
      return runCapture(join(goRoot(), 'bin', 'go.exe'), ['run', f, ...(args ?? [])], undefined, { env: goEnv(), timeout: 90000 })
    })
  }
  // C / C++ : compilateurs MinGW EMBARQUÉS (resources/mingw). C++ lié en statique
  // (-static) pour ne dépendre d'aucune DLL runtime MinGW à l'exécution.
  if (lang === 'c' || lang === 'cpp') {
    return withTempDir(async (dir) => {
      const isCpp = lang === 'cpp'
      const src = join(dir, isCpp ? 'sl.cpp' : 'sl.c')
      const exe = join(dir, isCpp ? 'sl_cpp.exe' : 'sl_c.exe')
      writeFileSync(src, code, 'utf8')
      const compileArgs = isCpp ? [src, '-static', '-o', exe] : [src, '-o', exe]
      return compileExeThenRun(isCpp ? gppBin() : gccBin(), compileArgs, exe, args,
        { ...process.env, PATH: mingwBinDir() + ';' + (process.env.PATH || '') })
    })
  }
  // Java : JDK EMBARQUÉ (resources/jdk). Compilation dans un dossier temporaire
  // DÉDIÉ (sinon un Main.class périmé ferait croire à une compilation réussie).
  if (lang === 'java') {
    return withTempDir(async (dir) => {
      writeFileSync(join(dir, 'Main.java'), code, 'utf8')
      // -encoding UTF-8 : lire la source UTF-8 ; -Dstdout.encoding=UTF-8 : émettre
      // la sortie en UTF-8 (sinon les accents sortent en codepage console → mojibake).
      const comp = await runCapture(javacBin(), ['-encoding', 'UTF-8', join(dir, 'Main.java')], undefined, { timeout: 60000 })
      if (!existsSync(join(dir, 'Main.class'))) return comp || 'Erreur de compilation.'
      return runCapture(javaBin(), ['-Dstdout.encoding=UTF-8', '-cp', dir, 'Main', ...(args ?? [])])
    })
  }
  // C# : csc INTÉGRÉ à Windows (.NET Framework). Produit un .exe natif exécuté direct.
  if (lang === 'csharp') {
    return withTempDir(async (dir) => {
      const src = join(dir, 'Main.cs'); const exe = join(dir, 'sl_cs.exe')
      writeFileSync(src, code, 'utf8')
      return compileExeThenRun(cscBin(), ['/nologo', '/out:' + exe, src], exe, args)
    })
  }
  // Rust : rustc EMBARQUÉ, linké par le gcc de MinGW. Compile vers un .exe puis
  // l'exécute (l'env Rust est requis à la compilation ET à l'exécution — DLLs).
  if (lang === 'rust') {
    return withTempDir(async (dir) => {
      const src = join(dir, 'sl.rs'); const exe = join(dir, 'sl_rs.exe')
      writeFileSync(src, code, 'utf8')
      const env = rustEnv()
      const comp = await runCapture(rustcBin(), [src, '-o', exe, '-C', 'linker=' + gccBin()], undefined, { env, timeout: 90000 })
      if (!existsSync(exe)) return comp || 'Erreur de compilation.'
      return runCapture(exe, args ?? [], undefined, { env })
    })
  }
  // bash : bash MSYS2 EMBARQUÉ (PortableGit). Le script est passé par stdin —
  // /tmp, coreutils, heredocs, $1 et accents (UTF-8) fonctionnent nativement.
  return runCapture(bashBin(), [], buildBashScript(lang, code, project, args))
}

export function setupTerminalIPC() {
  ipcMain.handle('terminal:bashAvailable',   () => checkBashAvailable())
  ipcMain.handle('terminal:pythonAvailable', () => checkPythonAvailable())
  ipcMain.handle('terminal:phpAvailable',    () => checkPhpAvailable())
  ipcMain.handle('terminal:toolAvailable',   (_, { tool }) => checkToolAvailable(tool))

  // Mise en place d'un acte de mission EN COULISSES (création de fichiers /tmp),
  // via le bash EMBARQUÉ (PortableGit), non affiché — pour ne pas dévoiler les données.
  ipcMain.handle('terminal:runSetup', async (_, { setup }) => {
    if (!setup) return { ok: true }
    try {
      await runProc(bashBin(), [], { input: setup, timeout: 15000 })
      return { ok: true }
    } catch (e) {
      return { ok: false, error: String(e?.message ?? e) }
    }
  })

  // Validation : exécute le code en coulisses et renvoie la sortie à comparer.
  // `project` (+ `args`) → mode « fichier script exécuté avec arguments ».
  // `error` est renvoyé SÉPARÉMENT de `output` : avant, un plantage de la
  // toolchain arrivait dans `output` et était comparé au résultat attendu, donc
  // présenté à l'élève comme un simple « Pas tout à fait… ».
  ipcMain.handle('terminal:runValidation', async (_, { lang, code, project, args }) => {
    try {
      return { output: await runValidation(lang, code, project, args) }
    } catch (e) {
      return { output: '', error: String(e?.message ?? e) }
    }
  })

  // Validation Git : exécute les commandes de l'élève dans un dépôt jetable
  // puis renvoie la sortie de chaque commande d'inspection (à comparer côté renderer).
  ipcMain.handle('terminal:runGit', async (_, { commands, checks }) => {
    try {
      return { outputs: await runGit(commands ?? '', checks ?? []) }
    } catch (e) {
      return { outputs: [], error: String(e?.message ?? e) }
    }
  })

  ipcMain.handle('terminal:create', (event, { id, shell, cols, rows, setup }) =>
    enqueue(id, async () => {
      trace(id, 'create demande |', shell, '| session existante ?', sessions.has(id))
      // Session déjà vivante : rien à faire. Ce test est désormais FIABLE — la
      // file garantit qu'aucun kill n'est en vol au moment où on le lit.
      if (sessions.has(id)) return { ok: true }
      try {
        await createSession(id, shell, cols, rows, setup, event.sender)
        return { ok: true }
      } catch (e) {
        // Remonter l'échec : le renderer affiche « terminal indisponible »
        // au lieu de rester sur un panneau noir sans explication.
        return { ok: false, error: String(e?.message ?? e) }
      }
    }))

  ipcMain.handle('terminal:write', (_, { id, data }) => {
    const proc = sessions.get(id)
    // `ok:false` permet au renderer de savoir que la session n'existe pas
    // (ancien comportement : l'ordre était jeté en silence, et le bouton
    // « Exécuter » ne faisait rien sans le moindre message).
    if (!proc) return { ok: false }
    proc.write(data)
    return { ok: true }
  })

  ipcMain.handle('terminal:resize', (_, { id, cols, rows }) => {
    const proc = sessions.get(id)
    if (proc && cols > 0 && rows > 0) {
      try { proc.resize(cols, rows) } catch { /* session en cours de fermeture */ }
    }
  })

  ipcMain.handle('terminal:kill', (_, { id }) =>
    enqueue(id, () => {
      const proc = sessions.get(id)
      trace(id, 'kill demande | session presente ?', Boolean(proc))
      if (proc) {
        // Marquage AVANT le kill : onExit peut se déclencher immédiatement, et il
        // ne doit pas afficher « le shell s'est arrêté » pour une fermeture
        // que nous avons nous-mêmes demandée.
        killedProcs.add(proc)
        try { proc.kill() } catch { /* déjà mort */ }
      }
      sessions.delete(id)
    }))
}
