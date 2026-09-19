import { useEffect, useRef } from 'react'
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

// Commandes qui prennent le contrôle plein écran du terminal (éditeurs/pagers) :
// leur « sortie » = l'écran redessiné (contenant le fichier édité), qui peut inclure
// le résultat attendu (ex. `echo "TROUVE"` visible dans nano). On IGNORE ces tours
// pour la détection, sinon on validerait sur l'écran de l'éditeur, pas sur le script
// réellement lancé. Le tour `bash solution.sh` (non-éditeur) reste évalué normalement.
const EDITOR_CMD_RE = /^(nano|vim|vi|nvim|emacs|less|more|man)\b/

// Longueur du suffixe de `s` qui est un PRÉFIXE du marqueur — pour gérer le cas où
// le marqueur est coupé entre deux chunks du PTY (on met ce morceau en attente).
function partialMarkerSuffixLen(s) {
  const max = Math.min(s.length, PROMPT_MARKER.length - 1)
  for (let k = max; k > 0; k--) {
    if (s.slice(s.length - k) === PROMPT_MARKER.slice(0, k)) return k
  }
  return 0
}

// Préfixe d'invite SYNTHÉTIQUE, utilisé quand on doit tronquer le tampon d'un
// tour (voir plus bas) : emitTurn repère la sortie « après la dernière ligne
// d'invite », il faut donc qu'une ligne d'invite subsiste dans le tampon tronqué.
function promptPrefixFor(shell) {
  if (shell === 'python') return '>>> '
  if (shell === 'powershell') return 'PS '
  return '$ '
}

// onOutput(outputBlock, cmd) : appelé avec la SORTIE réelle de chaque commande
// exécutée (écho de la commande retiré), pour la validation « terminal-auto ».
// onReady(bool) : signale que la session PTY existe (ou qu'elle a échoué). Le
// parent peut ainsi désactiver « Exécuter » tant que le terminal n'est pas prêt —
// avant, un write() vers une session inexistante était jeté EN SILENCE côté main.
// setup : commandes bash (mkdir/printf…) exécutées EN COULISSES à la création de la
// session, AVANT le shell interactif — garantit que les fichiers de l'acte sont prêts
// dans /tmp avant toute frappe (voir createSession dans src/main/terminal.js).
export default function Terminal({ id, shell = 'powershell', className = '', onOutput, onReady, setup }) {
  const containerRef = useRef(null)
  const xtermRef = useRef(null)
  const fitRef = useRef(null)
  // Refs vers les derniers callbacks : l'effet d'initialisation ne s'exécute
  // qu'une fois par (id, shell), mais le parent peut fournir de nouveaux
  // callbacks à chaque rendu.
  const onOutputRef = useRef(onOutput)
  onOutputRef.current = onOutput
  const onReadyRef = useRef(onReady)
  onReadyRef.current = onReady

  useEffect(() => {
    // ── Cycle de vie ─────────────────────────────────────────────────────────
    // POURQUOI tout est dans CE useEffect avec un drapeau local `alive`, et non
    // dans un useCallback avec des refs partagées : l'initialisation est
    // ASYNCHRONE (await terminal.create) alors que le nettoyage est synchrone.
    // Séquence observée en StrictMode (et en production dès qu'un démontage
    // survient avant la fin du create — changement d'acte rapide) :
    //   run #1 crée xterm A → await → cleanup #1 (l'abonnement n'existe pas
    //   encore, donc rien n'est désabonné) → run #2 crée xterm B et s'abonne →
    //   la suite du run #1 reprend et ÉCRASE la référence d'abonnement.
    // Résultat : un écouteur fantôme filtrant le MÊME id restait actif à vie →
    // onOutput appelé deux fois par tour (double validation) et écriture dans un
    // xterm déjà dispose(). Avec un drapeau et des variables LOCALES, chaque run
    // ne nettoie que ses propres ressources.
    let alive = true
    let unsub = null
    let term = null
    let resizeTimer = null
    let lastSize = { cols: 0, rows: 0 }

    const observer = new ResizeObserver(() => {
      // Débounce : le ResizeObserver se déclenche à chaque frame pendant un
      // redimensionnement de fenêtre ; sans ça, on envoyait des dizaines de
      // resize ConPTY par seconde (chacun provoquant un redessin complet du shell).
      clearTimeout(resizeTimer)
      resizeTimer = setTimeout(() => {
        if (!alive) return
        fitRef.current?.fit()
        const t = xtermRef.current
        if (!t) return
        // Ne rien envoyer si la taille en caractères n'a pas changé (un
        // redimensionnement de quelques pixels ne change souvent rien).
        if (t.cols === lastSize.cols && t.rows === lastSize.rows) return
        lastSize = { cols: t.cols, rows: t.rows }
        window.electronAPI.terminal.resize({ id, cols: t.cols, rows: t.rows })
      }, 120)
    })

    async function init() {
      if (!containerRef.current || xtermRef.current) return

      term = new XTerm({
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
      lastSize = { cols: term.cols, rows: term.rows }

      // ── Affichage + isolation de la sortie pour la validation terminal-auto ──────
      // Le shell émet un MARQUEUR invisible (PROMPT_MARKER) avant chaque invite. On
      // s'en sert pour : (a) le RETIRER de l'affichage (sinon des caractères de contrôle
      // pollueraient l'écran) ; (b) découper le flux en blocs « invite + commande tapée
      // + sortie ». À chaque marqueur, le bloc accumulé depuis le précédent est complet :
      // on isole la sortie réelle (lignes APRÈS la dernière ligne d'invite → l'écho de la
      // commande est exclu, ce qui règle le piège « echo "texte attendu" ») et on l'émet.
      const PROMPT_RE = promptRegexFor(shell)
      const PROMPT_PREFIX = promptPrefixFor(shell)
      let carry = ''        // morceau de marqueur éventuellement coupé entre 2 chunks
      let turnBuf = ''      // bloc courant (depuis le dernier marqueur), marqueur retiré
      let turnCmd = null    // commande du tour, capturée TÔT (avant que nano ne noie le buffer)

      // Extrait la commande tapée d'un buffer : 1re ligne d'invite SUIVIE d'une autre
      // ligne (donc « Entrée » a été pressée). Capturée dès qu'elle est disponible pour
      // rester fiable même si turnBuf est ensuite tronqué par les redraws de nano.
      const extractCmd = (buf) => {
        const lines = stripAnsi(buf).split('\n')
        for (let i = 0; i < lines.length - 1; i++) {
          if (PROMPT_RE.test(lines[i])) return lines[i].replace(PROMPT_RE, '').trim()
        }
        return null
      }

      const emitTurn = (text) => {
        const cb = onOutputRef.current
        if (!cb) return
        // Ignorer les tours « éditeur/pager » (nano…) : on ne valide pas sur leur écran.
        if (turnCmd && EDITOR_CMD_RE.test(turnCmd)) return
        const lines = stripAnsi(text).split('\n')
        let lastPrompt = -1
        for (let i = 0; i < lines.length; i++) {
          if (PROMPT_RE.test(lines[i])) lastPrompt = i
        }
        if (lastPrompt === -1) return           // bloc sans commande (bannière de démarrage)
        const output = lines.slice(lastPrompt + 1).join('\n').trim()
        // On transmet aussi la commande du tour : le parent peut ainsi distinguer un
        // VRAI lancement de script (bash/python/powershell…) d'une commande d'exploration.
        if (output) cb(output, turnCmd)
      }

      unsub = window.electronAPI.terminal.onData(({ id: sid, chunk }) => {
        if (sid !== id || !alive) return
        let data = carry + chunk
        carry = ''
        let out = ''
        let mi
        while ((mi = data.indexOf(PROMPT_MARKER)) !== -1) {
          const before = data.slice(0, mi)
          out += before
          turnBuf += before
          if (turnCmd === null) turnCmd = extractCmd(turnBuf)
          emitTurn(turnBuf)                     // bloc complet → on isole et on émet sa sortie
          turnBuf = ''
          turnCmd = null                        // réarmer pour le tour suivant
          data = data.slice(mi + PROMPT_MARKER.length)
        }
        // Garder en attente un marqueur potentiellement coupé en fin de chunk.
        // Seuil de 3 caractères : avec 1, un simple « _ » tapé en fin de chunk
        // (nom de variable) était retenu et n'apparaissait qu'à la frappe suivante.
        const p = partialMarkerSuffixLen(data)
        if (p >= 3) { carry = data.slice(data.length - p); data = data.slice(0, data.length - p) }
        out += data
        turnBuf += data
        // Capturer la commande du tour DÈS qu'elle est disponible (avant troncature).
        if (turnCmd === null) turnCmd = extractCmd(turnBuf)
        // Borne de sécurité : sans marqueur (ex. shell node) ou pendant une longue session
        // nano, turnBuf ne se réinitialise pas — on évite une croissance mémoire illimitée.
        // On RÉINJECTE une ligne d'invite synthétique en tête : la troncature
        // coupait par le début et emportait la vraie ligne d'invite, donc
        // emitTurn ne trouvait plus de repère et n'émettait RIEN — toute commande
        // produisant plus de 16 Ko (un `grep -r`, un `cat` de log) n'était jamais
        // évaluée, l'élève voyait le bon résultat sans que l'acte se valide.
        if (turnBuf.length > 16384) {
          turnBuf = `${PROMPT_PREFIX}${turnCmd ?? ''}\n` + turnBuf.slice(-8192)
        }
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
      // ── Création de la session PTY, APRÈS l'installation des écouteurs ────────
      // POURQUOI dans cet ordre : `terminal:create` ne rend la main qu'une fois le
      // shell lancé (et, en mission, une fois le `setup` exécuté — jusqu'à 15 s).
      // Or le shell écrit sa bannière et sa PREMIÈRE INVITE dès qu'il démarre, donc
      // AVANT que cette promesse ne se résolve. En s'abonnant après, on jetait ces
      // premiers octets : le panneau restait vide, sans invite, et l'élève croyait
      // le terminal mort alors qu'il fonctionnait. L'écouteur filtre déjà par id,
      // s'abonner tôt est donc sans risque.
      const res = await window.electronAPI.terminal.create({ id, shell, cols: term.cols, rows: term.rows, setup })

      // Démontage pendant le create : on referme immédiatement ce qu'on vient
      // d'ouvrir. L'abonnement existe déjà cette fois-ci : le cleanup s'en charge.
      if (!alive) {
        window.electronAPI.terminal.kill({ id })
        return
      }
      if (res && res.ok === false) {
        term.writeln(`\x1b[31m# Terminal indisponible : ${res.error ?? 'erreur inconnue'}\x1b[0m`)
        term.writeln('\x1b[33m#   Toolchain manquante ? Lance « npm run toolchains » puis relance l\u2019app.\x1b[0m')
        onReadyRef.current?.(false)
        return
      }
      onReadyRef.current?.(true)
    }

    // .catch : une promesse rejetée ici (IPC indisponible) laissait un panneau
    // noir sans le moindre message et une « unhandled rejection » en console.
    init().catch((e) => {
      try { xtermRef.current?.writeln(`\x1b[31m# Erreur d'initialisation : ${String(e?.message ?? e)}\x1b[0m`) } catch { /* xterm déjà détruit */ }
      onReadyRef.current?.(false)
    })

    if (containerRef.current) observer.observe(containerRef.current)

    return () => {
      alive = false
      clearTimeout(resizeTimer)
      observer.disconnect()
      unsub?.()
      window.electronAPI.terminal.kill({ id })
      onReadyRef.current?.(false)
      xtermRef.current?.dispose()
      xtermRef.current = null
      fitRef.current = null
    }
  }, [id, shell, setup])

  return (
    // onMouseDown : xterm ne reçoit les frappes que si son textarea caché a le
    // focus, et il ne le prend que sur un clic tombant DANS sa propre zone. Les
    // 8 px de padding de ce conteneur ne lui appartiennent pas : un clic sur le
    // bord ne focalisait rien et l'élève tapait dans le vide. On refocalise donc
    // explicitement sur tout clic dans le conteneur.
    <div
      ref={containerRef}
      className={`w-full h-full ${className}`}
      style={{ padding: '8px' }}
      onMouseDown={() => xtermRef.current?.focus()}
    />
  )
}
