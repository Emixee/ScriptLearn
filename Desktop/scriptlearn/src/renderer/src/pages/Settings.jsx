import { useState, useEffect } from 'react'
import { useProfile } from '../contexts/ProfileContext'
import { checkOllama } from '../utils/ollama'
import contentIndex from '../content/index.json'
import { getModule } from '../content/loader'

const ALL_LANGS = ['bash', 'python', 'powershell', 'kql', 'sql', 'regex', 'git', 'spl', 'yaml']
const LANG_LABELS = { bash: 'Bash', python: 'Python', powershell: 'PowerShell', kql: 'KQL', sql: 'SQL', regex: 'Regex', git: 'Git', spl: 'SPL', yaml: 'YAML' }

const UPDATE_STATUS = { idle: 'idle', checking: 'checking', uptodate: 'uptodate', available: 'available', downloading: 'downloading', ready: 'ready', error: 'error' }

function Toggle({ enabled, onToggle }) {
  return (
    <button
      onClick={onToggle}
      className={`w-11 h-6 rounded-full transition-all duration-300 relative flex-shrink-0 focus:outline-none overflow-hidden ${
        enabled ? 'bg-[#6366f1]' : 'bg-[#374151]'
      }`}
    >
      <span
        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform duration-300 ${
          enabled ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  )
}

function Settings() {
  const { profile, settings, saveSettings, updateAvailable, setUpdateAvailable } = useProfile()

  const [aiEnabled, setAiEnabled] = useState(false)
  const [aiModel,   setAiModel]   = useState('llama3.2')
  const [aiUrl,     setAiUrl]     = useState('http://localhost:11434')
  const [testState, setTestState] = useState(null)
  // pullState : null | 'pulling' | { status, pct } | 'done' | 'error'
  const [pullState, setPullState] = useState(null)
  const [resetState, setResetState] = useState(null)
  const [appVersion, setAppVersion] = useState('…')
  const [exportState, setExportState] = useState(null)
  const [remindersEnabled, setRemindersEnabled] = useState(false)
  const [reminderTime,     setReminderTime]     = useState('20:00')
  const [weeklyGoal,       setWeeklyGoal]       = useState(10)
  const [weeklyGoalInput,  setWeeklyGoalInput]  = useState('10')
  const [importState,      setImportState]      = useState(null)

  // Mises à jour
  const [updateStatus, setUpdateStatus] = useState(UPDATE_STATUS.idle)
  const [updateInfo,   setUpdateInfo]   = useState(null)
  const [dlProgress,   setDlProgress]   = useState(0)
  const [installerPath, setInstallerPath] = useState(null)

  useEffect(() => {
    window.electronAPI.app.getVersion().then(setAppVersion)
  }, [])

  // Afficher la section MàJ directement si une MàJ est déjà détectée
  useEffect(() => {
    if (updateAvailable) setUpdateStatus(UPDATE_STATUS.available)
  }, [updateAvailable])

  const checkUpdate = async () => {
    setUpdateStatus(UPDATE_STATUS.checking)
    setUpdateInfo(null)
    const info = await window.electronAPI.update.check()
    if (info.available) {
      setUpdateInfo(info)
      setUpdateStatus(UPDATE_STATUS.available)
      setUpdateAvailable(true)
    } else if (info.error) {
      setUpdateStatus(UPDATE_STATUS.error)
    } else {
      setUpdateStatus(UPDATE_STATUS.uptodate)
    }
  }

  const downloadUpdate = async () => {
    if (!updateInfo) return
    setUpdateStatus(UPDATE_STATUS.downloading)
    setDlProgress(0)
    const unsub = window.electronAPI.update.onProgress(pct => setDlProgress(pct))
    const result = await window.electronAPI.update.download({
      downloadUrl: updateInfo.downloadUrl,
      assetName: updateInfo.assetName
    })
    unsub()
    if (result.ok) {
      setInstallerPath(result.path)
      setUpdateStatus(UPDATE_STATUS.ready)
    } else {
      setUpdateStatus(UPDATE_STATUS.error)
    }
  }

  const installUpdate = async () => {
    if (!installerPath) return
    await window.electronAPI.update.install({ path: installerPath })
  }

  useEffect(() => {
    if (!settings) return
    setAiEnabled(settings.aiEnabled ?? false)
    setAiModel(settings.aiModel ?? 'llama3.2')
    setAiUrl(settings.aiUrl ?? 'http://localhost:11434')
    setRemindersEnabled(settings.remindersEnabled ?? false)
    setReminderTime(settings.reminderTime ?? '20:00')
  }, [settings])

  useEffect(() => {
    if (!profile) return
    window.electronAPI.store.getWeeklyGoal(profile.id).then(g => {
      const v = g ?? 10
      setWeeklyGoal(v)
      setWeeklyGoalInput(String(v))
    })
  }, [profile?.id])

  const persist = (patch) => {
    const next = { aiEnabled, aiModel, aiUrl, remindersEnabled, reminderTime, ...patch }
    saveSettings(next)
    if ('aiEnabled'         in patch) setAiEnabled(patch.aiEnabled)
    if ('aiModel'           in patch) setAiModel(patch.aiModel)
    if ('aiUrl'             in patch) setAiUrl(patch.aiUrl)
    if ('remindersEnabled'  in patch) setRemindersEnabled(patch.remindersEnabled)
    if ('reminderTime'      in patch) setReminderTime(patch.reminderTime)
  }

  const handleImportProfile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = async (e) => {
      const file = e.target.files[0]
      if (!file) return
      setImportState('reading')
      try {
        const text = await file.text()
        const payload = JSON.parse(text)
        const result = await window.electronAPI.store.importProfileJSON(payload)
        if (result.ok) {
          setImportState('done')
          setTimeout(() => setImportState(null), 4000)
        } else {
          setImportState('error')
          setTimeout(() => setImportState(null), 4000)
        }
      } catch {
        setImportState('error')
        setTimeout(() => setImportState(null), 4000)
      }
    }
    input.click()
  }

  const handleWeeklyGoalBlur = async () => {
    const n = Math.max(1, Math.min(200, parseInt(weeklyGoalInput, 10) || 10))
    setWeeklyGoal(n)
    setWeeklyGoalInput(String(n))
    if (profile) await window.electronAPI.store.setWeeklyGoal(profile.id, n)
  }

  // RAM recommandée par modèle — affichée dans l'UI pour guider le choix
  // Ces valeurs correspondent à la RAM nécessaire pour charger le modèle en mémoire
  // (VRAM si GPU, RAM système sinon). Source : documentation officielle Ollama.
  const MODEL_RAM = {
    'mistral:7b':  '8 Go minimum, 16 Go recommandé',
    'llama3.2':    '4 Go minimum, 8 Go recommandé',
    'gemma2:2b':   '4 Go minimum',
    'phi3.5':      '4 Go minimum, 8 Go recommandé',
    'llama3.1':    '8 Go minimum, 16 Go recommandé',
    'llama3.1:8b': '8 Go minimum, 16 Go recommandé',
    'codellama':   '8 Go minimum, 16 Go recommandé',
    'qwen2.5':     '8 Go minimum',
  }

  // Retourne la RAM requise pour le modèle configuré, ou un texte générique
  const getModelRam = (model) => {
    if (!model) return null
    // Chercher correspondance exacte puis par préfixe
    if (MODEL_RAM[model]) return MODEL_RAM[model]
    const prefix = Object.keys(MODEL_RAM).find(k => model.startsWith(k.split(':')[0]))
    return prefix ? MODEL_RAM[prefix] : null
  }

  const pullModel = async () => {
    // Télécharger le modèle sélectionné et le définir comme modèle par défaut
    setPullState('pulling')

    // S'abonner aux événements de progression envoyés par le main process
    const unsubProgress = window.electronAPI.ollama.onPullProgress(({ status, pct }) => {
      setPullState({ status, pct })
    })
    const unsubDone = window.electronAPI.ollama.onPullDone(({ ok }) => {
      unsubProgress()
      unsubDone()
      if (ok) {
        // Le modèle est téléchargé — l'activer comme modèle par défaut et relancer le test
        persist({ aiModel, aiEnabled: true })
        setPullState('done')
        // Rafraîchir la liste des modèles pour montrer le nouveau modèle
        testConnection()
      } else {
        setPullState('error')
      }
    })

    // Lancer le pull via IPC — le main process gère le streaming NDJSON
    await window.electronAPI.ollama.pull({ url: aiUrl, model: aiModel })
  }

  const testConnection = async () => {
    setTestState('testing')
    const result = await checkOllama(aiUrl)

    if (result?.ok && result.models?.length > 0) {
      // Vérifier si le modèle actuellement configuré est bien dans la liste des modèles installés.
      // POURQUOI : si on prend toujours models[0], le modèle choisi par l'utilisateur
      // (ex: mistral:7b) est silencieusement écrasé par le premier de la liste (ex: llama3.2).
      const configuredModelAvailable = result.models.includes(aiModel)

      if (!configuredModelAvailable) {
        // Le modèle configuré n'est pas installé dans Ollama.
        // On enrichit le résultat avec un avertissement pour l'afficher dans l'UI.
        // On ne change PAS le modèle automatiquement — c'est à l'utilisateur de choisir.
        setTestState({ ...result, modelWarning: true })
      } else {
        // Le modèle configuré est disponible — aucun changement nécessaire.
        setTestState(result)
      }
    } else {
      // Ollama inaccessible ou aucun modèle installé
      setTestState(result)
    }
  }

  const handleExportProgress = async () => {
    if (!profile) return
    setExportState('generating')
    const progress = await window.electronAPI.store.getProgress(profile.id)
    const activity = await window.electronAPI.store.getActivity(profile.id)

    const lines = [
      `ScriptLearn — Rapport de progression`,
      `Profil : ${profile.name}  |  Date : ${new Date().toLocaleDateString('fr-FR')}`,
      ``,
    ]
    let totalDone = 0, totalEx = 0
    for (const level of contentIndex.levels) {
      lines.push(`\n=== Niveau ${level.id} — ${level.name} ===`)
      for (const lang of ALL_LANGS) {
        const refs = level.languages[lang] ?? []
        if (refs.length === 0) continue
        lines.push(`\n  [${LANG_LABELS[lang]}]`)
        for (const ref of refs) {
          const mod = getModule(ref.id)
          if (!mod) continue
          const done = mod.exercises.filter(ex => progress[ex.id]?.completed).length
          const total = mod.exercises.length
          totalDone += done; totalEx += total
          const pct = total > 0 ? Math.round((done / total) * 100) : 0
          lines.push(`    ${done === total ? '✓' : '○'} ${ref.title} (${done}/${total} — ${pct}%)`)
          for (const ex of mod.exercises) {
            const entry = progress[ex.id]
            if (entry?.completed) {
              const date = entry.completedAt ? new Date(entry.completedAt).toLocaleDateString('fr-FR') : '?'
              lines.push(`        ✓ ${ex.title} — ${entry.attempts ?? 1} tentative(s) — ${date}`)
            }
          }
        }
      }
    }
    const globalPct = totalEx > 0 ? Math.round((totalDone / totalEx) * 100) : 0
    const header = [
      `Progression globale : ${totalDone}/${totalEx} exercices (${globalPct}%)`,
      `Jours d'activité : ${activity.length}`,
      ``,
    ]
    const content = [...lines.slice(0, 3), ...header, ...lines.slice(3)].join('\n')
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `scriptlearn-progression-${profile.name}-${new Date().toISOString().slice(0,10)}.txt`
    a.click()
    URL.revokeObjectURL(url)
    setExportState('done')
    setTimeout(() => setExportState(null), 3000)
  }

  const handleResetProgress = async () => {
    if (resetState !== 'confirm') {
      setResetState('confirm')
      return
    }
    if (!profile) return
    await window.electronAPI.store.resetProgress(profile.id)
    setResetState('done')
    setTimeout(() => setResetState(null), 3000)
  }

  return (
    <div className="p-8 max-w-2xl overflow-y-auto h-full">
      <h1 className="text-2xl font-bold text-white mb-8">Paramètres</h1>

      <div className="space-y-6">
        {/* IA locale */}
        <div className="bg-[#1a1d2e] rounded-xl p-6 border border-[#2d3748]">
          <h2 className="text-white font-semibold mb-1">Intelligence artificielle</h2>
          <p className="text-slate-400 text-sm mb-4">
            Activer Ollama pour des corrections et explications générées localement.
            Requiert ~5 Go de disque et 8 Go de RAM.
          </p>

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-300 text-sm font-medium">Ollama (IA locale)</p>
              <p className="text-slate-500 text-xs mt-0.5">
                {aiEnabled
                  ? 'Actif — feedback dynamique activé'
                  : 'Inactif — corrections statiques utilisées'}
              </p>
            </div>
            <Toggle enabled={aiEnabled} onToggle={() => persist({ aiEnabled: !aiEnabled })} />
          </div>

          {aiEnabled && (
            <div className="border-t border-[#2d3748] pt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-400 text-xs uppercase tracking-widest">
                    URL Ollama
                  </label>
                  <button
                    onClick={() => persist({ aiUrl: 'http://localhost:11434' })}
                    className="text-xs text-slate-500 hover:text-[#6366f1] transition-colors"
                  >
                    Réinitialiser
                  </button>
                </div>
                <input
                  value={aiUrl}
                  onChange={e => setAiUrl(e.target.value)}
                  onBlur={() => persist({ aiUrl })}
                  className={`w-full bg-[#0f1117] border rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none transition-colors ${
                    aiUrl && !aiUrl.startsWith('http')
                      ? 'border-red-500/60 focus:border-red-500'
                      : 'border-[#2d3748] focus:border-[#6366f1]'
                  }`}
                  placeholder="http://localhost:11434"
                />
                {aiUrl && !aiUrl.startsWith('http') && (
                  <p className="text-red-400 text-xs mt-1">
                    L'URL doit commencer par http:// ou https:// — ex : http://localhost:11434
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-slate-400 text-xs uppercase tracking-widest">
                    Modèle
                  </label>
                  {/* Indicateur de RAM requise — aide l'utilisateur à choisir selon sa machine */}
                  {getModelRam(aiModel) && (
                    <span className="text-xs text-slate-500">
                      🧠 RAM : <span className="text-slate-400">{getModelRam(aiModel)}</span>
                    </span>
                  )}
                </div>
                <input
                  value={aiModel}
                  onChange={e => { setAiModel(e.target.value); setPullState(null) }}
                  onBlur={() => persist({ aiModel })}
                  className="w-full bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-[#6366f1] transition-colors"
                  placeholder="llama3.2"
                />
                {/* Liste des modèles installés — permet à l'utilisateur de savoir quoi taper */}
                {testState?.models?.length > 0 && (
                  <div className="mt-1.5 space-y-1">
                    <p className="text-slate-500 text-xs">Modèles installés dans Ollama :</p>
                    <div className="flex flex-wrap gap-1.5">
                      {testState.models.map(m => (
                        <button
                          key={m}
                          onClick={() => { setAiModel(m); persist({ aiModel: m }) }}
                          className={`text-xs px-2 py-0.5 rounded-full transition-colors font-mono ${
                            m === aiModel
                              ? 'bg-[#6366f1] text-white'
                              : 'bg-[#232640] text-slate-400 hover:text-white hover:bg-[#2d3258]'
                          }`}
                        >
                          {m === aiModel ? '✓ ' : ''}{m}
                        </button>
                      ))}
                    </div>
                    {/* Avertissement + bouton pull si le modèle configuré n'est pas installé */}
                    {testState.modelWarning && (
                      <div className="mt-1.5 space-y-1.5">
                        <p className="text-amber-400 text-xs">
                          Le modèle <span className="font-mono">{aiModel}</span> n'est pas installé dans Ollama.
                        </p>
                        <button
                          onClick={pullModel}
                          disabled={pullState === 'pulling'}
                          className="flex items-center gap-2 text-xs bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-50 text-white px-3 py-1.5 rounded-lg transition-colors font-medium"
                        >
                          {pullState === 'pulling' ? '⏳ Téléchargement…' : '↓ Télécharger ce modèle'}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* Zone de progression du téléchargement de modèle */}
              {pullState && pullState !== 'done' && pullState !== 'error' && pullState !== 'pulling' && (
                <div className="bg-[#0f1117] rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{pullState.status || 'Téléchargement…'}</span>
                    {pullState.pct !== null && (
                      <span className="text-xs text-[#6366f1] font-medium">{pullState.pct}%</span>
                    )}
                  </div>
                  {pullState.pct !== null && (
                    <div className="h-1.5 bg-[#1a1d2e] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#6366f1] rounded-full transition-all duration-300"
                        style={{ width: `${pullState.pct}%` }}
                      />
                    </div>
                  )}
                </div>
              )}
              {pullState === 'done' && (
                <p className="text-green-400 text-xs flex items-center gap-1">
                  <span>✓</span> Modèle téléchargé et activé comme modèle par défaut.
                </p>
              )}
              {pullState === 'error' && (
                <p className="text-red-400 text-xs">
                  ✗ Erreur lors du téléchargement. Vérifiez qu'Ollama est lancé et réessayez.
                </p>
              )}
              <button
                onClick={testConnection}
                disabled={testState === 'testing' || pullState === 'pulling'}
                className="flex items-center gap-2 text-sm bg-[#232640] hover:bg-[#2d3258] text-slate-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {testState === 'testing' ? (
                  <>⏳ Test en cours…</>
                ) : testState?.ok && !testState?.modelWarning ? (
                  <><span className="text-green-400">✓</span> Ollama OK — modèle disponible</>
                ) : testState?.ok && testState?.modelWarning ? (
                  <><span className="text-amber-400">⚠</span> Ollama OK — modèle introuvable</>
                ) : testState?.ok === false ? (
                  <><span className="text-red-400">✗</span> Ollama inaccessible</>
                ) : (
                  <>Tester la connexion</>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Rappels quotidiens */}
        <div className="bg-[#1a1d2e] rounded-xl p-6 border border-[#2d3748]">
          <h2 className="text-white font-semibold mb-1">Rappels</h2>
          <p className="text-slate-400 text-sm mb-4">
            Recevoir une notification si vous n'avez pas pratiqué dans la journée.
          </p>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-slate-300 text-sm font-medium">Rappel quotidien</p>
              <p className="text-slate-500 text-xs mt-0.5">
                {remindersEnabled ? `Actif — notification à ${reminderTime}` : 'Inactif'}
              </p>
            </div>
            <Toggle enabled={remindersEnabled} onToggle={() => persist({ remindersEnabled: !remindersEnabled })} />
          </div>
          {remindersEnabled && (
            <div>
              <label className="text-slate-400 text-xs uppercase tracking-widest block mb-1.5">Heure</label>
              <input
                type="time"
                value={reminderTime}
                onChange={e => setReminderTime(e.target.value)}
                onBlur={() => persist({ reminderTime })}
                className="bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-[#6366f1] transition-colors"
              />
            </div>
          )}
        </div>

        {/* Objectif hebdomadaire */}
        <div className="bg-[#1a1d2e] rounded-xl p-6 border border-[#2d3748]">
          <h2 className="text-white font-semibold mb-1">Objectif hebdomadaire</h2>
          <p className="text-slate-400 text-sm mb-4">
            Nombre d'exercices à compléter chaque semaine (visible sur le tableau de bord).
          </p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={1}
              max={200}
              value={weeklyGoalInput}
              onChange={e => setWeeklyGoalInput(e.target.value)}
              onBlur={handleWeeklyGoalBlur}
              className="w-24 bg-[#0f1117] border border-[#2d3748] rounded-lg px-3 py-2 text-sm text-slate-200 font-mono focus:outline-none focus:border-[#6366f1] transition-colors"
            />
            <span className="text-slate-400 text-sm">exercices / semaine</span>
          </div>
        </div>

        {/* Apparence */}
        <div className="bg-[#1a1d2e] rounded-xl p-6 border border-[#2d3748]">
          <h2 className="text-white font-semibold mb-4">Apparence</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-slate-300 text-sm font-medium">Thème</p>
              <p className="text-slate-500 text-xs mt-0.5">Thème clair à venir dans une prochaine version</p>
            </div>
            <span className="text-xs text-slate-400 bg-[#0f1117] px-3 py-1.5 rounded-lg border border-[#2d3748]">
              Sombre
            </span>
          </div>
        </div>

        {/* Progression */}
        <div className="bg-[#1a1d2e] rounded-xl p-6 border border-[#2d3748]">
          <h2 className="text-white font-semibold mb-1">Progression</h2>
          <p className="text-slate-400 text-sm mb-4">
            Réinitialiser efface tous les exercices complétés pour le profil actif ({profile?.name ?? '…'}).
            Cette action est irréversible.
          </p>
          <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleExportProgress}
            disabled={exportState === 'generating'}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors ${
              exportState === 'done'
                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                : 'bg-[#232640] hover:bg-[#2d3258] text-slate-300 border border-[#2d3748] disabled:opacity-50'
            }`}
          >
            {exportState === 'generating' ? '⏳ Génération…' : exportState === 'done' ? '✓ Exporté' : '⬇ Exporter ma progression'}
          </button>
          <button
            onClick={() => window.electronAPI.store.exportProfileJSON(profile?.id).then(data => {
              if (!data) return
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `scriptlearn-profil-${profile?.name ?? 'backup'}-${new Date().toISOString().slice(0,10)}.json`
              a.click()
              URL.revokeObjectURL(url)
            })}
            className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors bg-[#232640] hover:bg-[#2d3258] text-slate-300 border border-[#2d3748]"
          >
            📦 Sauvegarder le profil (JSON)
          </button>
          <button
            onClick={handleImportProfile}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors border ${
              importState === 'done'
                ? 'bg-green-500/10 text-green-400 border-green-500/30'
                : importState === 'error'
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : 'bg-[#232640] hover:bg-[#2d3258] text-slate-300 border-[#2d3748]'
            }`}
          >
            {importState === 'reading' ? '⏳ Import…'
              : importState === 'done'  ? '✓ Profil importé'
              : importState === 'error' ? '✗ Fichier invalide'
              : '📥 Importer un profil'}
          </button>
          <button
            onClick={handleResetProgress}
            className={`flex items-center gap-2 text-sm px-4 py-2 rounded-lg transition-colors ${
              resetState === 'done'
                ? 'bg-green-500/10 text-green-400 border border-green-500/30'
                : resetState === 'confirm'
                ? 'bg-red-500 hover:bg-red-600 text-white font-medium'
                : 'bg-[#232640] hover:bg-red-500/20 text-slate-400 hover:text-red-400 border border-[#2d3748] hover:border-red-500/30'
            }`}
          >
            {resetState === 'done'
              ? '✓ Progression réinitialisée'
              : resetState === 'confirm'
              ? '⚠ Confirmer la réinitialisation'
              : 'Réinitialiser la progression'}
          </button>
          </div>
          {resetState === 'confirm' && (
            <p className="text-red-400/70 text-xs mt-2">
              Cliquez à nouveau pour confirmer. Tous vos exercices complétés seront effacés.
            </p>
          )}
        </div>

        {/* Mises à jour */}
        <div className="bg-[#1a1d2e] rounded-xl p-6 border border-[#2d3748]">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-white font-semibold">Mises à jour</h2>
            {updateAvailable && updateStatus !== UPDATE_STATUS.ready && (
              <span className="text-xs bg-green-500/15 text-green-400 px-2 py-0.5 rounded-full font-medium">
                Mise à jour disponible
              </span>
            )}
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Version actuelle : <span className="text-slate-300 font-mono">{appVersion}</span>
          </p>

          {/* État : disponible ou prête à installer */}
          {(updateStatus === UPDATE_STATUS.available || updateStatus === UPDATE_STATUS.ready) && updateInfo && (
            <div className="bg-[#0f1117] border border-green-500/20 rounded-lg p-4 mb-4">
              <p className="text-green-400 font-medium text-sm mb-1">
                Version {updateInfo.remoteVersion} disponible
              </p>
              {updateInfo.releaseNotes && (
                <p className="text-slate-500 text-xs mb-3 line-clamp-3">{updateInfo.releaseNotes}</p>
              )}
              {updateStatus === UPDATE_STATUS.ready ? (
                <button
                  onClick={installUpdate}
                  className="w-full bg-green-500 hover:bg-green-400 text-white text-sm py-2 rounded-lg transition-colors font-medium"
                >
                  ↺ Redémarrer et installer
                </button>
              ) : (
                <button
                  onClick={downloadUpdate}
                  className="w-full bg-[#6366f1] hover:bg-[#4f46e5] text-white text-sm py-2 rounded-lg transition-colors font-medium"
                >
                  ↓ Télécharger ({updateInfo.assetSize ? `${Math.round(updateInfo.assetSize / 1024 / 1024)} Mo` : '…'})
                </button>
              )}
            </div>
          )}

          {/* Barre de progression */}
          {updateStatus === UPDATE_STATUS.downloading && (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                <span>Téléchargement en cours…</span>
                <span>{dlProgress}%</span>
              </div>
              <div className="h-2 bg-[#0f1117] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#6366f1] rounded-full transition-all duration-300"
                  style={{ width: `${dlProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* État à jour */}
          {updateStatus === UPDATE_STATUS.uptodate && (
            <p className="text-green-400/80 text-sm mb-4 flex items-center gap-2">
              <span>✓</span> Vous utilisez la dernière version.
            </p>
          )}

          {/* Erreur */}
          {updateStatus === UPDATE_STATUS.error && (
            <p className="text-red-400/80 text-sm mb-4">
              Impossible de vérifier les mises à jour. Vérifiez votre connexion.
            </p>
          )}

          {/* Bouton vérifier */}
          {updateStatus !== UPDATE_STATUS.downloading && updateStatus !== UPDATE_STATUS.ready && (
            <button
              onClick={checkUpdate}
              disabled={updateStatus === UPDATE_STATUS.checking}
              className="flex items-center gap-2 text-sm bg-[#232640] hover:bg-[#2d3258] text-slate-300 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {updateStatus === UPDATE_STATUS.checking ? (
                <><span className="animate-spin inline-block">↻</span> Vérification…</>
              ) : (
                <>↻ Vérifier les mises à jour</>
              )}
            </button>
          )}
        </div>

        {/* À propos */}
        <div className="bg-[#1a1d2e] rounded-xl p-6 border border-[#2d3748]">
          <h2 className="text-white font-semibold mb-4">À propos</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-400">Version</span>
              <span className="text-slate-300">{appVersion}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Modules</span>
              <span className="text-slate-300">118 modules · 8 niveaux</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Licence</span>
              <span className="text-slate-300">Gratuit & open-source</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Langages</span>
              <span className="text-slate-300">Bash · Python · PowerShell · KQL · SQL · Git · Regex · SPL · YAML</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings
