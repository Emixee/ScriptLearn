# ScriptLearn — Journal de développement

## Version actuelle : 0.4.3

### État du projet
Application Electron/React d'apprentissage du scripting (Bash, Python, PowerShell + langages complémentaires), Windows uniquement, interface 100% française, hors-ligne, multi-profils.

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
