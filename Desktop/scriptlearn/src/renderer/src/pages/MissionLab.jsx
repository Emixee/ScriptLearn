import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import WasmTerminal from '../components/WasmTerminal'
import WindowControls from '../components/WindowControls'
import { getCampaign } from '../content/missions'
import { parseMarkdown } from '../utils/markdown'
import { useProfile } from '../contexts/ProfileContext'

// ─── MissionLab — mission « jeu » sur terminal Linux réel (WASM) ──────────────
// UN SEUL terminal : on tape les commandes dedans. Le moteur surveille la sortie
// EN DIRECT et combine 4 mécaniques de jeu :
//   ① Intrusion  : une jauge de MENACE qui descend à mesure qu'on neutralise.
//   ② Sysadmin   : objectifs « réparer » validés par une confirmation affichée.
//   ③ Cascade    : la checklist d'objectifs s'illumine en direct (détection sortie).
//   ④ Le Coffre  : chaque objectif révèle un FRAGMENT ; on compose le code final.
export default function MissionLab() {
  const { labId } = useParams()
  const navigate = useNavigate()
  const { profile } = useProfile()
  const lab = getCampaign(labId)

  const [done, setDone] = useState({})        // { objId: true }
  const doneRef = useRef({})                  // miroir pour la détection (closure stable)
  const [log, setLog] = useState([])          // récompenses narratives révélées
  const [vaultInput, setVaultInput] = useState('')
  const [vaultError, setVaultError] = useState(false)
  const [showFinale, setShowFinale] = useState(false)

  const accent = lab?.accent ?? '#e879f9'
  const objectives = lab?.objectives ?? []
  const doneCount = Object.keys(done).length
  const allDone = objectives.length > 0 && doneCount === objectives.length
  // Jauge de menace : 100% au départ, descend proportionnellement aux objectifs validés.
  const threat = Math.round((1 - doneCount / Math.max(1, objectives.length)) * (lab?.threatMax ?? 100))

  // Reprise : pré-marquer les objectifs déjà réussis.
  useEffect(() => {
    if (!profile || !lab) return
    window.electronAPI.store.getProgress(profile.id).then(p => {
      const map = {}
      objectives.forEach(o => { if (p[`${lab.id}:${o.id}`]?.completed) map[o.id] = true })
      doneRef.current = map
      setDone({ ...map })
    })
  }, [profile?.id, lab?.id])

  // Détection LIVE : appelée pour chaque ligne affichée par le terminal.
  // Pour chaque objectif non encore validé dont la regex `detect` matche la ligne,
  // on le valide, on révèle son fragment + sa récompense narrative, on enregistre.
  const handleOutput = useCallback((line) => {
    if (!lab) return
    let changed = false
    for (const o of objectives) {
      if (doneRef.current[o.id]) continue
      let hit = false
      try { hit = o.detect && new RegExp(o.detect, 'i').test(line) } catch { hit = false }
      if (hit) {
        doneRef.current = { ...doneRef.current, [o.id]: true }
        changed = true
        if (o.reward) setLog(l => [...l, { obj: o.id, text: o.reward }])
        if (profile) window.electronAPI.store.markExerciseDone(profile.id, `${lab.id}:${o.id}`)
      }
    }
    if (changed) setDone({ ...doneRef.current })
  }, [lab, profile?.id])

  const handleVault = () => {
    const expected = lab?.vault?.code ?? objectives.map(o => o.fragment ?? '').join('')
    if (vaultInput.trim() === expected) {
      if (profile) window.electronAPI.store.markExerciseDone(profile.id, `${lab.id}:vault`)
      setShowFinale(true)
    } else {
      setVaultError(true)
      setTimeout(() => setVaultError(false), 1200)
    }
  }

  if (!lab) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a09]">
        <div className="text-center">
          <p className="text-stone-400 mb-4">Mission introuvable.</p>
          <button onClick={() => navigate('/app/missions')} className="text-[#d97706] hover:underline text-sm">← Retour aux missions</button>
        </div>
      </div>
    )
  }

  // Fragments révélés (dans l'ordre des objectifs), pour composer le code du coffre.
  const fragments = objectives.filter(o => done[o.id]).map(o => o.fragment).filter(Boolean)

  return (
    <div className="flex flex-col h-screen bg-[#0a0a09]">
      {/* Barre du haut */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#111110] border-b border-[#2e2b26] flex-shrink-0" style={{ WebkitAppRegion: 'drag' }}>
        <div className="flex items-center gap-3 min-w-0" style={{ WebkitAppRegion: 'no-drag' }}>
          <button onClick={() => navigate('/app/missions')} className="text-stone-400 hover:text-white text-sm flex-shrink-0">← Quitter</button>
          <div className="w-px h-4 bg-[#2e2b26]" />
          <span className="text-xs font-bold uppercase tracking-wider flex-shrink-0" style={{ color: accent }}>Lab</span>
          <h1 className="text-white font-medium text-sm truncate">{lab.title}</h1>
        </div>
        <div className="ml-auto" style={{ WebkitAppRegion: 'no-drag' }}><WindowControls /></div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Panneau gauche : mission, jauge, objectifs, coffre */}
        <div className="w-[40%] max-w-[520px] flex flex-col border-r border-[#2e2b26] flex-shrink-0 overflow-y-auto p-5 gap-4">
          {/* Jauge de menace ① */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] uppercase tracking-widest text-red-400">Niveau de menace</span>
              <span className="text-xs font-bold" style={{ color: threat > 50 ? '#f87171' : threat > 0 ? '#fbbf24' : '#86efac' }}>{threat}%</span>
            </div>
            <div className="h-2 bg-[#0a0a09] rounded-full overflow-hidden border border-[#2e2b26]">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${threat}%`, background: threat > 50 ? '#f87171' : threat > 0 ? '#fbbf24' : '#86efac' }} />
            </div>
          </div>

          {/* Récit */}
          {lab.story && (
            <div className="text-stone-300 text-sm leading-relaxed sl-prose"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(lab.story) }} />
          )}

          {/* Objectifs ③ */}
          <div>
            <div className="text-stone-500 text-[10px] uppercase tracking-widest mb-2">
              Objectifs ({doneCount}/{objectives.length})
            </div>
            <div className="flex flex-col gap-2">
              {objectives.map(o => {
                const ok = !!done[o.id]
                return (
                  <div key={o.id} className="rounded border p-3 transition-colors"
                    style={{ borderColor: ok ? `${accent}55` : '#2e2b26', backgroundColor: ok ? `${accent}11` : '#111110' }}>
                    <div className="flex items-start gap-2">
                      <span className="text-sm flex-shrink-0" style={{ color: ok ? '#86efac' : '#3d3a34' }}>{ok ? '✓' : '○'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm leading-snug" style={{ color: ok ? '#d6d0c8' : '#a8a29e' }}
                          dangerouslySetInnerHTML={{ __html: parseMarkdown(o.label) }} />
                        {/* Indice repliable tant que non validé */}
                        {!ok && o.hint && (
                          <details className="mt-1">
                            <summary className="text-stone-600 text-[11px] cursor-pointer hover:text-stone-400 select-none">💡 indice</summary>
                            <div className="text-stone-500 text-[11px] mt-1" dangerouslySetInnerHTML={{ __html: parseMarkdown(o.hint) }} />
                          </details>
                        )}
                        {/* Fragment révélé ④ */}
                        {ok && o.fragment && (
                          <div className="mt-1 text-[11px]" style={{ color: accent }}>Fragment du code : <span className="font-bold text-base">{o.fragment}</span></div>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Coffre ④ — apparaît une fois tous les objectifs validés */}
          {allDone && lab.vault && (
            <div className="rounded border p-4" style={{ borderColor: `${accent}55`, backgroundColor: `${accent}10` }}>
              <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: accent }}>🔒 Le Coffre</div>
              <div className="text-stone-300 text-sm mb-2" dangerouslySetInnerHTML={{ __html: parseMarkdown(lab.vault.prompt || 'Compose le code à partir des fragments collectés.') }} />
              <div className="text-stone-500 text-xs mb-2">Fragments : {fragments.join(' · ')}</div>
              <div className="flex gap-2">
                <input
                  value={vaultInput}
                  onChange={e => setVaultInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleVault()}
                  placeholder="code du coffre"
                  className={`flex-1 bg-[#0a0a09] border rounded-sm px-3 py-1.5 text-sm text-stone-200 font-mono outline-none ${vaultError ? 'border-red-500' : 'border-[#2e2b26]'}`}
                />
                <button onClick={handleVault} className="px-4 py-1.5 rounded-sm text-sm font-medium text-[#0a0a09]" style={{ backgroundColor: accent }}>Ouvrir</button>
              </div>
              {vaultError && <div className="text-red-400 text-xs mt-1">Code incorrect.</div>}
            </div>
          )}

          {/* Journal des récompenses narratives */}
          {log.length > 0 && (
            <div className="border-t border-[#2e2b26] pt-3">
              <div className="text-stone-500 text-[10px] uppercase tracking-widest mb-2">L'enquête avance</div>
              <div className="flex flex-col gap-2">
                {log.map((e, i) => (
                  <div key={i} className="text-stone-300 text-xs leading-relaxed sl-prose" dangerouslySetInnerHTML={{ __html: parseMarkdown(e.text) }} />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Terminal Linux réel — la SEULE zone de saisie */}
        <div className="flex-1 min-w-0">
          <WasmTerminal seedFiles={lab.seedFiles || {}} title={lab.title} onOutput={handleOutput} />
        </div>
      </div>

      {/* Écran de fin */}
      {showFinale && (
        <div className="absolute inset-0 z-50 bg-[#0a0a09]/95 flex items-center justify-center p-8">
          <div className="bg-[#111110] border rounded p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl" style={{ borderColor: `${accent}40` }}>
            <div className="text-4xl mb-3">🎯</div>
            <div className="text-stone-300 text-sm leading-relaxed sl-prose" dangerouslySetInnerHTML={{ __html: parseMarkdown(lab.finale || 'Mission accomplie. La menace est neutralisée.') }} />
            <button onClick={() => navigate('/app/missions')} className="mt-6 px-5 py-2.5 rounded font-medium text-sm text-[#0a0a09]" style={{ backgroundColor: accent }}>Retour aux missions</button>
          </div>
        </div>
      )}
    </div>
  )
}
