import { useEffect, useRef, useCallback } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

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

export default function Terminal({ id, shell = 'powershell', className = '' }) {
  const containerRef = useRef(null)
  const xtermRef = useRef(null)
  const fitRef = useRef(null)
  const unsubRef = useRef(null)

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
    await window.electronAPI.terminal.create({ id, shell, cols: term.cols, rows: term.rows })

    // Afficher la sortie BRUTE du PTY (prompt, écho, séquences de complétion/curseur).
    // Surtout PAS de découpage par lignes : un PTY émet des fragments sans \n (le prompt,
    // les redraws de readline lors d'un Tab) qu'xterm doit recevoir tels quels pour
    // s'afficher correctement.
    unsubRef.current = window.electronAPI.terminal.onData(({ id: sid, chunk }) => {
      if (sid !== id) return
      term.write(chunk)
    })

    // Envoyer l'input utilisateur (y compris Tab, flèches, Ctrl+C) au PTY.
    term.onData((data) => {
      window.electronAPI.terminal.write({ id, data })
    })

    // Message de bienvenue
    const label = shell === 'powershell' ? 'PowerShell' : 'Bash'
    term.writeln(`\x1b[36m# Terminal ${label} — ScriptLearn\x1b[0m`)
    term.writeln('')

  }, [id, shell])

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
