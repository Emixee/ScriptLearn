import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import { getModule } from '../content/loader'
import contentIndex from '../content/index.json'
import { parseMarkdown } from '../utils/markdown'

const ALL_LANGS = ['bash', 'python', 'powershell', 'kql', 'sql', 'regex', 'git', 'spl', 'yaml']
const LANG_COLORS = { bash: '#22d3ee', python: '#f59e0b', powershell: '#d97706', kql: '#e879f9', sql: '#34d399', regex: '#fb923c', git: '#60a5fa', spl: '#a78bfa', yaml: '#facc15', html: '#e34c26', php: '#8892bf' }
const LANG_LABELS = { bash: 'Bash', python: 'Python', powershell: 'PowerShell', kql: 'KQL', sql: 'SQL', regex: 'Regex', git: 'Git', spl: 'SPL', yaml: 'YAML', html: 'HTML', php: 'PHP' }

const FILTERS = [
  { id: 'difficult',  label: 'Difficiles',    desc: '3+ tentatives' },
  { id: 'pending',    label: 'Non terminés',   desc: 'En cours' },
  { id: 'completed',  label: 'Terminés',       desc: 'Révision' },
  { id: 'all',        label: 'Tous',           desc: 'Tous les exercices' },
]

function buildFlashcards(progress) {
  const cards = []

  // Niveaux standard (Bash, Python, PowerShell — niveaux 1 à 6)
  for (const level of contentIndex.levels) {
    for (const lang of ALL_LANGS) {
      for (const ref of (level.languages[lang] ?? [])) {
        const mod = getModule(ref.id)
        if (!mod) continue
        for (const ex of mod.exercises) {
          const entry = progress[ex.id] ?? {}
          // levelId numérique (ex : 1, 2) pour les modules standard
          cards.push({ ex, lang, levelId: level.id, moduleId: ref.id, entry })
        }
      }
    }
  }

  // Langages complémentaires (SQL, Git, Regex, KQL, SPL, YAML — structure tracks)
  // levelId est ici une chaîne du type "sql-l1", "kql-l2", etc. — le routage /course/:lang/:levelId/:id le gère
  const tracks = contentIndex.complementary?.tracks ?? {}
  for (const [trackKey, track] of Object.entries(tracks)) {
    for (const level of track.levels) {
      for (const modRef of level.modules) {
        const mod = getModule(modRef.id)
        if (!mod) continue
        for (const ex of mod.exercises) {
          const entry = progress[ex.id] ?? {}
          cards.push({ ex, lang: trackKey, levelId: level.id, moduleId: modRef.id, entry })
        }
      }
    }
  }

  return cards
}

export default function Flashcards() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [progress, setProgress]   = useState({})
  const [filter, setFilter]       = useState('difficult')
  const [cardIdx, setCardIdx]     = useState(0)
  const [flipped, setFlipped]     = useState(false)
  const [langFilter, setLangFilter] = useState(null)

  useEffect(() => {
    if (!profile) return
    window.electronAPI.store.getProgress(profile.id).then(setProgress)
  }, [profile?.id])

  const allCards = useMemo(() => buildFlashcards(progress), [progress])

  const filteredCards = useMemo(() => {
    let cards = allCards
    if (langFilter) cards = cards.filter(c => c.lang === langFilter)
    if (filter === 'difficult') cards = cards.filter(c => (c.entry.attempts ?? 0) >= 3)
    else if (filter === 'pending') cards = cards.filter(c => !c.entry.completed)
    else if (filter === 'completed') cards = cards.filter(c => c.entry.completed)
    return cards
  }, [allCards, filter, langFilter])

  useEffect(() => {
    setCardIdx(0)
    setFlipped(false)
  }, [filter, langFilter])

  const card = filteredCards[cardIdx] ?? null
  const langColor = card ? (LANG_COLORS[card.lang] ?? '#d97706') : '#d97706'
  const langLabel = card ? (LANG_LABELS[card.lang] ?? card.lang) : ''

  const goNext = () => {
    setFlipped(false)
    setTimeout(() => setCardIdx(i => Math.min(i + 1, filteredCards.length - 1)), 150)
  }
  const goPrev = () => {
    setFlipped(false)
    setTimeout(() => setCardIdx(i => Math.max(i - 1, 0)), 150)
  }
  const flipCard = () => setFlipped(v => !v)

  return (
    <div className="p-8 overflow-y-auto h-full flex flex-col">
      {/* En-tête */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Révision / Flashcards</h1>
          <p className="text-stone-400 text-sm mt-1">Entraîne-toi sur les exercices qui te posent problème</p>
        </div>
        <span className="text-stone-500 text-sm bg-[#111110] border border-[#2e2b26] px-3 py-1 rounded-sm">
          {filteredCards.length} carte{filteredCards.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Filtres */}
      <div className="flex gap-3 mb-4 flex-wrap">
        {FILTERS.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`px-3 py-1.5 rounded-sm text-xs font-medium transition-colors border ${
              filter === f.id
                ? 'bg-[#d97706] text-[#0a0a09] border-[#d97706]'
                : 'bg-[#111110] text-stone-400 hover:text-white border-[#2e2b26]'
            }`}
          >
            {f.label}
            <span className="ml-1.5 opacity-60 text-[10px]">{f.desc}</span>
          </button>
        ))}
        <div className="ml-auto flex gap-2 flex-wrap">
          {ALL_LANGS.map(lang => (
            <button
              key={lang}
              onClick={() => setLangFilter(langFilter === lang ? null : lang)}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                langFilter === lang ? 'text-[#0a0a09]' : 'text-stone-500 hover:text-stone-300 bg-[#111110]'
              }`}
              style={langFilter === lang ? { backgroundColor: LANG_COLORS[lang] } : {}}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
      </div>

      {/* Flashcard */}
      {filteredCards.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-4xl mb-3">🎉</p>
            <p className="text-white font-semibold mb-1">Aucune carte dans cette catégorie</p>
            <p className="text-stone-400 text-sm">
              {filter === 'difficult' ? 'Aucun exercice avec 3+ tentatives.' :
               filter === 'pending'   ? 'Tous les exercices sont terminés !' :
               filter === 'completed' ? 'Commencez d\'abord des exercices.' :
               'Pas encore de contenu disponible.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          {/* Counter */}
          <div className="flex items-center gap-2">
            {filteredCards.map((_, i) => (
              <button
                key={i}
                onClick={() => { setFlipped(false); setCardIdx(i) }}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === cardIdx ? 'bg-white scale-125' : 'bg-[#2e2b26] hover:bg-stone-400'
                }`}
              />
            ))}
          </div>
          <p className="text-stone-500 text-xs">{cardIdx + 1} / {filteredCards.length}</p>

          {/* Card */}
          <div
            className="w-full max-w-2xl cursor-pointer"
            style={{ perspective: '1000px' }}
            onClick={flipCard}
          >
            <div
              className="relative transition-transform duration-500"
              style={{
                transformStyle: 'preserve-3d',
                transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
                minHeight: '280px'
              }}
            >
              {/* Recto */}
              <div
                className="absolute inset-0 bg-[#111110] border border-[#2e2b26] rounded p-7 flex flex-col"
                style={{ backfaceVisibility: 'hidden' }}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{ backgroundColor: `${langColor}20`, color: langColor }}>
                    {langLabel}
                  </span>
                  <div className="flex items-center gap-2">
                    {(card.entry.attempts ?? 0) >= 3 && (
                      <span className="text-xs text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                        {card.entry.attempts} tentatives
                      </span>
                    )}
                    {card.entry.completed && (
                      <span className="text-xs text-[#86efac] bg-[#86efac]/10 px-2 py-0.5 rounded">✓ Terminé</span>
                    )}
                  </div>
                </div>
                <h3 className="text-white font-semibold text-lg mb-3">{card.ex.title}</h3>
                <div className="text-stone-300 text-sm leading-relaxed flex-1"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(card.ex.instructions) }} />
                <p className="text-stone-600 text-xs text-center mt-4">Cliquez pour voir la correction</p>
              </div>

              {/* Verso */}
              <div
                className="absolute inset-0 bg-[#111110] border rounded p-7 flex flex-col"
                style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)', borderColor: `${langColor}40` }}
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-stone-500 uppercase tracking-widest">Correction</span>
                  <span className="text-xs px-2 py-0.5 rounded font-medium"
                    style={{ backgroundColor: `${langColor}20`, color: langColor }}>
                    {langLabel}
                  </span>
                </div>
                <pre className="text-[#4ade80] text-sm font-mono mb-3 whitespace-pre-wrap overflow-x-auto flex-1">
                  {card.ex.correction}
                </pre>
                {card.ex.explanation && (
                  <div className="text-stone-400 text-xs leading-relaxed border-t border-[#2e2b26] pt-3"
                    dangerouslySetInnerHTML={{ __html: parseMarkdown(card.ex.explanation) }} />
                )}
                <p className="text-stone-600 text-xs text-center mt-3">Cliquez pour retourner</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <button
              onClick={goPrev}
              disabled={cardIdx === 0}
              className="px-4 py-2 bg-[#111110] hover:bg-[#1c1c1a] text-stone-300 rounded-sm text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-[#2e2b26]"
            >
              ← Précédent
            </button>
            <button
              onClick={() => navigate(`/course/${card.lang}/${card.levelId}/${card.moduleId}`)}
              className="px-4 py-2 text-stone-400 hover:text-white text-xs transition-colors"
            >
              Voir le cours →
            </button>
            <button
              onClick={goNext}
              disabled={cardIdx === filteredCards.length - 1}
              className="px-4 py-2 bg-[#111110] hover:bg-[#1c1c1a] text-stone-300 rounded-sm text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-[#2e2b26]"
            >
              Suivant →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
