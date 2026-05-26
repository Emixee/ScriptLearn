"use strict";
const { app, BrowserWindow, ipcMain, shell } = require("electron");
const path = require("path");
const fs = require("fs");
const Store = require("electron-store");
const { autoUpdater } = require("electron-updater");
const isDev = process.env.NODE_ENV === "development" || !app.isPackaged;
let logPath = null;
function initLog() {
  logPath = path.join(app.getPath("userData"), "app.log");
  try {
    if (fs.existsSync(logPath) && fs.statSync(logPath).size > 1e6) {
      const lines = fs.readFileSync(logPath, "utf8").split("\n");
      fs.writeFileSync(logPath, lines.slice(-500).join("\n"));
    }
  } catch {
  }
}
function writeLog(level, message, data) {
  if (!logPath) return;
  const ts = (/* @__PURE__ */ new Date()).toISOString();
  const extra = data ? " " + JSON.stringify(data) : "";
  const line = `[${ts}] [${level}] ${message}${extra}
`;
  try {
    fs.appendFileSync(logPath, line);
  } catch {
  }
}
process.on("uncaughtException", (err) => {
  writeLog("FATAL", "Main process uncaught exception", { message: err.message, stack: err.stack });
});
const schema = {
  profiles: {
    type: "array",
    default: []
  },
  settings: {
    type: "object",
    default: {
      lang: "fr",
      ollamaUrl: "http://localhost:11434",
      ollamaModel: "llama3",
      theme: "dark",
      notifications: true
    }
  }
};
const store = new Store({ schema });
let mainWindow;
function setupAutoUpdater() {
  if (isDev) return;
  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  function sendStatus(event, data = {}) {
    mainWindow?.webContents?.send("updater:status", { event, ...data });
    writeLog("INFO", `Updater: ${event}`, data);
  }
  autoUpdater.on("checking-for-update", () => {
    sendStatus("checking");
  });
  autoUpdater.on("update-available", (info) => {
    sendStatus("available", { version: info.version, releaseDate: info.releaseDate });
  });
  autoUpdater.on("update-not-available", () => {
    sendStatus("not-available");
  });
  autoUpdater.on("download-progress", (progress) => {
    sendStatus("downloading", {
      percent: Math.round(progress.percent),
      speed: Math.round(progress.bytesPerSecond / 1024),
      // Ko/s
      transferred: Math.round(progress.transferred / 1024 / 1024 * 10) / 10,
      // Mo
      total: Math.round(progress.total / 1024 / 1024 * 10) / 10
      // Mo
    });
  });
  autoUpdater.on("update-downloaded", (info) => {
    sendStatus("ready", { version: info.version });
  });
  autoUpdater.on("error", (err) => {
    const msg = err?.message || String(err);
    if (!msg.includes("No published releases")) {
      sendStatus("error", { message: msg });
      writeLog("ERROR", "Auto-updater error", { message: msg });
    } else {
      sendStatus("not-available");
    }
  });
  setTimeout(() => autoUpdater.checkForUpdates(), 5e3);
  setInterval(() => autoUpdater.checkForUpdates(), 4 * 60 * 60 * 1e3);
}
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: "#0d1117",
    titleBarStyle: "hidden",
    titleBarOverlay: {
      color: "#0d1117",
      symbolColor: "#00ff88",
      height: 36
    },
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    },
    icon: path.join(__dirname, "../../public/icon.png"),
    show: false
  });
  if (isDev) {
    mainWindow.loadURL(process.env["ELECTRON_RENDERER_URL"] || "http://localhost:5173");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}
app.whenReady().then(() => {
  initLog();
  writeLog("INFO", "App starting", { version: app.getVersion(), isDev });
  createWindow();
  setupAutoUpdater();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
ipcMain.handle("profiles:list", () => {
  return store.get("profiles", []);
});
ipcMain.handle("profiles:create", (_, profile) => {
  const profiles = store.get("profiles", []);
  const newProfile = {
    id: Date.now().toString(),
    name: profile.name,
    avatar: profile.avatar || "🛡️",
    createdAt: (/* @__PURE__ */ new Date()).toISOString(),
    xp: 0,
    level: 0,
    progress: {},
    badges: [],
    completedLessons: [],
    completedQuizzes: {},
    completedLabs: [],
    completedCTFs: [],
    streak: 0,
    lastActivity: (/* @__PURE__ */ new Date()).toISOString()
  };
  profiles.push(newProfile);
  store.set("profiles", profiles);
  return newProfile;
});
ipcMain.handle("profiles:update", (_, { id, data }) => {
  const profiles = store.get("profiles", []);
  const idx = profiles.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  profiles[idx] = { ...profiles[idx], ...data, lastActivity: (/* @__PURE__ */ new Date()).toISOString() };
  store.set("profiles", profiles);
  return profiles[idx];
});
ipcMain.handle("profiles:delete", (_, id) => {
  const profiles = store.get("profiles", []).filter((p) => p.id !== id);
  store.set("profiles", profiles);
  return true;
});
ipcMain.handle("profiles:get", (_, id) => {
  const profiles = store.get("profiles", []);
  return profiles.find((p) => p.id === id) || null;
});
ipcMain.handle("progress:save-lesson", (_, { profileId, lessonId, xpGained }) => {
  const profiles = store.get("profiles", []);
  const idx = profiles.findIndex((p) => p.id === profileId);
  if (idx === -1) return null;
  const profile = profiles[idx];
  if (!profile.completedLessons.includes(lessonId)) {
    profile.completedLessons.push(lessonId);
    profile.xp += xpGained;
    profile.level = computeLevel(profile.xp);
  }
  profile.lastActivity = (/* @__PURE__ */ new Date()).toISOString();
  store.set("profiles", profiles);
  return profile;
});
ipcMain.handle("progress:save-quiz", (_, { profileId, quizId, score, total, xpGained }) => {
  const profiles = store.get("profiles", []);
  const idx = profiles.findIndex((p) => p.id === profileId);
  if (idx === -1) return null;
  const profile = profiles[idx];
  const existing = profile.completedQuizzes[quizId];
  if (!existing || score > existing.score) {
    profile.completedQuizzes[quizId] = { score, total, date: (/* @__PURE__ */ new Date()).toISOString() };
    if (!existing) profile.xp += xpGained;
    profile.level = computeLevel(profile.xp);
  }
  profile.lastActivity = (/* @__PURE__ */ new Date()).toISOString();
  store.set("profiles", profiles);
  return profile;
});
ipcMain.handle("progress:save-lab", (_, { profileId, labId, xpGained }) => {
  const profiles = store.get("profiles", []);
  const idx = profiles.findIndex((p) => p.id === profileId);
  if (idx === -1) return null;
  const profile = profiles[idx];
  if (!profile.completedLabs.includes(labId)) {
    profile.completedLabs.push(labId);
    profile.xp += xpGained;
    profile.level = computeLevel(profile.xp);
  }
  profile.lastActivity = (/* @__PURE__ */ new Date()).toISOString();
  store.set("profiles", profiles);
  return profile;
});
ipcMain.handle("progress:save-ctf", (_, { profileId, ctfId, xpGained }) => {
  const profiles = store.get("profiles", []);
  const idx = profiles.findIndex((p) => p.id === profileId);
  if (idx === -1) return null;
  const profile = profiles[idx];
  if (!profile.completedCTFs.includes(ctfId)) {
    profile.completedCTFs.push(ctfId);
    profile.xp += xpGained;
    profile.level = computeLevel(profile.xp);
  }
  store.set("profiles", profiles);
  return profile;
});
ipcMain.handle("progress:award-badge", (_, { profileId, badgeId }) => {
  const profiles = store.get("profiles", []);
  const idx = profiles.findIndex((p) => p.id === profileId);
  if (idx === -1) return null;
  const profile = profiles[idx];
  if (!profile.badges.includes(badgeId)) {
    profile.badges.push(badgeId);
    store.set("profiles", profiles);
  }
  return profile;
});
ipcMain.handle("settings:get", () => {
  return store.get("settings");
});
ipcMain.handle("settings:save", (_, settings) => {
  store.set("settings", { ...store.get("settings"), ...settings });
  return store.get("settings");
});
ipcMain.handle("updater:check", async () => {
  if (isDev) return { status: "dev" };
  try {
    await autoUpdater.checkForUpdates();
    return { status: "ok" };
  } catch (err) {
    return { status: "error", message: err.message };
  }
});
ipcMain.handle("updater:download", () => {
  autoUpdater.downloadUpdate();
});
ipcMain.handle("updater:install", () => {
  autoUpdater.quitAndInstall(false, true);
});
ipcMain.handle("log:write", (_, { level, message, data }) => {
  writeLog(level, message, data);
  return true;
});
ipcMain.handle("log:get-path", () => logPath);
ipcMain.handle("log:open", () => {
  if (logPath && fs.existsSync(logPath)) shell.openPath(logPath);
});
function computeLevel(xp) {
  const thresholds = [0, 500, 1500, 3500, 7e3, 12e3, 2e4, 32e3, 5e4, 75e3, 11e4];
  for (let i = thresholds.length - 1; i >= 0; i--) {
    if (xp >= thresholds[i]) return i;
  }
  return 0;
}
