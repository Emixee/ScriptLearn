import React, { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Zap, BookOpen, FlaskConical, Flag, Award, TrendingUp, Target, Flame } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { Card, ProgressBar, Badge, Button } from '../components/UI'
import { curriculum } from '../data/curriculum'

const LEVEL_COLORS = ['var(--level-0)', 'var(--level-1)', 'var(--level-2)', 'var(--level-3)', 'var(--level-4)']

function StatCard({ icon, label, value, color }) {
  return (
    <Card style={{ textAlign: 'center' }}>
      <div style={{ color, marginBottom: 8, display: 'flex', justifyContent: 'center' }}>{icon}</div>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
    </Card>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { currentProfile, getLevelProgress, t } = useAppStore()
  const lvl = getLevelProgress()

  const LEVEL_LABELS = [
    t('levels.0.name'), t('levels.1.name'), t('levels.2.name'),
    t('levels.3.name'), t('levels.4.name'),
  ]

  const stats = useMemo(() => {
    if (!currentProfile) return {}
    return {
      lessons: currentProfile.completedLessons?.length || 0,
      quizzes: Object.keys(currentProfile.completedQuizzes || {}).length,
      labs: currentProfile.completedLabs?.length || 0,
      ctfs: currentProfile.completedCTFs?.length || 0,
      badges: currentProfile.badges?.length || 0,
    }
  }, [currentProfile])

  // Find next lesson to do
  const nextLesson = useMemo(() => {
    if (!currentProfile) return null
    for (const level of curriculum) {
      for (const module of level.modules) {
        for (const lesson of module.lessons) {
          if (!currentProfile.completedLessons?.includes(lesson.id)) {
            return { ...lesson, moduleName: module.title, levelName: level.name, levelColor: LEVEL_COLORS[level.id] }
          }
        }
      }
    }
    return null
  }, [currentProfile])

  // Global progress
  const totalLessons = useMemo(() => curriculum.reduce((s, l) => s + l.modules.reduce((ms, m) => ms + m.lessons.length, 0), 0), [])
  const globalPct = Math.round(((stats.lessons || 0) / totalLessons) * 100)

  if (!currentProfile) return null

  return (
    <div style={{ padding: '2rem', maxWidth: 1100, margin: '0 auto' }} className="fade-in">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 700 }}>
          {t('dashboard.welcome')} <span style={{ color: 'var(--accent)' }}>{currentProfile.name}</span> 👋
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
          {new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* XP & Level banner */}
      <Card style={{ marginBottom: '1.5rem', background: `linear-gradient(135deg, var(--bg-card), var(--bg-surface))` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: LEVEL_COLORS[Math.min(4, lvl.level)] + '22',
              border: `2px solid ${LEVEL_COLORS[Math.min(4, lvl.level)]}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem',
            }}>
              {currentProfile.avatar || '🛡️'}
            </div>
            <div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em' }}>
                NIVEAU {lvl.level} — {LEVEL_LABELS[Math.min(4, lvl.level)].toUpperCase()}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: LEVEL_COLORS[Math.min(4, lvl.level)] }}>
                {(currentProfile.xp || 0).toLocaleString()} XP
              </div>
              <div style={{ marginTop: 6, width: 220 }}>
                <ProgressBar value={lvl.xpCurrent} max={lvl.xpToNext} color={LEVEL_COLORS[Math.min(4, lvl.level)]} height={5} />
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
                  {lvl.xpCurrent} / {lvl.xpToNext} XP → Nv.{lvl.level + 1}
                </div>
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>Progression globale</div>
            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{globalPct}%</div>
            <div style={{ width: 120 }}>
              <ProgressBar value={stats.lessons || 0} max={totalLessons} color="var(--accent)" height={4} />
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: 3, fontFamily: 'var(--font-mono)' }}>
              {stats.lessons}/{totalLessons} leçons
            </div>
          </div>
        </div>
      </Card>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        <StatCard icon={<BookOpen size={22} />}    label="Leçons" value={stats.lessons || 0}  color="var(--accent-blue)" />
        <StatCard icon={<Target size={22} />}      label="Quiz"   value={stats.quizzes || 0}  color="var(--accent-purple)" />
        <StatCard icon={<FlaskConical size={22} />} label="Labs"  value={stats.labs || 0}     color="var(--accent-cyan)" />
        <StatCard icon={<Flag size={22} />}        label="CTF"    value={stats.ctfs || 0}     color="var(--accent-orange)" />
        <StatCard icon={<Award size={22} />}       label="Badges" value={stats.badges || 0}   color="var(--accent-yellow)" />
      </div>

      {/* Main row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '1.5rem' }}>
        {/* Next lesson */}
        <div>
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
            {nextLesson ? 'Prochaine étape' : 'Formation terminée !'}
          </h2>
          {nextLesson ? (
            <Card hoverable onClick={() => navigate(`/lesson/${nextLesson.id}`)} style={{ cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: 6, letterSpacing: '0.06em' }}>
                    {nextLesson.moduleName?.toUpperCase()} · {nextLesson.levelName?.toUpperCase()}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>
                    {nextLesson.title}
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1rem' }}>
                    {nextLesson.description}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <Badge color="accent">{nextLesson.xpReward} XP</Badge>
                    <Badge color="muted">{nextLesson.duration} min</Badge>
                    {nextLesson.hasLab && <Badge color="cyan">Lab</Badge>}
                    {nextLesson.hasQuiz && <Badge color="blue">Quiz</Badge>}
                  </div>
                </div>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'var(--accent-glow)',
                  border: '1px solid var(--accent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <ArrowRight size={20} color="var(--accent)" />
                </div>
              </div>
            </Card>
          ) : (
            <Card style={{ textAlign: 'center', padding: '2rem' }}>
              <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🏆</div>
              <h3 style={{ color: 'var(--accent)' }}>Formation complète !</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 8 }}>
                Vous avez terminé l'intégralité du curriculum SOC Analyst.
              </p>
            </Card>
          )}

          {/* Level progression */}
          <h2 style={{ fontSize: '1rem', fontWeight: 600, margin: '1.5rem 0 0.75rem', color: 'var(--text-secondary)' }}>
            Progression par niveau
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {curriculum.map((level) => {
              const totalL = level.modules.reduce((s, m) => s + m.lessons.length, 0)
              const doneL = level.modules.reduce((s, m) => s + m.lessons.filter(l => currentProfile.completedLessons?.includes(l.id)).length, 0)
              const pct = totalL > 0 ? Math.round((doneL / totalL) * 100) : 0
              const isUnlocked = level.id === 0 || (currentProfile.completedLessons?.length || 0) >=
                curriculum.slice(0, level.id).reduce((s, l) => s + Math.floor(l.modules.reduce((ms, m) => ms + m.lessons.length, 0) * 0.8), 0)

              return (
                <div key={level.id} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.6rem 0.75rem',
                  background: 'var(--bg-card)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border)',
                  opacity: isUnlocked ? 1 : 0.5,
                }}>
                  <div style={{ fontSize: '1.1rem', width: 28, textAlign: 'center', flexShrink: 0 }}>
                    {level.badge}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 500, color: 'var(--text-primary)' }}>{level.name}</span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{doneL}/{totalL}</span>
                    </div>
                    <ProgressBar value={doneL} max={totalL} color={LEVEL_COLORS[level.id]} height={4} />
                  </div>
                  <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: LEVEL_COLORS[level.id], fontWeight: 600, width: 36, textAlign: 'right', flexShrink: 0 }}>
                    {pct}%
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right panel */}
        <div>
          {/* Badges */}
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
            Badges débloqués
          </h2>
          <Card style={{ marginBottom: '1.5rem' }}>
            {(currentProfile.badges?.length || 0) === 0 ? (
              <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>🎖️</div>
                Complétez des leçons pour gagner des badges !
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem' }}>
                {currentProfile.badges.map(badgeId => (
                  <div key={badgeId} style={{ textAlign: 'center', padding: '0.5rem' }}>
                    <div style={{ fontSize: '1.6rem', marginBottom: 4 }}>🏅</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{badgeId}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Quick actions */}
          <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
            Accès rapide
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Button variant="secondary" onClick={() => navigate('/curriculum')} icon={<BookOpen size={16} />} style={{ justifyContent: 'flex-start' }}>
              Voir le curriculum complet
            </Button>
            <Button variant="secondary" onClick={() => navigate('/ctf')} icon={<Flag size={16} />} style={{ justifyContent: 'flex-start' }}>
              Défis CTF
            </Button>
            {nextLesson && (
              <Button onClick={() => navigate(`/lesson/${nextLesson.id}`)} icon={<Zap size={16} />} style={{ justifyContent: 'flex-start' }}>
                Continuer l'apprentissage
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
