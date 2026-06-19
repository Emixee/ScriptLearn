import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import { listCampaigns } from '../content/missions'
import { LANG_LABELS } from '../lib/langs'

// Tous les langages disposent désormais de leur Voie (parcours débutant→expert) —
// plus aucune carte « à venir ».
const VOIES_A_VENIR = []

const TIER_LABELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé', expert: 'Expert' }
const DIFF_LABELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé', expert: 'Expert' }
const TIER_ORDER = ['debutant', 'intermediaire', 'avance', 'expert']

export default function Missions() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const campaigns = listCampaigns()
  const labs = campaigns.filter(c => c.kind === 'lab')
  const voies = campaigns.filter(c => c.kind === 'voie')
  const scenarios = campaigns.filter(c => c.kind === 'scenario' || !c.kind)
  // Progression brute (clé = "<campagne>:<chapitre>") pour calculer l'avancement.
  const [progress, setProgress] = useState({})

  useEffect(() => {
    if (!profile) return
    window.electronAPI.store.getProgress(profile.id).then(p => setProgress(p ?? {}))
  }, [profile?.id])

  const campaignProgress = (c) => {
    const done = c.chapters.filter(ch => progress[`${c.id}:${ch.id}`]?.completed).length
    return { done, total: c.chapters.length, pct: Math.round((done / c.chapters.length) * 100) }
  }

  // Palier courant d'une Voie = le tier du premier acte non terminé. Si tout est
  // fait → 'done' (Expert atteint). C'est ce qui « grimpe » sur la carte.
  const currentTier = (c) => {
    const next = c.chapters.find(ch => !progress[`${c.id}:${ch.id}`]?.completed)
    return next ? (next.tier ?? 'debutant') : 'done'
  }

  // Carte d'une Voie (parcours complet) — met en avant le palier qui grimpe.
  const VoieCard = (c) => {
    const { done, total, pct } = campaignProgress(c)
    const tier = currentTier(c)
    return (
      <button
        key={c.id}
        onClick={() => navigate(`/mission/${c.id}`)}
        className="text-left bg-[#111110] border border-[#2e2b26] rounded p-5 hover:border-[#d97706] transition-colors"
        style={{ borderLeftWidth: 3, borderLeftColor: c.accent ?? '#d97706' }}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-white font-semibold text-lg leading-tight">{c.title}</h2>
          {tier === 'done' ? (
            <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#86efac]/15 text-[#86efac] flex-shrink-0">Expert ✓</span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded font-medium flex-shrink-0"
              style={{ backgroundColor: `${c.accent}20`, color: c.accent }}>
              Palier : {TIER_LABELS[tier]}
            </span>
          )}
        </div>
        <p className="text-stone-400 text-sm mb-3 leading-snug">{c.tagline}</p>

        {/* Échelle des paliers — visualise la montée débutant → expert */}
        <div className="flex items-center gap-1 mb-2">
          {TIER_ORDER.map((t, i) => {
            const reached = tier === 'done' || TIER_ORDER.indexOf(tier) > i || (TIER_ORDER.indexOf(tier) === i)
            const passed = tier === 'done' || TIER_ORDER.indexOf(tier) > i
            return (
              <div key={t} className="flex-1 flex flex-col gap-1">
                <div className="h-1 rounded-full" style={{ backgroundColor: passed ? (c.accent ?? '#d97706') : (TIER_ORDER.indexOf(tier) === i ? `${c.accent}66` : '#2e2b26') }} />
                <span className="text-[8px] text-stone-600 text-center leading-none">{TIER_LABELS[t].slice(0, 4)}</span>
              </div>
            )
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500">
          <span className="px-1.5 py-0.5 rounded bg-[#1c1c1a]">{LANG_LABELS[c.language] ?? c.language}</span>
          <span className="px-1.5 py-0.5 rounded bg-[#1c1c1a]">{total} actes</span>
          <span className="px-1.5 py-0.5 rounded bg-[#1c1c1a]">~{c.estimatedMinutes} min</span>
          <span className="ml-auto text-stone-400">{done}/{total} · {pct}%</span>
        </div>
      </button>
    )
  }

  // Carte d'un Scénario (campagne thématique multi-langages).
  const ScenarioCard = (c) => {
    const { done, total, pct } = campaignProgress(c)
    const langs = [...new Set(c.chapters.map(ch => LANG_LABELS[ch.lang] ?? ch.lang))]
    return (
      <button
        key={c.id}
        onClick={() => navigate(`/mission/${c.id}`)}
        className="text-left bg-[#111110] border border-[#2e2b26] rounded p-5 hover:border-[#d97706] transition-colors"
        style={{ borderLeftWidth: 3, borderLeftColor: c.accent ?? '#d97706' }}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-white font-semibold text-lg leading-tight">{c.title}</h2>
          {pct === 100 ? (
            <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#86efac]/15 text-[#86efac] flex-shrink-0">terminé ✓</span>
          ) : done > 0 ? (
            <span className="text-[10px] px-2 py-0.5 rounded font-medium flex-shrink-0" style={{ backgroundColor: `${c.accent}20`, color: c.accent }}>{done}/{total}</span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#1c1c1a] text-stone-500 flex-shrink-0">nouveau</span>
          )}
        </div>
        <p className="text-stone-400 text-sm mb-3 leading-snug">{c.tagline}</p>
        <div className="h-1 bg-[#0a0a09] rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#86efac' : (c.accent ?? '#d97706') }} />
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500">
          <span className="px-1.5 py-0.5 rounded bg-[#1c1c1a]">{DIFF_LABELS[c.difficulty] ?? c.difficulty}</span>
          <span className="px-1.5 py-0.5 rounded bg-[#1c1c1a]">{c.chapters.length} actes</span>
          <span className="text-stone-600">·</span>
          <span className="truncate">{langs.join(' · ')}</span>
        </div>
      </button>
    )
  }

  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Missions</h1>
        <p className="text-stone-400">
          Joue dans un <span className="text-stone-200">vrai terminal Linux</span> (Labs), ou suis une <span className="text-stone-200">Voie</span> complète
          qui te mène de débutant à expert dans un langage.
        </p>
      </div>

      {/* ── Labs : terminal Linux réel (jeu) ── */}
      {labs.length > 0 && (
        <section className="mb-8">
          <div className="flex items-baseline gap-3 mb-3">
            <h3 className="text-stone-400 text-xs uppercase tracking-widest">Labs — terminal Linux réel</h3>
            <span className="text-stone-600 text-xs">Un seul terminal, on tape les commandes dedans. Objectifs en direct.</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {labs.map(c => (
              <button
                key={c.id}
                onClick={() => navigate(`/lab/${c.id}`)}
                className="text-left bg-[#111110] border border-[#2e2b26] rounded p-5 hover:border-[#d97706] transition-colors"
                style={{ borderLeftWidth: 3, borderLeftColor: c.accent ?? '#e879f9' }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h2 className="text-white font-semibold text-lg leading-tight">{c.title}</h2>
                  <span className="text-[10px] px-2 py-0.5 rounded font-medium flex-shrink-0" style={{ backgroundColor: `${c.accent ?? '#e879f9'}20`, color: c.accent ?? '#e879f9' }}>🐧 Linux WASM</span>
                </div>
                <p className="text-stone-400 text-sm mb-3 leading-snug">{c.tagline}</p>
                <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500">
                  <span className="px-1.5 py-0.5 rounded bg-[#1c1c1a]">{(c.objectives?.length ?? 0)} objectifs</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#1c1c1a]">jeu</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#1c1c1a]">sans WSL</span>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* ── Parcours complets (Voies) ── */}
      <section className="mb-8">
        <div className="flex items-baseline gap-3 mb-3">
          <h3 className="text-stone-400 text-xs uppercase tracking-widest">Parcours complets — débutant → expert</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {voies.map(VoieCard)}
          {/* Voies à venir (autres langages, prochaines vagues) */}
          {VOIES_A_VENIR.map((v, i) => (
            <div key={`soon-${i}`} className="bg-[#0a0a09] border border-dashed border-[#2e2b26] rounded p-5 opacity-70">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-stone-300 font-semibold text-sm leading-tight">{v.title}</h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#1c1c1a] text-stone-600 flex-shrink-0">bientôt</span>
              </div>
              <p className="text-stone-500 text-xs">Parcours complet {LANG_LABELS[v.lang] ?? v.lang} en préparation.</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Scénarios thématiques ── */}
      {scenarios.length > 0 && (
        <section className="mb-8">
          <div className="flex items-baseline gap-3 mb-3">
            <h3 className="text-stone-400 text-xs uppercase tracking-widest">Scénarios</h3>
            <span className="text-stone-600 text-xs">Enquêtes thématiques multi-langages.</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {scenarios.map(ScenarioCard)}
          </div>
        </section>
      )}
    </div>
  )
}
