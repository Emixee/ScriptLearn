import React, { useState } from 'react'
import { Flag, Lock, CheckCircle2, HelpCircle, Trophy } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { Card, Badge, Button, Input } from '../components/UI'
import { ctfChallenges } from '../data/curriculum'

const DIFF_COLORS = { easy: 'accent', medium: 'yellow', hard: 'orange', expert: 'red' }
const DIFF_LABELS = { easy: 'Facile', medium: 'Intermédiaire', hard: 'Difficile', expert: 'Expert' }

export default function CTF() {
  const { currentProfile, completeCTF, addToast, settings } = useAppStore()
  const [selected, setSelected] = useState(null)
  const [flagInput, setFlagInput] = useState('')
  const [hintIdx, setHintIdx] = useState(0)
  const [showHints, setShowHints] = useState({})
  const [wrong, setWrong] = useState(false)
  const lang = settings.lang

  const completed = currentProfile?.completedCTFs || []
  const { getLevelProgress } = useAppStore()
  const { level: currentLevel } = getLevelProgress()

  function handleFlag() {
    if (!selected) return
    const normalized = flagInput.trim().toUpperCase()
    if (normalized === selected.flag.toUpperCase()) {
      completeCTF(selected.id, selected.points)
      addToast(lang === 'fr' ? `CTF résolu ! +${selected.points} XP` : `CTF solved! +${selected.points} XP`, 'success')
      setFlagInput('')
      setWrong(false)
    } else {
      setWrong(true)
      addToast(lang === 'fr' ? 'Flag incorrect. Continuez à chercher !' : 'Wrong flag. Keep looking!', 'error')
    }
  }

  const totalSolved = completed.length
  const totalPoints = ctfChallenges.filter(c => completed.includes(c.id)).reduce((s, c) => s + c.points, 0)

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }} className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.4rem' }}>Capture The Flag</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          {lang === 'fr' ? 'Défis progressifs pour mettre en pratique vos compétences SOC' : 'Progressive challenges to practice your SOC skills'}
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <CheckCircle2 size={15} color="var(--accent)" />
            <strong style={{ color: 'var(--accent)' }}>{totalSolved}</strong> résolu(s)
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Trophy size={15} color="var(--accent-yellow)" />
            <strong style={{ color: 'var(--accent-yellow)' }}>{totalPoints}</strong> points
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selected ? '1fr 420px' : '1fr', gap: '1.5rem' }}>
        {/* Challenge list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {ctfChallenges.map(ctf => {
            const isDone = completed.includes(ctf.id)
            const isLocked = !isDone && ctf.levelRequired > currentLevel
            return (
              <Card
                key={ctf.id}
                hoverable={!isLocked}
                onClick={() => { if (!isLocked) { setSelected(ctf); setFlagInput(''); setWrong(false); setHintIdx(0) } }}
                style={{
                  cursor: isLocked ? 'not-allowed' : 'pointer',
                  opacity: isLocked ? 0.5 : 1,
                  borderColor: selected?.id === ctf.id ? 'var(--accent)' : undefined,
                  background: isDone ? 'rgba(0,255,136,0.04)' : undefined,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: 'var(--radius-md)',
                    background: isDone ? 'rgba(0,255,136,0.1)' : 'var(--bg-active)',
                    border: `1px solid ${isDone ? 'var(--accent)' : 'var(--border)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.2rem', flexShrink: 0,
                  }}>
                    {isLocked ? <Lock size={18} color="var(--text-muted)" /> : isDone ? '🏆' : <Flag size={18} color="var(--accent)" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem' }}>{ctf.title}</span>
                      {isDone && <CheckCircle2 size={14} color="var(--accent)" />}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: 6 }}>{ctf.description}</p>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Badge color={DIFF_COLORS[ctf.difficulty] || 'muted'} size="sm">{DIFF_LABELS[ctf.difficulty] || ctf.difficulty}</Badge>
                      <Badge color="blue" size="sm">{ctf.category}</Badge>
                      <Badge color="accent" size="sm">{ctf.points} pts</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>

        {/* Challenge detail */}
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="slide-in">
            <Card style={{ borderColor: 'var(--accent)33', position: 'sticky', top: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div>
                  <h3 style={{ marginBottom: 6 }}>{selected.title}</h3>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <Badge color={DIFF_COLORS[selected.difficulty] || 'muted'}>{DIFF_LABELS[selected.difficulty]}</Badge>
                    <Badge color="blue">{selected.category}</Badge>
                    <Badge color="accent">{selected.points} pts</Badge>
                  </div>
                </div>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
              </div>

              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: 1.7, marginBottom: '1rem', padding: '0.75rem', background: 'var(--bg-active)', borderRadius: 'var(--radius-md)', whiteSpace: 'pre-wrap' }}>
                {lang === 'en' ? (selected.descriptionEn || selected.description) : selected.description}
              </div>

              {completed.includes(selected.id) ? (
                <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--accent)' }}>
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>🏆</div>
                  <strong>{lang === 'fr' ? 'Challenge résolu !' : 'Challenge solved!'}</strong>
                </div>
              ) : (
                <>
                  <div style={{ marginBottom: '0.75rem' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                      {lang === 'fr' ? 'Soumettre le flag' : 'Submit the flag'}
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <Input
                        value={flagInput}
                        onChange={e => { setFlagInput(e.target.value); setWrong(false) }}
                        onKeyDown={e => e.key === 'Enter' && handleFlag()}
                        placeholder="CTF{...}"
                        style={{
                          fontFamily: 'var(--font-mono)',
                          borderColor: wrong ? 'var(--accent-red)' : undefined,
                        }}
                      />
                      <Button onClick={handleFlag} icon={<Flag size={15} />}>
                        Submit
                      </Button>
                    </div>
                    {wrong && (
                      <p style={{ color: 'var(--accent-red)', fontSize: '0.78rem', marginTop: 4 }}>
                        {lang === 'fr' ? 'Flag incorrect. Continuez à chercher !' : 'Wrong flag. Keep looking!'}
                      </p>
                    )}
                  </div>

                  {selected.hints && selected.hints.length > 0 && (
                    <div>
                      <button
                        onClick={() => {
                          setShowHints(s => ({ ...s, [selected.id]: true }))
                          if ((showHints[selected.id] || hintIdx === 0) && hintIdx < selected.hints.length - 1) setHintIdx(i => i + 1)
                        }}
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: 'var(--accent-yellow)', fontSize: '0.8rem',
                          display: 'flex', alignItems: 'center', gap: 4,
                          fontFamily: 'var(--font-sans)',
                        }}
                      >
                        <HelpCircle size={14} />
                        {showHints[selected.id]
                          ? (hintIdx < selected.hints.length - 1 ? (lang === 'fr' ? 'Indice suivant' : 'Next hint') : (lang === 'fr' ? 'Plus d\'indices' : 'No more hints'))
                          : (lang === 'fr' ? 'Afficher un indice' : 'Show a hint')
                        }
                        <span style={{ color: 'var(--text-muted)' }}>({hintIdx + (showHints[selected.id] ? 0 : 0)}/{selected.hints.length})</span>
                      </button>
                      {showHints[selected.id] && selected.hints.slice(0, hintIdx + 1).map((hint, i) => (
                        <div key={i} style={{
                          marginTop: 8, padding: '0.5rem 0.75rem',
                          background: 'rgba(227,179,65,0.08)',
                          borderRadius: 'var(--radius-sm)',
                          borderLeft: '3px solid var(--accent-yellow)',
                          fontSize: '0.82rem', color: 'var(--text-secondary)',
                        }}>
                          <strong style={{ color: 'var(--accent-yellow)' }}>Indice {i + 1} :</strong> {hint}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  )
}
