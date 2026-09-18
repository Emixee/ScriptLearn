# Audit de code — ScriptLearn v0.21.0

Analyse du clone `C:\Users\guill\ScriptLearn\Desktop\scriptlearn` (HEAD `08c2c85`).
Périmètre : `src/main`, `src/preload`, `src/renderer` (58 fichiers source), `scripts/`, `installer/`, `content/` (213 leçons, 808 exercices, 23 campagnes), outillage.

Chaque point a été vérifié dans le code. Format : `fichier:ligne — problème — impact — correctif`.

---

## 1. Sécurité (à traiter en premier)

### 1.1 — CRITIQUE : XSS distant → exécution de code local

`src/renderer/src/components/UpdateOverlay.jsx:76` injecte les **notes de release GitHub** (`release.body`, récupéré dans `src/main/updater.js:113`) via `dangerouslySetInnerHTML={{ __html: parseMarkdown(...) }}`.

Or :

- `src/renderer/src/utils/markdown.js:43` configure `marked` **sans sanitizer** (marked ne désinfecte plus depuis la v5, et DOMPurify n'est pas dans le projet) ;
- `src/renderer/index.html` n'a **aucune CSP** ;
- le preload expose `terminal.runValidation` / `terminal.write` / `app.saveScript` (`src/preload/index.js:16-31`), qui exécutent du code arbitraire côté main (`src/main/terminal.js:385`).

Un `<img src=x onerror="electronAPI.terminal.runValidation({lang:'python',code:'...'})">` dans un corps de release = exécution de code sur la machine de l'élève. Le vecteur suppose un accès en écriture aux releases du dépôt, mais la chaîne est complète et sans garde-fou.

**Correctif** : rendre `releaseNotes` en texte brut (`{updateInfo.releaseNotes}`), ajouter une balise CSP stricte dans `index.html`, et — pour les 20 autres appels `dangerouslySetInnerHTML` (contenu local) — passer la sortie de `marked` dans DOMPurify. Accessoirement `markdown.js:49` interpole `lang` sans échappement dans le badge.

### 1.2 — CRITIQUE : installateur exécuté sans vérification d'intégrité

`src/main/updater.js:120-158` télécharge un `.exe` puis le `spawn()` :

- aucun hash, aucune signature vérifiée — `latest.yml` et `.blockmap` ne sont **lus par personne** (0 occurrence dans `src/`), `electron-updater` n'est pas une dépendance ;
- `downloadFile` suit les redirections **y compris vers `http://`** (ligne 50) ;
- `destPath = join(temp, assetName)` : `assetName` vient du JSON distant, non nettoyé → traversée de chemin possible (`../..`). Utiliser `basename()` ;
- `res.on('end', () => { file.close(); resolve() })` (ligne 74) : la promesse résout **avant le vidage du tampon**, et `file.write(chunk)` ignore la contre-pression. Sur ~800 Mo, l'installateur peut être lancé tronqué.

**Correctif** : `await pipeline(res, createWriteStream(dest))`, forcer `https`, `basename(assetName)`, et vérifier le `sha512` de `latest.yml` avant `spawn` — ou adopter `electron-updater` et supprimer cet updater maison.

### 1.3 — IMPORTANT : `rm -rf` sur un chemin que l'élève peut réécrire

`src/main/terminal.js:231-248` (`buildGitScript`) : le code de l'élève est inliné **dans le même shell** que `W=$(mktemp -d)`, puis le script finit par `cd /; rm -rf "$W" "$GC"`. Un exercice où l'élève tape `W=$HOME` (ou `export W=...`) fait supprimer son dossier personnel, avec les droits de l'app.

**Correctif** : exécuter les commandes de l'élève dans un sous-shell isolé (`bash -c '...'` séparé), et faire le nettoyage depuis Node (`fs.rmSync`) avec le chemin capturé côté main, jamais dans le script.

### 1.4 — Mineur : durcissement Electron

`src/main/index.js:23-27` : `sandbox: false` sans nécessité apparente (le preload n'utilise aucun module Node), pas de handler `will-navigate`, pas de CSP. `session.defaultSession.webRequest.onHeadersReceived` (ligne 64) injecte `access-control-allow-origin: *` — acceptable car limité à `localhost:11434`, mais à documenter comme tel.

---

## 2. Le cœur du produit : la validation des exercices est largement contournable

C'est le constat le plus lourd fonctionnellement : l'app promet une validation « par moteur réel », et six validateurs existent (`src/renderer/src/lib/validators/`), mais **aucun n'est utilisé par le parcours Cours**.

### 2.1 — `Exercise.jsx` n'importe aucun validateur

Les 808 exercices de cours passent par la logique locale de `Exercise.jsx:616-667`, copie appauvrie de `useCodeRunner` (qui, lui, branche les 6 moteurs mais ne sert qu'aux missions — 21 chapitres sur 369, soit 5,7 %).

- 399 exercices (sql, git, regex, kql, spl, yaml, html) sont validés par `code.toLowerCase().includes(motclé)`. Exemple vérifié `ex-sql-l2-m3-2` : les 10 mots-clés requis sont tous satisfaits par le **commentaire SQL** `-- select from employees e inner join departments d on e. d.`. 17 exercices ont tous leurs mots-clés ≤ 6 caractères (`ex-regex-l1-m1-1` → `["\d"]`).
- Les valeurs `validationType` `keywords`, `contains`, `output_contains` (804 exercices) sont **purement décoratives** : `Exercise.jsx` ne teste que `output_nonempty`, le chemin étant choisi par `isStatic(lang)`.

**Correctif** : consommer `useCodeRunner().validate` dans `Exercise.jsx` (supprime aussi la duplication), puis migrer progressivement les exercices statiques vers les payloads déjà éprouvés côté missions (`sqlOrdered`, `regexTests`, `yamlAssertions`, `domAssertions`, `gitChecks`, `pipeline`).

### 2.2 — `output_nonempty` valide la longueur du **code**, pas de la sortie

`Exercise.jsx:661` et `src/renderer/src/lib/useCodeRunner.js:97-98` : `isCorrect = trimmed.length > 0` où `trimmed` est le contenu de l'éditeur. **Un seul caractère tapé valide l'exercice** et crédite l'XP (4 exercices concernés : `bash-l1-m1`, `bash-l1-m2`, `ps-l1-m4`). La branche terminal-auto (`MissionPlay.jsx:161`) fait correctement le test sur la sortie.

### 2.3 — Le lab WASM se valide en tapant la réponse

`src/renderer/src/components/WasmTerminal.jsx:226` : `pushLine('prompt', '$ ' + cmd)` transmet la **ligne tapée** à `onOutput` avant toute exécution, et `MissionLab.jsx:50-65` teste `new RegExp(o.detect,'i')` dessus. Avec `lab-intrusion.json`, taper `echo 185.220.101.5` ou même `# backdoor` valide l'objectif et débloque le fragment. Les 4 fragments (code `4271`) s'obtiennent sans une seule commande utile.

**Correctif** : n'appeler `onOutput` que depuis la branche sortie série (`WasmTerminal.jsx:161`), jamais pour `type === 'prompt'`.

### 2.4 — Mode terminal-auto : `echo` suffit

`useCodeRunner.js:21-23` (`matchesExpected`) fait un `includes` sur la sortie. L'écho de la commande est bien exclu, mais le **résultat** de `echo SESAME` est indiscernable de la vraie solution (`mission-voie-bash.json`, actes `d1` → `"SESAME"`, `d3` → `"4271"`). `EDITOR_CMD_RE` (`Terminal.jsx:49`) ne bloque que les éditeurs/pagers : `cat`, `head`, `grep` passent.

**Correctif** : ajouter par acte une contrainte sur la forme de la commande (`requiredCmd` en regex), ou rejouer la commande capturée sur un jeu de données différent de celui affiché.

### 2.5 — Autres faux positifs vérifiés

- `missions/mission-final-anima.json#choix` : pas de `validationType`, pas de `expectedOutput` → `includes('')` toujours vrai.
- `validators/sql.js` : pas de `catch` autour de `db.run(SEED)` / requête de correction → promesse rejetée, UI figée sur `STATUS.running`. Et pour les exercices DML (`sql-l1-m4`), l'attendu est `[]`, donc `DROP TABLE commandes` est jugé « correct » (la comparaison porte sur le jeu de résultats, pas sur l'état des tables).
- `validators/regex.js` : `new RegExp(code)` puis `.test()` sur le thread du renderer, sans limite → ReDoS (`(a+)+$`) fige la fenêtre sans message. La variable `rx` construite n'est même pas utilisée (recompilation dans 3 boucles).

---

## 3. Fiabilité : processus principal et stockage

### 3.1 — Toute la validation gèle le processus principal

`src/main/terminal.js` n'utilise que des appels **synchrones** : `execFileSync` (timeouts 30 s, 60 s à la compilation, **90 s** pour Go et Rust) et `execSync`. Pendant une compilation, le main process ne répond plus : plus d'IPC (store, terminal, fenêtre), Windows affiche « ne répond pas ». Le `setup` d'un acte est aussi synchrone (`terminal.js:43-47`, 15 s) et s'exécute **à chaque création de session**.

**Correctif** : passer `runValidation`, `runGit` et `runSetup` en `execFile` asynchrone (promisifié) — les handlers IPC sont déjà `async` côté renderer, le changement est local.

### 3.2 — IPC enregistré dans `createWindow()`

`src/main/index.js:37-41` appelle `setupTerminalIPC/​setupUpdaterIPC` **dans** `createWindow`, lui-même rappelé par `app.on('activate')` (ligne 80). Un second appel lève `Attempted to register a second handler for 'terminal:create'`, et le monkey-patch de `emitter.emit` (`terminal.js:428-437`) s'empile en capturant l'**ancienne** fenêtre.

**Correctif** : enregistrer les handlers une seule fois dans `whenReady`, et résoudre la fenêtre courante via `BrowserWindow.getAllWindows()` au moment de l'envoi.

### 3.3 — Fichiers temporaires à noms fixes

`terminal.js` écrit toujours `sl_proj.py`, `sl.c`/`sl_c.exe`, `sl.cpp`, `Main.cs`, `sl.rs`, `sl_proj.ps1`, `/tmp/sl_proj.sh` dans `tmpdir()`. Deux validations concurrentes (validation + sandbox, ou double clic) se marchent dessus et l'élève voit la sortie de l'autre exécution. Seul Java fait correctement un `mkdtempSync` (ligne 335).

**Correctif** : un `mkdtempSync` par exécution, supprimé en `finally`.

### 3.4 — Écriture du store non atomique

`src/main/store.js:99-104` : `writeFileSync` direct du fichier complet, à **chaque** mutation (y compris chaque sauvegarde de brouillon). Une coupure pendant l'écriture laisse un JSON tronqué, et `load()` (ligne 94) retombe silencieusement sur `DEFAULT_DATA()` : **toute la progression est perdue sans message**.

**Correctif** : écrire dans `fichier.tmp` puis `renameSync`, garder une copie `.bak`, et prévenir l'utilisateur quand le parsing échoue au lieu de repartir de zéro.

### 3.5 — Autres

- `store.js:311` / `129` : `id = Date.now()` — collision possible entre deux créations dans la même milliseconde, et `importProfileJSON` (ligne 308) étale `payload.profile` sans validation de schéma.
- `store.js:62-77` : les migrations ne mettent jamais `d.version` à jour.
- `index.js:90-109` (rappel quotidien) : la garde `now.getMinutes() > rMin + 4` ne fonctionne pas pour une heure de rappel > `:55` (ex. `20:58` → `rMin+4 = 62`, jamais dépassé) → notification répétée toute l'heure.
- Aucun `before-quit` ne ferme les sessions PTY (`terminal.js`, `sessions` Map) — à ajouter par précaution.
- `checkBashAvailable/PythonAvailable/PhpAvailable/ToolAvailable` (`terminal.js:16-19`) retournent `true` en dur : code mort, et si une toolchain manque l'élève reçoit une erreur de compilation brute au lieu d'un message clair.
- `buildBashScript` (`terminal.js:201-222`) garde les branches `c/cpp/java/csharp` avec `mcs`/`mono` : code mort depuis la suppression de WSL, `runValidation` traite ces langages avant. 7 commentaires « WSL » subsistent et induisent en erreur.

---

## 4. Renderer : bugs React vérifiés

**Critique**

- `components/Terminal.jsx:70,143,203,216` — `init()` est asynchrone mais le cleanup est synchrone. Au démontage précoce (StrictMode actif dans `main.jsx:14`, ou changement d'acte rapide), `unsubRef.current` est encore `undefined` : rien n'est désabonné, puis la continuation du run précédent **écrase** `unsubRef` avec son propre unsub. Résultat : un listener fantôme filtrant le **même id** → `onOutput` appelé deux fois par tour (double validation) et `term.write` sur un xterm déjà `dispose()`. Correctif : drapeau `alive` testé après chaque `await`, unsub en variable locale à l'effet.
- `contexts/ProfileContext.jsx:16-26,51` — `refresh()` n'a ni `try/catch` ni `finally`, et le provider rend `{!loading && children}`. Un rejet IPC (store corrompu, handler absent) laisse `loading = true` **définitivement** → fenêtre noire, non rattrapée par `ErrorBoundary` (qui ne voit pas les rejets asynchrones). Correctif : `finally { setLoading(false) }` + écran d'erreur avec « réessayer ».
- `pages/Course.jsx:18,50` — `activeSection` n'est pas remis à 0 quand `moduleId` change (route unique, composant réutilisé) : passer d'un module à 5 sections à un module à 2 rend `sections[4]` `undefined` → `section.title` lève → écran blanc. C'est exactement ce que fait le bouton « Module suivant » (`Exercise.jsx:754`).
- `pages/Exercise.jsx:393-405` — `findNextModule` fait `parseInt(currentLevelId)`, `NaN` pour les ids de piste (`'sql-l1'`, `'java-l1'`) : le bouton « Module suivant » ne s'affiche **jamais** pour les 12 parcours complémentaires (la majorité du contenu).

**Important**

- `Exercise.jsx:501,551` / `Course.jsx:38` — le cleanup du debounce **annule** la sauvegarde en attente au démontage : un brouillon ou une note tapés puis suivis d'une navigation en moins de 800 ms sont perdus sans signal. Flusher au lieu d'annuler.
- `Exercise.jsx:479-491,513-520` / `Course.jsx:25-39` — `getDraft`/`getNote` sans garde d'obsolescence ni `.catch` : une réponse tardive écrit le brouillon de l'exercice précédent sous la **nouvelle** clé. Ajouter un drapeau `cancelled` et un `noteLoaded` comme pour `draftLoaded`.
- `Exercise.jsx:555-568` — `useEffect` **sans tableau de dépendances** : les listeners clavier sont retirés/réattachés à chaque frappe. Le handler est global, donc `Ctrl+R` (avec `preventDefault`) vole la recherche d'historique de bash/PowerShell dans le terminal.
- `MissionPlay.jsx:71,78-89` — `chapterIdx` vaut 0 au premier rendu : une session PTY complète est créée pour l'acte 0 (avec son `setup` synchrone de 15 s max), puis tuée quand `getProgress` répond. Le main process gèle deux fois par ouverture de mission, et cette fenêtre déclenche le bug n° 1 en production. Correctif : `chapterIdx = null` jusqu'au chargement de la progression.
- `MissionLab.jsx:196` — `<WasmTerminal>` sans `key` et effet de boot en `[]` : naviguer de `/lab/a` à `/lab/b` réutilise la VM et le système de fichiers du lab précédent (`log`, `vaultInput`, `showFinale` non réinitialisés).
- `MissionPlay.jsx:130-137` / `Sandbox.jsx:275` — `terminal.write` dans une session pas encore créée est jeté en silence côté main (`terminal.js:409-412`) : « ▶ Exécuter » juste après un changement d'acte ne fait rien. Exposer un `onReady` depuis `<Terminal>`.
- `Terminal.jsx:168` — `turnBuf.slice(-8192)` coupe par le début et détruit la ligne d'invite : toute commande dépassant ~16 Ko de sortie (`grep -r`, `cat` de log) n'est **jamais évaluée**.
- `Terminal.jsx:205-211` — `fit()` + IPC `resize` à chaque notification du `ResizeObserver`, sans debounce : des dizaines de `proc.resize` ConPTY par seconde pendant un redimensionnement.
- `Sandbox.jsx:281-290` — `outputBuffer` est alimenté par le flux **brut**, qui contient `__SLPROMPTMARK__` (émis systématiquement, `terminal.js:79`) : le marqueur finit dans le `srcDoc` de l'aperçu PHP. Importer `PROMPT_MARKER` et le retirer.
- `Sandbox.jsx:391` — `srcDoc={code}` non débouncé : l'iframe est rechargée à chaque caractère.
- `Settings.jsx:86-98,190-215` — `unsub()` du listener `update:progress` n'est appelé qu'en cas de succès (pas de `finally`), et les listeners de `pullModel` ne sont jamais retirés au démontage ; deux clics empilent deux paires de handlers.
- `Settings.jsx:344,352` — l'URL Ollama invalide est persistée quand même (`onBlur` sans condition) : le message rouge est décoratif, et tous les appels IA échouent ensuite en silence (`ollama:generate` renvoie `null`).
- `Settings.jsx:144-147` — pas de `refresh()` après `importProfileJSON` : le profil importé reste invisible jusqu'au redémarrage malgré le « ✓ Profil importé ».
- `Home.jsx:55-59` — suppression d'un profil en **un clic**, sans confirmation, alors que `deleteProfile` efface progression, activité, brouillons et notes définitivement.
- `AIAssistant.jsx:30-43` — aucun `AbortController` ni drapeau d'annulation (requête jusqu'à 60 s → `setState` après démontage), et le prompt n'envoie que la dernière question : l'UI ressemble à un chat mais chaque question part sans historique.

**Perf**

- 11 pages appellent `store.getProgress` indépendamment, sans cache partagé et **aucune** avec `.catch`. À chaque navigation, `Dashboard` relance 6 parcours complets des 213 modules / 808 exercices (`buildLevelStats`, `findResumeTarget`, `findSpacedRepetition`, `computeStats`, `computeTotalXP`, `completedModules`). Un `ProgressContext` (fetch + `useMemo` une fois) réglerait à la fois la perf, la duplication et les incohérences du § 5.
- `Flashcards.jsx:70` — `buildFlashcards` aplatit plus d'un millier de cartes **deux fois** de façon synchrone au rendu (une fois avec `progress = {}`, une fois après réponse IPC). Sortir l'index du composant.
- `Flashcards.jsx:163-171` — un `<button>` vide par carte dans l'indicateur de position (> 1000 nœuds, sans `aria-label`).
- `GlobalSearch.jsx:12-81,97-99` — index de ~1000 entrées construit au chargement du module (donc au démarrage, `AppLayout` l'importe statiquement) et filtre avec 2 `toLowerCase()` par entrée **à chaque frappe**, sans debounce.
- `Exercise.jsx:578-586` — listeners `mousemove`/`mouseup` attachés en permanence et `setPanelWidth` à chaque pixel → re-rendu du composant de 1093 lignes, CodeMirror et Terminal compris.

---

## 5. Cohérence des données affichées

- `utils/score.js:36-40` — `levelMasteryScore` n'agrège que `bash` et `powershell` : **Python est omis** alors que chaque niveau contient 6 modules Python. La barre « maîtrise X % » du Dashboard est fausse pour tout apprenant Python.
- `utils/badges.js:57` — `completedByLang[lang]` est incrémenté **par exercice**, mais les badges l'interprètent comme un compte de modules (« Finir 3 modules Bash ») : le badge tombe dès 3 exercices. Toute la gamification par langage est décalée. Incrémenter seulement quand `modDone === modTotal`.
- `Dashboard.jsx:202` — `totalDone = Object.values(progress).filter(p => p.completed).length` compte aussi les clés de missions/labs (`${campaign.id}:${chapter.id}`, écrites par `MissionPlay.jsx:149` et `MissionLab.jsx:61`) : « exercices réussis » gonflé, `globalPercent` peut dépasser 100 %, objectif hebdo validé par des chapitres de mission — et contradiction directe avec `Stats.jsx:170`.
- `Dashboard.jsx:131` vs `store.js:113` — le calendrier construit ses cases à minuit **local** puis formate en `toISOString()` (**UTC**) : en UTC+2, toutes les cases sont décalées d'un jour et l'activité du jour n'est jamais allumée.
- `Settings.jsx:161` vs `store.js:287` — objectif hebdo borné à 200 côté UI, à 100 côté main : saisir 150 affiche 150 puis 100 après rechargement.
- `Settings.jsx:739` — « 118 modules · 8 niveaux » codé en dur, alors que le contenu réel compte 213 modules / 6 niveaux + 12 pistes, et que le Dashboard calcule ce total dynamiquement.
- `content/index.json` vs fichiers de leçon — le catalogue est structurellement **sain** (213 ids référencés, 213 fichiers, 0 orphelin, 0 doublon, 0 `order` incohérent, 0 dossier hors du glob de `loader.js`), mais **80 modules sur 213 ont un `title` différent** entre `index.json` et le fichier (ex. `bash-l6-m1`, `py-l6-m2`) : le libellé change entre la carte et la page du module.
- `loader.js:3` — le glob liste 15 langages ; `js`, `ts`, `go`, `rust` (présents dans `LANG_META`) n'y sont pas. Sans effet aujourd'hui, mais un futur `content/go/level1/` serait silencieusement ignoré.
- `CourseMap.jsx:108` / `Stats.jsx:83-93` / `Flashcards.jsx:8-10,130` — listes de langages codées en dur et déjà désynchronisées du contenu : 6 boutons mènent à des niveaux vides, `html/php/c/cpp/csharp/java` sont impossibles à filtrer, et `Flashcards` redéclare `LANG_COLORS`/`LANG_LABELS` en omettant 8 langages (libellé brut `java`, couleur de repli).
- `CourseList.jsx:448-541` — ré-implémentation inline de `ModuleCard` (~90 lignes dupliquées), les deux copies ayant déjà divergé sur le badge affiché.

---

## 6. Build, release, outillage

- **`npm run package` est cassé depuis un clone propre** : `extraResources` déclare 8 toolchains, mais `scripts/fetch-toolchains.mjs` n'en couvre que 6 et `fetch-rust.mjs` une septième — **`go` n'apparaît nulle part** dans `scripts/`. `resources/` est gitignoré et absent. Aucun script npm ne déclenche les `fetch-*`. Ajouter `go` et un `"prepackage"`.
- **Deux chaînes de release contradictoires** : `scripts/release.ps1` publie deux `.exe` Inno Setup (`Hybrid` + `Offline`), sans `latest.yml` ni `.blockmap`, alors que `updater.js` prend « le premier `.exe` » de la release (choix non déterministe, l'Offline pèse plusieurs Go) et passe `/D=` (syntaxe **NSIS**, ignorée par Inno qui attend `/DIR=`). Le correctif documenté en v0.4.3 est donc inopérant sur ces releases. Il faut trancher : NSIS/electron-builder, ou Inno + updater adapté et filtrage de l'asset par nom exact.
- **Aucune barrière qualité** : pas d'ESLint, pas de Prettier, pas de TypeScript, **0 test**, aucun dossier `.github` (donc pas de CI), et 4 scripts npm seulement. `eslint-plugin-react-hooks` aurait signalé à lui seul plusieurs bugs du § 4 ; un script `content:check` aurait attrapé les 5 validations toujours-vraies et les 80 titres désynchronisés.
- **Toolchains téléchargées sans checksum** : 8 URLs, aucune vérification `sha256`, et `if (existsSync(dest)) return` réutilise une archive tronquée par un `Ctrl+C`. `ROOT = resolve('resources')` dépend du répertoire courant. Télécharger vers `.part` puis renommer, ancrer `ROOT` sur `import.meta.url`.
- **`release.ps1`** : `ISCC.exe` et `gh.exe` en chemins absolus **sans `Test-Path`** — l'échec survient après plusieurs minutes de build. Bump de version par regex globale plutôt que `npm version --no-git-tag-version`. Aucun secret en dur dans le dépôt (vérifié).
- **Deux dépendances fantômes** : `@codemirror/language` et `@codemirror/view` sont importés mais absents de `package.json` (résolus transitivement via `@uiw/react-codemirror`) — une mise à jour majeure casse le build sans changement visible.
- `package.json` `publish.repo` = `"scriptlearn"` vs `GITHUB_REPO = 'ScriptLearn'` dans `updater.js` (casse divergente). `isNewer()` renvoie `false` pour tout tag non-SemVer strict (`v1.0.0-beta` → `NaN`), silencieusement.

## 7. Documentation

- `CLAUDE.md:87-99` impose la publication des « trois fichiers requis par `electron-updater` » alors qu'`electron-updater` **n'est pas une dépendance** et que `latest.yml` n'est lu par personne. À trancher avec le § 6.
- `docs/CONVERSATION.md` : la version (0.21.0) est à jour, mais le seul bloc d'architecture (« v0.1.0 ») est faux sur trois points — « Store : electron-store » (0 occurrence, c'est un store JSON maison), « xterm.js + WSL pour Bash » (WSL supprimé en v0.18.0, `bashBin()` pointe sur `resources/git/bin/bash.exe`), « loader : aucun changement nécessaire pour les nouveaux modules » (le glob est une liste explicite à éditer).
- Les sections « Bugs connus » et « Prochaines étapes » ne vivent qu'aux lignes 828-837, **dans la section v0.1.0** : il n'existe aucun état courant pour 0.21.0, et deux items listés à faire sont livrés depuis longtemps (Git L3/L4, SQL L2/L3).

---

## Plan d'action suggéré

**Lot 1 — sécurité et fiabilité (quelques heures, gros retour)**
1. `UpdateOverlay` en texte brut + CSP dans `index.html` (§ 1.1).
2. `pipeline()` + `basename()` + vérification de hash dans l'updater (§ 1.2).
3. Sous-shell isolé pour la validation Git (§ 1.3).
4. Écriture atomique du store + `.bak` (§ 3.4).
5. `ProfileContext` : `try/finally` (§ 4).

**Lot 2 — crédibilité pédagogique**
6. Brancher `useCodeRunner().validate` dans `Exercise.jsx` et supprimer la logique dupliquée (§ 2.1).
7. `output_nonempty` sur la sortie réelle (§ 2.2), `onOutput` du lab sur la sortie série uniquement (§ 2.3).
8. `requiredCmd` par acte pour le mode terminal-auto (§ 2.4) ; `catch` dans `validators/sql.js`, garde ReDoS dans `validators/regex.js` (§ 2.5).

**Lot 3 — socle technique**
9. Passer `runValidation`/`runGit`/`runSetup` en asynchrone, IPC enregistré une fois, `mkdtemp` par exécution (§ 3.1-3.3).
10. `ProgressContext` partagé ; corriger `score.js`, `badges.js`, `Dashboard` (§ 4 perf, § 5).
11. ESLint + `eslint-plugin-react-hooks`, Vitest sur les 6 validateurs, script `content:check`, CI GitHub Actions (§ 6).
12. Réparer `npm run package` (toolchain `go`, `prepackage`) et unifier la chaîne de release (§ 6).
