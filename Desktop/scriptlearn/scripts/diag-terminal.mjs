// ============================================================================
// diag-terminal.mjs — Diagnostic du terminal intégré, HORS Electron.
//
// POURQUOI ce script : quand le panneau terminal de l'app reste muet, trois
// couches peuvent être en cause et rien ne permet de les distinguer depuis
// l'interface :
//   1. les binaires embarqués (resources/) sont absents ou incomplets ;
//   2. node-pty / ConPTY ne parvient pas à lancer un shell sur cette machine ;
//   3. l'application elle-même (cycle de vie React, IPC, sérialisation des
//      sessions) tue ou n'alimente pas la session.
// Ce script exerce UNIQUEMENT les couches 1 et 2, dans un processus Node nu.
// S'il affiche une invite, le problème est dans la couche 3 (l'app) ; s'il
// échoue ici, c'est l'environnement Windows ou l'installation des toolchains.
//
// Usage :  node scripts/diag-terminal.mjs [bash|python|powershell|node ...]
//          npm run diag
// ============================================================================
import { existsSync } from 'fs'
import { join, resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import nodePty from 'node-pty'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const RES = join(ROOT, 'resources')

// Doit rester cohérent avec src/main/terminal.js (mêmes chemins, mêmes args).
// Les deux fichiers ne peuvent pas se partager ces constantes : terminal.js
// importe `electron` (app.isPackaged) et n'est pas exécutable hors Electron.
const SHELLS = {
  bash:       { file: join(RES, 'git', 'bin', 'bash.exe'), args: ['-i', '-l'] },
  python:     { file: join(RES, 'python', 'python.exe'),   args: ['-i', '-u'] },
  node:       { file: join(RES, 'node', 'node.exe'),       args: ['-i'] },
  powershell: { file: 'powershell.exe',                    args: ['-NoLogo', '-NoExit', '-Command', 'function prompt { "PS> " }'] },
}

const BINS = {
  'git/bin/bash.exe': 'bash (PortableGit)', 'python/python.exe': 'python',
  'node/node.exe': 'node', 'php/php.exe': 'php', 'mingw/bin/gcc.exe': 'gcc',
  'jdk/bin/javac.exe': 'javac', 'go/bin/go.exe': 'go', 'rust/bin/rustc.exe': 'rustc',
}

console.log(`resources/ : ${RES}\n`)
console.log('— Binaires embarqués ——————————————————————————')
let missing = 0
for (const [rel, label] of Object.entries(BINS)) {
  const ok = existsSync(join(RES, rel))
  if (!ok) missing++
  console.log(`  ${ok ? 'OK       ' : 'MANQUANT '} ${label.padEnd(20)} ${rel}`)
}
if (missing) console.log(`\n  => ${missing} binaire(s) manquant(s) : lance « npm run toolchains ».`)

// Lance un shell, attend sa première sortie, puis le referme proprement.
// On n'utilise PAS de marqueur d'invite ici : on veut savoir si le PTY produit
// des octets, pas valider un exercice.
function probe(name) {
  return new Promise((done) => {
    const { file, args } = SHELLS[name]
    if (file !== 'powershell.exe' && !existsSync(file)) {
      console.log(`  ${name.padEnd(11)} IGNORÉ   binaire absent : ${file}`)
      return done()
    }
    let out = ''
    let proc
    try {
      proc = nodePty.spawn(file, args, { name: 'xterm-256color', cols: 80, rows: 24, cwd: ROOT, env: process.env })
    } catch (e) {
      console.log(`  ${name.padEnd(11)} ÉCHEC    spawn a levé : ${e.message}`)
      return done()
    }
    // Temporisation : un shell sain écrit son invite en quelques dizaines de ms.
    // 4 s laissent large même sur un disque lent ou avec un antivirus qui inspecte.
    const timer = setTimeout(() => {
      // ESC (\x1b) est PAR DEFINITION le caractere de controle qui ouvre une
      // sequence ANSI : impossible de la retirer sans le nommer. Volontaire.
      // NB : la directive doit etre la ligne JUSTE avant le code visé — un
      // commentaire inséré entre les deux la rend inopérante.
      // eslint-disable-next-line no-control-regex
      const printable = out.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '').replace(/[\r\n]+/g, ' ').trim()
      if (printable) console.log(`  ${name.padEnd(11)} OK       ${printable.slice(0, 70)}`)
      else console.log(`  ${name.padEnd(11)} MUET     aucun octet reçu en 4 s`)
      try { proc.kill() } catch { /* déjà mort */ }
      setTimeout(done, 150)
    }, 4000)
    proc.onData((d) => { out += d })
    proc.onExit(({ exitCode, signal }) => {
      clearTimeout(timer)
      // 0xC000013A = STATUS_CONTROL_C_EXIT : code normal quand NOUS fermons le
      // pseudo-terminal. Inattendu ici, il signale que quelque chose d'autre a
      // fermé le ConPTY sous le shell.
      const hex = exitCode === undefined ? '?' : `0x${(exitCode >>> 0).toString(16).toUpperCase()}`
      const note = exitCode === -1073741510 ? ' (STATUS_CONTROL_C_EXIT — ConPTY fermé)' : ''
      console.log(`  ${name.padEnd(11)} SORTIE   code ${exitCode} ${hex}${signal ? ` signal ${signal}` : ''}${note}`)
      if (out.trim()) console.log(`              (avait écrit : ${JSON.stringify(out.slice(0, 120))})`)
      done()
    })
  })
}

const wanted = process.argv.slice(2)
const names = wanted.length ? wanted : Object.keys(SHELLS)
console.log('\n— Lancement réel via node-pty (ConPTY) ———————————')
for (const n of names) {
  if (!SHELLS[n]) { console.log(`  ${n} : shell inconnu`); continue }
  await probe(n)
}
console.log('\nLecture : « OK » = le PTY fonctionne hors Electron (le problème est dans l’app).')
console.log('          « MUET » ou « SORTIE » = ConPTY/binaire en cause sur cette machine.')
process.exit(0)
