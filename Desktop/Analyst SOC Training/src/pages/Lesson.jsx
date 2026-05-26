import React, { useState, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, BookOpen, Target, FlaskConical, Flag, CheckCircle2, Clock, Zap, Bot } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import useAppStore from '../store/useAppStore'
import { Button, Badge, Card } from '../components/UI'
import QuizModule from '../components/Course/QuizModule'
import LabTerminal from '../components/Course/LabTerminal'
import AIAssistant from '../components/AI/AIAssistant'
import { curriculum, findLesson, getAdjacentLessons } from '../data/curriculum'

const TABS = ['theory', 'quiz', 'lab']

export default function Lesson() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { currentProfile, completeLesson, addToast, settings, t } = useAppStore()
  const [activeTab, setActiveTab] = useState('theory')
  const [aiOpen, setAiOpen] = useState(true)
  const lang = settings.lang

  const { lesson, level } = useMemo(() => findLesson(id), [id])
  const { prev, next } = useMemo(() => getAdjacentLessons(id), [id])

  if (!lesson) {
    return (
      <div style={{ padding: '3rem', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--accent-red)' }}>Leçon introuvable</h2>
        <Button variant="secondary" onClick={() => navigate('/curriculum')} style={{ marginTop: '1rem' }}>
          Retour au curriculum
        </Button>
      </div>
    )
  }

  const isCompleted = currentProfile?.completedLessons?.includes(lesson.id)
  const isQuizDone = currentProfile?.completedQuizzes?.[lesson.id]
  const isLabDone = currentProfile?.completedLabs?.includes(lesson.id)

  const LEVEL_COLORS = ['var(--level-0)', 'var(--level-1)', 'var(--level-2)', 'var(--level-3)', 'var(--level-4)']
  const levelColor = LEVEL_COLORS[level?.id || 0]

  async function handleMarkComplete() {
    if (isCompleted) return
    const updated = await completeLesson(lesson.id, lesson.xpReward)
    addToast(lang === 'fr' ? `Leçon terminée ! +${lesson.xpReward} XP` : `Lesson complete! +${lesson.xpReward} XP`, 'success')
  }

  const tabs = [
    { key: 'theory', icon: <BookOpen size={15} />, label: lang === 'fr' ? 'Cours' : 'Theory' },
    ...(lesson.quiz ? [{ key: 'quiz', icon: <Target size={15} />, label: 'Quiz', done: isQuizDone }] : []),
    ...(lesson.lab ? [{ key: 'lab', icon: <FlaskConical size={15} />, label: 'Lab', done: isLabDone }] : []),
  ]

  const theoryContent = lang === 'en' && lesson.theoryEn ? lesson.theoryEn : lesson.theory

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{
          padding: '0.75rem 1.5rem',
          paddingRight: '160px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          display: 'flex', alignItems: 'center', gap: '1rem',
          flexShrink: 0,
        }}>
          <Button variant="ghost" size="sm" onClick={() => navigate('/curriculum')} icon={<ChevronLeft size={15} />}>
            {lang === 'fr' ? 'Curriculum' : 'Curriculum'}
          </Button>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', letterSpacing: '0.06em', marginBottom: 2 }}>
              {level?.name?.toUpperCase()} — {lesson.module?.toUpperCase()}
            </div>
            <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lesson.title}
            </h2>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <Badge color="muted"><Clock size={11} style={{ marginRight: 3 }} />{lesson.duration}min</Badge>
            <Badge color="accent"><Zap size={11} style={{ marginRight: 3 }} />+{lesson.xpReward} XP</Badge>
            {isCompleted && <Badge color="accent"><CheckCircle2 size={11} style={{ marginRight: 3 }} />Terminé</Badge>}
          </div>

          <button
            onClick={() => setAiOpen(o => !o)}
            style={{
              width: 36, height: 36,
              borderRadius: 'var(--radius-md)',
              background: aiOpen ? 'var(--accent-glow)' : 'var(--bg-active)',
              border: `1px solid ${aiOpen ? 'var(--accent)' : 'var(--border)'}`,
              color: aiOpen ? 'var(--accent)' : 'var(--text-muted)',
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all var(--transition)', flexShrink: 0,
            }}
            title="Assistant IA"
          >
            <Bot size={17} />
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex', gap: '0.25rem',
          padding: '0 1.5rem',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}>
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.6rem 0.75rem',
                background: 'none', border: 'none',
                borderBottom: `2px solid ${activeTab === tab.key ? levelColor : 'transparent'}`,
                color: activeTab === tab.key ? 'var(--text-primary)' : 'var(--text-muted)',
                cursor: 'pointer', fontSize: '0.85rem',
                fontFamily: 'var(--font-sans)', fontWeight: activeTab === tab.key ? 600 : 400,
                transition: 'all var(--transition)',
                marginBottom: -1,
              }}
            >
              {tab.icon}
              {tab.label}
              {tab.done && <CheckCircle2 size={12} color="var(--accent)" />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
          {activeTab === 'theory' && (
            <div style={{ maxWidth: 740, margin: '0 auto' }}>
              {/* Objectives */}
              {lesson.objectives && (
                <Card style={{ marginBottom: '1.5rem', borderColor: levelColor + '33' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div style={{ width: 3, height: 18, background: levelColor, borderRadius: 2 }} />
                    <h4 style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      {lang === 'fr' ? 'Objectifs d\'apprentissage' : 'Learning objectives'}
                    </h4>
                  </div>
                  <ul style={{ paddingLeft: '1.2rem', margin: 0 }}>
                    {lesson.objectives.map((obj, i) => (
                      <li key={i} style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: 4, lineHeight: 1.5 }}>{obj}</li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Theory */}
              <div className="markdown-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {theoryContent}
                </ReactMarkdown>
              </div>

              {/* Complete button */}
              <div style={{ marginTop: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {prev && (
                    <Button variant="secondary" size="sm" onClick={() => navigate(`/lesson/${prev.id}`)} icon={<ChevronLeft size={15} />}>
                      {lang === 'fr' ? 'Précédent' : 'Previous'}
                    </Button>
                  )}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {!isCompleted && (
                    <Button onClick={handleMarkComplete} icon={<CheckCircle2 size={15} />}>
                      {lang === 'fr' ? 'Marquer comme terminé' : 'Mark as complete'} (+{lesson.xpReward} XP)
                    </Button>
                  )}
                  {lesson.quiz && (
                    <Button variant={isCompleted ? 'primary' : 'secondary'} onClick={() => setActiveTab('quiz')} icon={<Target size={15} />}>
                      Quiz
                    </Button>
                  )}
                  {lesson.lab && (
                    <Button variant="secondary" onClick={() => setActiveTab('lab')} icon={<FlaskConical size={15} />}>
                      Lab
                    </Button>
                  )}
                  {next && isCompleted && (
                    <Button onClick={() => navigate(`/lesson/${next.id}`)} icon={<ChevronRight size={15} />}>
                      {lang === 'fr' ? 'Leçon suivante' : 'Next lesson'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'quiz' && lesson.quiz && (
            <div style={{ maxWidth: 700, margin: '0 auto' }}>
              <QuizModule
                quiz={lesson.quiz}
                lessonId={lesson.id}
                onComplete={() => {
                  handleMarkComplete()
                  if (lesson.lab) setActiveTab('lab')
                  else if (next) navigate(`/lesson/${next.id}`)
                }}
              />
            </div>
          )}

          {activeTab === 'lab' && lesson.lab && (
            <div style={{ maxWidth: 800, margin: '0 auto' }}>
              <LabTerminal
                lab={lesson.lab}
                lessonId={lesson.id}
                onComplete={() => {
                  handleMarkComplete()
                  if (next) setTimeout(() => navigate(`/lesson/${next.id}`), 1000)
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* AI Assistant panel */}
      {aiOpen && (
        <AIAssistant
          lessonContext={`${lesson.title}. ${lesson.description || ''}`}
          isOpen={aiOpen}
          onToggle={() => setAiOpen(o => !o)}
        />
      )}
    </div>
  )
}
