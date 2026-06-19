import { useEffect, useRef, useState, useCallback } from 'react'

// ─── Terminal Linux réel via WebAssembly (v86) ───────────────────────────────
// Porté du système de labs d'Analyst SOC Training. v86 est un émulateur x86
// complet compilé en WebAssembly : il fait tourner un VRAI kernel Linux + BusyBox
// dans le renderer, totalement isolé de la machine hôte (aucune commande ne peut
// toucher le vrai système — pas besoin de WSL).
//
// Modèle « lab » : une seule fenêtre. On tape la commande dans la ligne de saisie,
// la sortie s'affiche au-dessus. C'est ce que l'utilisateur a demandé (copier les
// labs) — un terminal intégré, pas un éditeur séparé.
//
// Assets (≈12 Mo, embarqués dans l'installateur via public/v86 + asarUnpack) :
//   libv86.js (loader), buildroot-bzimage68.bin (kernel+BusyBox), v86.wasm, BIOS.
// En dev, Vite sert public/ à la racine (/v86) ; en prod (file://), les assets
// sont en ./v86 relativement à index.html (out/renderer/v86).
const isDev = import.meta.env.DEV
const V86_BASE = isDev ? '/v86' : './v86'
const V86_JS_URL = `${V86_BASE}/libv86.js`
const KERNEL_URL = `${V86_BASE}/buildroot-bzimage68.bin`

const STATES = { IDLE: 'idle', LOADING: 'loading', BOOTING: 'booting', READY: 'ready', ERROR: 'error' }

// onOutput(line) : appelé pour CHAQUE ligne affichée (commande tapée + sorties) →
//   permet au moteur de jeu de détecter en direct quand un objectif est atteint.
// onReady(send) : fournit au parent une fonction pour injecter des commandes.
export default function WasmTerminal({ seedFiles = {}, title = 'Lab', onOutput, onReady }) {
  const [status, setStatus] = useState(STATES.IDLE)
  const [lines, setLines]   = useState([])   // { type: 'prompt'|'output', text }
  const [input, setInput]   = useState('')
  const [pct, setPct]       = useState(0)
  const [err, setErr]       = useState('')

  const v86Ref     = useRef(null)
  const bootedRef  = useRef(false)
  const readyRef   = useRef(false)   // true une fois le setup (injection fichiers) terminé
  const termRef    = useRef(null)
  const inputRef   = useRef(null)
  const onOutputRef = useRef(onOutput)
  onOutputRef.current = onOutput

  // Auto-scroll vers le bas si l'utilisateur y est déjà (préserve la lecture manuelle).
  useEffect(() => {
    const el = termRef.current
    if (!el) return
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 60) {
      el.scrollTo({ top: el.scrollHeight })
    }
  }, [lines])

  // Ajoute une ligne ET la transmet au moteur de jeu (détection live).
  const pushLine = useCallback((type, text) => {
    setLines(l => [...l, { type, text }])
    onOutputRef.current?.(text)
  }, [])

  // ── Boot de l'émulateur (une seule fois) ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false
    let bootTimeout = null
    let fallback = null

    async function start() {
      try {
        setStatus(STATES.LOADING)
        setPct(0)

        // 1) Charger libv86.js (non-ESM → expose window.V86)
        if (!window.V86) {
          await new Promise((res, rej) => {
            const s = document.createElement('script')
            s.src = V86_JS_URL
            s.onload = res
            s.onerror = () => rej(new Error('Impossible de charger libv86.js (assets v86 manquants).'))
            document.head.appendChild(s)
          })
        }
        if (!window.V86) throw new Error('window.V86 indéfini après chargement de libv86.js.')

        // 2) Précharger kernel + wasm + BIOS en buffers (avec progression).
        const TOTAL_EST = (10 + 2 + 0.13 + 0.036) * 1024 * 1024
        let loaded = 0
        async function fetchBuf(url, label) {
          const r = await fetch(url)
          if (!r.ok) throw new Error(`${label} introuvable : ${url}`)
          const reader = r.body.getReader()
          const chunks = []
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            chunks.push(value); loaded += value.length
            setPct(Math.min(99, Math.round((loaded / TOTAL_EST) * 100)))
          }
          const size = chunks.reduce((t, c) => t + c.length, 0)
          const buf = new Uint8Array(size)
          let p = 0; for (const c of chunks) { buf.set(c, p); p += c.length }
          return buf.buffer
        }
        const kernelBuf = await fetchBuf(KERNEL_URL, 'Kernel')
        const wasmBuf   = await fetchBuf(`${V86_BASE}/v86.wasm`, 'v86.wasm')
        const biosBuf   = await fetchBuf(`${V86_BASE}/seabios.bin`, 'seabios.bin')
        const vgaBuf    = await fetchBuf(`${V86_BASE}/vgabios.bin`, 'vgabios.bin')
        if (cancelled) return

        setStatus(STATES.BOOTING)

        // 3) Démarrer v86. wasm_fn court-circuite le chargement interne du wasm
        //    (instanciation depuis notre buffer) → aucun problème de MIME/URL en prod.
        const emulator = new window.V86({
          wasm_fn: async (importObject) => {
            const { instance } = await WebAssembly.instantiate(wasmBuf, importObject)
            return instance.exports
          },
          memory_size: 128 * 1024 * 1024,
          vga_memory_size: 4 * 1024 * 1024,
          screen_container: null,
          bios:     { buffer: biosBuf },
          vga_bios: { buffer: vgaBuf },
          bzimage:  { buffer: kernelBuf },
          // ip=off : pas d'init réseau (sinon udhcpc attend ~60-120s au boot).
          cmdline: 'tsc=reliable mitigations=off random.trust_cpu=on console=ttyS0 ip=off',
          filesystem: {},
          autostart: true,
        })
        v86Ref.current = emulator

        bootTimeout = setTimeout(() => {
          if (!bootedRef.current) {
            emulator.destroy?.()
            setStatus(STATES.ERROR)
            setErr('Le kernel Linux n\'a pas démarré en 5 minutes. Vérifiez la RAM disponible.')
          }
        }, 300000)

        // 4) Sortie série (ttyS0) octet par octet → lignes.
        let lineBuffer = ''
        let firstOut = null
        fallback = setInterval(() => {
          if (bootedRef.current) { clearInterval(fallback); return }
          if (firstOut && Date.now() - firstOut > 45000) { emulator.serial0_send('\n'); firstOut = Date.now() }
        }, 5000)

        emulator.add_listener('serial0-output-byte', (byte) => {
          const ch = String.fromCharCode(byte)
          if (ch === '\r') return

          if (ch === '\n') {
            const line = lineBuffer; lineBuffer = ''
            if (!bootedRef.current) {
              const login = line.includes('login:')
              const shell = line.trim().endsWith('#') || line.trim().endsWith('$') || line.trim().endsWith('%')
              const isBoot = line.includes('[') && /\[\s*\d/.test(line)
              if (login || (shell && !isBoot)) {
                bootedRef.current = true
                clearInterval(fallback); clearTimeout(bootTimeout)
                const skipLogin = shell && !login
                setTimeout(() => postBoot(emulator, skipLogin), 500)
              } else if (!firstOut && line.trim()) firstOut = Date.now()
            } else if (readyRef.current) {
              // Le setup (injection) est terminé → on affiche les vraies sorties.
              pushLine('output', line)
            }
          } else {
            lineBuffer += ch
            if (!firstOut) firstOut = Date.now()
            if (!bootedRef.current) {
              if (lineBuffer.includes('login:') || lineBuffer.endsWith('# ') || lineBuffer.endsWith('$ ') || lineBuffer.endsWith('% ') || lineBuffer.endsWith('%')) {
                bootedRef.current = true
                clearInterval(fallback); clearTimeout(bootTimeout)
                const skipLogin = !lineBuffer.includes('login:')
                setTimeout(() => postBoot(emulator, skipLogin), 500)
              }
            }
          }
        })
      } catch (e) {
        if (!cancelled) { setStatus(STATES.ERROR); setErr(e.message) }
      }
    }

    // Setup post-boot : login + PS1 + injection des fichiers du lab (en silence,
    // readyRef encore false → les sorties d'injection ne sont PAS affichées, donc
    // le contenu des fichiers n'est jamais dévoilé d'un coup).
    async function postBoot(emulator, skipLogin) {
      const send = (t) => emulator.serial0_send(t + '\n')
      const wait = (ms) => new Promise(r => setTimeout(r, ms))

      if (!skipLogin) { await wait(500); send('root'); await wait(1000); send(''); await wait(1000) }
      else { await wait(500) }

      await wait(400)
      send('export PS1="joueur@linux:\\w$ "')   // PS1 simple (BusyBox ash)
      await wait(200)
      send('mkdir -p /home/joueur && cd /home/joueur')
      await wait(200)
      for (const [path, content] of Object.entries(seedFiles)) {
        await wait(150)
        send(`cat > '${path}' << 'LABEOF'`)
        for (const line of String(content).split('\n')) send(line)
        send('LABEOF')
      }
      await wait(400)
      // Repartir d'un écran propre : on bascule en mode "ready" puis on déclenche
      // un prompt frais. À partir de là, toute sortie s'affiche.
      readyRef.current = true
      setStatus(STATES.READY)
      setLines([{ type: 'output', text: `Linux prêt — ${title}. Tape tes commandes ci-dessous.` }])
      await wait(150)
      send('')  // provoque un prompt
      setTimeout(() => inputRef.current?.focus(), 200)
      onReady?.((cmd) => send(cmd))
    }

    start()
    return () => {
      cancelled = true
      clearTimeout(bootTimeout); clearInterval(fallback)
      v86Ref.current?.destroy?.()
    }
  }, [])

  function handleCommand() {
    const cmd = input.trim()
    if (!cmd || !v86Ref.current || !readyRef.current) return
    setInput('')
    pushLine('prompt', `$ ${cmd}`)
    v86Ref.current.serial0_send(cmd + '\n')
  }

  // ── Rendu ────────────────────────────────────────────────────────────────────
  if (status === STATES.LOADING || status === STATES.BOOTING) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#080807] text-center px-6">
        <div className="text-3xl mb-3 animate-pulse">🐧</div>
        <div className="text-stone-300 text-sm mb-1">
          {status === STATES.LOADING ? 'Chargement de Linux (WebAssembly)…' : 'Démarrage du noyau Linux…'}
        </div>
        <div className="text-stone-600 text-xs mb-4">≈12 Mo · kernel + BusyBox · 100% sandboxé (aucun WSL)</div>
        {status === STATES.LOADING && (
          <div className="w-64 h-1.5 bg-[#1c1c1a] rounded-full overflow-hidden">
            <div className="h-full bg-[#d97706] transition-all" style={{ width: `${pct}%` }} />
          </div>
        )}
        {status === STATES.BOOTING && <div className="text-stone-500 text-xs">Boot en cours (5-15 s)…</div>}
      </div>
    )
  }

  if (status === STATES.ERROR) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#080807] text-center px-6">
        <div className="text-3xl mb-3">⚠️</div>
        <div className="text-red-300 text-sm mb-2">Le terminal Linux n'a pas pu démarrer.</div>
        <div className="text-stone-500 text-xs mb-4 max-w-md">{err}</div>
        <button onClick={() => window.location.reload()} className="px-4 py-2 bg-[#d97706] text-[#0a0a09] rounded text-sm font-medium">Réessayer</button>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-[#080807]">
      {/* Historique */}
      <div ref={termRef} className="flex-1 overflow-y-auto p-3 font-mono text-[13px] leading-relaxed min-h-0">
        {lines.map((l, i) => (
          <div key={i} className="whitespace-pre-wrap break-words" style={{ color: l.type === 'prompt' ? '#d97706' : '#d6d0c8' }}>
            {l.text}
          </div>
        ))}
      </div>
      {/* Ligne de saisie */}
      <div className="flex items-center border-t border-[#2e2b26] px-3 py-2 flex-shrink-0">
        <span className="text-[#d97706] font-mono text-[13px] flex-shrink-0">joueur@linux:~$&nbsp;</span>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleCommand()}
          placeholder="tape une commande…"
          className="flex-1 bg-transparent border-none outline-none text-[#e6edf3] font-mono text-[13px]"
          autoFocus
        />
      </div>
    </div>
  )
}
