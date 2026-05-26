import { useState, useEffect, useRef, useId } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getModule } from '../content/loader'
import { parseMarkdown } from '../utils/markdown'
import AIAssistant from '../components/AIAssistant'
import WindowControls from '../components/WindowControls'
import Terminal from '../components/Terminal'
import { useProfile } from '../contexts/ProfileContext'

export default function Course() {
  const { lang, level, moduleId } = useParams()
  const navigate = useNavigate()
  const uid = useId().replace(/:/g, '')
  const termId = `course-term-${uid}`
  const { profile } = useProfile()
  const module = getModule(moduleId)
  const [activeSection, setActiveSection] = useState(0)
  const [showAI, setShowAI] = useState(false)
  const [showTerminal, setShowTerminal] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [showNote, setShowNote] = useState(false)
  const noteKey = `course:${moduleId}:${activeSection}`

  useEffect(() => {
    if (!profile) return
    window.electronAPI.store.getNote(profile.id, noteKey).then(n => setNoteText(n ?? ''))
    setShowNote(false)
  }, [profile?.id, moduleId, activeSection])

  const noteTimeout = useRef(null)
  useEffect(() => {
    if (!profile) return
    clearTimeout(noteTimeout.current)
    noteTimeout.current = setTimeout(() => {
      window.electronAPI.store.saveNote(profile.id, noteKey, noteText)
    }, 800)
    return () => clearTimeout(noteTimeout.current)
  }, [noteText, profile?.id, noteKey])

  if (!module) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0f1117]">
        <p className="text-slate-400">Module introuvable : {moduleId}</p>
      </div>
    )
  }

  const sections = module.course
  const section = sections[activeSection]
  const isFirst = activeSection === 0
  const isLast = activeSection === sections.length - 1
  const isStaticLang = ['kql', 'sql', 'spl', 'regex', 'git', 'yaml'].includes(lang)
  const isKQL = lang === 'kql'

  const LANG_COLORS = { bash: '#22d3ee', python: '#f59e0b', powershell: '#6366f1', kql: '#e879f9', sql: '#34d399', regex: '#fb923c', git: '#60a5fa', spl: '#a78bfa', yaml: '#facc15' }
  const LANG_LABELS = { bash: 'Bash', python: 'Python', powershell: 'PowerShell', kql: 'KQL', sql: 'SQL', regex: 'Regex', git: 'Git', spl: 'SPL', yaml: 'YAML' }
  const langAccent = LANG_COLORS[lang] ?? '#22d3ee'
  const langLabel = LANG_LABELS[lang] ?? lang

  return (
    <div className="flex flex-col h-screen bg-[#0f1117]">
      {/* Barre du haut */}
      <div
        className="flex items-center gap-3 px-4 py-3 bg-[#1a1d2e] border-b border-[#2d3748] flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <div className="flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
          <button onClick={() => navigate('/app/courses')}
            className="text-slate-400 hover:text-white transition-colors text-sm">
            ← Cours
          </button>
          <div className="w-px h-4 bg-[#2d3748]" />
          <span className="text-slate-400 text-xs uppercase tracking-widest">Cours</span>
          <div className="w-px h-4 bg-[#2d3748]" />
          <h1 className="text-white font-medium text-sm">{module.title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
          <span className="text-slate-500 text-xs">{module.estimatedMinutes} min</span>
          <span className="text-xs px-2 py-0.5 rounded font-medium"
            style={{ backgroundColor: `${langAccent}20`, color: langAccent }}>
            {langLabel}
          </span>
          {/* Mini-terminal toggle (seulement pour les langages avec terminal) */}
          {!isStaticLang && (
            <button
              onClick={() => setShowTerminal(v => !v)}
              title="Terminal (essayez les commandes)"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                showTerminal
                  ? 'bg-[#22d3ee]/20 text-[#22d3ee]'
                  : 'bg-[#232640] text-slate-400 hover:text-white hover:bg-[#2d3258]'
              }`}
            >
              <span>⌨</span>
              <span>Terminal</span>
            </button>
          )}
          <button
            onClick={() => setShowAI(v => !v)}
            title="Assistant IA"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
              showAI
                ? 'bg-[#6366f1] text-white'
                : 'bg-[#232640] text-slate-400 hover:text-white hover:bg-[#2d3258]'
            }`}
          >
            <span>✦</span>
            <span>IA</span>
          </button>
          <WindowControls />
        </div>
      </div>

      {/* Corps */}
      <div className="flex flex-1 overflow-hidden">
        {/* Table des matières */}
        <div className="w-56 bg-[#1a1d2e] border-r border-[#2d3748] p-3 flex flex-col flex-shrink-0 gap-1">
          <p className="text-slate-500 text-xs uppercase tracking-widest px-2 py-1 mb-1">Sections</p>
          {sections.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveSection(i)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs leading-snug transition-colors ${
                activeSection === i
                  ? 'bg-[#6366f1] text-white'
                  : 'text-slate-400 hover:text-white hover:bg-[#232640]'
              }`}
            >
              {i + 1}. {s.title}
            </button>
          ))}
          <div className="flex-1" />
          <button
            onClick={() => navigate(`/exercise/${lang}/${level}/${moduleId}/1`)}
            className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm py-2.5 rounded-lg transition-colors font-medium mt-2"
          >
            Exercices →
          </button>
        </div>

        {/* Contenu + terminal */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Contenu de la section */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-3xl">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[#6366f1] text-xs font-medium">{activeSection + 1} / {sections.length}</span>
              </div>
              <h2 className="text-white text-2xl font-bold mb-6">{section.title}</h2>
              <div
                className="text-slate-300 text-sm leading-relaxed"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(section.content) }}
              />

              {/* Note personnelle */}
              <div className="mt-8 border border-[#2d3748] rounded-xl p-4">
                <button
                  onClick={() => setShowNote(v => !v)}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1.5 w-full text-left"
                >
                  <span>{showNote ? '▾' : '▸'}</span>
                  <span>{noteText ? '📝 Ma note pour cette section' : '+ Ajouter une note'}</span>
                  {noteText && !showNote && (
                    <span className="ml-2 text-slate-600 italic truncate max-w-[300px]">{noteText.slice(0, 80)}</span>
                  )}
                </button>
                {showNote && (
                  <textarea
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder="Vos notes, résumés ou exemples personnels pour cette section…"
                    rows={4}
                    className="w-full mt-3 bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-300 resize-none focus:outline-none focus:border-[#6366f1] transition-colors leading-relaxed"
                  />
                )}
              </div>

              {/* Navigation bas de page */}
              <div className="flex justify-between mt-12 pt-6 border-t border-[#2d3748]">
                <button
                  disabled={isFirst}
                  onClick={() => setActiveSection(i => i - 1)}
                  className="text-slate-400 hover:text-white text-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ← Précédent
                </button>
                {isLast ? (
                  <button
                    onClick={() => navigate(`/exercise/${lang}/${level}/${moduleId}/1`)}
                    className="bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm px-5 py-2 rounded-lg transition-colors font-medium"
                  >
                    Commencer les exercices →
                  </button>
                ) : (
                  <button
                    onClick={() => setActiveSection(i => i + 1)}
                    className="bg-[#232640] hover:bg-[#2d3258] text-white text-sm px-5 py-2 rounded-lg transition-colors"
                  >
                    Suivant →
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Mini-terminal rétractable */}
          {showTerminal && (
            <div className="flex-shrink-0 border-t border-[#2d3748]" style={{ height: 220 }}>
              <div className="flex items-center gap-2 px-4 py-1.5 bg-[#1a1d2e] border-b border-[#2d3748]">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500/70"/>
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/70"/>
                  <div className="w-2.5 h-2.5 rounded-full bg-green-500/70"/>
                </div>
                <span className="text-slate-500 text-xs ml-1">Terminal — essayez les commandes du cours</span>
                <button
                  onClick={() => setShowTerminal(false)}
                  className="ml-auto text-slate-600 hover:text-slate-300 text-xs transition-colors"
                >
                  ✕
                </button>
              </div>
              <div style={{ height: 'calc(100% - 32px)' }} className="bg-[#0d0f16]">
                <Terminal id={termId} shell={lang} className="h-full" />
              </div>
            </div>
          )}
        </div>

        {/* Panneau Assistant IA */}
        {showAI && (
          <AIAssistant
            context={`Module "${module.title}" (${lang}), section "${section.title}".\nContenu : ${section.content.slice(0, 300)}`}
            onClose={() => setShowAI(false)}
          />
        )}
      </div>
    </div>
  )
}
