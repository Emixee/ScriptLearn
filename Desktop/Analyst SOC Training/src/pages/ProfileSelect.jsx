import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2, ShieldCheck, Clock, Star } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { Button, Modal, Input, Card } from '../components/UI'

const AVATARS = ['🛡️', '🔍', '⚔️', '🎯', '🔒', '💻', '🧠', '🦅', '🐉', '🌐', '🔬', '🎓']

function formatDate(iso) {
  if (!iso) return 'Jamais'
  const d = new Date(iso)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const LEVEL_LABELS = ['Fondamentaux', 'Sécurité', 'SOC Junior', 'SOC Confirmé', 'Expert']
const LEVEL_COLORS = ['#6366f1', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444']

export default function ProfileSelect() {
  const navigate = useNavigate()
  const { profiles, loadProfiles, createProfile, deleteProfile, setCurrentProfile, loadSettings, t } = useAppStore()
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newAvatar, setNewAvatar] = useState('🛡️')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadProfiles()
    loadSettings()
  }, [])

  async function handleSelect(profile) {
    setCurrentProfile(profile)
    navigate('/dashboard')
  }

  async function handleCreate() {
    if (!newName.trim()) { setError('Le nom est requis'); return }
    setCreating(true)
    await createProfile(newName.trim(), newAvatar)
    setShowCreate(false)
    setNewName('')
    setNewAvatar('🛡️')
    setError('')
    setCreating(false)
    navigate('/dashboard')
  }

  async function handleDelete() {
    if (!deleteTarget) return
    await deleteProfile(deleteTarget.id)
    setDeleteTarget(null)
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-base)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: '2rem',
    }}>
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '2.5rem', animation: 'fadeIn 0.4s ease' }}>
        <div style={{
          width: 72, height: 72, margin: '0 auto 1rem',
          background: 'var(--accent-glow)',
          border: '2px solid var(--accent)',
          borderRadius: '20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: 'var(--shadow-glow)',
        }}>
          <ShieldCheck size={38} color="var(--accent)" />
        </div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>
          Analyst SOC Training
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
          Formation complète — du débutant à l'expert
        </p>
        <div style={{ marginTop: '0.6rem', display: 'flex', justifyContent: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          <span style={{ color: 'var(--accent)' }}>500h+</span> de contenu ·
          <span style={{ color: 'var(--accent-blue)' }}>5 niveaux</span> ·
          <span style={{ color: 'var(--accent-purple)' }}>47 modules</span>
        </div>
      </div>

      {/* Profils */}
      <div style={{ maxWidth: 720, width: '100%' }}>
        <p style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.2rem' }}>
          {profiles.length === 0 ? 'Créez votre premier profil pour commencer' : 'Choisissez votre profil pour continuer'}
        </p>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1rem',
        }}>
          {profiles.map(profile => {
            const lvl = Math.min(4, profile.level || 0)
            return (
              <Card
                key={profile.id}
                hoverable
                onClick={() => handleSelect(profile)}
                style={{ position: 'relative', cursor: 'pointer' }}
              >
                {/* Delete button */}
                <button
                  onClick={e => { e.stopPropagation(); setDeleteTarget(profile) }}
                  style={{
                    position: 'absolute', top: 8, right: 8,
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-muted)', padding: 4, borderRadius: 4,
                    transition: 'color var(--transition)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.color = 'var(--accent-red)'}
                  onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  <Trash2 size={14} />
                </button>

                {/* Avatar */}
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'var(--bg-active)',
                  border: `2px solid ${LEVEL_COLORS[lvl]}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '1.6rem', marginBottom: '0.7rem',
                  boxShadow: `0 0 12px ${LEVEL_COLORS[lvl]}33`,
                }}>
                  {profile.avatar || '🛡️'}
                </div>

                <div style={{ fontWeight: 600, fontSize: '1rem', marginBottom: 4 }}>{profile.name}</div>

                <div style={{ display: 'flex', gap: 6, marginBottom: '0.6rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.7rem', background: `${LEVEL_COLORS[lvl]}22`, color: LEVEL_COLORS[lvl], padding: '2px 8px', borderRadius: 999, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                    Nv.{lvl} {LEVEL_LABELS[lvl]}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Star size={11} color="var(--accent-yellow)" />
                    {(profile.xp || 0).toLocaleString()} XP
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <Clock size={11} />
                    {formatDate(profile.lastActivity)}
                  </span>
                </div>
              </Card>
            )
          })}

          {/* New profile card */}
          <button
            onClick={() => setShowCreate(true)}
            style={{
              background: 'transparent',
              border: '2px dashed var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              minHeight: 140,
              color: 'var(--text-muted)',
              fontSize: '0.875rem',
              transition: 'all var(--transition)',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--accent)'
              e.currentTarget.style.color = 'var(--accent)'
              e.currentTarget.style.background = 'var(--accent-glow)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border)'
              e.currentTarget.style.color = 'var(--text-muted)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <Plus size={24} />
            <span>Nouveau profil</span>
          </button>
        </div>
      </div>

      {/* Modal création */}
      <Modal isOpen={showCreate} onClose={() => { setShowCreate(false); setError('') }} title="Créer un profil" width={420}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 6 }}>Nom du profil</label>
            <Input
              value={newName}
              onChange={e => setNewName(e.target.value)}
              placeholder="Votre prénom ou pseudo"
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            {error && <p style={{ color: 'var(--accent-red)', fontSize: '0.75rem', marginTop: 4 }}>{error}</p>}
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: 8 }}>Avatar</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {AVATARS.map(a => (
                <button
                  key={a}
                  onClick={() => setNewAvatar(a)}
                  style={{
                    width: 40, height: 40, borderRadius: 'var(--radius-md)',
                    border: `2px solid ${a === newAvatar ? 'var(--accent)' : 'var(--border)'}`,
                    background: a === newAvatar ? 'var(--accent-glow)' : 'var(--bg-active)',
                    cursor: 'pointer', fontSize: '1.2rem',
                    transition: 'all var(--transition)',
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: 4 }}>
            <Button variant="ghost" onClick={() => { setShowCreate(false); setError('') }}>Annuler</Button>
            <Button onClick={handleCreate} disabled={creating}>
              {creating ? 'Création...' : 'Créer le profil'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal suppression */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Supprimer le profil" width={380}>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.2rem', lineHeight: 1.6 }}>
          Supprimer définitivement le profil <strong style={{ color: 'var(--accent-red)' }}>{deleteTarget?.name}</strong> ?
          Cette action est irréversible et effacera toute la progression.
        </p>
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <Button variant="ghost" onClick={() => setDeleteTarget(null)}>Annuler</Button>
          <Button variant="danger" onClick={handleDelete}>Supprimer</Button>
        </div>
      </Modal>
    </div>
  )
}
