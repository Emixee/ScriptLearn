import { useState, useRef, useEffect } from 'react'
import { useProfile } from '../contexts/ProfileContext'
import { parseMarkdown } from '../utils/markdown'

// UpdateOverlay — fenêtre de progression GLOBALE pour les mises à jour.
// POURQUOI : l'installateur fait ~793 Mo (≈2,6 Go décompressés). Sans retour
// visuel clair, l'utilisateur ne sait pas où en est le téléchargement ni
// l'installation. Cet overlay, monté dans AppLayout (donc visible sur toutes les
// pages), couvre tout le cycle : disponible → téléchargement (%, Mo, vitesse,
// ETA) → lancement de l'installateur (fenêtre NSIS visible) + redémarrage.
// Réutilise l'IPC existant : update.check/download/install/onProgress.

const PHASE = { available: 'available', downloading: 'downloading', installing: 'installing', error: 'error' }

const mo = (b) => `${Math.round((b || 0) / 1048576)} Mo`
const mos = (b) => `${((b || 0) / 1048576).toFixed(1)} Mo/s`
function eta(transferred, total, bps) {
  if (!bps || !total || transferred >= total) return ''
  const s = Math.round((total - transferred) / bps)
  return s >= 60 ? `~${Math.round(s / 60)} min` : `~${s} s`
}

export default function UpdateOverlay() {
  const { updateInfo, updateAvailable } = useProfile()
  const [phase, setPhase] = useState(PHASE.available)
  const [prog, setProg] = useState({ percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 })
  const [error, setError] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const unsubRef = useRef(null)

  useEffect(() => () => { unsubRef.current?.() }, [])

  // Rien à montrer tant qu'aucune MAJ n'est disponible (ou si l'utilisateur a
  // reporté). updateInfo porte downloadUrl / assetName / assetSize / remoteVersion.
  if (!updateAvailable || !updateInfo?.available || dismissed) return null

  const accent = '#d97706'
  const totalSize = prog.total || updateInfo.assetSize || 0

  const startInstall = async () => {
    setError('')
    setPhase(PHASE.downloading)
    setProg({ percent: 0, transferred: 0, total: updateInfo.assetSize || 0, bytesPerSecond: 0 })
    // S'abonner à la progression (objet { percent, transferred, total, bytesPerSecond }).
    unsubRef.current = window.electronAPI.update.onProgress((p) => {
      if (p && typeof p === 'object') setProg(p)
    })
    const res = await window.electronAPI.update.download({
      downloadUrl: updateInfo.downloadUrl,
      assetName: updateInfo.assetName,
    })
    unsubRef.current?.(); unsubRef.current = null
    if (!res?.ok) { setError(res?.error || 'Téléchargement échoué.'); setPhase(PHASE.error); return }
    // L'installateur NSIS s'ouvre (fenêtre visible) ; l'app va se fermer puis redémarrer.
    setPhase(PHASE.installing)
    await window.electronAPI.update.install({ path: res.path })
  }

  return (
    <div className="absolute inset-0 z-[60] bg-[#0a0a09]/90 flex items-center justify-center p-8">
      <div className="bg-[#111110] border rounded-lg p-7 max-w-lg w-full shadow-2xl" style={{ borderColor: `${accent}55` }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="text-2xl">⬇️</div>
          <div>
            <div className="text-white font-semibold text-base">Mise à jour disponible</div>
            <div className="text-stone-400 text-xs">
              Version {updateInfo.remoteVersion}
              {updateInfo.assetSize ? ` · ${mo(updateInfo.assetSize)}` : ''}
            </div>
          </div>
        </div>

        {/* Notes de version (repliées si longues) */}
        {phase === PHASE.available && updateInfo.releaseNotes && (
          <div className="mb-4 max-h-40 overflow-y-auto rounded border border-[#2e2b26] bg-[#0a0a09] p-3 text-stone-300 text-xs leading-relaxed sl-prose"
            dangerouslySetInnerHTML={{ __html: parseMarkdown(updateInfo.releaseNotes) }} />
        )}

        {/* Barre de progression du téléchargement */}
        {(phase === PHASE.downloading || phase === PHASE.installing) && (
          <div className="mb-4">
            <div className="h-2 rounded-full bg-[#1c1c1a] overflow-hidden">
              <div className="h-full rounded-full transition-[width] duration-150"
                style={{ width: `${phase === PHASE.installing ? 100 : prog.percent}%`, backgroundColor: accent }} />
            </div>
            <div className="mt-2 text-xs text-stone-400 flex items-center justify-between">
              {phase === PHASE.downloading ? (
                <>
                  <span>{prog.percent}% · {mo(prog.transferred)} / {mo(totalSize)}</span>
                  <span>{prog.bytesPerSecond ? `${mos(prog.bytesPerSecond)} · ${eta(prog.transferred, totalSize, prog.bytesPerSecond)}` : 'Démarrage…'}</span>
                </>
              ) : (
                <span>Téléchargement terminé — l'installateur va s'ouvrir.</span>
              )}
            </div>
          </div>
        )}

        {phase === PHASE.installing && (
          <div className="mb-4 rounded border p-3 text-sm text-stone-200" style={{ borderColor: `${accent}40`, backgroundColor: `${accent}10` }}>
            La fenêtre d'installation va apparaître et afficher sa progression.
            <span className="text-stone-400"> L'application se ferme puis redémarrera automatiquement.</span>
          </div>
        )}

        {phase === PHASE.error && (
          <div className="mb-4 rounded border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
        )}

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          {(phase === PHASE.available || phase === PHASE.error) && (
            <>
              <button onClick={() => setDismissed(true)}
                className="px-4 py-2 rounded text-sm bg-[#1c1c1a] hover:bg-[#252520] text-stone-300 transition-colors">
                Plus tard
              </button>
              <button onClick={startInstall}
                className="px-4 py-2 rounded font-medium text-sm text-[#0a0a09] transition-colors" style={{ backgroundColor: accent }}>
                {phase === PHASE.error ? 'Réessayer' : 'Installer maintenant'}
              </button>
            </>
          )}
          {phase === PHASE.downloading && (
            <span className="text-stone-500 text-xs self-center">Téléchargement en cours… ne ferme pas l'application.</span>
          )}
        </div>
      </div>
    </div>
  )
}
