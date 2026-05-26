import React, { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronRight, Lock, CheckCircle2, Circle, Clock, Zap, FlaskConical, Target, BookOpen } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { Card, Badge, ProgressBar } from '../components/UI'
import { curriculum } from '../data/curriculum'

const LEVEL_COLORS = ['var(--level-0)', 'var(--level-1)', 'var(--level-2)', 'var(--level-3)', 'var(--level-4)']

function isLevelUnlocked(levelId, completedLessons) {
  if (levelId === 0) return true
  // Need 80% of previous level completed
  const prevLevel = curriculum[levelId - 1]
  if (!prevLevel) return false
  const total = prevLevel.modules.reduce((s, m) => s + m.lessons.length, 0)
  const done = prevLevel.modules.reduce((s, m) => s + m.lessons.filter(l => completedLessons.includes(l.id)).length, 0)
  return total > 0 && done / total >= 0.8
}

export default function Curriculum() {
  const navigate = useNavigate()
  const { currentProfile, t } = useAppStore()
  const [expandedLevels, setExpandedLevels] = useState({ 0: true })
  const [expandedModules, setExpandedModules] = useState({})

  const completedLessons = currentProfile?.completedLessons || []
  const completedQuizzes = currentProfile?.completedQuizzes || {}
  const completedLabs = currentProfile?.completedLabs || []

  const toggleLevel = (id) => setExpandedLevels(s => ({ ...s, [id]: !s[id] }))
  const toggleModule = (id) => setExpandedModules(s => ({ ...s, [id]: !s[id] }))

  const totalLessons = useMemo(() => curriculum.reduce((s, l) => s + l.modules.reduce((ms, m) => ms + m.lessons.length, 0), 0), [])
  const totalDuration = useMemo(() => curriculum.reduce((s, l) => s + (l.duration || 0), 0), [])

  return (
    <div style={{ padding: '2rem', maxWidth: 900, margin: '0 auto' }} className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ marginBottom: '0.4rem' }}>Curriculum complet</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
          Formation Analyste SOC — BAC → Mastère Cybersécurité
        </p>
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Clock size={15} color="var(--accent)" />
            <strong style={{ color: 'var(--accent)' }}>{totalDuration}h+</strong> de formation
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <BookOpen size={15} color="var(--accent-blue)" />
            <strong style={{ color: 'var(--accent-blue)' }}>{totalLessons}</strong> leçons
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
            <Zap size={15} color="var(--accent-yellow)" />
            5 niveaux · CompTIA · GIAC · OSCP
          </div>
        </div>
      </div>

      {/* Levels */}
      {curriculum.map((level) => {
        const unlocked = isLevelUnlocked(level.id, completedLessons)
        const totalL = level.modules.reduce((s, m) => s + m.lessons.length, 0)
        const doneL = level.modules.reduce((s, m) => s + m.lessons.filter(l => completedLessons.includes(l.id)).length, 0)
        const pct = totalL > 0 ? Math.round((doneL / totalL) * 100) : 0
        const expanded = expandedLevels[level.id]

        return (
          <div key={level.id} style={{ marginBottom: '1rem' }}>
            {/* Level header */}
            <button
              onClick={() => unlocked && toggleLevel(level.id)}
              style={{
                width: '100%',
                background: expanded ? `${LEVEL_COLORS[level.id]}11` : 'var(--bg-card)',
                border: `1px solid ${expanded ? LEVEL_COLORS[level.id] : 'var(--border)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: '1rem 1.25rem',
                cursor: unlocked ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', gap: '1rem',
                transition: 'all var(--transition)',
                textAlign: 'left',
                opacity: unlocked ? 1 : 0.55,
              }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: 'var(--radius-md)',
                background: `${LEVEL_COLORS[level.id]}22`,
                border: `1px solid ${LEVEL_COLORS[level.id]}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.3rem', flexShrink: 0,
              }}>
                {unlocked ? level.badge : <Lock size={18} color="var(--text-muted)" />}
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: 6 }}>
                  <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>
                    Niveau {level.id} — {level.name}
                  </span>
                  {!unlocked && <Badge color="muted" size="sm">Verrouillé</Badge>}
                  {doneL === totalL && totalL > 0 && <Badge color="accent" size="sm">Complété</Badge>}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {level.modules.length} modules · {totalL} leçons · {level.duration}h
                  </span>
                  {level.certifications?.length > 0 && (
                    <span style={{ fontSize: '0.7rem', color: LEVEL_COLORS[level.id], fontFamily: 'var(--font-mono)' }}>
                      {level.certifications.join(' · ')}
                    </span>
                  )}
                </div>
                {unlocked && (
                  <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <ProgressBar value={doneL} max={totalL} color={LEVEL_COLORS[level.id]} height={4} />
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', flexShrink: 0 }}>{doneL}/{totalL}</span>
                  </div>
                )}
              </div>

              {unlocked && (
                expanded ? <ChevronDown size={18} color="var(--text-muted)" /> : <ChevronRight size={18} color="var(--text-muted)" />
              )}
            </button>

            {/* Modules list */}
            {expanded && unlocked && (
              <div style={{ paddingLeft: '1rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }} className="slide-in">
                {level.modules.map(module => {
                  const modDone = module.lessons.filter(l => completedLessons.includes(l.id)).length
                  const modTotal = module.lessons.length
                  const modExpanded = expandedModules[module.id]

                  return (
                    <div key={module.id}>
                      <button
                        onClick={() => toggleModule(module.id)}
                        style={{
                          width: '100%',
                          background: modExpanded ? 'var(--bg-hover)' : 'transparent',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          padding: '0.6rem 1rem',
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.75rem',
                          textAlign: 'left',
                          transition: 'all var(--transition)',
                        }}
                      >
                        {modExpanded ? <ChevronDown size={15} color="var(--text-muted)" /> : <ChevronRight size={15} color="var(--text-muted)" />}
                        <span style={{ flex: 1, fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-primary)' }}>{module.title}</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{modDone}/{modTotal}</span>
                        {modDone > 0 && <ProgressBar value={modDone} max={modTotal} color={LEVEL_COLORS[level.id]} height={3} />}
                      </button>

                      {modExpanded && (
                        <div style={{ paddingLeft: '2rem', marginTop: '0.3rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                          {module.lessons.map(lesson => {
                            const done = completedLessons.includes(lesson.id)
                            const quizDone = completedQuizzes[lesson.id]
                            const labDone = completedLabs.includes(lesson.id)
                            return (
                              <button
                                key={lesson.id}
                                onClick={() => navigate(`/lesson/${lesson.id}`)}
                                style={{
                                  width: '100%',
                                  background: 'transparent',
                                  border: 'none',
                                  borderLeft: `2px solid ${done ? LEVEL_COLORS[level.id] : 'var(--border)'}`,
                                  borderRadius: '0 var(--radius-sm) var(--radius-sm) 0',
                                  padding: '0.45rem 0.75rem',
                                  cursor: 'pointer',
                                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                                  textAlign: 'left',
                                  transition: 'background var(--transition)',
                                }}
                                onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-hover)'}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                              >
                                {done
                                  ? <CheckCircle2 size={15} color={LEVEL_COLORS[level.id]} />
                                  : <Circle size={15} color="var(--text-muted)" />
                                }
                                <span style={{ flex: 1, fontSize: '0.85rem', color: done ? 'var(--text-secondary)' : 'var(--text-primary)' }}>
                                  {lesson.title}
                                </span>
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                  {lesson.hasQuiz && <Target size={12} color={quizDone ? 'var(--accent-blue)' : 'var(--text-muted)'} />}
                                  {lesson.hasLab && <FlaskConical size={12} color={labDone ? 'var(--accent-cyan)' : 'var(--text-muted)'} />}
                                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                                    {lesson.duration}min
                                  </span>
                                  <span style={{ fontSize: '0.65rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>
                                    +{lesson.xpReward}
                                  </span>
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
