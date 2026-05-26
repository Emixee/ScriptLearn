import React, { useState, useEffect } from 'react'
import { Save, Wifi, WifiOff, Bot, Globe, Bell, FileText, RefreshCw, Download, CheckCircle2, AlertCircle } from 'lucide-react'
import useAppStore from '../store/useAppStore'
import { Button, Input, Select, Card } from '../components/UI'
import { checkOllamaConnection, listOllamaModels } from '../services/ollamaService'

const RECOMMENDED_MODELS = ['llama3', 'llama3.1', 'llama3.2', 'mistral', 'mistral-nemo', 'gemma2', 'gemma2:9b', 'qwen2.5', 'phi3']

export default function Settings() {
  const { settings, saveSettings, addToast, t } = useAppStore()

  const [local, setLocal] = useState({ ...settings })
  const [ollamaStatus, setOllamaStatus] = useState(null) // null | 'ok' | 'error'
  const [checking, setChecking] = useState(false)
  const [availableModels, setAvailableModels] = useState([])
  const [saved, setSaved] = useState(false)

  // Updater state
  const [updateStatus, setUpdateStatus] = useState(null) // null | checking | available | not-available | downloading | ready | error
  const [updateInfo, setUpdateInfo] = useState({})
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  useEffect(() => {
    const unsub = window.electronAPI?.updater?.onStatus?.((data) => {
      setUpdateStatus(data.event)
      setUpdateInfo(data)
      if (data.event === 'checking') setCheckingUpdate(true)
      else setCheckingUpdate(false)
    })
    return () => unsub?.()
  }, [])

  useEffect(() => { setLocal({ ...settings }) }, [settings])

  async function testOllama() {
    setChecking(true)
    setOllamaStatus(null)
    const ok = await checkOllamaConnection(local.ollamaUrl)
    if (ok) {
      const models = await listOllamaModels(local.ollamaUrl)
      setAvailableModels(models)
      setOllamaStatus('ok')
      // Auto-sélectionne le premier modèle disponible si le modèle actuel n'est pas installé
      if (models.length > 0 && !models.includes(local.ollamaModel)) {
        setLocal(s => ({ ...s, ollamaModel: models[0] }))
        addToast(`Ollama connecté ! Modèle auto-sélectionné : ${models[0]}`, 'success')
      } else {
        addToast('Ollama connecté !', 'success')
      }
    } else {
      setOllamaStatus('error')
      addToast('Impossible de se connecter à Ollama', 'error')
    }
    setChecking(false)
  }

  async function handleSave() {
    await saveSettings(local)
    setSaved(true)
    addToast('Paramètres sauvegardés', 'success')
    setTimeout(() => setSaved(false), 2000)
  }

  const Section = ({ icon, title, children }) => (
    <Card style={{ marginBottom: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.2rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border)' }}>
        <span style={{ color: 'var(--accent)' }}>{icon}</span>
        <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>{title}</h3>
      </div>
      {children}
    </Card>
  )

  const Field = ({ label, description, children }) => (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)', marginBottom: 4 }}>{label}</label>
      {description && <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 8, lineHeight: 1.5 }}>{description}</p>}
      {children}
    </div>
  )

  return (
    <div style={{ padding: '2rem', maxWidth: 640, margin: '0 auto' }} className="fade-in">
      <div style={{ marginBottom: '2rem' }}>
        <h1>Paramètres</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: 4 }}>
          Configuration de l'application et de l'IA
        </p>
      </div>

      {/* Langue */}
      <Section icon={<Globe size={18} />} title="Langue / Language">
        <Field label="Langue de l'interface">
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            {[{ value: 'fr', label: '🇫🇷 Français' }, { value: 'en', label: '🇬🇧 English' }].map(opt => (
              <button
                key={opt.value}
                onClick={() => setLocal(s => ({ ...s, lang: opt.value }))}
                style={{
                  padding: '8px 20px',
                  borderRadius: 'var(--radius-md)',
                  border: `2px solid ${local.lang === opt.value ? 'var(--accent)' : 'var(--border)'}`,
                  background: local.lang === opt.value ? 'var(--accent-glow)' : 'transparent',
                  color: local.lang === opt.value ? 'var(--accent)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.875rem',
                  fontWeight: local.lang === opt.value ? 600 : 400,
                  transition: 'all var(--transition)',
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      {/* IA */}
      <Section icon={<Bot size={18} />} title="Intelligence Artificielle (Ollama)">
        <Field
          label="URL du serveur Ollama"
          description="Ollama doit être installé et démarré. Par défaut : http://localhost:11434"
        >
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Input
              value={local.ollamaUrl}
              onChange={e => setLocal(s => ({ ...s, ollamaUrl: e.target.value }))}
              placeholder="http://localhost:11434"
              style={{ flex: 1 }}
            />
            <Button variant="secondary" onClick={testOllama} disabled={checking}>
              {checking ? 'Test...' : 'Tester'}
            </Button>
          </div>
          {ollamaStatus && (
            <div style={{
              marginTop: 8, padding: '6px 12px',
              borderRadius: 'var(--radius-sm)',
              background: ollamaStatus === 'ok' ? 'rgba(0,255,136,0.1)' : 'rgba(255,107,107,0.1)',
              border: `1px solid ${ollamaStatus === 'ok' ? 'var(--accent)' : 'var(--accent-red)'}`,
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: '0.8rem',
            }}>
              {ollamaStatus === 'ok'
                ? <><Wifi size={14} color="var(--accent)" /> <span style={{ color: 'var(--accent)' }}>Connecté — {availableModels.length} modèle(s) disponible(s)</span></>
                : <><WifiOff size={14} color="var(--accent-red)" /> <span style={{ color: 'var(--accent-red)' }}>Impossible de se connecter. Ollama est-il démarré ?</span></>
              }
            </div>
          )}
        </Field>

        <Field label="Modèle à utiliser" description="Recommandés : llama3.1, mistral-nemo, gemma2:9b">
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            {(availableModels.length > 0 ? availableModels : RECOMMENDED_MODELS).map(m => (
              <button
                key={m}
                onClick={() => setLocal(s => ({ ...s, ollamaModel: m }))}
                style={{
                  padding: '4px 12px',
                  borderRadius: 999,
                  border: `1px solid ${local.ollamaModel === m ? 'var(--accent)' : 'var(--border)'}`,
                  background: local.ollamaModel === m ? 'var(--accent-glow)' : 'transparent',
                  color: local.ollamaModel === m ? 'var(--accent)' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-mono)',
                  transition: 'all var(--transition)',
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <Input
            value={local.ollamaModel}
            onChange={e => setLocal(s => ({ ...s, ollamaModel: e.target.value }))}
            placeholder="Nom du modèle Ollama"
            style={{ marginTop: 8 }}
          />
        </Field>

        <div style={{ padding: '0.75rem', background: 'var(--bg-active)', borderRadius: 'var(--radius-md)', fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          <strong style={{ color: 'var(--text-secondary)' }}>Installation Ollama :</strong><br />
          1. Téléchargez Ollama sur <span style={{ color: 'var(--accent-blue)', fontFamily: 'var(--font-mono)' }}>ollama.com</span><br />
          2. Exécutez : <code style={{ color: 'var(--accent-orange)', background: 'var(--bg-base)', padding: '1px 6px', borderRadius: 4 }}>ollama pull llama3.1</code><br />
          3. Ollama démarre automatiquement en arrière-plan.
        </div>
      </Section>

      {/* Notifications */}
      <Section icon={<Bell size={18} />} title="Notifications">
        <Field label="Notifications de progression">
          <button
            onClick={() => setLocal(s => ({ ...s, notifications: !s.notifications }))}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            <div style={{
              width: 44, height: 24, borderRadius: 12,
              background: local.notifications ? 'var(--accent)' : 'var(--bg-active)',
              border: `1px solid ${local.notifications ? 'var(--accent)' : 'var(--border)'}`,
              position: 'relative', transition: 'all var(--transition)',
            }}>
              <div style={{
                position: 'absolute', top: 2,
                left: local.notifications ? 22 : 2,
                width: 18, height: 18,
                borderRadius: '50%',
                background: local.notifications ? '#0d1117' : 'var(--text-muted)',
                transition: 'left var(--transition)',
              }} />
            </div>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {local.notifications ? 'Activées' : 'Désactivées'}
            </span>
          </button>
        </Field>
      </Section>

      {/* Mises à jour */}
      <Section icon={<RefreshCw size={18} />} title="Mises à jour">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            {updateStatus === null && 'Vérification automatique toutes les 4 heures.'}
            {updateStatus === 'checking' && <span style={{ color: 'var(--accent-blue)' }}>Vérification en cours...</span>}
            {updateStatus === 'not-available' && <span style={{ color: 'var(--accent)' }}>✓ Application à jour</span>}
            {updateStatus === 'available' && <span style={{ color: 'var(--accent-yellow)' }}>Mise à jour v{updateInfo.version} disponible !</span>}
            {updateStatus === 'downloading' && (
              <span style={{ color: 'var(--accent-blue)' }}>
                Téléchargement... {updateInfo.percent}% ({updateInfo.transferred} / {updateInfo.total} Mo)
              </span>
            )}
            {updateStatus === 'ready' && <span style={{ color: 'var(--accent)' }}>✓ v{updateInfo.version} prête — sera installée à la fermeture</span>}
            {updateStatus === 'error' && <span style={{ color: 'var(--accent-red)' }}>Erreur : {updateInfo.message}</span>}
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
            {(updateStatus === null || updateStatus === 'not-available' || updateStatus === 'error') && (
              <Button variant="secondary" size="sm" icon={<RefreshCw size={14} />}
                disabled={checkingUpdate}
                onClick={() => { setCheckingUpdate(true); window.electronAPI?.updater?.check() }}
              >
                Vérifier maintenant
              </Button>
            )}
            {updateStatus === 'available' && (
              <Button size="sm" icon={<Download size={14} />}
                onClick={() => window.electronAPI?.updater?.download()}
              >
                Télécharger
              </Button>
            )}
            {updateStatus === 'ready' && (
              <Button size="sm" icon={<CheckCircle2 size={14} />}
                onClick={() => window.electronAPI?.updater?.install()}
              >
                Redémarrer et installer
              </Button>
            )}
          </div>
        </div>
        {updateStatus === 'downloading' && (
          <div style={{ marginTop: '0.75rem' }}>
            <div style={{ background: 'var(--bg-active)', borderRadius: 999, height: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 999,
                background: 'var(--accent-blue)',
                width: `${updateInfo.percent || 0}%`,
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>
        )}
      </Section>

      {/* À propos */}
      <Card style={{ background: 'var(--bg-surface)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.8 }}>
            <strong style={{ color: 'var(--text-secondary)' }}>Analyst SOC Training</strong><br />
            Version 1.0.0 · Formation complète Analyste SOC<br />
            BAC → Mastère Cybersécurité · 500h+ de contenu<br />
            Certifications : CompTIA Security+, CySA+, GIAC, OSCP
          </div>
          <button
            onClick={() => window.electronAPI?.log?.open()}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              background: 'none', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', padding: '5px 12px',
              color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem',
              fontFamily: 'var(--font-sans)', transition: 'all var(--transition)',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent-blue)'; e.currentTarget.style.color = 'var(--accent-blue)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            title="Ouvre le fichier app.log dans le bloc-notes"
          >
            <FileText size={13} />
            Voir les logs
          </button>
        </div>
      </Card>

      {/* Save button */}
      <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
        <Button onClick={handleSave} icon={<Save size={16} />} size="lg">
          {saved ? 'Sauvegardé ✓' : 'Sauvegarder'}
        </Button>
      </div>
    </div>
  )
}
