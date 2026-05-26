import React, { useState, useRef, useEffect } from 'react'
import { Terminal, HelpCircle, CheckCircle2, Send } from 'lucide-react'
import { Button, Card } from '../UI'
import useAppStore from '../../store/useAppStore'
import { streamOllamaResponse, buildLabHintPrompt } from '../../services/ollamaService'

export default function LabTerminal({ lab, lessonId, onComplete }) {
  const { completeLab, settings, addToast } = useAppStore()
  const [lines, setLines] = useState([
    { type: 'system', text: `SOC Lab Terminal v1.0 — ${lab.title}` },
    { type: 'system', text: 'Tapez "help" pour voir les commandes disponibles.' },
    { type: 'system', text: '─'.repeat(50) },
  ])
  const [input, setInput] = useState('')
  const [answers, setAnswers] = useState({})
  const [answerInputs, setAnswerInputs] = useState({})
  const [hintCount, setHintCount] = useState(0)
  const [labDone, setLabDone] = useState(false)
  const [aiHint, setAiHint] = useState('')
  const [loadingHint, setLoadingHint] = useState(false)
  const [showFiles, setShowFiles] = useState(false)
  const termRef = useRef(null)
  const inputRef = useRef(null)
  const lang = settings.lang

  useEffect(() => {
    termRef.current?.scrollTo({ top: termRef.current.scrollHeight, behavior: 'smooth' })
  }, [lines])

  function addLine(type, text) {
    setLines(l => [...l, { type, text }])
  }

  function handleCommand() {
    const cmd = input.trim()
    if (!cmd) return
    setInput('')
    addLine('prompt', `$ ${cmd}`)

    const lower = cmd.toLowerCase()

    if (lower === 'help') {
      addLine('output', 'Commandes disponibles :')
      Object.keys(lab.commands || {}).forEach(c => addLine('output', `  ${c}`))
      if (lab.files) {
        addLine('output', '  ls — lister les fichiers')
        addLine('output', '  cat <fichier> — afficher un fichier')
      }
      return
    }

    if (lower === 'clear') {
      setLines([{ type: 'system', text: 'Terminal effacé.' }])
      return
    }

    // Check commands
    const cmdEntry = lab.commands?.[cmd] || lab.commands?.[lower]
    if (cmdEntry) {
      if (typeof cmdEntry === 'string') {
        cmdEntry.split('\n').forEach(line => addLine('output', line))
      } else if (cmdEntry.error) {
        addLine('error', cmdEntry.error)
      } else if (cmdEntry.success) {
        addLine('success', cmdEntry.message || 'Succès')
      }
      return
    }

    // ls
    if (lower === 'ls' && lab.files) {
      const fileList = Object.keys(lab.files).join('  ')
      addLine('output', fileList)
      return
    }

    // cat
    if (lower.startsWith('cat ') && lab.files) {
      const filename = cmd.slice(4).trim()
      const content = lab.files[filename]
      if (content) {
        content.split('\n').forEach(line => addLine('output', line))
      } else {
        addLine('error', `cat: ${filename}: No such file or directory`)
      }
      return
    }

    // grep simulation
    if (lower.startsWith('grep ') && lab.files) {
      const parts = cmd.slice(5).trim().split(' ')
      const pattern = parts[0].replace(/['"]/g, '')
      const filename = parts[1]
      const content = lab.files?.[filename]
      if (content) {
        const matches = content.split('\n').filter(line => line.toLowerCase().includes(pattern.toLowerCase()))
        if (matches.length === 0) addLine('output', '(no matches)')
        else matches.forEach(m => addLine('output', m))
      } else if (!filename) {
        addLine('error', 'grep: missing file argument')
      } else {
        addLine('error', `grep: ${filename}: No such file or directory`)
      }
      return
    }

    // wc -l
    if (lower.startsWith('wc') && lab.files) {
      const parts = cmd.split(' ')
      const filename = parts[parts.length - 1]
      const content = lab.files?.[filename]
      if (content) {
        const count = content.split('\n').length
        addLine('output', `${count} ${filename}`)
      } else {
        addLine('error', `wc: ${filename}: No such file or directory`)
      }
      return
    }

    addLine('error', `bash: ${cmd}: command not found`)
  }

  function handleAnswerSubmit(qId, answer) {
    const question = lab.questions.find(q => q.id === qId)
    if (!question) return

    const isCorrect = answer.trim().toLowerCase() === question.answer.toLowerCase() ||
      (question.answerAlt && question.answerAlt.some(a => a.toLowerCase() === answer.trim().toLowerCase()))

    if (isCorrect) {
      setAnswers(a => ({ ...a, [qId]: true }))
      addLine('success', `✓ Bonne réponse pour : "${question.text}"`)
      addToast(lang === 'fr' ? 'Bonne réponse !' : 'Correct!', 'success')

      const allDone = lab.questions.every(q => q.id === qId || answers[q.id])
      if (allDone) {
        finishLab()
      }
    } else {
      addLine('error', `✗ Réponse incorrecte. Essayez encore.`)
      addToast(lang === 'fr' ? 'Réponse incorrecte' : 'Incorrect answer', 'error')
    }
  }

  async function finishLab() {
    setLabDone(true)
    const xp = lab.xpReward || 150
    await completeLab(lessonId, xp)
    addLine('success', '─'.repeat(50))
    addLine('success', `🎉 LABORATOIRE COMPLÉTÉ ! +${xp} XP`)
    addToast(lang === 'fr' ? `Lab terminé ! +${xp} XP` : `Lab complete! +${xp} XP`, 'success')
    setTimeout(() => onComplete?.(), 1000)
  }

  async function getAIHint() {
    if (loadingHint) return
    setLoadingHint(true)
    setAiHint('')
    try {
      const prompt = buildLabHintPrompt(
        lang,
        lab.description || lab.title,
        lab.questions.map(q => q.text).join(', '),
        `${hintCount} indices déjà donnés`,
      )
      let full = ''
      for await (const chunk of streamOllamaResponse(prompt, settings.ollamaModel, settings.ollamaUrl)) {
        full += chunk
        setAiHint(full)
      }
      setHintCount(c => c + 1)
    } catch {
      setAiHint(lang === 'fr' ? 'Ollama non disponible. Vérifiez les paramètres.' : 'Ollama unavailable. Check settings.')
    }
    setLoadingHint(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Instructions */}
      <Card>
        <h3 style={{ marginBottom: '0.5rem', color: 'var(--accent)' }}>{lab.title}</h3>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: 1.6 }}>{lab.description}</p>

        {lab.files && (
          <div style={{ marginTop: '0.75rem' }}>
            <button
              onClick={() => setShowFiles(f => !f)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--accent-blue)', fontSize: '0.8rem',
                display: 'flex', alignItems: 'center', gap: 4,
                fontFamily: 'var(--font-sans)',
              }}
            >
              <Terminal size={14} />
              {showFiles ? 'Masquer les fichiers' : 'Voir les fichiers disponibles'} ({Object.keys(lab.files).length})
            </button>
            {showFiles && (
              <div style={{ marginTop: 6, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {Object.keys(lab.files).map(f => (
                  <span key={f} style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', background: 'var(--bg-active)', padding: '2px 8px', borderRadius: 4, color: 'var(--accent-orange)' }}>
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}
      </Card>

      {/* Terminal */}
      <div style={{ background: '#0a0a0a', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <div style={{ padding: '6px 12px', background: '#111', borderBottom: '1px solid #222', display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#28c840' }} />
          <span style={{ fontSize: '0.72rem', color: '#555', marginLeft: 8, fontFamily: 'var(--font-mono)' }}>
            soc-analyst@lab:~$
          </span>
        </div>

        <div
          ref={termRef}
          style={{ height: 300, overflowY: 'auto', padding: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.82rem' }}
        >
          {lines.map((line, i) => (
            <div key={i} style={{
              color: line.type === 'prompt' ? '#00ff88'
                : line.type === 'error' ? '#ff6b6b'
                : line.type === 'success' ? '#00ff88'
                : line.type === 'system' ? '#6b7280'
                : '#e6edf3',
              lineHeight: 1.5,
            }}>
              {line.text}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', borderTop: '1px solid #222', padding: '6px 12px', background: '#0a0a0a' }}>
          <span style={{ color: '#00ff88', fontFamily: 'var(--font-mono)', fontSize: '0.82rem', lineHeight: '32px', flexShrink: 0 }}>$ </span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleCommand()}
            placeholder={lang === 'fr' ? 'Tapez une commande...' : 'Type a command...'}
            style={{
              flex: 1, background: 'none', border: 'none', outline: 'none',
              color: '#e6edf3', fontFamily: 'var(--font-mono)', fontSize: '0.82rem',
              padding: '0 8px', caretColor: '#00ff88',
            }}
            disabled={labDone}
            autoFocus
          />
        </div>
      </div>

      {/* Questions */}
      <Card>
        <h4 style={{ marginBottom: '0.75rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
          {lang === 'fr' ? 'Questions' : 'Questions'} ({Object.keys(answers).length}/{lab.questions.length} validées)
        </h4>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {lab.questions.map(q => (
            <div key={q.id} style={{
              padding: '0.75rem',
              background: answers[q.id] ? 'rgba(0,255,136,0.05)' : 'var(--bg-active)',
              borderRadius: 'var(--radius-md)',
              border: `1px solid ${answers[q.id] ? 'var(--accent)33' : 'var(--border)'}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: answers[q.id] ? 0 : '0.5rem' }}>
                {answers[q.id]
                  ? <CheckCircle2 size={16} color="var(--accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                  : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '1px solid var(--border)', flexShrink: 0, marginTop: 2 }} />
                }
                <span style={{ fontSize: '0.875rem', color: 'var(--text-primary)' }}>{q.text}</span>
              </div>
              {!answers[q.id] && (
                <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 24 }}>
                  <input
                    value={answerInputs[q.id] || ''}
                    onChange={e => setAnswerInputs(a => ({ ...a, [q.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && handleAnswerSubmit(q.id, answerInputs[q.id] || '')}
                    placeholder={q.placeholder || (lang === 'fr' ? 'Votre réponse...' : 'Your answer...')}
                    style={{
                      flex: 1, background: 'var(--bg-base)', border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)', padding: '5px 10px',
                      color: 'var(--text-primary)', fontSize: '0.82rem',
                      fontFamily: q.type === 'command' ? 'var(--font-mono)' : 'var(--font-sans)',
                      outline: 'none',
                    }}
                    onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  />
                  <button
                    onClick={() => handleAnswerSubmit(q.id, answerInputs[q.id] || '')}
                    style={{
                      padding: '5px 12px', background: 'var(--accent-glow)',
                      border: '1px solid var(--accent)', borderRadius: 'var(--radius-sm)',
                      color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem',
                      fontFamily: 'var(--font-sans)',
                    }}
                  >
                    <Send size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* AI Hint */}
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: aiHint ? '0.75rem' : 0 }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            {lang === 'fr' ? `Indice IA (${hintCount} utilisé${hintCount > 1 ? 's' : ''})` : `AI Hint (${hintCount} used)`}
          </span>
          <Button variant="ghost" onClick={getAIHint} disabled={loadingHint} icon={<HelpCircle size={15} />} size="sm">
            {loadingHint ? '...' : (lang === 'fr' ? 'Demander un indice' : 'Get a hint')}
          </Button>
        </div>
        {aiHint && (
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.6, padding: '0.5rem', background: 'var(--bg-active)', borderRadius: 'var(--radius-sm)', borderLeft: '3px solid var(--accent-yellow)' }}>
            {aiHint}
          </div>
        )}
      </Card>
    </div>
  )
}
