import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import WindowControls from '../components/WindowControls'

const EMOJIS = ['🧑', '👩', '👨', '🧒', '👧', '👦', '🧑‍💻', '👩‍💻', '👨‍💻', '🧓', '👴', '👵']

const CAREERS = [
  { id: 'sysadmin',  icon: '🖥️',  label: 'SysAdmin',        desc: 'Administration système Windows/Linux' },
  { id: 'devops',    icon: '🔄',  label: 'DevOps/SRE',       desc: 'Automatisation, CI/CD, infra-as-code' },
  { id: 'soc',       icon: '🔍',  label: 'Analyste SOC',     desc: 'Cybersécurité, détection de menaces, KQL' },
  { id: 'datascience',icon: '📊', label: 'Data / ML',        desc: 'Python, traitement de données, automatisation' },
  { id: 'developer', icon: '💻',  label: 'Développeur',      desc: 'Scripting, automatisation, productivité' },
  { id: 'general',   icon: '🌐',  label: 'Général',          desc: 'Apprentissage complet sans spécialisation' },
]

const CREATE_STEPS = { name: 'name', career: 'career' }

export default function Home() {
  const navigate = useNavigate()
  const { refresh } = useProfile()
  const [profiles, setProfiles] = useState([])
  const [step, setStep] = useState(null)
  const [newName, setNewName] = useState('')
  const [newEmoji, setNewEmoji] = useState('🧑')
  const [newCareer, setNewCareer] = useState(null)

  useEffect(() => {
    window.electronAPI.store.listProfiles().then(setProfiles)
  }, [])

  const selectProfile = async (id) => {
    await window.electronAPI.store.setActiveProfile(id)
    await refresh()
    navigate('/app/dashboard')
  }

  const startCreate = () => {
    setStep(CREATE_STEPS.name)
    setNewName('')
    setNewEmoji('🧑')
    setNewCareer(null)
  }

  const cancelCreate = () => {
    setStep(null)
    setNewName('')
    setNewEmoji('🧑')
    setNewCareer(null)
  }

  const goToCareerStep = () => {
    if (!newName.trim()) return
    setStep(CREATE_STEPS.career)
  }

  const createProfile = async (career) => {
    const chosenCareer = career ?? newCareer ?? 'general'
    const p = await window.electronAPI.store.createProfile(newName.trim(), newEmoji, chosenCareer)
    setProfiles(prev => [...prev, p])
    cancelCreate()
    await selectProfile(p.id)
  }

  const deleteProfile = async (e, id) => {
    e.stopPropagation()
    const result = await window.electronAPI.store.deleteProfile(id)
    if (result.ok) setProfiles(prev => prev.filter(p => p.id !== id))
  }

  return (
    <div className="min-h-screen bg-[#0f1117] flex flex-col items-center justify-center px-4">
      {/* Barre de drag avec contrôles fenêtre */}
      <div className="fixed top-0 left-0 right-0 h-10 flex items-center justify-end px-2 z-50"
        style={{ WebkitAppRegion: 'drag' }}>
        <WindowControls />
      </div>

      {/* Logo */}
      <div className="mb-14 text-center">
        <div className="flex items-center justify-center gap-4 mb-4">
          <div className="w-14 h-14 bg-[#6366f1] rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg shadow-indigo-500/30">
            S
          </div>
          <h1 className="text-5xl font-bold text-white tracking-tight">ScriptLearn</h1>
        </div>
        <p className="text-slate-400 text-lg">
          Maîtrisez <span className="text-[#22d3ee]">Bash</span>,{' '}
          <span className="text-[#f59e0b]">Python</span>,{' '}
          <span className="text-[#6366f1]">PowerShell</span> &amp;{' '}
          <span className="text-[#e879f9]">KQL</span>, du débutant à l'expert
        </p>
      </div>

      {/* Étape 1 : Sélection ou création de profil */}
      {step === null && (
        <div className="text-center">
          <p className="text-slate-500 text-xs font-medium uppercase tracking-widest mb-8">
            Choisir un profil
          </p>
          <div className="flex gap-8 justify-center flex-wrap max-w-2xl">
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => selectProfile(profile.id)}
                className="flex flex-col items-center gap-3 group relative"
              >
                <div className="w-24 h-24 bg-[#1a1d2e] border border-[#2d3748] rounded-2xl flex items-center justify-center text-4xl transition-all duration-200 group-hover:scale-105 group-hover:border-[#6366f1] group-hover:shadow-lg group-hover:shadow-[#6366f1]/20">
                  {profile.emoji}
                </div>
                <span className="text-slate-400 text-sm group-hover:text-white transition-colors">
                  {profile.name}
                </span>
                {profile.career && (
                  <span className="text-slate-600 text-xs">
                    {CAREERS.find(c => c.id === profile.career)?.icon} {CAREERS.find(c => c.id === profile.career)?.label}
                  </span>
                )}
                {profiles.length > 1 && (
                  <button
                    onClick={(e) => deleteProfile(e, profile.id)}
                    title="Supprimer ce profil"
                    className="absolute -top-2 -right-2 w-5 h-5 bg-[#374151] hover:bg-red-500 rounded-full text-xs text-slate-400 hover:text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center leading-none"
                  >
                    ✕
                  </button>
                )}
              </button>
            ))}

            {/* Nouveau profil */}
            <button
              onClick={startCreate}
              className="flex flex-col items-center gap-3 group"
            >
              <div className="w-24 h-24 bg-[#1a1d2e] border-2 border-dashed border-[#2d3748] rounded-2xl flex items-center justify-center text-3xl text-slate-600 group-hover:border-[#6366f1] group-hover:text-[#6366f1] transition-all">
                +
              </div>
              <span className="text-slate-600 text-sm group-hover:text-slate-400 transition-colors">Nouveau</span>
            </button>
          </div>
        </div>
      )}

      {/* Étape 1 création : Nom + emoji */}
      {step === CREATE_STEPS.name && (
        <div className="w-full max-w-sm">
          <h2 className="text-white font-bold text-xl mb-6 text-center">Créer un profil</h2>
          <div className="flex flex-col items-center gap-4">
            <div className="text-5xl mb-1">{newEmoji}</div>
            <div className="flex gap-1.5 flex-wrap justify-center max-w-xs">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setNewEmoji(e)}
                  className={`text-xl p-1 rounded transition-colors ${
                    newEmoji === e ? 'bg-[#6366f1]/30 ring-1 ring-[#6366f1]' : 'hover:bg-[#232640]'
                  }`}>
                  {e}
                </button>
              ))}
            </div>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') goToCareerStep()
                if (e.key === 'Escape') cancelCreate()
              }}
              placeholder="Prénom ou pseudo…"
              maxLength={20}
              className="w-full bg-[#232640] border border-[#2d3748] rounded-xl px-4 py-3 text-sm text-white text-center placeholder-slate-600 focus:outline-none focus:border-[#6366f1]"
            />
            <div className="flex gap-3 w-full">
              <button onClick={cancelCreate}
                className="flex-1 bg-[#1a1d2e] border border-[#2d3748] text-slate-400 text-sm py-2.5 rounded-xl hover:text-white transition-colors">
                Annuler
              </button>
              <button onClick={goToCareerStep} disabled={!newName.trim()}
                className="flex-1 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm py-2.5 rounded-xl transition-colors disabled:opacity-40 font-medium">
                Suivant →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Étape 2 création : Parcours métier */}
      {step === CREATE_STEPS.career && (
        <div className="w-full max-w-xl">
          <h2 className="text-white font-bold text-xl mb-2 text-center">Quel est ton objectif ?</h2>
          <p className="text-slate-400 text-sm text-center mb-6">
            Ton parcours sera personnalisé selon ton profil.
          </p>
          <div className="grid grid-cols-2 gap-3 mb-6">
            {CAREERS.map(career => (
              <button
                key={career.id}
                onClick={() => setNewCareer(career.id)}
                className={`flex items-center gap-3 p-4 rounded-xl border text-left transition-all ${
                  newCareer === career.id
                    ? 'bg-[#6366f1]/15 border-[#6366f1] text-white'
                    : 'bg-[#1a1d2e] border-[#2d3748] text-slate-400 hover:text-white hover:border-[#3d4756]'
                }`}
              >
                <span className="text-2xl flex-shrink-0">{career.icon}</span>
                <div>
                  <p className="font-medium text-sm">{career.label}</p>
                  <p className="text-xs opacity-60 mt-0.5">{career.desc}</p>
                </div>
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(CREATE_STEPS.name)}
              className="flex-1 bg-[#1a1d2e] border border-[#2d3748] text-slate-400 text-sm py-2.5 rounded-xl hover:text-white transition-colors">
              ← Retour
            </button>
            <button
              onClick={() => createProfile(newCareer ?? 'general')}
              className="flex-1 bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm py-2.5 rounded-xl transition-colors font-medium">
              Créer le profil →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
