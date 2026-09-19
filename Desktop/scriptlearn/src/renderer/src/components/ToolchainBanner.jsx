import { useEffect, useState } from 'react'
import { TOOLCHAINS } from '../lib/langs'

// ToolchainBanner — avertit quand un outil nécessaire au langage courant est
// INTROUVABLE dans l'installation.
//
// Les outils sont EMBARQUÉS dans l'app (resources/) depuis la v0.18.0 : il n'y a
// donc plus rien à installer, et cette bannière ne signale plus une dépendance
// manquante mais une INSTALLATION INCOMPLÈTE (extraction interrompue, binaire mis
// en quarantaine par un antivirus, dossier resources/ déplacé). Sans elle,
// l'élève n'a qu'un « command not found » au milieu du terminal.
// La vérification est faite côté processus principal (terminal.toolAvailable →
// existsSync sur le binaire attendu) : le renderer n'a pas accès au disque.
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
        <strong>{tc.label}</strong> introuvable dans l'installation : l'exécution de ce
        langage va échouer. Réinstalle ScriptLearn (l'installateur embarque cet outil)
        ou vérifie que le dossier <code className="px-1 bg-[#1c1c1a] rounded-sm text-amber-200 select-text">resources</code> de
        l'application n'a pas été supprimé ou mis en quarantaine par un antivirus.
      </span>
    </div>
  )
}
