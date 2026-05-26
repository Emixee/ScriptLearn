import React, { useState, useCallback } from 'react'
import { CheckCircle2, XCircle, ChevronRight, RefreshCw, Trophy } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button, Card, ProgressBar } from '../UI'
import useAppStore from '../../store/useAppStore'

export default function QuizModule({ quiz, lessonId, onComplete }) {
  const { completeQuiz, settings, addToast } = useAppStore()
  const [current, setCurrent] = useState(0)
  const [selected, setSelected] = useState(null)
  const [answers, setAnswers] = useState([])
  const [showExplanation, setShowExplanation] = useState(false)
  const [finished, setFinished] = useState(false)
  const [score, setScore] = useState(0)

  const q = quiz[current]
  const isLast = current === quiz.length - 1
  const lang = settings.lang

  function handleSelect(idx) {
    if (selected !== null) return
    setSelected(idx)
    setShowExplanation(true)
    const isCorrect = idx === q.correct
    setAnswers(a => [...a, { questionId: q.id, selected: idx, correct: isCorrect }])
  }

  async function handleNext() {
    if (isLast) {
      const finalScore = answers.filter(a => a.correct).length
      setScore(finalScore)
      setFinished(true)
      const xp = Math.round((finalScore / quiz.length) * (q.xpReward || 50))
      const saved = await completeQuiz(lessonId, finalScore, quiz.length, xp)
      if (finalScore / quiz.length >= 0.7) {
        addToast(lang === 'fr' ? `Quiz réussi ! +${xp} XP` : `Quiz passed! +${xp} XP`, 'success')
        onComplete?.()
      }
    } else {
      setCurrent(c => c + 1)
      setSelected(null)
      setShowExplanation(false)
    }
  }

  function handleRetry() {
    setCurrent(0)
    setSelected(null)
    setAnswers([])
    setShowExplanation(false)
    setFinished(false)
    setScore(0)
  }

  if (finished) {
    const pct = Math.round((score / quiz.length) * 100)
    const passed = pct >= 70

    return (
      <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem', gap: '1.5rem' }}>
        <div style={{ fontSize: '4rem' }}>{passed ? '🏆' : '📚'}</div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: passed ? 'var(--accent)' : 'var(--accent-orange)', marginBottom: 8 }}>
            {passed
              ? (lang === 'fr' ? 'Quiz réussi !' : 'Quiz passed!')
              : (lang === 'fr' ? 'Continuez vos efforts !' : 'Keep going!')}
          </h2>
          <div style={{ fontSize: '3rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: passed ? 'var(--accent)' : 'var(--accent-orange)' }}>
            {pct}%
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: 8 }}>
            {score}/{quiz.length} {lang === 'fr' ? 'bonnes réponses' : 'correct answers'}
          </p>
        </div>

        <Card style={{ width: '100%', maxWidth: 480 }}>
          <ProgressBar value={score} max={quiz.length} color={passed ? 'var(--accent)' : 'var(--accent-orange)'} height={8} />
          <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {quiz.map((q, i) => {
              const ans = answers[i]
              return (
                <div key={q.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}>
                  {ans?.correct
                    ? <CheckCircle2 size={16} color="var(--accent)" />
                    : <XCircle size={16} color="var(--accent-red)" />
                  }
                  <span style={{ color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {q.question}
                  </span>
                </div>
              )
            })}
          </div>
        </Card>

        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <Button variant="secondary" icon={<RefreshCw size={15} />} onClick={handleRetry}>
            {lang === 'fr' ? 'Réessayer' : 'Retry'}
          </Button>
          {passed && (
            <Button onClick={onComplete} icon={<ChevronRight size={15} />}>
              {lang === 'fr' ? 'Continuer' : 'Continue'}
            </Button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Progress */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {lang === 'fr' ? 'Question' : 'Question'} {current + 1}/{quiz.length}
        </span>
        <ProgressBar value={current + 1} max={quiz.length} color="var(--accent)" height={4} />
      </div>

      {/* Question */}
      <Card>
        <div className="markdown-content" style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '1.25rem', lineHeight: 1.6 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.question}</ReactMarkdown>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {q.options.map((opt, idx) => {
            let bg = 'var(--bg-active)'
            let border = 'var(--border)'
            let color = 'var(--text-primary)'
            let icon = null

            if (selected !== null) {
              if (idx === q.correct) {
                bg = 'rgba(0,255,136,0.1)'; border = 'var(--accent)'; color = 'var(--accent)'
                icon = <CheckCircle2 size={16} color="var(--accent)" />
              } else if (idx === selected && idx !== q.correct) {
                bg = 'rgba(255,107,107,0.1)'; border = 'var(--accent-red)'; color = 'var(--accent-red)'
                icon = <XCircle size={16} color="var(--accent-red)" />
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={selected !== null}
                style={{
                  width: '100%', textAlign: 'left',
                  padding: '0.75rem 1rem',
                  background: bg,
                  border: `1px solid ${border}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: selected === null ? 'pointer' : 'default',
                  color,
                  fontSize: '0.9rem',
                  fontFamily: 'var(--font-sans)',
                  transition: 'all var(--transition)',
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                }}
                onMouseEnter={e => { if (selected === null) e.currentTarget.style.background = 'var(--bg-hover)' }}
                onMouseLeave={e => { if (selected === null) e.currentTarget.style.background = bg }}
              >
                <span style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: 'var(--bg-base)',
                  border: `1px solid ${border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.7rem', fontWeight: 700, flexShrink: 0,
                  color,
                }}>
                  {icon || String.fromCharCode(65 + idx)}
                </span>
                <div className="markdown-content" style={{ fontSize: '0.9rem' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{opt}</ReactMarkdown>
                </div>
              </button>
            )
          })}
        </div>
      </Card>

      {/* Explanation */}
      {showExplanation && (
        <Card className="fade-in" style={{ borderColor: selected === q.correct ? 'var(--accent)33' : 'var(--accent-red)33' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
            {selected === q.correct
              ? <CheckCircle2 size={16} color="var(--accent)" />
              : <XCircle size={16} color="var(--accent-red)" />
            }
            <span style={{ fontWeight: 600, fontSize: '0.9rem', color: selected === q.correct ? 'var(--accent)' : 'var(--accent-red)' }}>
              {selected === q.correct
                ? (lang === 'fr' ? 'Correct !' : 'Correct!')
                : (lang === 'fr' ? 'Incorrect' : 'Incorrect')
              }
            </span>
          </div>
          <div className="markdown-content" style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{q.explanation}</ReactMarkdown>
          </div>
          <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end' }}>
            <Button onClick={handleNext} icon={<ChevronRight size={15} />}>
              {isLast
                ? (lang === 'fr' ? 'Terminer le quiz' : 'Finish quiz')
                : (lang === 'fr' ? 'Question suivante' : 'Next question')
              }
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
