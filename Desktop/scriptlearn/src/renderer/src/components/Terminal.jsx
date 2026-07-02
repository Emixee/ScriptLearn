import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'
import { PROMPT_MARKER, stripAnsi } from '../lib/langs'

// Thème Terminal Ambre — cohérent avec la palette de l'UI.
// Le curseur ambre est immédiatement identifiable comme l'accent de l'application.
// Les couleurs ANSI standard restent lisibles sur fond noir chaud.
const THEME = {
  background:      '#080807',  // fond légèrement plus sombre que l'UI pour la distinction
  foreground:      '#d6d0c8',  // texte crème — plus chaud que le blanc froid
  cursor:          '#d97706',  // curseur ambre — cohérence avec l'accent UI
  cursorAccent:    '#0a0a09',
  black:           '#111110',
  red:             '#f87171',
  green:           '#86efac',  // vert doux au lieu de #4ade80 (plus cohérent avec la palette)
  yellow:          '#fbbf24',  // ambre clair
  blue:            '#60a5fa',
  magenta:         '#c084fc',
  cyan:            '#22d3ee',
  white:           '#d6d0c8',  // crème chaud
  brightBlack:     '#3d3a34',
  brightRed:       '#fca5a5',
  brightGreen:     '#bbf7d0',
  brightYellow:    '#fde68a',
  brightBlue:      '#93c5fd',
  brightMagenta:   '#d8b4fe',
  brightCyan:      '#67e8f9',
  brightWhite:     '#f5f0e8'   // crème le plus clair
}

// Invite (après marqueur retiré) selon le shell — sert à isoler la SORTIE réelle
// d'une commande de l'écho de la commande tapée (le PTY réaffiche ce que l'élève
// saisit sur la ligne d'invite). Tout ce qui suit la dernière ligne d'invite d'un
// bloc = la sortie produite par la commande.
function promptRegexFor(shell) {
  if (shell === 'python') return /^(>>> |\.\.\. )/
  if (shell === 'powershell') return /^PS /
  return /^\$ /                       // bash MSYS2
}

// Longueur du suffixe de `s` qui est un PRÉFIXE du marqueur — pour gérer le cas où
// le marqueur est coupé entre deux chunks du PTY (on met ce morceau en attente).
function partialMarkerSuffixLen(s) {
  const max = Math.min(s.length, PROMPT_MARKER.length - 1)
  for (let k = max; k > 0; k--) {
    if (s.slice(s.length - k) === PROMPT_MARKER.slice(0, k)) return k
  }
  return 0
}

// onOutput(outputBlock) : appelé avec la SORTIE réelle de chaque commande exécutée
// (écho de la commande retiré), pour la validation « terminal-auto » (cours/missions).
// setup : commandes bash (mkdir/printf…) exécutées EN COULISSES à la création de la
// session, AVANT le shell interactif — garantit que les fichiers de l'acte sont prêts
// dans /tmp avant toute frappe (voir createSession dans src/main/terminal.js).
export default function Terminal({ id, shell = 'powershell', className = '', onOutput, setup }) {
  const containerRef = useRef(null)
  const xtermRef = useRef(null)
  const fitRef = useRef(null)
  const unsubRef = useRef(null)
  // Ref vers le dernier onOutput : init ne s'exécute qu'une fois (garde xtermRef),
  // mais le parent peut fournir un nouveau callback à chaque rendu.
  const onOutputRef = useRef(onOutput)
  onOutputRef.current = onOutput

  const init = useCallback(async () => {
    if (!containerRef.current || xtermRef.current) return

    const term = new XTerm({
      theme: THEME,
      fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", "Consolas", monospace',
      fontSize: 13,
      lineHeight: 1.4,
      cursorBlink: true,
      scrollback: 1000,
      convertEol: true
    })

    const fitAddon = new FitAddon()
    const linksAddon = new WebLinksAddon()
    term.loadAddon(fitAddon)
    term.loadAddon(linksAddon)
    term.open(containerRef.current)
    fitAddon.fit()

    xtermRef.current = term
    fitRef.current = fitAddon

    // Créer la session côté main process avec la taille initiale (cols/rows) —
    // le PTY en a besoin pour le retour à la ligne et l'alignement de la complétion.
    await window.electronAPI.terminal.create({ id, shell, cols: term.cols, rows: term.rows, setup })

    // ── Affichage + isolation de la sortie pour la validation terminal-auto ──────
    // Le shell émet un MARQUEUR invisible (PROMPT_MARKER) avant chaque invite. On
    // s'en sert pour : (a) le RETIRER de l'affichage (sinon des caractères de contrôle
    // pollueraient l'écran) ; (b) découper le flux en blocs « invite + commande tapée
    // + sortie ». À chaque marqueur, le bloc accumulé depuis le précédent est complet :
    // on isole la sortie réelle (lignes APRÈS la dernière ligne d'invite → l'écho de la
    // commande est exclu, ce qui règle le piège « echo "texte attendu" ») et on l'émet.
    const PROMPT_RE = promptRegexFor(shell)
    let carry = ''        // morceau de marqueur éventuellement coupé entre 2 chunks
    let turnBuf = ''      // bloc courant (depuis le dernier marqueur), marqueur retiré

    const emitTurn = (text) => {
      const cb = onOutputRef.current
      if (!cb) return
      const lines = stripAnsi(text).split('\n')
      let lastPrompt = -1
      for (let i = 0; i < lines.length; i++) {
        if (PROMPT_RE.test(lines[i])) lastPrompt = i
      }
      if (lastPrompt === -1) return           // bloc sans commande (bannière de démarrage)
      const output = lines.slice(lastPrompt + 1).join('\n').trim()
      if (output) cb(output)
    }

    unsubRef.current = window.electronAPI.terminal.onData(({ id: sid, chunk }) => {
      if (sid !== id) return
      let data = carry + chunk
      carry = ''
      let out = ''
      let mi
      while ((mi = data.indexOf(PROMPT_MARKER)) !== -1) {
        const before = data.slice(0, mi)
        out += before
        turnBuf += before
        emitTurn(turnBuf)                     // bloc complet → on isole et on émet sa sortie
        turnBuf = ''
        data = data.slice(mi + PROMPT_MARKER.length)
      }
      // Garder en attente un marqueur potentiellement coupé en fin de chunk.
      const p = partialMarkerSuffixLen(data)
      if (p > 0) { carry = data.slice(data.length - p); data = data.slice(0, data.length - p) }
      out += data
      turnBuf += data
      // Borne de sécurité : sans marqueur (ex. shell node), turnBuf ne se réinitialise
      // jamais — on évite une croissance mémoire illimitée.
      if (turnBuf.length > 16384) turnBuf = turnBuf.slice(-8192)
      term.write(out)
    })

    // Envoyer l'input utilisateur (flèches, Ctrl+C, caractères) au PTY.
    term.onData((data) => {
      window.electronAPI.terminal.write({ id, data })
    })

    // Forwarder EXPLICITE de la touche Tab vers le PTY.
    // POURQUOI : à partir d'xterm 6, Tab n'est plus toujours envoyé au shell par
    // défaut (il est laissé à la navigation clavier du navigateur) — d'où l'absence
    // de complétion alors que tout le reste fonctionne. On intercepte donc Tab,
    // on bloque le comportement par défaut du navigateur (preventDefault) et on
    // envoie nous-mêmes le caractère de tabulation (\t) qui déclenche la complétion
    // readline de bash. `return false` empêche xterm de retraiter la touche (pas de
    // double envoi). Shift+Tab → séquence de complétion inverse.
    term.attachCustomKeyEventHandler((e) => {
      if (e.type === 'keydown' && e.key === 'Tab') {
        e.preventDefault()
        const seq = e.shiftKey ? '\x1b[Z' : '\t'
        window.electronAPI.terminal.write({ id, data: seq })
        return false
      }
      return true
    })

    // Message de bienvenue
    const label = shell === 'powershell' ? 'PowerShell' : 'Bash'
    term.writeln(`\x1b[36m# Terminal ${label} — ScriptLearn\x1b[0m`)
    term.writeln('')

  }, [id, shell, setup])

  useEffect(() => {
    init()

    const observer = new ResizeObserver(() => {
      fitRef.current?.fit()
      // Informer le PTY de la nouvelle taille pour aligner le retour à la ligne
      // et la mise en page de la complétion.
      const t = xtermRef.current
      if (t) window.electronAPI.terminal.resize({ id, cols: t.cols, rows: t.rows })
    })
    if (containerRef.current) observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
      unsubRef.current?.()
      window.electronAPI.terminal.kill({ id })
      xtermRef.current?.dispose()
      xtermRef.current = null
    }
  }, [id, init])

  return (
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      style={{ padding: '8px' }}
    />
  )
}
