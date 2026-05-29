# ScriptLearn — Journal de développement

## Version actuelle : 0.5.4

### État du projet
Application Electron/React d'apprentissage du scripting (Bash, Python, PowerShell + langages complémentaires), Windows uniquement, interface 100% française, hors-ligne, multi-profils.

---

## v0.5.4 — Fix installer + sélection modèle défaut (2026-05-28)

### Fix installer NSIS — boutons radio (2 bugs)
**Bug 1** : impossible de déselectionner. Chaque `RadioButton` dans son propre `Panel` → parents différents → Windows Forms ne crée pas de groupe → `mistral:7b` restait coché.
**Bug 2** : `mistral:7b` toujours installé peu importe le choix (conséquence du bug 1).
**Fix** : tous les `RadioButton` dans un seul `GroupBox` (même parent = déselection mutuelle automatique).

### Paramètres — sélection modèle par défaut
- `installedModels` : état persistant séparé de `testState` (ne disparaît plus quand l'utilisateur tape)
- Cartes cliquables pour chaque modèle installé → clic = modèle par défaut + badge "par défaut"
- RAM requise affichée sur chaque carte (version courte)

### v0.5.3 — Fix IA indisponible (cause racine)
**Cause principale** : Node.js résout `localhost` → `::1` (IPv6) sur Windows 11+, Ollama écoute sur `127.0.0.1` (IPv4) → connexion refusée silencieusement.
Identifié en comparant avec l'implémentation Analyst SOC Training.
- `resolveHostname()` force `127.0.0.1` explicitement
- `stream: true` + lecture NDJSON ligne par ligne (plus robuste)
- `session.defaultSession.webRequest.onHeadersReceived` injecte CORS sur `localhost:11434`
- `event.sender.send()` au lieu de `BrowserWindow.getAllWindows()[0]` pour `ollama:pull`

---

## v0.5.2 — Pull modèle Ollama depuis Paramètres + RAM requis (2026-05-28)

### Nouvelles fonctionnalités
- **Bouton "Télécharger ce modèle"** dans Paramètres > IA : apparaît quand le modèle configuré n'est pas installé. Lance `ollama pull <modèle>` avec streaming de progression (statut + barre %)
- **Indicateur RAM** à côté du champ modèle : affiche la RAM minimum/recommandée selon le modèle sélectionné (`mistral:7b` → 8 Go min, `llama3.2` → 4 Go min, etc.)
- Après pull réussi : modèle activé automatiquement + liste des modèles rafraîchie

### v0.5.1 — Fix validation + IA (http natif, /api/chat, timeout 180s) (2026-05-28)
- **Exercise.jsx** : suppression fallback source-code dans validate() → plus de faux positifs
- **ollama.js** : migration `fetch`/undici → `http` natif Node.js (plus fiable sur longues connexions)
- **ollama.js** : migration `/api/generate` → `/api/chat` (API recommandée Ollama v0.1.14+)
- **ollama.js** : timeout augmenté de 90s → 180s (cold start mistral:7b)

### Architecture IPC Ollama (mise à jour)
- `ollama:check` → `/api/tags` (ping + liste modèles)
- `ollama:generate` → `/api/chat` (inférence, 180s timeout, http natif)
- `ollama:pull` → `/api/pull` (streaming NDJSON, pas de timeout fixe)
- Événements renderer : `ollama:pull-progress` `{ status, pct }` + `ollama:pull-done` `{ ok }`

---

## v0.5.0 — Installation Ollama et modèle IA pendant l'installateur (2026-05-28)

### Ce qui se passe pendant l'installation (NSIS)

Après la copie des fichiers de ScriptLearn, l'installateur lance automatiquement une fenêtre de configuration Ollama :

1. **Sélection du modèle** — UI Windows Forms avec radio buttons :
   - `mistral:7b` — Recommandé, excellent français (4.1 Go)
   - `llama3.2` — Léger et rapide (2.0 Go)
   - `gemma2:2b` — Ultra léger (1.6 Go)
   - `phi3.5` — Compact et polyvalent (2.2 Go)
   - Ne pas installer (configurer plus tard dans Paramètres)

2. **Installation Ollama** — Si absent, télécharge `OllamaSetup.exe` depuis `ollama.com/download` et l'installe silencieusement

3. **Pull du modèle** — Lance `ollama pull <modèle>` et attend la fin

4. **Config sauvegardée** — Écrit `%APPDATA%\ScriptLearn\installer-ai-config.json` avec `{ model, enabled, installedAt }`

5. **Premier démarrage ScriptLearn** — `store.js` `load()` lit le fichier et applique `aiModel` + `aiEnabled` si non encore configurés

### Fichiers créés
- `build/setup-ollama.ps1` — Script PowerShell bundlé dans l'installateur NSIS, extrait vers `%TEMP%` et exécuté pendant l'installation
- `installer/custom.nsh` — Macro `!macro customInstall` electron-builder/NSIS : extrait et run le PS1 via `ExecWait`
- `src/main/store.js` — Fonction `readInstallerAiConfig()` + application au `load()`
- `package.json` — `nsis.include: "installer/custom.nsh"`

---

## v0.4.6 — Vérification modèle Ollama + revue complète du code (2026-05-28)

### Revue complète du code — résultats

**Bug corrigé — `Settings.jsx` `testConnection()` écrasait le modèle choisi :**
```javascript
// AVANT (bug) : toujours models[0], écrase silencieusement le modèle configuré
const firstModel = result.models[0]
setAiModel(firstModel)
persist({ aiModel: firstModel })

// APRÈS (corrigé) : vérifie si le modèle configuré est dans la liste
const configuredModelAvailable = result.models.includes(aiModel)
if (!configuredModelAvailable) setTestState({ ...result, modelWarning: true })
```
Comportement après correction :
- Modèle configuré **installé dans Ollama** → `✓ Ollama OK — modèle disponible`
- Modèle configuré **absent d'Ollama** → `⚠ Ollama OK — modèle introuvable` + message avec `ollama pull <modèle>`
- Modèles installés affichés comme **boutons cliquables** pour sélection directe

**Bug cosmétique corrigé — `Stats.jsx` ligne 203 :**
Emoji utilisé comme classe CSS (`className="text-base ✅"`) — classe invalide ignorée par le navigateur. Corrigé : emoji dans le contenu uniquement.

### Ce que le code fait / ne fait PAS concernant Ollama
- **Fait** : vérifie si Ollama tourne (`/api/tags`), liste les modèles installés
- **Fait** : vérifie si le modèle configuré est dans la liste (ajouté en v0.4.6)
- **Ne fait pas** : télécharger/installer Ollama (l'utilisateur doit l'installer séparément)
- **Ne fait pas** : `ollama pull <modèle>` (l'utilisateur doit exécuter cette commande manuellement)
- Si `generate` est appelé avec un modèle non installé → retourne `null` silencieusement (Ollama échoue côté serveur)

---

## v0.4.5 — Correctif cours complémentaires / prop `ref` réservé (2026-05-28)

### Cause du bug
Dans `CourseList.jsx`, le composant `ModuleCard` était appelé avec `ref={modRef}` :
```jsx
<ModuleCard ref={modRef} lang={selectedTrack} ... />
```
`ref` est un **prop réservé React** — React l'intercepte pour ses propres besoins (refs DOM/composants) et **ne le transmet jamais** au composant. Résultat : à l'intérieur de `ModuleCard`, `modRef` était `undefined` → `getModule(undefined.id)` → `TypeError: Cannot read properties of undefined (reading 'id')` → intercepté par ErrorBoundary (v0.4.4) et affiché à l'utilisateur.

### Correction
Renommage `ref` → `modRef` dans la définition et l'appel du composant `ModuleCard`.

---

## v0.4.4 — Correctif exercices vides en production (2026-05-28)

### Cause du bug
**Bug 1 — Temporal Dead Zone (TDZ)** dans `Exercise.jsx` :
```js
// AVANT (ligne 376 — BUG) :
const noteKey = exercise ? `ex:${exercise.id}` : null  // exercise utilisé ici...
// ...
const exercise = module?.exercises?.[exIdx] ?? null     // ...mais déclaré ICI (ligne 385)
```
- En **développement** (esbuild) : `const` → `var`, pas de TDZ → fonctionne silencieusement
- En **production** (Rollup) : `const` conservé, TDZ enforced → `ReferenceError: Cannot access 'exercise' before initialization` → React doit démonter

**Bug 2 — Aucun `ErrorBoundary`** dans toute l'app. Tout `ReferenceError` non intercepté fait démonter l'arbre React entier → écran blanc, sans message.

### Corrections
- `src/renderer/src/pages/Exercise.jsx` — `noteKey` déplacé après la déclaration de `exercise`
- `src/renderer/src/components/ErrorBoundary.jsx` (**nouveau**) — intercepte les erreurs de rendu, affiche message + bouton retour
- `src/renderer/src/main.jsx` — `ErrorBoundary` en racine autour de tout l'app

### Note
Ce bug existait depuis que les annotations (notes) ont été ajoutées en v0.3.0, mais n'était visible qu'en build production (pas en `npm run dev`).

---

## v0.4.3 — Correctif installation mise à jour NSIS (2026-05-28)

### Cause du bug
`update:install` dans `updater.js` appelait `spawn(installerPath, [])` sans arguments NSIS.

**Bug 1 — pas de `/S`** : NSIS s'ouvre en mode interactif (fenêtre UI visible). L'utilisateur ne la voit pas (l'app vient de se fermer), l'ignore, ou installe dans un mauvais répertoire.

**Bug 2 — pas de `/D=`** : même en silencieux, NSIS installe dans son chemin par défaut. Si l'installation existante est ailleurs → deux versions coexistent, raccourcis pointent toujours vers l'ancienne.

### Correction
```javascript
const installDir = dirname(app.getPath('exe'))
spawn(installerPath, ['/S', `/D=${installDir}`], { detached: true, stdio: 'ignore' }).unref()
setTimeout(() => app.quit(), 1500)  // était 800ms
```
- `/S` = mode silencieux, aucune UI
- `/D=<installDir>` = écrase l'installation existante au bon endroit
- `dirname(app.getPath('exe'))` = répertoire de l'exécutable actuel

### Note importante pour l'utilisateur v0.4.1
Pour passer de 0.4.1 à 0.4.3, **installer manuellement** `ScriptLearn-Setup-Hybrid.exe` depuis la [release v0.4.3](https://github.com/Emixee/ScriptLearn/releases/tag/v0.4.3). Les versions 0.4.2+ peuvent se mettre à jour automatiquement.

---

## v0.4.2 — Correctif Ollama / Private Network Access (2026-05-28)

### Cause du bug
Chromium (moteur d'Electron) applique la **Private Network Access (PNA)** policy depuis Chromium 94+. Quand le renderer (page `file://` = origine `null`) tente un `fetch('http://localhost:11434/...')`, Chromium envoie d'abord un préflight `OPTIONS` avec le header `Access-Control-Request-Private-Network: true`. Ollama répond **403 Forbidden** à ce préflight → Chromium bloque la requête → `catch` silencieux → "Ollama inaccessible".

Preuve : `Invoke-WebRequest -Uri "http://localhost:11434/api/tags"` depuis PowerShell répond bien 200, mais la requête OPTIONS échoue avec 403.

### Correction
Tous les appels HTTP vers Ollama migrent du renderer vers le **processus principal** (Node.js via IPC). Le main process n'est pas soumis aux restrictions CORS/PNA — il fait de vraies requêtes réseau.

**Fichiers modifiés :**
- `src/main/ollama.js` (**nouveau**) — handlers `ollama:check` (ping + liste modèles) et `ollama:generate` (inférence IA), utilisant `fetch` Node.js 22 sans restriction
- `src/main/index.js` — appel `setupOllamaIPC()` au démarrage de la fenêtre
- `src/preload/index.js` — exposition de `window.electronAPI.ollama.{check, generate}`
- `src/renderer/src/utils/ollama.js` — suppression des `fetch` directs, délégation à `window.electronAPI.ollama.*`

---

## v0.4.1 — Correctif auto-updater (2026-05-27)

### Ce qui a été corrigé
**Bug** : `src/main/updater.js` cherchait un asset nommé `ScriptLearn-Setup-Hybrid.exe` (nom inexistant dans les releases).

**Cause racine** : electron-builder génère `ScriptLearn Setup X.Y.Z.exe` (avec espaces), et GitHub remplace automatiquement les espaces par des points lors de l'upload → `ScriptLearn.Setup.X.Y.Z.exe`. Le nom change aussi à chaque version (contient X.Y.Z), donc un nom fixe est inutilisable.

**Correction** : recherche dynamique du premier asset `.exe` non-`.blockmap` dans les assets de la release GitHub. Fonctionne pour toutes les versions futures sans modification.

**Fichier modifié** : `src/main/updater.js` — suppression de `ASSET_NAME`, nouvelle logique `assets.find(a => a.name.endsWith('.exe') && !a.name.endsWith('.blockmap'))`

---

## v0.4.0 — Langages complémentaires multi-niveaux (2026-05-27)

### Ce qui a été fait
**Restructure complète des langages complémentaires** : SQL, Git, Regex, KQL, SPL, YAML passent d'une structure plate (anciens niveaux 7 et 8 dans `index.json`) à une section `complementary.tracks` parallèle à `levels[]`, avec une progression multi-niveaux identique aux langages principaux.

**Nouveaux modules créés :**
- Regex L1 (4 modules déjà existants) + L2 (4 modules : lookaheads, named groups, flags, module re) + L3 (4 modules : patterns complexes, backtracking, sécurité, projet final)
- KQL L1 (4 modules : pipeline, where/project, sort/summarize, search) + L2 (4 modules : joins, UEBA, EventIDs, temporal) + L3 (3 modules : lambdas, behavioral, analytics rules)
- SPL L1 (3 modules : fondations, search/where/eval, stats/timechart) + L2 (3 modules : eval avancé, subsearches, lookups) + L3 (2 modules : macros/tstats, alertes/dashboards)
- YAML L1 (3 modules : syntaxe, listes/objets, multiline/types) + L2 (3 modules : anchors/aliases, Docker Compose, GitHub Actions)

**Fichiers modifiés :**
- `src/renderer/src/content/index.json` — ajout section `complementary.tracks`, suppression niveaux 7/8
- `src/renderer/src/pages/CourseList.jsx` — onglets Scripting/Complémentaires, sidebar expandable, ModuleCard
- `src/renderer/src/pages/CourseMap.jsx` — toggle Standard/Complémentaires, grille tracks + timeline détaillée
- `src/renderer/src/pages/Roadmap.jsx` — CAREER_PATHS mis à jour + `findModuleMeta()` étendu aux complementary tracks
- `src/renderer/src/utils/badges.js` — `computeStats()` itère les deux sections (standard + complémentaires)
- `src/renderer/src/utils/xp.js` — `computeTotalXP()` + `xpForExercise()` support string levelId ("sql-l1")
- `src/renderer/src/pages/Stats.jsx` — exByLang + hardExercises couvrent les deux sections
- `src/renderer/src/pages/Dashboard.jsx` — findResumeTarget, findSpacedRepetition, completedModules, totalModules, totalExercises mis à jour
- `src/renderer/src/pages/Flashcards.jsx` — buildFlashcards() inclut tracks complémentaires
- `src/renderer/src/components/GlobalSearch.jsx` — SEARCH_INDEX inclut tous les modules (standard + complémentaires)
- 25 anciens fichiers plats supprimés (`git-m1..4`, `sql-m1..4`, `kql-m1..6`, `spl-m1..3`, `yaml-m1..4`, `regex-m1..4`)

### Structure index.json
```json
{
  "levels": [...],  // Bash, Python, PowerShell niveaux 1-6
  "complementary": {
    "sectionName": "Langages complémentaires",
    "tracks": {
      "sql":  { "name": "SQL",  "icon": "🗄️", "color": "#3b82f6", "levels": [...] },
      "git":  { "name": "Git",  "icon": "🌿", "color": "#f97316", "levels": [...] },
      "regex":{ "name": "Regex","icon": "🔍", "color": "#8b5cf6", "levels": [...] },
      "kql":  { "name": "KQL",  "icon": "🛡️", "color": "#e879f9", "levels": [...] },
      "spl":  { "name": "SPL",  "icon": "🔎", "color": "#10b981", "levels": [...] },
      "yaml": { "name": "YAML", "icon": "📄", "color": "#f59e0b", "levels": [...] }
    }
  }
}
```

### IDs de modules complémentaires
Pattern : `{lang}-l{niveau}-m{numéro}` (ex: `kql-l2-m3`, `yaml-l1-m2`)
IDs d'exercices : `ex-{lang}-l{niveau}-m{module}-{numéro}` (ex: `ex-kql-l2-m3-1`)
Level IDs (chaînes) : `sql-l1`, `kql-l2`, `regex-l3`, etc.

### Routing
`/course/${lang}/${levelId}/${moduleId}` — fonctionne avec les levelId string pour les complémentaires
`/exercise/${lang}/${levelId}/${moduleId}/${exIndex}`

---

## v0.3.0 — YAML, Roadmap, Flashcards, Sandbox, annotations, objectif hebdo

### Ce qui a été fait
- Ajout modules YAML (étaient en niveau 8, plats)
- Parcours Roadmap par profil métier (6 parcours)
- Flashcards avec révision espacée
- Sandbox de code
- Annotations et objectif hebdomadaire dans le Dashboard

---

## v0.2.0

### Ce qui a été fait
- Architecture multi-profils
- Système d'XP et de badges
- Statistiques détaillées
- Recherche globale (Ctrl+K)
- Cheatsheets par langage

---

## v0.1.0 — Initial release

### Architecture
- Electron + electron-vite + React + Tailwind CSS
- IPC via `window.electronAPI` (contextBridge)
- Modules JSON dans `src/renderer/src/content/{lang}/level{n}/`
- Loader : `import.meta.glob('./{bash,...,yaml}/**/*.json')` — aucun changement nécessaire pour les nouveaux modules
- Store : electron-store (JSON local), clé par profil
- Terminal : xterm.js + WSL pour Bash, PowerShell natif
- Validation exercices : `validationType: "keywords"` (vérification de mots-clés insensible à la casse)

### Bugs connus
- Le warning `duplicate dependency references` (codemirror) dans electron-builder est sans impact fonctionnel
- `latest.yml` nécessite `publish` dans `package.json` pour être généré par electron-builder

### Prochaines étapes potentielles
- Git L3/L4 modules à vérifier/créer
- SQL L2/L3 modules à créer
- Tests automatisés pour la validation des exercices
- Mode sombre/clair toggle
- Export de progression en PDF
