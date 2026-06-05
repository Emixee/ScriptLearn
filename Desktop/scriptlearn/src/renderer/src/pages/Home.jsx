import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useProfile } from '../contexts/ProfileContext'
import WindowControls from '../components/WindowControls'

const EMOJIS = ['🧑', '👩', '👨', '🧒', '👧', '👦', '🧑‍💻', '👩‍💻', '👨‍💻', '🧓', '👴', '👵']

const CAREERS = [
  { id: 'sysadmin',   label: 'sysadmin',    desc: 'administration système Windows/Linux' },
  { id: 'devops',     label: 'devops/sre',  desc: 'automatisation, CI/CD, infra-as-code' },
  { id: 'soc',        label: 'analyste soc',desc: 'cybersécurité, détection, KQL' },
  { id: 'datascience',label: 'data / ml',   desc: 'Python, traitement de données' },
  { id: 'developer',  label: 'développeur', desc: 'scripting, automatisation, productivité' },
  { id: 'general',    label: 'généraliste', desc: 'apprentissage complet sans spécialisation' },
]

const LANGS_DISPLAY = ['bash', 'python', 'powershell', 'html', 'php', 'kql', 'sql']

const CREATE_STEPS = { name: 'name', career: 'career' }

export default function Home() {
  const navigate   = useNavigate()
  const { refresh } = useProfile()
  const [profiles,   setProfiles]  = useState([])
  const [step,       setStep]      = useState(null)
  const [newName,    setNewName]   = useState('')
  const [newEmoji,   setNewEmoji]  = useState('🧑')
  const [newCareer,  setNewCareer] = useState(null)
  const [version,    setVersion]   = useState('')

  useEffect(() => {
    window.electronAPI.store.listProfiles().then(setProfiles)
    window.electronAPI.app.getVersion().then(setVersion)
  }, [])

  const selectProfile = async (id) => {
    await window.electronAPI.store.setActiveProfile(id)
    await refresh()
    navigate('/app/dashboard')
  }

  const startCreate  = () => { setStep(CREATE_STEPS.name); setNewName(''); setNewEmoji('🧑'); setNewCareer(null) }
  const cancelCreate = () => { setStep(null); setNewName(''); setNewEmoji('🧑'); setNewCareer(null) }

  const goToCareerStep = () => { if (!newName.trim()) return; setStep(CREATE_STEPS.career) }

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
    // Plein écran, split gauche/droite — pas de splash centré générique
    <div className="h-screen bg-[#0a0a09] flex flex-col overflow-hidden">

      {/* Barre drag en haut pour déplacer la fenêtre */}
      <div
        className="h-8 flex-shrink-0 flex items-center justify-end px-2"
        style={{ WebkitAppRegion: 'drag' }}
      >
        <WindowControls />
      </div>

      {/* Layout principal : deux zones côte à côte */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Zone gauche : identité ──────────────────────────────────────
            Fond légèrement plus chaud que la droite pour créer la distinction.
            Le prompt >_ évoque directement la ligne de commande. */}
        <div className="w-2/5 flex flex-col justify-between p-8 border-r border-[#2e2b26] flex-shrink-0">
          <div>
            {/* Logo / identité */}
            <div className="flex items-center gap-3 mb-8">
              <div className="w-9 h-9 bg-[#d97706] flex items-center justify-center text-xs font-bold text-[#0a0a09] rounded-sm select-none">
                &gt;_
              </div>
              <div>
                <div className="text-[#f5f0e8] text-xl font-semibold leading-none tracking-tight">
                  ScriptLearn
                </div>
                <div className="text-[#3d3a34] text-xs mt-0.5 tracking-wide">
                  // apprentissage du scripting
                </div>
              </div>
            </div>

            {/* Tagline structurée — liste de langages, style terminal */}
            <div className="space-y-1.5">
              <div className="text-[#3d3a34] text-xs uppercase tracking-widest mb-3">
                langages disponibles
              </div>
              {LANGS_DISPLAY.map((lang) => (
                <div key={lang} className="flex items-center gap-2.5 text-xs">
                  <span className="text-[#d97706]">·</span>
                  <span className="text-[#78716c] tracking-wide">{lang}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Version en bas à gauche */}
          {version && (
            <div className="text-[#3d3a34] text-[10px] tracking-widest">
              v{version}
            </div>
          )}
        </div>

        {/* ── Zone droite : sélection / création de profil ──────────────── */}
        <div className="flex-1 flex flex-col justify-center p-8 overflow-y-auto">

          {/* État par défaut : liste des profils */}
          {step === null && (
            <div className="max-w-sm">
              <div className="text-[#3d3a34] text-xs uppercase tracking-widest mb-5">
                sélectionner un profil
              </div>

              <div className="space-y-1">
                {profiles.map((profile) => (
                  <div key={profile.id} className="relative group">
                    <button
                      onClick={() => selectProfile(profile.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 border border-[#2e2b26] rounded-sm text-left hover:border-[#d97706] hover:bg-[#111110] transition-colors"
                    >
                      <span className="text-lg flex-shrink-0">{profile.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[#f5f0e8] text-sm font-medium tracking-tight">{profile.name}</div>
                        {profile.career && (
                          <div className="text-[#3d3a34] text-[10px] tracking-wide mt-0.5">
                            {CAREERS.find(c => c.id === profile.career)?.label ?? profile.career}
                          </div>
                        )}
                      </div>
                      <span className="text-[#3d3a34] text-xs group-hover:text-[#d97706] transition-colors">▸</span>
                    </button>
                    {/* Supprimer (seulement si plusieurs profils) */}
                    {profiles.length > 1 && (
                      <button
                        onClick={(e) => deleteProfile(e, profile.id)}
                        title="Supprimer ce profil"
                        className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center text-[#3d3a34] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all text-xs"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}

                {/* Nouveau profil */}
                <button
                  onClick={startCreate}
                  className="w-full flex items-center gap-3 px-4 py-3 border border-dashed border-[#2e2b26] rounded-sm text-left hover:border-[#d97706] hover:bg-[#111110] transition-colors"
                >
                  <span className="text-[#3d3a34] text-lg">+</span>
                  <span className="text-[#78716c] text-sm tracking-wide">nouveau profil</span>
                </button>
              </div>
            </div>
          )}

          {/* ── Étape 1 création : Nom + emoji ─────────────────────────── */}
          {step === CREATE_STEPS.name && (
            <div className="max-w-sm">
              <div className="text-[#3d3a34] text-xs uppercase tracking-widest mb-5">
                créer un profil
              </div>

              {/* Sélecteur emoji */}
              <div className="mb-4">
                <div className="text-[#78716c] text-[10px] uppercase tracking-widest mb-2">avatar</div>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJIS.map(e => (
                    <button
                      key={e}
                      onClick={() => setNewEmoji(e)}
                      className={`w-9 h-9 flex items-center justify-center text-lg rounded-sm transition-all border ${
                        newEmoji === e
                          ? 'border-[#d97706] bg-[#d97706]/10'
                          : 'border-[#2e2b26] hover:border-[#3d3a34]'
                      }`}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              {/* Champ nom */}
              <div className="mb-5">
                <div className="text-[#78716c] text-[10px] uppercase tracking-widest mb-2">nom</div>
                <input
                  autoFocus
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') goToCareerStep()
                    if (e.key === 'Escape') cancelCreate()
                  }}
                  placeholder="prénom ou pseudo…"
                  maxLength={20}
                  className="w-full bg-[#0a0a09] border border-[#2e2b26] rounded-sm px-3 py-2.5 text-sm text-[#f5f0e8] placeholder-[#3d3a34] focus:outline-none focus:border-[#d97706] transition-colors tracking-wide"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={cancelCreate}
                  className="flex-1 border border-[#2e2b26] text-[#78716c] text-xs py-2.5 rounded-sm hover:text-[#f5f0e8] hover:border-[#3d3a34] transition-colors tracking-wide"
                >
                  annuler
                </button>
                <button
                  onClick={goToCareerStep}
                  disabled={!newName.trim()}
                  className="flex-1 bg-[#d97706] hover:bg-[#b45309] text-[#0a0a09] text-xs py-2.5 rounded-sm transition-colors disabled:opacity-30 font-semibold tracking-wide"
                >
                  suivant ▸
                </button>
              </div>
            </div>
          )}

          {/* ── Étape 2 création : Parcours métier ──────────────────────── */}
          {step === CREATE_STEPS.career && (
            <div className="max-w-sm">
              <div className="text-[#3d3a34] text-xs uppercase tracking-widest mb-5">
                quel est votre objectif ?
              </div>

              <div className="space-y-1 mb-5">
                {CAREERS.map(career => (
                  <button
                    key={career.id}
                    onClick={() => setNewCareer(career.id)}
                    className={`w-full flex items-start gap-3 px-4 py-3 rounded-sm border text-left transition-all ${
                      newCareer === career.id
                        ? 'border-[#d97706] bg-[#d97706]/10 text-[#f5f0e8]'
                        : 'border-[#2e2b26] text-[#78716c] hover:text-[#f5f0e8] hover:border-[#3d3a34]'
                    }`}
                  >
                    <span className={`text-xs mt-0.5 flex-shrink-0 ${newCareer === career.id ? 'text-[#d97706]' : 'text-[#3d3a34]'}`}>
                      {newCareer === career.id ? '▸' : '·'}
                    </span>
                    <div>
                      <div className="text-xs font-medium tracking-wide">{career.label}</div>
                      <div className="text-[10px] text-[#3d3a34] mt-0.5 tracking-wide">{career.desc}</div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(CREATE_STEPS.name)}
                  className="flex-1 border border-[#2e2b26] text-[#78716c] text-xs py-2.5 rounded-sm hover:text-[#f5f0e8] hover:border-[#3d3a34] transition-colors tracking-wide"
                >
                  ← retour
                </button>
                <button
                  onClick={() => createProfile(newCareer ?? 'general')}
                  className="flex-1 bg-[#d97706] hover:bg-[#b45309] text-[#0a0a09] text-xs py-2.5 rounded-sm transition-colors font-semibold tracking-wide"
                >
                  créer le profil ▸
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
