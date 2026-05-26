import { create } from 'zustand'
import { t } from '../i18n'

const useAppStore = create((set, get) => ({
  // ─── Profil actif ──────────────────────────────────────────────────────────
  currentProfile: null,
  profiles: [],

  setCurrentProfile: (profile) => set({ currentProfile: profile }),

  loadProfiles: async () => {
    const profiles = await window.electronAPI.profiles.list()
    set({ profiles })
    return profiles
  },

  createProfile: async (name, avatar) => {
    const profile = await window.electronAPI.profiles.create({ name, avatar })
    const profiles = await window.electronAPI.profiles.list()
    set({ profiles, currentProfile: profile })
    return profile
  },

  updateProfile: async (id, data) => {
    const updated = await window.electronAPI.profiles.update(id, data)
    const profiles = await window.electronAPI.profiles.list()
    set({ profiles })
    if (get().currentProfile?.id === id) {
      set({ currentProfile: updated })
    }
    return updated
  },

  deleteProfile: async (id) => {
    await window.electronAPI.profiles.delete(id)
    const profiles = await window.electronAPI.profiles.list()
    set({ profiles })
    if (get().currentProfile?.id === id) {
      set({ currentProfile: null })
    }
  },

  // ─── Progression ───────────────────────────────────────────────────────────

  completeLesson: async (lessonId, xpGained) => {
    const profile = get().currentProfile
    if (!profile) return
    const updated = await window.electronAPI.progress.saveLesson(profile.id, lessonId, xpGained)
    set({ currentProfile: updated })
    // Vérifier les badges
    get()._checkBadges(updated)
    return updated
  },

  completeQuiz: async (quizId, score, total, xpGained) => {
    const profile = get().currentProfile
    if (!profile) return
    const updated = await window.electronAPI.progress.saveQuiz(profile.id, quizId, score, total, xpGained)
    set({ currentProfile: updated })
    get()._checkBadges(updated)
    return updated
  },

  completeLab: async (labId, xpGained) => {
    const profile = get().currentProfile
    if (!profile) return
    const updated = await window.electronAPI.progress.saveLab(profile.id, labId, xpGained)
    set({ currentProfile: updated })
    get()._checkBadges(updated)
    return updated
  },

  completeCTF: async (ctfId, xpGained) => {
    const profile = get().currentProfile
    if (!profile) return
    const updated = await window.electronAPI.progress.saveCTF(profile.id, ctfId, xpGained)
    set({ currentProfile: updated })
    get()._checkBadges(updated)
    return updated
  },

  _checkBadges: async (profile) => {
    const awardBadge = async (badgeId) => {
      if (!profile.badges.includes(badgeId)) {
        await window.electronAPI.progress.awardBadge(profile.id, badgeId)
        const profiles = await window.electronAPI.profiles.list()
        const updated = profiles.find(p => p.id === profile.id)
        set({ currentProfile: updated, profiles })
      }
    }

    if (profile.completedLessons.length === 1) await awardBadge('firstLesson')
    if (Object.keys(profile.completedQuizzes).length === 1) await awardBadge('firstQuiz')
    if (profile.completedLabs.length === 1) await awardBadge('firstLab')
    if (profile.completedCTFs.length === 1) await awardBadge('firstCTF')
  },

  // ─── Settings ──────────────────────────────────────────────────────────────
  settings: {
    lang: 'fr',
    ollamaUrl: 'http://localhost:11434',
    ollamaModel: 'llama3',
    theme: 'dark',
    notifications: true,
  },

  loadSettings: async () => {
    const settings = await window.electronAPI.settings.get()
    set({ settings })
    return settings
  },

  saveSettings: async (newSettings) => {
    const saved = await window.electronAPI.settings.save(newSettings)
    set({ settings: saved })
    return saved
  },

  // ─── Utilitaires ───────────────────────────────────────────────────────────
  t: (key) => t(get().settings.lang, key),

  getLevelProgress: () => {
    const profile = get().currentProfile
    if (!profile) return { level: 0, xp: 0, xpToNext: 500, percent: 0 }
    const thresholds = [0, 500, 1500, 3500, 7000, 12000, 20000, 32000, 50000, 75000, 110000]
    const lvl = profile.level || 0
    const xpCurrent = profile.xp - (thresholds[lvl] || 0)
    const xpNeeded = (thresholds[lvl + 1] || thresholds[thresholds.length - 1]) - (thresholds[lvl] || 0)
    return {
      level: lvl,
      xp: profile.xp,
      xpCurrent,
      xpToNext: xpNeeded,
      percent: Math.min(100, Math.round((xpCurrent / xpNeeded) * 100)),
    }
  },

  // ─── Notification toast ────────────────────────────────────────────────────
  toasts: [],
  addToast: (message, type = 'info') => {
    const id = Date.now()
    set(state => ({ toasts: [...state.toasts, { id, message, type }] }))
    setTimeout(() => {
      set(state => ({ toasts: state.toasts.filter(t => t.id !== id) }))
    }, 3500)
  },
  removeToast: (id) => set(state => ({ toasts: state.toasts.filter(t => t.id !== id) })),
}))

export default useAppStore
