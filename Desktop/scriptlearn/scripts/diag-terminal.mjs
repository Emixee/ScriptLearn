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

// Sonde un shell : on le lance, on attend son invite, PUIS ON TAPE DEDANS.
// POURQUOI écrire dans le PTY : le symptôme à reproduire n'est pas « le shell
// démarre-t-il » mais « taper produit-il quelque chose ». xterm ne fait aucun
// écho local : dans l'application, chaque caractère affiché vient du shell. Un
// shell qui affiche son invite puis ignore l'entrée donne exactement la même
// image qu'un shell mort. Seule une écriture réelle départage les deux.
function probe(name) {
  return new Promise((done) => {
    const { file, args } = SHELLS[name]
    // Ligne imprimée AVANT toute tentative : ainsi aucun shell ne peut
    // disparaître silencieusement du rapport (un `return` oublié suffisait).
    process.stdout.write(`  ${name.padEnd(11)} ... `)
    if (file !== 'powershell.exe' && !existsSync(file)) {
      console.log(`IGNORÉ   binaire absent : ${file}`)
      return done()
    }
    let out = ''
    let beforeWrite = -1
    let proc
    let finished = false
    // Déclarées AVANT finish()/onExit() qui les annulent : node-pty peut émettre
    // `exit` immédiatement, et un `const` déclaré plus bas lèverait alors
    // « Cannot access 't1' before initialization » au lieu du vrai diagnostic.
    let t1 = null
    let t2 = null
    const finish = (verdict, detail) => {
      if (finished) return
      finished = true
      clearTimeout(t1); clearTimeout(t2)
      console.log(verdict + (detail ? '   ' + detail : ''))
      try { proc.kill() } catch { /* déjà mort */ }
      setTimeout(done, 150)
    }
    try {
      proc = nodePty.spawn(file, args, { name: 'xterm-256color', cols: 80, rows: 24, cwd: ROOT, env: process.env })
    } catch (e) {
      console.log(`ÉCHEC    spawn a levé : ${e.message}`)
      return done()
    }
    proc.onData((d) => { out += d })
    proc.onExit(({ exitCode, signal }) => {
      if (finished) return
      finished = true
      clearTimeout(t1); clearTimeout(t2)
      // 0xC000013A = STATUS_CONTROL_C_EXIT : code d'un processus dont le
      // pseudo-terminal a été fermé. Inattendu ici, il désigne un tiers.
      const note = exitCode === -1073741510 ? ' (STATUS_CONTROL_C_EXIT — ConPTY fermé)' : ''
      const quand = beforeWrite === -1 ? 'avant toute frappe' : 'après la frappe'
      console.log(`MORT     code ${exitCode}${signal ? ' signal ' + signal : ''}${note} — ${quand}`)
      if (out.trim()) console.log(`              avait écrit : ${JSON.stringify(out.slice(0, 100))}`)
      done()
    })
    // 1,2 s : le temps qu'un shell affiche son invite (bash MSYS est le plus lent).
    t1 = setTimeout(() => {
      if (finished) return
      beforeWrite = out.length
      // `echo` existe dans les quatre shells testés. Le \r est la touche Entrée.
      proc.write('echo SL_DIAG_OK\r')
    }, 1200)
    t2 = setTimeout(() => {
      // eslint-disable-next-line no-control-regex
      const clean = out.replace(/\x1b\[[0-9;?]*[a-zA-Z]/g, '')
      if (beforeWrite === -1) finish('MUET', 'aucune invite en 1,2 s')
      else if (clean.includes('SL_DIAG_OK')) finish('OK', 'invite + écho de la frappe')
      else if (out.length > beforeWrite) finish('PARTIEL', 'le shell répond mais sans écho de la commande')
      else finish('SOURD', 'invite affichée, mais la frappe ne produit RIEN — symptôme reproduit hors Electron')
    }, 3200)
  })
}

const wanted = process.argv.slice(2)
const names = wanted.length ? wanted : Object.keys(SHELLS)
console.log('\n— Lancement réel via node-pty (ConPTY) ———————————')
for (const n of names) {
  if (!SHELLS[n]) { console.log(`  ${n} : shell inconnu`); continue }
  await probe(n)
}
console.log('\nLecture :')
console.log('  OK       le PTY fonctionne hors Electron -> le problème est dans l’application.')
console.log('  SOURD    l’invite s’affiche mais la frappe ne produit rien -> ConPTY/le shell.')
console.log('  MORT     le shell s’arrête seul -> le code de sortie dit qui l’a fermé.')
console.log('  MUET     aucune invite -> binaire ou ConPTY en cause sur cette machine.')
process.exit(0)
