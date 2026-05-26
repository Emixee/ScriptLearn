import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'

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

function load() {
  const file = getDataFile()
  if (!existsSync(file)) return DEFAULT_DATA()
  try {
    const d = JSON.parse(readFileSync(file, 'utf8'))
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
    return d
  } catch {
    return DEFAULT_DATA()
  }
}

function persist(data) {
  const file = getDataFile()
  const dir = join(file, '..')
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
  writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

let _data = null
function data() {
  if (!_data) _data = load()
  return _data
}

function todayISO() {
  return new Date().toISOString().slice(0, 10)
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

export function createProfile(name, emoji = '🧑', career = null) {
  const d = data()
  const id = Date.now()
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
  p.weeklyGoal = Math.max(1, Math.min(100, goal))
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

export function importProfileJSON(payload) {
  if (!payload?.profile || !payload?.progress) return { ok: false, error: 'Format invalide.' }
  const d = data()
  const newId = Date.now()
  const profile = {
    ...payload.profile,
    id: newId,
    name: `${payload.profile.name} (importé)`,
    createdAt: new Date().toISOString(),
    weeklyGoal: payload.profile.weeklyGoal ?? 10
  }
  d.profiles.push(profile)
  const pk = String(newId)
  d.progress[pk] = payload.progress ?? {}
  d.activity[pk] = payload.activity ?? []
  d.drafts[pk]   = {}
  d.notes[pk]    = payload.notes ?? {}
  persist(d)
  return { ok: true, profile }
}

// Last activity date for notifications
export function getLastActivityDate(profileId) {
  const dates = data().activity?.[String(profileId)] ?? []
  if (!dates.length) return null
  return [...dates].sort().reverse()[0]
}
