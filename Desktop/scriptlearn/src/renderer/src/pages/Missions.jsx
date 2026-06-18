import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import { listCampaigns } from '../content/missions'
import { LANG_LABELS } from '../lib/langs'

// Campagnes encore à écrire — affichées en « à venir » dans la section Expert pour
// donner à voir la suite (défis multi-langages, scénarios métier) sans contenu réel.
const COMING_SOON = [
  { title: 'Faille Zero Day', tagline: 'Analyse un binaire suspect et neutralise la menace (Python + C).', career: 'Sécurité offensive', accent: '#f87171' },
]

// Niveaux affichés dans l'ordre, du plus accessible au plus exigeant.
const TIERS = [
  { key: 'debutant', label: 'Débutant', desc: 'Aucun prérequis — on apprend en jouant.' },
  { key: 'intermediaire', label: 'Intermédiaire', desc: 'On réutilise les acquis et on enchaîne.' },
  { key: 'avance', label: 'Avancé', desc: 'Combiner les outils, manipuler les données.' },
  { key: 'expert', label: 'Expert', desc: 'Scripting et automatisation complète.' },
]
const DIFF_LABELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé', expert: 'Expert' }

export default function Missions() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const campaigns = listCampaigns()
  // Progression brute du profil (clé = "<campagne>:<chapitre>") pour calculer
  // l'avancement de chaque campagne, à la manière de la page Roadmap.
  const [progress, setProgress] = useState({})

  useEffect(() => {
    if (!profile) return
    window.electronAPI.store.getProgress(profile.id).then(p => setProgress(p ?? {}))
  }, [profile?.id])

  const campaignProgress = (c) => {
    const done = c.chapters.filter(ch => progress[`${c.id}:${ch.id}`]?.completed).length
    return { done, total: c.chapters.length, pct: Math.round((done / c.chapters.length) * 100) }
  }

  // Carte d'une campagne jouable.
  const CampaignCard = (c) => {
    const { done, total, pct } = campaignProgress(c)
    const langs = [...new Set(c.chapters.map(ch => LANG_LABELS[ch.lang] ?? ch.lang))]
    return (
      <button
        key={c.id}
        onClick={() => navigate(`/mission/${c.id}`)}
        className="text-left bg-[#111110] border border-[#2e2b26] rounded p-5 hover:border-[#d97706] transition-colors group"
        style={{ borderLeftWidth: 3, borderLeftColor: c.accent ?? '#d97706' }}
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <h2 className="text-white font-semibold text-lg leading-tight">{c.title}</h2>
          {pct === 100 ? (
            <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#86efac]/15 text-[#86efac] flex-shrink-0">terminée ✓</span>
          ) : done > 0 ? (
            <span className="text-[10px] px-2 py-0.5 rounded font-medium flex-shrink-0" style={{ backgroundColor: `${c.accent}20`, color: c.accent }}>{done}/{total}</span>
          ) : (
            <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#1c1c1a] text-stone-500 flex-shrink-0">nouveau</span>
          )}
        </div>
        <p className="text-stone-400 text-sm mb-3 leading-snug">{c.tagline}</p>

        <div className="h-1 bg-[#0a0a09] rounded-full overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#86efac' : (c.accent ?? '#d97706') }} />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500">
          <span className="px-1.5 py-0.5 rounded bg-[#1c1c1a]">{DIFF_LABELS[c.difficulty] ?? c.difficulty}</span>
          <span className="px-1.5 py-0.5 rounded bg-[#1c1c1a]">~{c.estimatedMinutes} min</span>
          <span className="px-1.5 py-0.5 rounded bg-[#1c1c1a]">{c.chapters.length} actes</span>
          <span className="text-stone-600">·</span>
          <span className="truncate">{langs.join(' · ')}</span>
        </div>
      </button>
    )
  }

  return (
    <div className="p-8 overflow-y-auto h-full">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Missions</h1>
        <p className="text-stone-400">
          Des aventures où tu apprends en résolvant une vraie intrigue — chaque énigme
          t'enseigne une notion puis te fait avancer dans l'histoire. Commence par le niveau Débutant.
        </p>
      </div>

      {/* Sections par niveau */}
      {TIERS.map(tier => {
        const inTier = campaigns.filter(c => (c.difficulty ?? 'intermediaire') === tier.key)
        const showComingSoon = tier.key === 'expert'
        if (inTier.length === 0 && !showComingSoon) return null
        return (
          <section key={tier.key} className="mb-8">
            <div className="flex items-baseline gap-3 mb-3">
              <h3 className="text-stone-400 text-xs uppercase tracking-widest">{tier.label}</h3>
              <span className="text-stone-600 text-xs">{tier.desc}</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {inTier.map(CampaignCard)}

              {/* Cartes « à venir » dans la section Avancé */}
              {showComingSoon && COMING_SOON.map((c, i) => (
                <div key={`soon-${i}`} className="bg-[#0a0a09] border border-dashed border-[#2e2b26] rounded p-5 opacity-70">
                  <div className="flex items-center justify-between mb-2">
                    <h2 className="text-stone-300 font-semibold text-sm leading-tight">{c.title}</h2>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-[#1c1c1a] text-stone-600 flex-shrink-0">bientôt</span>
                  </div>
                  <p className="text-stone-500 text-xs mb-3 leading-snug">{c.tagline}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1c1c1a]" style={{ color: c.accent }}>{c.career}</span>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
