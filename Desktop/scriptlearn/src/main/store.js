import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, copyFileSync } from 'fs'

// ------------------------------------------------------------------------------
// LECTURE DE LA CONFIG INSTALLATEUR
// L'installateur NSIS (via build/setup-ollama.ps1) peut laisser un fichier JSON
// dans %APPDATA%\ScriptLearn\installer-ai-config.json contenant le modèle Ollama
// choisi par l'utilisateur PENDANT l'installation.
// Cette fonction lit ce fichier UNE SEULE FOIS au premier démarrage et retourne
// { model, enabled } ou null si le fichier n'existe pas.
// POURQUOI on ne supprime pas le fichier : si l'utilisateur réinstalle ScriptLearn
// sans changer les paramètres, on ne veut pas réinitialiser son choix. Le fichier
// est ignoré si les paramètres ont déjà été personnalisés (aiEnabled différent de false).
// ------------------------------------------------------------------------------
function readInstallerAiConfig() {
  try {
    const configPath = join(app.getPath('userData'), 'installer-ai-config.json')
    if (!existsSync(configPath)) return null
    const raw = readFileSync(configPath, 'utf8')
    const parsed = JSON.parse(raw)
    if (parsed?.model && parsed.model !== 'none') {
      return { model: parsed.model, enabled: parsed.enabled ?? true }
    }
    return null
  } catch {
    // Si le fichier est corrompu ou illisible, on l'ignore silencieusement
    return null
  }
}

// Objectif hebdomadaire maximal (nombre d'exercices). Exporté pour que l'UI
// borne son champ de saisie sur la MÊME valeur que la persistance.
export const MAX_WEEKLY_GOAL = 100

let _dataFile = null
function getDataFile() {
  if (!_dataFile) _dataFile = join(app.getPath('userData'), 'scriptlearn-data.json')
  return _dataFile
}

const DEFAULT_DATA = () => ({
  version: 3,
  profiles: [
    { id: 1, name: 'Apprenant', emoji: '🧑', createdAt: new Date().toISOString(), career: null, weeklyGoal: 10 }
  ],
  activeProfileId: 1,
  progress: { '1': {} },
  activity: { '1': [] },
  drafts: { '1': {} },
  notes: { '1': {} },
  settings: {
    aiEnabled: false,
    aiModel: 'llama3.2',
    aiUrl: 'http://localhost:11434',
    remindersEnabled: false,
    reminderTime: '20:00'
  }
})

// Indique qu'un fichier de données illisible a été rencontré au démarrage :
// le renderer l'affiche (Paramètres) au lieu de laisser croire à une remise à
// zéro volontaire.
let _loadWarning = null
export function getLoadWarning() { return _loadWarning }

function load() {
  const file = getDataFile()
  if (!existsSync(file)) return DEFAULT_DATA()
  try {
    const d = migrate(JSON.parse(readFileSync(file, 'utf8')))
    return d
  } catch {
    // Fichier principal illisible : on tente la copie de sécurité AVANT de
    // repartir de zéro, et on conserve le fichier fautif pour diagnostic
    // (l'ancien code écrasait la corruption au prochain persist()).
    try {
      const bak = file + '.bak'
      if (existsSync(bak)) {
        const d = migrate(JSON.parse(readFileSync(bak, 'utf8')))
        _loadWarning = 'Fichier de données illisible — restauration de la copie de sécurité.'
        try { copyFileSync(file, file + '.corrupt') } catch { /* ignore */ }
        return d
      }
    } catch { /* la sauvegarde est aussi illisible */ }
    try { copyFileSync(file, file + '.corrupt') } catch { /* ignore */ }
    _loadWarning = 'Fichier de données illisible : un nouveau profil vierge a été créé. L\'ancien fichier est conservé (scriptlearn-data.json.corrupt).'
    return DEFAULT_DATA()
  }
}

// Migrations de schéma, isolées pour être réutilisables (fichier principal ET
// copie de sécurité).
function migrate(d) {
  // migrate v1 → v2
  if (!d.activity) d.activity = {}
  if (!d.drafts)   d.drafts   = {}
  // migrate v2 → v3
  if (!d.notes) d.notes = {}
  for (const p of (d.profiles ?? [])) {
    const key = String(p.id)
    if (!d.activity[key]) d.activity[key] = []
    if (!d.drafts[key])   d.drafts[key]   = {}
    if (!d.notes[key])    d.notes[key]    = {}
    if (!p.career)     p.career     = null
    if (p.weeklyGoal == null) p.weeklyGoal = 10
  }
  if (!d.settings) d.settings = {}
  if (d.settings.remindersEnabled == null) d.settings.remindersEnabled = false
  if (!d.settings.reminderTime) d.settings.reminderTime = '20:00'

  // Appliquer la configuration laissée par l'installateur si :
  // - Le fichier installer-ai-config.json existe (l'user a choisi un modèle)
  // - ET aiEnabled est encore à false (l'utilisateur n'a pas encore personnalisé manuellement)
  // Cela évite d'écraser un paramètre que l'utilisateur aurait changé dans les Paramètres.
  if (!d.settings.aiEnabled) {
    const installerConfig = readInstallerAiConfig()
    if (installerConfig) {
      d.settings.aiModel   = installerConfig.model
      d.settings.aiEnabled = installerConfig.enabled
      // Sauvegarder immédiatement pour ne pas relire à chaque démarrage
      persist(d)
    }
  }

  // On aligne le numéro de schéma : sans ça, `version` restait à 1 pour un
  // fichier déjà migré et on ne pouvait plus savoir ce qui avait été appliqué.
  d.version = 3
  return d
}

// Écriture ATOMIQUE.
// POURQUOI : persist() est appelé à chaque mutation (y compris à chaque
// sauvegarde automatique de brouillon). L'ancien writeFileSync écrasait le
// fichier EN PLACE : une coupure de courant, un plantage ou un antivirus au
// mauvais moment laissait un JSON tronqué, et load() repartait alors
// silencieusement sur DEFAULT_DATA() → toute la progression perdue, sans un mot.
// Ici : on écrit dans un fichier temporaire, on garde l'ancien en .bak, puis on
// renomme. `rename` est atomique au niveau du système de fichiers : à aucun
// instant le fichier de données n'est partiellement écrit.
function persist(data) {
  const file = getDataFile()
  const dir = join(file, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  const tmp = file + '.tmp'
  writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8')
  // Copie de sécurité de la version précédente : si le JSON venait malgré tout
  // à être corrompu, load() peut basculer dessus au lieu de tout perdre.
  try { if (existsSync(file)) copyFileSync(file, file + '.bak') } catch { /* best-effort */ }
  renameSync(tmp, file)
}

let _data = null
function data() {
  if (!_data) _data = load()
  return _data
}

// Date du jour en heure LOCALE (AAAA-MM-JJ).
// POURQUOI pas toISOString().slice(0,10) : celui-ci renvoie la date UTC. En
// France (UTC+1/+2), une session entre minuit et 2 h était enregistrée à la
// date de la VEILLE : la série (« streak ») se cassait et le calendrier
// d'activité du Dashboard n'allumait jamais la case du jour. Le Dashboard
// utilise désormais le même format local (voir pages/Dashboard.jsx).
function todayISO() {
  const d = new Date()
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function listProfiles() {
  return data().profiles
}

export function getActiveProfile() {
  const d = data()
  return d.profiles.find(p => p.id === d.activeProfileId) ?? d.profiles[0]
}

export function getActiveProfileId() {
  return data().activeProfileId
}

// Génère un identifiant de profil unique.
// POURQUOI pas Date.now() seul : deux créations (ou une création juste après un
// import) dans la même milliseconde produisaient le MÊME id — les deux profils
// partageaient alors progression, brouillons et notes. On avance jusqu'au
// premier id libre : simple, déterministe, et l'ordre chronologique est conservé.
function nextProfileId(d) {
  const used = new Set((d.profiles ?? []).map(p => p.id))
  let id = Date.now()
  while (used.has(id)) id++
  return id
}

export function createProfile(name, emoji = '🧑', career = null) {
  const d = data()
  const id = nextProfileId(d)
  const profile = { id, name: name.trim(), emoji, career, weeklyGoal: 10, createdAt: new Date().toISOString() }
  d.profiles.push(profile)
  d.progress[String(id)] = {}
  d.activity[String(id)] = []
  d.drafts[String(id)]   = {}
  d.notes[String(id)]    = {}
  persist(d)
  return profile
}

export function deleteProfile(id) {
  const d = data()
  if (d.profiles.length <= 1) return { ok: false, error: 'Impossible de supprimer le dernier profil.' }
  d.profiles = d.profiles.filter(p => p.id !== id)
  delete d.progress[String(id)]
  delete d.activity[String(id)]
  delete d.drafts[String(id)]
  delete d.notes[String(id)]
  if (d.activeProfileId === id) d.activeProfileId = d.profiles[0].id
  persist(d)
  return { ok: true }
}

export function setActiveProfile(id) {
  const d = data()
  if (!d.profiles.find(p => p.id === id)) return false
  d.activeProfileId = id
  persist(d)
  return true
}

export function updateProfileCareer(id, career) {
  const d = data()
  const p = d.profiles.find(p => p.id === id)
  if (!p) return false
  p.career = career
  persist(d)
  return true
}

export function getProgress(profileId) {
  return data().progress[String(profileId)] ?? {}
}

export function getActivity(profileId) {
  return data().activity[String(profileId)] ?? []
}

export function markExerciseDone(profileId, exerciseId) {
  const d = data()
  const key = String(profileId)
  if (!d.progress[key]) d.progress[key] = {}
  const prev = d.progress[key][exerciseId] ?? {}
  d.progress[key][exerciseId] = {
    completed: true,
    attempts: (prev.attempts ?? 0) + 1,
    completedAt: prev.completedAt ?? new Date().toISOString(),
    firstAttemptSuccess: (prev.attempts ?? 0) === 0
  }
  if (!d.activity[key]) d.activity[key] = []
  const today = todayISO()
  if (!d.activity[key].includes(today)) {
    d.activity[key].push(today)
  }
  persist(d)
  return d.progress[key][exerciseId]
}

export function getSettings() {
  const d = data()
  return d.settings ?? { aiEnabled: false, aiModel: 'llama3.2', aiUrl: 'http://localhost:11434', remindersEnabled: false, reminderTime: '20:00' }
}

export function saveSettings(incoming) {
  const d = data()
  d.settings = { ...getSettings(), ...incoming }
  persist(d)
  return d.settings
}

export function resetProgress(profileId) {
  const d = data()
  const key = String(profileId)
  d.progress[key] = {}
  d.activity[key] = []
  persist(d)
  return { ok: true }
}

export function recordAttempt(profileId, exerciseId) {
  const d = data()
  const key = String(profileId)
  if (!d.progress[key]) d.progress[key] = {}
  const prev = d.progress[key][exerciseId] ?? {}
  d.progress[key][exerciseId] = {
    completed: prev.completed ?? false,
    attempts: (prev.attempts ?? 0) + 1,
    completedAt: prev.completedAt ?? null,
    firstAttemptSuccess: prev.firstAttemptSuccess ?? false
  }
  persist(d)
}

export function getDraft(profileId, key) {
  return data().drafts?.[String(profileId)]?.[key] ?? ''
}

export function saveDraft(profileId, key, code) {
  const d = data()
  const pk = String(profileId)
  if (!d.drafts[pk]) d.drafts[pk] = {}
  d.drafts[pk][key] = code
  persist(d)
}

export function deleteDraft(profileId, key) {
  const d = data()
  const pk = String(profileId)
  if (d.drafts[pk]) {
    delete d.drafts[pk][key]
    persist(d)
  }
}

// Notes
export function getNote(profileId, key) {
  return data().notes?.[String(profileId)]?.[key] ?? ''
}

export function saveNote(profileId, key, text) {
  const d = data()
  const pk = String(profileId)
  if (!d.notes[pk]) d.notes[pk] = {}
  if (text.trim()) {
    d.notes[pk][key] = text
  } else {
    delete d.notes[pk][key]
  }
  persist(d)
}

export function getAllNotes(profileId) {
  return data().notes?.[String(profileId)] ?? {}
}

// Weekly goal
export function getWeeklyGoal(profileId) {
  const p = data().profiles.find(p => p.id === profileId)
  return p?.weeklyGoal ?? 10
}

export function setWeeklyGoal(profileId, goal) {
  const d = data()
  const p = d.profiles.find(p => p.id === profileId)
  if (!p) return false
  // MAX_WEEKLY_GOAL est LA borne de référence : l'UI (pages/Settings.jsx)
  // acceptait jusqu'à 200 alors qu'on bornait ici à 100 — saisir 150 affichait
  // 150, puis 100 après rechargement. Les deux doivent utiliser la même valeur.
  p.weeklyGoal = Math.max(1, Math.min(MAX_WEEKLY_GOAL, Number(goal) || 1))
  persist(d)
  return true
}

// Import / Export
export function exportProfileJSON(profileId) {
  const d = data()
  const pk = String(profileId)
  const profile = d.profiles.find(p => p.id === profileId)
  if (!profile) return null
  return {
    exportVersion: 1,
    exportedAt: new Date().toISOString(),
    profile,
    progress: d.progress[pk] ?? {},
    activity: d.activity[pk] ?? [],
    notes: d.notes[pk] ?? {}
  }
}

// Nettoie un dictionnaire venant d'un fichier importé.
// POURQUOI : le contenu provient d'un fichier CHOISI PAR L'UTILISATEUR, donc
// arbitraire. Deux risques concrets : (1) une clé « __proto__ » ou
// « constructor » dans un objet JSON peut polluer le prototype de Object une
// fois recopiée ; (2) des valeurs de type inattendu font planter les pages qui
// lisent la progression. On ne recopie donc QUE des clés sûres et des formes
// attendues.
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

function sanitizeProgress(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw)) {
    if (UNSAFE_KEYS.has(k) || typeof k !== 'string' || k.length > 200) continue
    if (!v || typeof v !== 'object') continue
    out[k] = {
      completed: Boolean(v.completed),
      attempts: Number.isFinite(v.attempts) ? Math.max(0, Math.floor(v.attempts)) : 0,
      completedAt: typeof v.completedAt === 'string' ? v.completedAt : null,
      firstAttemptSuccess: Boolean(v.firstAttemptSuccess),
    }
  }
  return out
}

function sanitizeNotes(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object') return out
  for (const [k, v] of Object.entries(raw)) {
    if (UNSAFE_KEYS.has(k) || typeof v !== 'string') continue
    out[k] = v.slice(0, 20000) // borne : une note géante ferait gonfler le store
  }
  return out
}

export function importProfileJSON(payload) {
  if (!payload?.profile || !payload?.progress) return { ok: false, error: 'Format invalide.' }
  if (typeof payload.profile !== 'object') return { ok: false, error: 'Format invalide.' }
  const d = data()
  const newId = nextProfileId(d)
  // Liste blanche de champs : on ne recopie PAS le profil importé tel quel
  // (`...payload.profile`), qui pouvait embarquer n'importe quelle clé.
  const rawName = typeof payload.profile.name === 'string' ? payload.profile.name.trim() : ''
  const goal = Number(payload.profile.weeklyGoal)
  const profile = {
    id: newId,
    name: `${(rawName || 'Apprenant').slice(0, 40)} (importé)`,
    emoji: typeof payload.profile.emoji === 'string' ? payload.profile.emoji.slice(0, 8) : '🧑',
    career: typeof payload.profile.career === 'string' ? payload.profile.career : null,
    createdAt: new Date().toISOString(),
    weeklyGoal: Number.isFinite(goal) ? Math.max(1, Math.min(MAX_WEEKLY_GOAL, Math.floor(goal))) : 10
  }
  d.profiles.push(profile)
  const pk = String(newId)
  d.progress[pk] = sanitizeProgress(payload.progress)
  // Dates d'activité : on ne garde que des chaînes AAAA-MM-JJ plausibles.
  d.activity[pk] = Array.isArray(payload.activity)
    ? payload.activity.filter(v => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)).slice(0, 5000)
    : []
  d.drafts[pk]   = {}
  d.notes[pk]    = sanitizeNotes(payload.notes)
  persist(d)
  return { ok: true, profile }
}

// Last activity date for notifications
export function getLastActivityDate(profileId) {
  const dates = data().activity?.[String(profileId)] ?? []
  if (!dates.length) return null
  return [...dates].sort().reverse()[0]
}
