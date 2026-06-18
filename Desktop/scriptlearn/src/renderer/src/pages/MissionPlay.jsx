import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import CodeMirror from '@uiw/react-codemirror'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'
import Terminal from '../components/Terminal'
import WindowControls from '../components/WindowControls'
import ToolchainBanner from '../components/ToolchainBanner'
import { getCampaign } from '../content/missions'
import { parseMarkdown } from '../utils/markdown'
import { useProfile } from '../contexts/ProfileContext'
import { useCodeRunner } from '../lib/useCodeRunner'
import { getLangExtension, isStatic, termShellFor, LANG_LABELS, LANG_COLORS } from '../lib/langs'

const STATUS = { idle: 'idle', running: 'running', success: 'success', error: 'error' }
// Libellés des paliers d'une Voie (parcours débutant → expert).
const TIER_LABELS = { debutant: 'Débutant', intermediaire: 'Intermédiaire', avance: 'Avancé', expert: 'Expert' }

const cmTheme = EditorView.theme({
  '&': { fontSize: '13px', backgroundColor: '#080807' },
  '.cm-content': { padding: '8px', fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" },
  '.cm-focused': { outline: 'none' },
  '.cm-editor': { borderRadius: '0' },
  '.cm-scroller': { fontFamily: "'JetBrains Mono', 'Cascadia Code', 'Fira Code', monospace" },
})

export default function MissionPlay() {
  const { campaignId } = useParams()
  const navigate = useNavigate()
  const { profile } = useProfile()
  const campaign = getCampaign(campaignId)

  const [chapterIdx, setChapterIdx] = useState(0)
  const [code, setCode] = useState('')
  const [status, setStatus] = useState(STATUS.idle)
  const [showReward, setShowReward] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const [showFinale, setShowFinale] = useState(false)
  // Carte des chapitres déjà réussis (clé = id de chapitre) — pour le fil d'étapes
  // et pour reprendre la mission là où on l'avait laissée.
  const [completed, setCompleted] = useState({})

  const chapter = campaign?.chapters[chapterIdx] ?? null
  const lang = chapter?.lang ?? 'bash'
  const isLast = campaign ? chapterIdx === campaign.chapters.length - 1 : false
  const staticLang = isStatic(lang)
  // termId unique par chapitre : change de chapitre = nouvelle session terminal
  // (sinon l'historique d'un acte polluerait le suivant).
  const termId = campaign ? `mission-${campaign.id}-${chapterIdx}` : 'mission-none'
  const accent = campaign?.accent ?? '#d97706'

  // Hook partagé : exécution + validation (sentinel pour exécuté, mots-clés pour statique).
  const { run, validate } = useCodeRunner(termId, lang)

  // Reprise : au montage, on charge la progression et on saute au premier acte non résolu.
  useEffect(() => {
    if (!profile || !campaign) return
    window.electronAPI.store.getProgress(profile.id).then(p => {
      const map = {}
      campaign.chapters.forEach(ch => { if (p[`${campaign.id}:${ch.id}`]?.completed) map[ch.id] = true })
      setCompleted(map)
      const firstIncomplete = campaign.chapters.findIndex(ch => !map[ch.id])
      setChapterIdx(firstIncomplete === -1 ? 0 : firstIncomplete)
    })
  }, [profile?.id, campaign?.id])

  // À chaque changement d'acte : recharger le code de départ et réinitialiser l'état.
  useEffect(() => {
    setCode(chapter?.starterCode ?? '')
    setStatus(STATUS.idle)
    setShowReward(false)
    setShowHint(false)
  }, [chapterIdx, campaign?.id])

  // Prépare les données de l'acte EN COULISSES dès l'ouverture (invocation WSL séparée,
  // NON affichée). Les fichiers atterrissent dans /tmp (partagé avec la session du
  // terminal) sans que la commande de préparation n'apparaisse jamais à l'écran —
  // sinon elle dévoilerait les données que l'élève doit découvrir avec ls/cat/grep.
  useEffect(() => {
    if (!chapter || staticLang || !chapter.setup) return
    window.electronAPI.terminal.runSetup(chapter.setup)
  }, [chapter?.id, staticLang])

  if (!campaign) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a09]">
        <div className="text-center">
          <p className="text-stone-400 mb-4">Mission introuvable.</p>
          <button onClick={() => navigate('/app/missions')} className="text-[#d97706] hover:underline text-sm">← Retour aux missions</button>
        </div>
      </div>
    )
  }

  const handleRun = async () => {
    if (staticLang) return
    setStatus(STATUS.idle)
    // S'assurer que les fichiers de données existent (créés en coulisses), au cas où
    // l'élève clique avant la fin de la préparation au chargement. Idempotent.
    if (chapter.setup) await window.electronAPI.terminal.runSetup(chapter.setup)
    run(code)
  }

  const handleValidate = async () => {
    if (!code.trim() || status === STATUS.running) return
    setStatus(STATUS.running)
    if (chapter.setup) await window.electronAPI.terminal.runSetup(chapter.setup)
    const { correct } = await validate(chapter, code)
    if (correct) {
      setStatus(STATUS.success)
      setShowReward(true)
      setCompleted(prev => ({ ...prev, [chapter.id]: true }))
      // Réutilise le store générique : un chapitre réussi = un "exercice" terminé.
      if (profile) window.electronAPI.store.markExerciseDone(profile.id, `${campaign.id}:${chapter.id}`)
    } else {
      setStatus(STATUS.error)
    }
  }

  const handleContinue = () => {
    if (isLast) { setShowFinale(true); return }
    setChapterIdx(i => i + 1)
  }

  return (
    <div className="flex flex-col h-screen bg-[#0a0a09]">
      {/* ── Barre du haut (draggable) ──────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-[#111110] border-b border-[#2e2b26] flex-shrink-0"
        style={{ WebkitAppRegion: 'drag' }}>
        <div className="flex items-center gap-3 min-w-0" style={{ WebkitAppRegion: 'no-drag' }}>
          <button onClick={() => navigate('/app/missions')} className="text-stone-400 hover:text-white transition-colors text-sm flex-shrink-0">← Quitter</button>
          <div className="w-px h-4 bg-[#2e2b26]" />
          <span className="text-xs font-bold uppercase tracking-wider flex-shrink-0" style={{ color: accent }}>Mission</span>
          <h1 className="text-white font-medium text-sm truncate">{campaign.title}</h1>
        </div>
        <div className="ml-auto flex items-center gap-3" style={{ WebkitAppRegion: 'no-drag' }}>
          {/* Fil des actes : ✓ réussi · ▸ courant · · à venir.
              Un fin séparateur « | » matérialise chaque changement de palier. */}
          <div className="flex items-center gap-1">
            {campaign.chapters.map((ch, i) => {
              const tierBreak = i > 0 && ch.tier && campaign.chapters[i - 1].tier && ch.tier !== campaign.chapters[i - 1].tier
              return (
                <span key={ch.id} className="flex items-center gap-1">
                  {tierBreak && <span className="text-[#2e2b26] text-xs">|</span>}
                  <span className="text-xs" title={`${ch.title}${ch.tier ? ' · ' + (TIER_LABELS[ch.tier] ?? ch.tier) : ''}`}
                    style={{ color: completed[ch.id] ? '#86efac' : i === chapterIdx ? accent : '#3d3a34' }}>
                    {completed[ch.id] ? '✓' : i === chapterIdx ? '▸' : '·'}
                  </span>
                </span>
              )
            })}
          </div>
          <span className="text-stone-500 text-xs">
            Acte {chapterIdx + 1} / {campaign.chapters.length}
            {chapter.tier && <span style={{ color: accent }}> · {TIER_LABELS[chapter.tier] ?? chapter.tier}</span>}
          </span>
          <WindowControls />
        </div>
      </div>

      {/* ── Corps : histoire (gauche) + code (droite) ──────────────────── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Panneau gauche — HISTOIRE */}
        <div className="w-[42%] max-w-[560px] flex flex-col border-r border-[#2e2b26] flex-shrink-0 overflow-y-auto">
          <div className="p-6">
            <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: accent }}>{chapter.title}</div>

            {/* Récit du chapitre */}
            <div className="text-stone-300 text-sm leading-relaxed mb-5"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(chapter.story) }} />

            {/* Encart pédagogique « Comment t'y prendre » — enseigne la notion AVANT
                de demander de l'appliquer. C'est ce qui rend les missions jouables
                sans aucun prérequis : on apprend en jouant. Affiché si l'acte fournit
                un exemple `teach`. */}
            {chapter.teach && (
              <div className="rounded p-3 mb-4 border" style={{ borderColor: `${accent}33`, backgroundColor: `${accent}0d` }}>
                <div className="text-[10px] uppercase tracking-widest mb-1.5" style={{ color: accent }}>Comment t'y prendre</div>
                <div className="text-stone-300 text-sm leading-relaxed sl-prose"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(chapter.teach) }} />
              </div>
            )}

            {/* Objectif concret de l'acte */}
            <div className="bg-[#111110] border border-[#2e2b26] rounded p-3 mb-4">
              <div className="text-stone-500 text-[10px] uppercase tracking-widest mb-1.5">Ta tâche</div>
              <div className="text-stone-200 text-sm leading-snug"
                dangerouslySetInnerHTML={{ __html: parseMarkdown(chapter.brief) }} />
            </div>

            {/* Indice repliable */}
            {chapter.hint && (
              <details className="mb-4" open={showHint}>
                <summary className="text-stone-500 text-xs cursor-pointer hover:text-stone-300 transition-colors select-none">
                  💡 Afficher un indice
                </summary>
                <div className="text-stone-400 text-xs mt-1.5 pl-3 border-l border-[#2e2b26] leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(chapter.hint) }} />
              </details>
            )}

            {/* Récompense narrative — révélée à la réussite, fait avancer l'intrigue */}
            {showReward && (
              <div className="mt-5 rounded p-4 border" style={{ borderColor: `${accent}40`, backgroundColor: `${accent}10` }}>
                <div className="text-[10px] uppercase tracking-widest mb-2" style={{ color: accent }}>
                  {isLast ? 'Dénouement' : 'L\'enquête avance'}
                </div>
                <div className="text-stone-200 text-sm leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: parseMarkdown(chapter.reward) }} />
                <button
                  onClick={handleContinue}
                  className="mt-4 px-4 py-2 rounded font-medium text-sm text-[#0a0a09] transition-colors"
                  style={{ backgroundColor: accent }}
                >
                  {isLast ? 'Clôturer la mission ▸' : 'Continuer ▸'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Panneau droit — CODE + sortie */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Barre d'actions */}
          <div className="flex items-center gap-3 px-4 py-2 bg-[#111110] border-b border-[#2e2b26] flex-shrink-0">
            <span className="text-xs px-2 py-0.5 rounded font-medium"
              style={{ backgroundColor: `${LANG_COLORS[lang] ?? accent}20`, color: LANG_COLORS[lang] ?? accent }}>
              {LANG_LABELS[lang] ?? lang}
            </span>
            <div className="ml-auto flex items-center gap-2">
              {!staticLang && (
                <button onClick={handleRun}
                  className="px-3 py-1.5 bg-[#1c1c1a] hover:bg-[#252520] text-stone-300 text-xs rounded-sm transition-colors">
                  ▶ Exécuter
                </button>
              )}
              <button onClick={handleValidate} disabled={status === STATUS.running}
                className="px-3 py-1.5 text-xs rounded-sm font-medium text-[#0a0a09] transition-colors disabled:opacity-50"
                style={{ backgroundColor: accent }}>
                {status === STATUS.running ? 'Vérification…' : '✓ Valider'}
              </button>
            </div>
          </div>

          <ToolchainBanner lang={lang} />

          {/* Feedback d'échec (le succès s'affiche via la récompense narrative) */}
          {status === STATUS.error && (
            <div className="px-4 py-2 bg-red-500/10 border-b border-red-500/20 text-red-300 text-xs flex-shrink-0">
              Pas encore. {staticLang ? 'Vérifie les mots-clés / la source attendus.' : `La sortie doit contenir le résultat attendu.`} Réessaie ou consulte l'indice.
            </div>
          )}

          {/* Éditeur */}
          <div className="flex-1 overflow-hidden border-b border-[#2e2b26]" style={{ minHeight: 0 }}>
            <CodeMirror
              value={code}
              onChange={setCode}
              extensions={[getLangExtension(lang), cmTheme, EditorView.lineWrapping]}
              theme={oneDark}
              height="100%"
              style={{ height: '100%' }}
              basicSetup={{ lineNumbers: true, foldGutter: false, highlightActiveLine: true, closeBrackets: true }}
            />
          </div>

          {/* Bas : terminal (langages exécutés) ou note (langages statiques) */}
          <div className="flex-shrink-0 bg-[#080807]" style={{ height: 200 }}>
            {staticLang ? (
              <div className="h-full flex items-center justify-center px-6 text-center">
                <p className="text-stone-500 text-xs leading-relaxed">
                  Langage validé par <span className="text-stone-300">analyse de la requête</span> (mots-clés / source attendus).<br />
                  Écris ta {LANG_LABELS[lang]} puis clique sur <span style={{ color: accent }}>Valider</span>.
                </p>
              </div>
            ) : (
              // key={termId} force une session neuve à chaque acte exécuté.
              <Terminal key={termId} id={termId} shell={termShellFor(lang)} className="h-full" />
            )}
          </div>
        </div>
      </div>

      {/* ── Écran de fin de mission ────────────────────────────────────── */}
      {showFinale && (
        <div className="absolute inset-0 z-50 bg-[#0a0a09]/95 flex items-center justify-center p-8">
          <div className="bg-[#111110] border rounded p-8 max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl"
            style={{ borderColor: `${accent}40` }}>
            <div className="text-4xl mb-3">🎯</div>
            <div className="text-stone-300 text-sm leading-relaxed sl-prose"
              dangerouslySetInnerHTML={{ __html: parseMarkdown(campaign.finale) }} />
            <div className="flex gap-3 mt-6">
              <button onClick={() => navigate('/app/missions')}
                className="px-5 py-2.5 rounded font-medium text-sm text-[#0a0a09]" style={{ backgroundColor: accent }}>
                Retour aux missions
              </button>
              <button onClick={() => { setShowFinale(false); setChapterIdx(0) }}
                className="px-5 py-2.5 rounded text-sm bg-[#1c1c1a] hover:bg-[#252520] text-stone-300 transition-colors">
                Rejouer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
