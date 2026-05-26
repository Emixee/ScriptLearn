import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import contentIndex from '../content/index.json'
import { getModule } from '../content/loader'

const ALL_LANGS = ['bash', 'python', 'powershell', 'kql', 'sql', 'regex', 'git', 'spl', 'yaml']
const LANG_LABELS = { bash: 'Bash', python: 'Python', powershell: 'PowerShell', kql: 'KQL', sql: 'SQL', regex: 'Regex', git: 'Git', spl: 'SPL', yaml: 'YAML' }
const LANG_COLORS = { bash: '#22d3ee', python: '#f59e0b', powershell: '#6366f1', kql: '#e879f9', sql: '#34d399', regex: '#fb923c', git: '#60a5fa', spl: '#a78bfa', yaml: '#facc15' }

export default function CourseMap() {
  const navigate = useNavigate()
  const { profile } = useProfile()
  const [progress, setProgress] = useState({})
  const [selectedLang, setSelectedLang] = useState('bash')

  useEffect(() => {
    if (!profile) return
    window.electronAPI.store.getProgress(profile.id).then(setProgress)
  }, [profile])

  const langData = useMemo(() => {
    return contentIndex.levels.map(level => {
      const refs = level.languages[selectedLang] ?? []
      const modules = refs.map(ref => {
        const mod = getModule(ref.id)
        const exercises = mod?.exercises ?? []
        const done = exercises.filter(ex => progress[ex.id]?.completed).length
        const total = exercises.length
        const pct = total > 0 ? Math.round((done / total) * 100) : 0
        return { ...ref, done, total, pct, locked: level.locked }
      })
      return { ...level, modules }
    })
  }, [selectedLang, progress])

  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="flex items-center gap-4 mb-8">
        <h1 className="text-2xl font-bold text-white">Carte du parcours</h1>
        {/* Sélecteur de langage */}
        <div className="flex gap-2 ml-4">
          {ALL_LANGS.map(lang => (
            <button
              key={lang}
              onClick={() => setSelectedLang(lang)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                selectedLang === lang
                  ? 'text-white'
                  : 'bg-[#1a1d2e] text-slate-400 hover:text-white border border-[#2d3748]'
              }`}
              style={selectedLang === lang
                ? { backgroundColor: LANG_COLORS[lang], color: 'white' }
                : {}}
            >
              {LANG_LABELS[lang]}
            </button>
          ))}
        </div>
      </div>

      <div className="relative">
        {/* Ligne verticale de connexion */}
        <div className="absolute left-6 top-8 bottom-8 w-0.5 bg-[#2d3748]" />

        <div className="space-y-8">
          {langData.map((level, li) => (
            <div key={level.id} className="relative pl-16">
              {/* Nœud niveau */}
              <div
                className="absolute left-3.5 top-3 w-5 h-5 rounded-full border-2 flex items-center justify-center"
                style={{
                  backgroundColor: level.locked ? '#1a1d2e' : level.color,
                  borderColor: level.locked ? '#374151' : level.color
                }}
              >
                {level.locked && <span className="text-slate-600 text-xs">🔒</span>}
              </div>

              {/* En-tête niveau */}
              <div className="mb-4">
                <h2 className="text-white font-bold">Niveau {level.id} — {level.name}</h2>
                {level.description && <p className="text-slate-500 text-xs mt-0.5">{level.description}</p>}
              </div>

              {level.modules.length === 0 ? (
                <p className="text-slate-600 text-sm italic">Aucun module {LANG_LABELS[selectedLang]} à ce niveau.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {level.modules.map((mod, mi) => (
                    <button
                      key={mod.id}
                      disabled={level.locked}
                      onClick={() => !level.locked && navigate(`/course/${selectedLang}/${level.id}/${mod.id}`)}
                      className={`bg-[#1a1d2e] rounded-xl p-4 border text-left transition-all ${
                        level.locked
                          ? 'border-[#2d3748] opacity-50 cursor-not-allowed'
                          : mod.pct === 100
                          ? 'border-green-500/40 hover:border-green-500/70'
                          : mod.pct > 0
                          ? 'border-[#6366f1]/40 hover:border-[#6366f1]'
                          : 'border-[#2d3748] hover:border-[#3d4756]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className="text-white text-sm font-medium leading-snug">{mod.title}</span>
                        {mod.pct === 100 && <span className="text-green-400 text-xs flex-shrink-0">✓</span>}
                      </div>
                      <div className="h-1 bg-[#0f1117] rounded-full overflow-hidden mb-1">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${mod.pct}%`,
                            backgroundColor: mod.pct === 100 ? '#4ade80' : LANG_COLORS[selectedLang]
                          }}
                        />
                      </div>
                      <p className="text-slate-500 text-xs">{mod.done}/{mod.total} exercices</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
