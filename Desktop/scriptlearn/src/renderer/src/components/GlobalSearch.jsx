import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import contentIndex from '../content/index.json'
import { getModule } from '../content/loader'

const ALL_LANGS = ['bash', 'python', 'powershell', 'kql', 'sql', 'regex', 'git', 'spl', 'yaml']
const LANG_COLORS = { bash: '#22d3ee', python: '#f59e0b', powershell: '#d97706', kql: '#e879f9', sql: '#34d399', regex: '#fb923c', git: '#60a5fa', spl: '#a78bfa', yaml: '#facc15', html: '#e34c26', php: '#8892bf' }
const LANG_LABELS = { bash: 'Bash', python: 'Python', powershell: 'PowerShell', kql: 'KQL', sql: 'SQL', regex: 'Regex', git: 'Git', spl: 'SPL', yaml: 'YAML', html: 'HTML', php: 'PHP' }

// Construire l'index de recherche une seule fois au chargement du module
// L'index couvre TOUS les contenus : niveaux standard + langages complémentaires
const SEARCH_INDEX = []

// ── Niveaux standard (Bash, Python, PowerShell — niveaux 1 à 6) ──────────────
for (const level of contentIndex.levels) {
  for (const lang of ALL_LANGS) {
    for (const ref of (level.languages[lang] ?? [])) {
      SEARCH_INDEX.push({
        type: 'module',
        id: ref.id,
        title: ref.title,
        lang,
        levelId: level.id,
        levelName: level.name,
        url: `/course/${lang}/${level.id}/${ref.id}`
      })
      const mod = getModule(ref.id)
      if (mod) {
        for (let i = 0; i < mod.exercises.length; i++) {
          const ex = mod.exercises[i]
          SEARCH_INDEX.push({
            type: 'exercise',
            id: ex.id,
            title: ex.title,
            lang,
            levelId: level.id,
            levelName: level.name,
            moduleTitle: ref.title,
            url: `/exercise/${lang}/${level.id}/${ref.id}/${i + 1}`
          })
        }
      }
    }
  }
}

// ── Langages complémentaires (SQL, Git, Regex, KQL, SPL, YAML) ───────────────
// levelName affiché sous forme "SQL — N1", "KQL — N2", etc.
const compTracks = contentIndex.complementary?.tracks ?? {}
for (const [trackKey, track] of Object.entries(compTracks)) {
  for (const level of track.levels) {
    const levelName = `${track.name} — ${level.name}`
    for (const modRef of level.modules) {
      SEARCH_INDEX.push({
        type: 'module',
        id: modRef.id,
        title: modRef.title,
        lang: trackKey,
        levelId: level.id,
        levelName,
        url: `/course/${trackKey}/${level.id}/${modRef.id}`
      })
      const mod = getModule(modRef.id)
      if (mod) {
        for (let i = 0; i < mod.exercises.length; i++) {
          const ex = mod.exercises[i]
          SEARCH_INDEX.push({
            type: 'exercise',
            id: ex.id,
            title: ex.title,
            lang: trackKey,
            levelId: level.id,
            levelName,
            moduleTitle: modRef.title,
            url: `/exercise/${trackKey}/${level.id}/${modRef.id}/${i + 1}`
          })
        }
      }
    }
  }
}

export default function GlobalSearch({ onClose }) {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return SEARCH_INDEX
      .filter(item => item.title.toLowerCase().includes(q) || item.levelName.toLowerCase().includes(q))
      .slice(0, 12)
  }, [query])

  useEffect(() => { setSelected(0) }, [results])

  const go = (item) => {
    navigate(item.url)
    onClose()
  }

  const handleKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter' && results[selected]) go(results[selected])
    if (e.key === 'Escape') onClose()
  }

  // Scroll l'élément sélectionné dans la vue
  useEffect(() => {
    const el = listRef.current?.children[selected]
    el?.scrollIntoView({ block: 'nearest' })
  }, [selected])

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="bg-[#111110] border border-[#2e2b26] rounded w-full max-w-xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#2e2b26]">
          <span className="text-stone-500 text-lg">🔍</span>
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Rechercher un cours, un exercice…"
            className="flex-1 bg-transparent text-white placeholder-stone-500 outline-none text-sm"
          />
          <kbd className="text-stone-600 text-xs border border-[#2e2b26] px-1.5 py-0.5 rounded">Esc</kbd>
        </div>

        {/* Résultats */}
        {query.trim() === '' ? (
          <div className="px-4 py-8 text-center text-stone-500 text-sm">
            Tapez pour rechercher dans {SEARCH_INDEX.length} éléments…
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-8 text-center text-stone-500 text-sm">
            Aucun résultat pour « {query} »
          </div>
        ) : (
          <div ref={listRef} className="overflow-y-auto max-h-96 py-2">
            {results.map((item, i) => (
              <button
                key={item.id + item.url}
                onClick={() => go(item)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  i === selected ? 'bg-[#1c1c1a]' : 'hover:bg-[#1c1c1a]'
                }`}
              >
                <span className="text-base flex-shrink-0">
                  {item.type === 'module' ? '📖' : '✏️'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm truncate">{item.title}</p>
                  <p className="text-stone-500 text-xs">
                    Niv. {item.levelId} · {item.levelName}
                    {item.moduleTitle && ` · ${item.moduleTitle}`}
                  </p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded flex-shrink-0 font-medium"
                  style={{ backgroundColor: `${LANG_COLORS[item.lang]}20`, color: LANG_COLORS[item.lang] }}
                >
                  {LANG_LABELS[item.lang]}
                </span>
              </button>
            ))}
          </div>
        )}

        {results.length > 0 && (
          <div className="px-4 py-2 border-t border-[#2e2b26] flex items-center gap-4 text-xs text-stone-600">
            <span>↑↓ Naviguer</span>
            <span>↵ Ouvrir</span>
            <span>{results.length} résultat{results.length > 1 ? 's' : ''}</span>
          </div>
        )}
      </div>
    </div>
  )
}
