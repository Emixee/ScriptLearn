import { ipcMain } from 'electron'
import * as store from './store.js'

export function setupStoreIPC() {
  ipcMain.handle('store:listProfiles',        ()         => store.listProfiles())
  ipcMain.handle('store:getActiveProfile',    ()         => store.getActiveProfile())
  ipcMain.handle('store:createProfile',       (_, p)     => store.createProfile(p.name, p.emoji, p.career ?? null))
  ipcMain.handle('store:deleteProfile',       (_, p)     => store.deleteProfile(p.id))
  ipcMain.handle('store:setActiveProfile',    (_, p)     => store.setActiveProfile(p.id))
  ipcMain.handle('store:updateCareer',        (_, p)     => store.updateProfileCareer(p.id, p.career))
  ipcMain.handle('store:getProgress',         (_, p)     => store.getProgress(p.profileId))
  ipcMain.handle('store:getActivity',         (_, p)     => store.getActivity(p.profileId))
  ipcMain.handle('store:markExerciseDone',    (_, p)     => store.markExerciseDone(p.profileId, p.exerciseId))
  ipcMain.handle('store:recordAttempt',       (_, p)     => store.recordAttempt(p.profileId, p.exerciseId))
  ipcMain.handle('store:getSettings',         ()         => store.getSettings())
  ipcMain.handle('store:saveSettings',        (_, p)     => store.saveSettings(p.settings))
  ipcMain.handle('store:resetProgress',       (_, p)     => store.resetProgress(p.profileId))
  ipcMain.handle('store:getDraft',            (_, p)     => store.getDraft(p.profileId, p.key))
  ipcMain.handle('store:saveDraft',           (_, p)     => store.saveDraft(p.profileId, p.key, p.code))
  ipcMain.handle('store:deleteDraft',         (_, p)     => store.deleteDraft(p.profileId, p.key))
  // Notes
  ipcMain.handle('store:getNote',             (_, p)     => store.getNote(p.profileId, p.key))
  ipcMain.handle('store:saveNote',            (_, p)     => store.saveNote(p.profileId, p.key, p.text))
  ipcMain.handle('store:getAllNotes',         (_, p)     => store.getAllNotes(p.profileId))
  // Weekly goal
  ipcMain.handle('store:getWeeklyGoal',       (_, p)     => store.getWeeklyGoal(p.profileId))
  ipcMain.handle('store:setWeeklyGoal',       (_, p)     => store.setWeeklyGoal(p.profileId, p.goal))
  // Import / Export JSON
  ipcMain.handle('store:exportProfileJSON',   (_, p)     => store.exportProfileJSON(p.profileId))
  ipcMain.handle('store:importProfileJSON',   (_, p)     => store.importProfileJSON(p.payload))
  // Notification helpers
  ipcMain.handle('store:getLastActivityDate', (_, p)     => store.getLastActivityDate(p.profileId))
}
