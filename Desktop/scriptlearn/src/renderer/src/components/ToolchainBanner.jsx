import { useEffect, useState } from 'react'
import { TOOLCHAINS } from '../lib/langs'

// ToolchainBanner — affiche un avertissement si la toolchain WSL nécessaire à un
// langage compilé (gcc, g++, javac, mono) est absente. Sans ça, l'étudiant verrait
// seulement un cryptique « command not found » dans le terminal sans comprendre
// quoi installer. On vérifie côté main process (terminal.toolAvailable) car le
// renderer ne peut pas exécuter de commande WSL lui-même.
export default function ToolchainBanner({ lang }) {
  const tc = TOOLCHAINS[lang]
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    if (!tc) { setMissing(false); return }
    let cancelled = false
    // toolAvailable renvoie un booléen par outil — il suffit qu'un seul manque.
    Promise.all(tc.tools.map(t => window.electronAPI.terminal.toolAvailable(t)))
      .then(res => { if (!cancelled) setMissing(res.some(ok => !ok)) })
      .catch(() => { if (!cancelled) setMissing(false) })
    return () => { cancelled = true }
  }, [lang])

  if (!tc || !missing) return null
  return (
    <div className="px-4 py-2 bg-amber-500/10 border-b border-amber-500/20 text-amber-300 text-xs flex items-center gap-2 flex-shrink-0">
      <span>⚠</span>
      <span className="flex-1">
        Outils requis absents dans WSL pour exécuter ce langage. Installe-les avec&nbsp;:
        <code className="ml-1 px-1.5 py-0.5 bg-[#1c1c1a] rounded-sm text-amber-200 select-text">{tc.install}</code>
      </span>
    </div>
  )
}
