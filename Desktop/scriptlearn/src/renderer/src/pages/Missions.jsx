import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import { listCampaigns } from '../content/missions'
import { LANG_LABELS } from '../lib/langs'

// Campagnes encore à écrire — affichées en « à venir » pour donner à voir la
// vision (portfolio, scénarios métier variés) sans contenu réel derrière.
const COMING_SOON = [
  { title: 'Portfolio express', tagline: 'Construis et déploie ton premier site vitrine.', career: 'Dev web', accent: '#e34c26' },
  { title: 'Journée d\'entretien', tagline: 'Enchaîne les défis techniques d\'un vrai process de recrutement.', career: 'Tous métiers', accent: '#f59e0b' },
  { title: 'Astreinte sysadmin', tagline: 'Un serveur tombe à 2h du matin. Automatise la remise en route.', career: 'Sysadmin', accent: '#22d3ee' },
]

const DIFF_LABELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé' }

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

  return (
    <div className="p-8 overflow-y-auto h-full">
      {/* En-tête */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-1">Missions</h1>
        <p className="text-stone-400">
          Des enquêtes scénarisées où tu apprends en résolvant une vraie intrigue —
          chaque énigme résolue fait avancer l'histoire jusqu'à l'objectif final.
        </p>
      </div>

      {/* Campagnes jouables */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        {campaigns.map(c => {
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
                {/* Badge progression / état */}
                {pct === 100 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#86efac]/15 text-[#86efac] flex-shrink-0">terminée ✓</span>
                ) : done > 0 ? (
                  <span className="text-[10px] px-2 py-0.5 rounded font-medium flex-shrink-0" style={{ backgroundColor: `${c.accent}20`, color: c.accent }}>{done}/{total}</span>
                ) : (
                  <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-[#1c1c1a] text-stone-500 flex-shrink-0">nouveau</span>
                )}
              </div>
              <p className="text-stone-400 text-sm mb-3 leading-snug">{c.tagline}</p>

              {/* Barre de progression */}
              <div className="h-1 bg-[#0a0a09] rounded-full overflow-hidden mb-3">
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, backgroundColor: pct === 100 ? '#86efac' : (c.accent ?? '#d97706') }} />
              </div>

              {/* Méta : métier, difficulté, durée, langages */}
              <div className="flex flex-wrap items-center gap-2 text-[10px] text-stone-500">
                <span className="px-1.5 py-0.5 rounded bg-[#1c1c1a]">{DIFF_LABELS[c.difficulty] ?? c.difficulty}</span>
                <span className="px-1.5 py-0.5 rounded bg-[#1c1c1a]">~{c.estimatedMinutes} min</span>
                <span className="px-1.5 py-0.5 rounded bg-[#1c1c1a]">{c.chapters.length} actes</span>
                <span className="text-stone-600">·</span>
                <span className="truncate">{langs.join(' · ')}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* À venir */}
      <h3 className="text-stone-500 text-xs uppercase tracking-widest mb-3">À venir</h3>
      <div className="grid grid-cols-3 gap-4">
        {COMING_SOON.map((c, i) => (
          <div
            key={i}
            className="bg-[#0a0a09] border border-dashed border-[#2e2b26] rounded p-5 opacity-70"
          >
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-stone-300 font-semibold text-sm leading-tight">{c.title}</h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#1c1c1a] text-stone-600 flex-shrink-0">bientôt</span>
            </div>
            <p className="text-stone-500 text-xs mb-3 leading-snug">{c.tagline}</p>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1c1c1a]" style={{ color: c.accent }}>{c.career}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
