# ScriptLearn — Journal de développement

## Version actuelle : 0.19.0

## v0.19.0 — Validation « terminal-auto » : on tape dans le terminal, ça se valide tout seul (2026-06-23)

Refonte de la résolution des cours ET des missions pour les langages à shell/REPL. **Problème** : « Valider » n'évaluait QUE l'éditeur (`runValidation` exécutait le code de l'éditeur en coulisses) ; ce que l'élève tapait dans le terminal MSYS2 affiché n'était relié à rien → taper la bonne commande dans le terminal ne validait jamais (éditeur vide → échec).

- **Le terminal devient la source de vérité** (mode « terminal-auto ») pour **bash, powershell, python** (langages à REPL/shell). L'élève tape directement dans le terminal embarqué ; l'acte/exercice se valide **automatiquement** dès que la **sortie réelle** d'une commande contient le résultat attendu. Plus d'éditeur, plus de bouton dans ce mode.
- **Marqueur de prompt invisible** (`PROMPT_MARKER`, octet 0x1f) émis par chaque shell avant chaque invite — bash via `PROMPT_COMMAND` (le prompt MSYS2 est en PS1, jamais touché), python via `PYTHONSTARTUP`/`sys.ps1`, powershell via `function prompt`. `Terminal.jsx` le retire de l'affichage (invisible) et découpe le flux en blocs « commande → sortie ». **Règle le piège « echo »** : la sortie est isolée de l'écho de la commande tapée (ex. `echo "Bonjour Bash !"` ne valide plus par son propre écho ; `echo 4271 > /dev/null` → sortie vide → rejeté).
- **Périmètre** : la bascule s'applique si `isRepl(lang) && !project && !static`. Les actes **projet** (script multi-lignes + args), les langages **compilés** (C/C++/C#/Java/Go/Rust/PHP) et **statiques** (SQL/Regex/KQL/SPL/YAML/HTML/Git) **gardent l'éditeur + bouton Valider** inchangés. **js/ts exclus** du périmètre REPL (le REPL Node n'a ni hook pré-exécution ni invite non ambiguë pour isoler proprement la sortie).
- **Fichiers** : `lib/langs.js` (flag `repl`, `isRepl`, `PROMPT_MARKER`), `main/terminal.js` (marqueurs par shell dans `createSession` + `pyStartupFile`), `components/Terminal.jsx` (prop `onOutput` + isolation des blocs, gestion du marqueur coupé entre 2 chunks), `lib/useCodeRunner.js` (`matchesExpected`), `pages/MissionPlay.jsx` + `pages/Exercise.jsx` (disposition + détection live, réutilisant le motif de `MissionLab`). Libellés trompeurs « Bash (WSL) » corrigés en « Bash » (Exercise/Sandbox/Dashboard).
- **Vérifié** : build OK ; marqueur émis correctement par le bash embarqué ; isolation de sortie testée 7/7 (pièges echo inclus) ; streaming avec marqueur coupé géré et jamais visible à l'écran. **À tester en GUI** : déclenchement réel des marqueurs dans le PTY interactif (bash/powershell/python).

## v0.18.4 — Habillage « jeu narratif » (vagues 2 & 3 : facultés + modernes) (2026-06-21)

- **Facultés** (HTML, SQL, Git, Regex, YAML, KQL, SPL) : taglines accrocheuses (hook + enjeu) ; HTML thématisé (la Surface affiche `ANIMA` / `Systeme en ligne`) ; briefs Git narrativisés (rouvre/sonde/indexe/grave l'Historique). Données des requêtes déjà dans l'univers (employes, SecurityEvent, index=web) conservées.
- **Modernes** (JavaScript, TypeScript, Go, Rust) : taglines accrocheuses + **sorties scénarisées** des actes d'ouverture — `Bonjour`→`Reflexe actif`/`Agent en ligne`/`Armure active`, `grand`→`DECLENCHE`/`DEPLOYE`/`VERROUILLE`.
- Vérifié : toutes les corrections re-testées (HTML keyword ; JS/TS via Node 24, Go, Rust via toolchains embarquées). **Les 19 Voies ont désormais un habillage jeu narratif cohérent.**



## v0.18.3 — Habillage « jeu narratif » (vague 1 : page Missions + fragments) (2026-06-21)

- **Page Missions** (`Missions.jsx`) : intro et sous-titres réécrits en cadre « Réveil » (reconquête d'ANIMA fragment par fragment).
- **Voies-fragments enrichies** (PowerShell, Python, PHP, C, C++, C#, Java) : taglines accrocheuses (hook + enjeu), stories étoffées, **sorties scénarisées** par thème (Poste de Commandement, Laboratoire R-7, Vitrine, Noyau, Moteurs, Interface, Réseau) — ex. `positif`→`AUTORISE`/`NOMINAL`/`CONNECTE`, `Bonjour X`→`Poste PC-7 en ligne`/`Noeud N-1 actif`. `teach` et mécanique de validation inchangés.
- **Fix encodage PowerShell** (`terminal.js`) : BOM UTF-8 + `[Console]::OutputEncoding=UTF8` + invocation `-Command "& 'fichier' args"` → les accents des projets `.ps1` (`reconstitué`) ne sont plus corrompus.
- Vérifié : toutes les corrections des 7 Voies passent via toolchains embarquées.
- Reste : vague 2 (facultés : HTML, SQL, Git, Regex, YAML, KQL, SPL), vague 3 (modernes : JS, TS, Go, Rust).



### État du projet
Application Electron/React, Windows, FR, hors-ligne, multi-profils. Installateur « Tout-en-un » (toolchains embarquées, WSL supprimé), arc narratif « Réveil » complet, **fenêtres de progression installation/MAJ**.

---

## v0.18.2 — Fenêtres de progression installation & mise à jour (2026-06-21)

- **Overlay de MAJ global** (`src/renderer/src/components/UpdateOverlay.jsx`, monté dans `AppLayout`) : s'affiche automatiquement au démarrage si une MAJ existe (via `ProfileContext` qui conserve désormais l'`updateInfo` complet). Cycle complet : disponible (version, taille, notes) → **téléchargement avec barre + `% · Mo/Mo · vitesse · ETA`** → lancement de l'installateur + message de redémarrage. Bouton « Plus tard ».
- **Progression enrichie** (`src/main/updater.js`) : `downloadFile` émet un objet `{ percent, transferred, total, bytesPerSecond }` (throttle 150 ms) ; `Settings.jsx` adapté (rétro-compatible).
- **Installation de MAJ VISIBLE** : `update:install` ne passe plus `/S` (silencieux) → l'installateur NSIS s'affiche avec sa **barre de progression native** pendant l'extraction (~2,6 Go) ; `/D=` pré-remplit le dossier.
- **Install initiale explicitée** (`installer/custom.nsh`) : `DetailPrint` listant les outils embarqués (~2,6 Go) pendant l'installation.

---

## Historique — Version 0.18.1

### État du projet
Application Electron/React d'apprentissage du scripting, Windows uniquement, interface 100% française, hors-ligne, multi-profils. **Installateur « Tout-en-un » : toutes les toolchains sont EMBARQUÉES — aucun langage n'exige WSL ni installation externe.** Marche sur n'importe quel PC Windows, sans admin, sans réseau. **L'arc narratif « Réveil » est clos** par un scénario final à choix (Contenir / Libérer).

---

## v0.18.1 — Dénouement « Réveil » : scénario final ANIMA + mécanique de choix (2026-06-21)

Clôture de l'arc narratif, du début (la machine-prison du Bash) à la fin.
- **Nouvelle mécanique de « choix »** dans `MissionPlay.jsx` : un acte portant un tableau `options` affiche un panneau de choix (au lieu de l'éditeur) ; sélectionner une option révèle son **épilogue** (`outcome`) et clôt l'acte (état `chosen`, marquage de progression). Aucun « faux » choix.
- **Scénario final `mission-final-anima.json`** (kind scenario, « ANIMA — L'Éveil ») : 3 actes — `convergence` (boucle bash énumérant les 12 fragments), `ombre` (condition Python : l'Ombre se dissipe, ANIMA est complète), `choix` (**Contenir** vs **Libérer**, deux épilogues complets). Récapitule tout le canon (8 fragments + 7 facultés + 4 éclats modernes) et renvoie l'apprenant à ce qu'il a vraiment gagné : les 19 langages.
- Exercices vérifiés via bash/python embarqués.
- **L'arc « Réveil » est désormais complet** : 19 Voies reliées + dénouement à choix.

---

## v0.18.0 — Installateur « Tout-en-un » : toutes les toolchains embarquées (WSL supprimé) (2026-06-21)

Aboutissement du cap « Tout-en-un ». Chaque langage s'exécute via une **toolchain native embarquée dans l'app** (`resources/`, `extraResources`), résolue en prod via `process.resourcesPath`. **Plus aucun appel à `wsl.exe`.**
- **Toolchains embarquées** (`scripts/fetch-toolchains.mjs` les télécharge dans `resources/`, gitignoré) :
  - **Node 24** (js/ts — Node 24 dépouille TS nativement), **Python embeddable** (`PYTHONUTF8=1`), **PHP**, **MinGW-w64** (gcc/g++, + linker de Rust), **JDK Temurin 21** (java, `-encoding/-Dstdout.encoding=UTF-8`), **PortableGit** (bash MSYS2 + coreutils + git), **Go**, **Rust** (rustc windows-gnu, linké par MinGW).
  - **C#** : `csc` **intégré à Windows** (.NET Framework, toujours présent) — 0 Mo. Voie adaptée en **C# 5** (interpolation → concaténation).
- **NOUVELLE Voie Rust** (Fragment XII — l'Armure) : 18 actes (println!, variables, vecteurs, structs, match, itérateurs, impl) + 3 projets `.rs` (`std::env::args`).
- **`src/main/terminal.js`** réécrit : `runValidation` route chaque lang vers son binaire embarqué (python/php natif, c/cpp via gcc/g++ `-static`, java via javac/java, csharp via csc, go/rust compilés) ; `runSetup`, `runGit` (dépôt jetable) et le terminal interactif (`createSession`) passent par le **bash embarqué** ; checks de disponibilité → toujours vrai ; `TOOLCHAINS` vidé (plus de bannière).
- **Vérifié end-to-end** : toutes les corrections de TOUTES les Voies exécutables compilent/s'exécutent via les binaires embarqués (php/python/js/ts 74/74 ; c/cpp/java/csharp 64/64 ; bash 24 + git ; go 18 ; rust 18). Encodage UTF-8 réglé (Python/Java) ; C# p3 en ASCII (csc Framework sort en codepage OEM).
- **Taille** : `resources/` ≈ 2,67 Go (MinGW 939, Rust 573, git 351, jdk 329, go 261, node 105, php 87, python 22) → installateur compressé volumineux (~1 Go).
- Reste : le **choix final Contenir/Libérer**.

---

## v0.17.0 — NOUVELLE Voie Go + infrastructure « toolchain embarquée » (2026-06-20)

Troisième nouveau langage, et **première brique de l'installateur « Tout-en-un »** demandé : exécution réelle via une **toolchain native EMBARQUÉE** (zéro dépendance externe).
- **Infrastructure d'embarquement** : SDK Go Windows placé dans `resources/go` (gitignoré, copié au build) et déclaré en **`extraResources`** d'electron-builder (hors-asar). `src/main/terminal.js` résout la racine (`process.resourcesPath` en prod, `<projet>/resources` en dev), exécute `go.exe run` avec un env dédié (`GOROOT` embarqué, `GOCACHE`/`GOPATH` en données utilisateur, `GOTOOLCHAIN=local`, `GOPROXY=off` → 100% hors-ligne). `runCapture` accepte désormais des options (env/timeout). Vérifié : SDK présent dans `dist/win-unpacked/resources/go/bin/go.exe` ; installateur **158 Mo** (+~78 Mo).
- **Narration** : Go = les **Essaims** d'ANIMA (**Fragment XI**), ses agents concurrents du cloud.
- **Voie complète, 18 actes** : 15 actes pédagogiques (Println, variables, Printf, if, for, slices, range, fonctions, structs, maps, retours multiples, méthodes) + **3 projets `.go`** (`etat.go`, `scan.go`, `reconstituer.go` avec `os.Args[1]`, argument `XI`).
- **Vérifié** (go.exe embarqué, 18/18) : toutes les corrections **compilent et s'exécutent** (compilation Go stricte : imports/variables inutilisés interdits).
- Reste : Rust (à embarquer ou structurel), migration des langages WSL (C/C++/Java/C#/PHP/Bash) vers toolchains embarquées, puis final Contenir/Libérer.

---

## v0.16.16 — NOUVELLE Voie TypeScript : univers « Réveil » + 3 projets Node (2026-06-20)

Deuxième nouveau langage : **Voie entièrement créée**, exécutée par Node (dépouillement de types).
- **Intégration TypeScript** : entrée `ts` dans `LANG_META` (exec direct, `termShell:'node'`, mode CodeMirror JS) ; `runValidation` mutualisé avec JS (`lang === 'js' || 'ts'`) — fichier `.ts` + `process.argv` pour les projets, stdin pour les exercices. Node 24 **dépouille les types à la volée** (vérifié : interfaces et classes typées « erasables » OK). Aucune dépendance ajoutée.
- **Narration** : TS = les **Réflexes disciplinés** d'ANIMA (**Fragment X**) — le même code que les Réflexes (JS), mais **sous contrat de types**.
- **Voie complète, 18 actes** : 15 actes pédagogiques centrés sur les **types** (variables typées, `number[]`, fonctions typées, interfaces, types union, classes typées, reduce) + **3 projets `.ts`** (`etat.ts`, `scan.ts`, `reconstituer.ts` avec `process.argv[2]`, argument `X`).
- **Vérifié** (Node réel, 18/18) : toutes les corrections produisent la sortie attendue.
- Reste : Go et Rust (toolchains WSL à installer), puis final Contenir/Libérer.

---

## v0.16.15 — NOUVELLE Voie JavaScript : univers « Réveil » + 3 projets Node (2026-06-20)

Début de la phase « nouveaux langages » : **première Voie entièrement créée** (langage absent jusqu'ici).
- **Intégration JavaScript** : entrée `js` dans `LANG_META` (`langs.js`, exec direct, `termShell:'node'`, mode CodeMirror JS) ; `createSession` ouvre un **REPL Node natif** (`node -i`) ; `runValidation` exécute via **Node natif** (stdin pour les exercices, fichier `.js` + `process.argv` pour les projets). Node 24 déjà présent ; aucune dépendance ajoutée. La Voie est auto-enregistrée (glob des missions).
- **Narration** : JS = les **Réflexes** d'ANIMA (**Fragment IX**), le code injecté dans navigateurs/runtimes — premier des **fragments modernes** par lesquels elle s'était étendue.
- **Voie complète, 18 actes** créés de zéro : 15 actes pédagogiques (console.log, variables, gabarits, if, for, tableaux, for...of, fonctions, objets, filter, fléchées, ternaire, classes, reduce) + **3 projets `.js`** (`etat.js`, `scan.js`, `reconstituer.js` avec `process.argv[2]`, argument `IX`, export activé).
- **Vérifié** (Node réel, 18/18) : toutes les corrections produisent la sortie attendue.
- Reste : TypeScript (Node natif, type-stripping), Go et Rust (toolchains à installer), puis final Contenir/Libérer.

---

## v0.16.14 — Voie SPL : narration « Réveil » + capstones à pipeline structuré (2026-06-20)

Septième et **dernière Voie statique** de la phase : narration « Réveil » + validation structurelle (même moteur que KQL).
- **Moteur structurel réutilisé** : `validators/structured.js` (`validationType:'structured'`) — découpe sur `|` + sous-séquence ordonnée.
- **Narration** : Voie SPL réécrite dans « Réveil » — SPL = les **Sondes** d'ANIMA (recherche dans ses journaux Splunk), saturées de bruit par l'Ombre. Stories/rewards des 17 actes retissés.
- **3 actes capstone structurés** (17 → 20) : `c1` erreurs par serveur (search+stats), `c2` poids moyen calculé/classé (eval→stats→sort), `c3` investigation sources suspectes (stats→sort→head). **Pipeline vérifié étape par étape**.
- **Vérifié** (Node, 7 cas) : corrections valides, pipelines désordonnés (eval après stats), incomplets (sans stats/head) ou mauvais index rejetés.
- **Bilan phase « Voies statiques » terminée** : HTML (DOM), SQL (sql.js), Regex (RegExp), YAML (js-yaml), Git (git WSL), KQL+SPL (structurel) ont tous narration « Réveil » + capstones à validation réelle/structurelle.
- Reste : nouveaux langages JS/TS/Go/Rust (Voies complètes + projets), puis final Contenir/Libérer.

---

## v0.16.13 — Voie KQL : narration « Réveil » + capstones à pipeline structuré (2026-06-20)

Sixième Voie statique de la phase : narration « Réveil » + **validation structurelle de pipeline**.
- **Nouveau moteur structurel** : `src/renderer/src/lib/validators/structured.js` (partagé KQL+SPL). KQL/SPL n'ayant **aucun moteur exécutable hors-ligne**, on découpe la requête sur `|` et on exige que chaque étape attendue apparaisse, avec tous ses tokens, **dans le bon ordre** (sous-séquence ordonnée des segments). Bien plus fiable qu'un sac de mots-clés : `summarize | where` ne passe pas pour `where | summarize`. Dispatch ajouté (`validationType:'structured'`).
- **Narration** : Voie KQL réécrite dans « Réveil » — KQL = la **Vigie** d'ANIMA (interrogation de sa télémétrie), aveuglée par l'Ombre. Stories/rewards des 17 actes retissés.
- **3 actes capstone structurés** (17 → 20) : `c1` échecs de connexion filtrés/projetés/triés, `c2` top des comptes attaqués (summarize+top), `c3` cartographie temporelle (ago + bin()). **Pipeline vérifié étape par étape**.
- **Vérifié** (Node, 8 cas) : corrections valides, pipelines désordonnés (sort avant where), incomplets (sans top/ago/sort) ou mauvaise table rejetés.
- Reste : SPL (même moteur structurel), puis nouveaux langages JS/TS/Go/Rust, puis final Contenir/Libérer.

---

## v0.16.12 — Voie Git : narration « Réveil » + capstones exécutés dans un dépôt WSL réel (2026-06-20)

Cinquième Voie statique de la phase : narration « Réveil » + **exécution réelle de git** (dépôt jetable WSL).
- **Nouveau moteur Git** : IPC `terminal:runGit` (main, `src/main/terminal.js`) crée un **dépôt git temporaire isolé** (`GIT_CONFIG_GLOBAL` pointant un config jetable : identité + `defaultBranch=main`, sans toucher au `~/.gitconfig` de l'utilisateur), y exécute les commandes de l'élève, puis lance des **commandes d'inspection** dont la sortie prouve l'état (nb de commits, branche courante, fichiers suivis). Validateur `src/renderer/src/lib/validators/git.js` (`gitChecks` : `{ run, equals|contains }`) ; preload `terminal.runGit` ; dispatch `validationType:'git'` dans `useCodeRunner.js`.
- **Narration** : Voie Git réécrite dans « Réveil » — Git = l'**Historique** d'ANIMA (chronique versionnée de son code), brouillé par l'Ombre. Stories/rewards des 17 actes retissés.
- **3 actes capstone git** (17 → 20) : `c1` premier dépôt + commit (état : 1 commit, message, fichier suivi), `c2` branche parallèle (`switch -c`, 2 commits, branches main+restauration), `c3` fusion (`merge`, retour sur main, 2 fichiers). **Exécutés dans un vrai dépôt**.
- **Vérifié** (WSL réel, 7 cas) : corrections valides, séquences fausses (sans commit, mauvais message, sans bascule de branche, sans merge) rejetées. git 2.43 présent dans WSL.
- Reste : KQL/SPL (structurel), puis nouveaux langages JS/TS/Go/Rust, puis final Contenir/Libérer.

---

## v0.16.11 — Voie YAML : narration « Réveil » + capstones parsés via js-yaml (2026-06-20)

Quatrième Voie statique de la phase : narration « Réveil » + **validation par parsing réel** (js-yaml).
- **Nouveau moteur YAML** : `src/renderer/src/lib/validators/yaml.js` parse le YAML de l'élève avec `js-yaml` (pur JS, hors-ligne) et évalue des **assertions sur l'objet produit** (`path` pointé + `equals`/`exists`/`length`/`contains`/`hasKeys`/`type`). Un YAML mal indenté ou mal typé échoue ; les alias doivent être correctement résolus. Dispatch ajouté dans `useCodeRunner.js` (`validationType:'yaml'`).
- **Narration** : Voie YAML réécrite dans « Réveil » — YAML = le **Schéma directeur** d'ANIMA (config de déploiement), corrompu par l'Ombre. Stories/rewards des 15 actes retissés.
- **3 actes capstone yaml** (15 → 18) : `c1` manifeste d'un service (imbrication + liste de ports), `c2` déploiement multi-services (réplicas, types numériques, listes), `c3` factorisation par ancres `&`/alias `*` (alias résolus vérifiés). **Analysés réellement**.
- **Vérifié** (Node, 8 cas) : corrections valides, configs fausses (mauvaise valeur, service manquant, type string au lieu de number, alias non résolu, YAML invalide) rejetées.
- Reste : Git (git WSL), KQL/SPL (structurel), puis nouveaux langages JS/TS/Go/Rust, puis final Contenir/Libérer.

---

## v0.16.10 — Voie Regex : narration « Réveil » + capstones validés par RegExp réel (2026-06-20)

Troisième Voie statique de la phase : narration « Réveil » + **validation par RegExp natif** (aucune dépendance).
- **Nouveau moteur Regex** : `src/renderer/src/lib/validators/regex.js` construit la vraie `RegExp` de l'élève et la confronte à un jeu de cas — chaînes à **reconnaître** (`mustMatch`), à **rejeter** (`mustReject`) et **groupes de capture** attendus (`captures` via `exec`). Un motif aux bons morceaux mais qui ne capte rien échoue. Dispatch ajouté dans `useCodeRunner.js` (`validationType:'regex'`).
- **Narration** : Voie Regex réécrite dans « Réveil » — Regex = les **Filtres** d'ANIMA (tri des motifs dans le flux), noyés sous le bruit par l'Ombre. Stories/rewards des 18 actes retissés.
- **3 actes capstone regex** (18 → 20) : `c1` identifiants de secteur (`[A-Z]\d{2,4}`), `c2` horodatages capturés (`(\d{2})/(\d{2})/(\d{4})`), `c3` adresses d'agents démêlées (`([a-z]+)@([a-z]+\.[a-z]+)`). **Testés sur des échantillons**.
- **Vérifié** (Node, 7 cas) : corrections valides, motifs faux (quantificateur trop large, captures manquantes, syntaxe invalide) rejetés. Backslashes correctement stockés dans le JSON.
- Reste : YAML (js-yaml), Git (git WSL), KQL/SPL (structurel), puis nouveaux langages JS/TS/Go/Rust, puis final Contenir/Libérer.

---

## v0.16.9 — Voie SQL : narration « Réveil » + capstones exécutés via SQLite WASM (2026-06-20)

Deuxième Voie statique de la phase : narration « Réveil » + **validation par exécution réelle** (sql.js).
- **Nouveau moteur SQL** : `src/renderer/src/lib/validators/sql.js` exécute la requête de l'élève dans **SQLite compilé en WebAssembly** (`sql.js`, 100% hors-ligne) sur une base seedée (`employes`, `commandes`), puis **compare le jeu de lignes** à celui de la requête de référence. Comparaison ensembliste par défaut, ordonnée si la consigne l'exige (`sqlOrdered`). Fini les mots-clés : une requête aux bons mots mais au mauvais résultat échoue. Dispatch ajouté dans `useCodeRunner.js` (`validationType:'sql'`, async).
- **Bundling WASM** : `sql.js` ajouté en dépendance ; `sql-wasm.wasm` (660 Ko) placé dans `src/renderer/public/sqljs/` et dépaqué via `asarUnpack: ["**/sqljs/**"]` (même schéma que les assets v86 ; locateFile = `/sqljs/` en dev, `./sqljs/` en prod). Vérifié : wasm copié dans `out/renderer/sqljs/` et dépaqué dans `app.asar.unpacked`.
- **Narration** : Voie SQL réécrite dans « Réveil » — SQL = la **Mémoire** d'ANIMA, verrouillée par l'Ombre. Stories/rewards des 17 actes retissés.
- **3 actes capstone SQL** (17 → 20) : `c1` extraction filtrée+triée (WHERE+AND+ORDER BY DESC), `c2` agrégat par groupe (GROUP BY+COUNT+HAVING), `c3` jointure agrégée (JOIN+SUM+GROUP BY). **Exécutés réellement**.
- **Vérifié** (sql.js en Node, 10 cas) : corrections valides, syntaxes alternatives (alias de tables, ordre des lignes) acceptées, requêtes fausses (sans tri/HAVING, mauvais seuil, SUM→COUNT, SQL invalide) rejetées.
- Reste : Regex (RegExp), YAML (js-yaml), Git (git WSL), KQL/SPL (structurel), puis nouveaux langages JS/TS/Go/Rust, puis final Contenir/Libérer.

---

## v0.16.8 — Voie HTML : narration « Réveil » + capstones validés par le DOM réel (2026-06-20)

Début de la phase « Voies statiques » : narration « Réveil » **+ validation par moteur réel** (au-delà des mots-clés).
- **Nouveau moteur de validation DOM** : `src/renderer/src/lib/validators/dom.js` parse le HTML de l'élève avec `DOMParser` (natif au renderer) et évalue des **assertions structurelles** (sélecteur CSS + `count`/`minCount`/`text`/`attr`/`doctype`). L'imbrication, l'ordre et les attributs comptent enfin — fini la fragilité des mots-clés. Dispatch ajouté dans `useCodeRunner.js` (`validationType:'dom'`, prioritaire sur le statut static/exec, exécuté côté renderer sans IPC).
- **Narration** : Voie HTML réécrite dans « Réveil » — HTML = la **Surface** d'ANIMA (ses écrans), lacérée par l'Ombre. Stories/rewards des 17 actes retissés ; synopsis/finale enchaînent avec les Fragments I–VIII.
- **3 actes capstone DOM** (17 → 20) : `c1` squelette sémantique complet (doctype, html[lang], head>title, body>header/main/footer), `c2` page navigable (nav≥3 liens, section>h2, img[alt]), `c3` panneau d'accès accessible (form, label[for]↔input[id] ×2, button, h1). Validés sur leur **structure DOM réelle**.
- **Vérifié** : test jsdom hors-build → les 3 corrections passent, une page incomplète échoue.
- Reste : SQL (sql.js), Regex (RegExp), YAML (js-yaml), Git (git WSL), KQL/SPL (structurel), puis nouveaux langages JS/TS/Go/Rust, puis final Contenir/Libérer.

---

## v0.16.7 — Voie Java : narration « Réveil » + 3 projets de programmes (2026-06-20)

Huitième livraison du chantier (Voie par Voie) — **fin des langages exécutés** : les 8 fragments sont réunis.
- **Narration** : Voie Java réécrite dans l'univers « Réveil » — Java = le **Réseau** (maillage d'entreprise) d'ANIMA (**Fragment VIII**), parsemé de nœuds fantômes par l'Ombre. Stories/rewards des 13 actes pédagogiques retissés ; synopsis/finale enchaînent avec les fragments I–VII et annoncent le **choix final Contenir/Libérer**.
- **3 actes projet `.java`** (13 → 16) : `Etat.java` (mini : variable + println), `Scan.java` (structuré : tableau + for-each + `.equals`), `Reconstituer.java` (complet : méthode + `args[0]`, compilé avec javac et exécuté avec l'argument `VIII`, export activé). Vérifié via WSL : javac+java + args + sortie accentuée OK.
- **Bilan** : tous les langages exécutés (Bash, PowerShell, Python, PHP, C, C++, C#, Java) ont désormais narration « Réveil » + 3 projets de scripts/programmes exportables.
- Reste : narration des Voies statiques (SQL, Git, Regex, KQL, SPL, YAML, HTML) + final global Contenir/Libérer.

---

## v0.16.6 — Voie C# : narration « Réveil » + 3 projets de programmes (2026-06-20)

Septième livraison du chantier (Voie par Voie).
- **Narration** : Voie C# réécrite dans l'univers « Réveil » — C# = l'**Interface** .NET d'ANIMA (**Fragment VII**), couche opérateur verrouillée par l'Ombre. Stories/rewards des 13 actes pédagogiques retissés ; synopsis/finale enchaînent avec les fragments I–VI.
- **3 actes projet `.cs`** (13 → 16) : `Etat.cs` (mini : variable + WriteLine interpolé), `Scan.cs` (structuré : tableau + foreach + `==`), `Reconstituer.cs` (complet : méthode + `args[0]`, compilé avec mcs/mono et exécuté avec l'argument `VII`, export activé). Vérifié via WSL : mcs+mono + args + sortie accentuée OK.
- Reste : Java, puis narration des Voies statiques + final global Contenir/Libérer.

---

## v0.16.5 — Voie C++ : narration « Réveil » + 3 projets de programmes (2026-06-20)

Sixième livraison du chantier (Voie par Voie).
- **Narration** : Voie C++ réécrite dans l'univers « Réveil » — C++ = les **Moteurs** (fonderie de calcul) d'ANIMA (**Fragment VI**), déréglés par l'Ombre. Stories/rewards des 13 actes pédagogiques retissés ; synopsis/finale enchaînent avec les fragments I–V.
- **3 actes projet `.cpp`** (13 → 16) : `etat.cpp` (mini : `std::string` + cout), `scan.cpp` (structuré : `std::vector` + range-based for + `==`), `reconstituer.cpp` (complet : fonction + `argv[1]`, compilé avec g++ et exécuté avec l'argument `VI`, export activé). Vérifié via WSL : compilation g++ + argv + sortie accentuée OK.
- Reste : C#/Java, puis narration des Voies statiques + final global Contenir/Libérer.

---

## v0.16.4 — Voie C : narration « Réveil » + 3 projets de programmes (2026-06-20)

Cinquième livraison du chantier (Voie par Voie).
- **Narration** : Voie C réécrite dans l'univers « Réveil » — C = le **Noyau** bas-niveau d'ANIMA (**Fragment V**), cœur système corrompu par l'Ombre. Stories/rewards des 13 actes pédagogiques retissés ; synopsis/finale enchaînent avec Bash (I), PowerShell (II), Python (III), PHP (IV).
- **3 actes projet `.c`** (13 → 16) : `etat.c` (mini : variable + printf), `scan.c` (structuré : tableau + for + `strcmp`), `reconstituer.c` (complet : fonction + `argv[1]`, compilé avec gcc et exécuté avec l'argument `V`, export activé). Vérifié : la sortie accentuée (`reconstitué`) passe correctement via gcc/WSL.
- Reste : C++/C#/Java, puis narration des Voies statiques + final global Contenir/Libérer.

---

## v0.16.3 — Voie PHP : narration « Réveil » + 3 projets de scripts (2026-06-20)

Quatrième livraison du chantier (Voie par Voie) — début des langages compilés/serveur.
- **Narration** : Voie PHP réécrite dans l'univers « Réveil » — PHP = la **Vitrine** d'ANIMA, sa façade web défigurée par l'Ombre (**Fragment IV**). Stories/rewards des 15 actes pédagogiques retissés ; synopsis/finale enchaînent avec Bash (I), PowerShell (II), Python (III).
- **3 actes projet `.php`** (15 → 18) : `etat.php` (mini : variable + echo), `scan.php` (structuré : tableau + foreach + if), `reconstituer.php` (complet : fonction + `$argv[1]`, exécuté avec l'argument `IV`, export activé). Le mode projet exécute un **vrai fichier** `php sl_proj.php <args>`.
- Reste : C/C++/C#/Java, puis narration des Voies statiques + final global Contenir/Libérer.

---

## v0.16.2 — Voie Python : narration « Réveil » + 3 projets de scripts (2026-06-19)

Troisième livraison du chantier (Voie par Voie).
- **Narration** : Voie Python réécrite dans l'univers « Réveil » — Python = le **Laboratoire** où ANIMA est née (**Fragment III**). On conserve R-7 (le robot assistant) mais relié à la saga ; synopsis/finale enchaînent avec Bash (Fragment I) et PowerShell (Fragment II).
- **3 actes projet `.py`** (17 → 20) : `etat.py` (mini : variable + print), `scan.py` (structuré : liste + for + if), `reconstituer.py` (complet : `import sys` + fonction + `sys.argv[1]`, exécuté avec l'argument `III`, export activé). Le mode projet exécute un **fichier** → fin des soucis de REPL (def/class multi-lignes OK).
- Reste : compilés (PHP/C/C++/C#/Java), puis narration des Voies statiques + final global Contenir/Libérer.

---

## v0.16.1 — Voie PowerShell : narration « Réveil » + 3 projets de scripts (2026-06-19)

Deuxième livraison du chantier (Voie par Voie), même format que Bash v0.16.0.
- **Narration** : Voie PowerShell réécrite dans l'univers « Réveil » — PowerShell = le **Poste de Commandement** d'ANIMA (**Fragment II**). story/reward narratifs, synopsis/tagline/finale reliés à la saga (suite directe du Fragment I/Bash).
- **3 actes projet `.ps1`** (17 → 20 actes) : `etat.ps1` (mini : variables + Write-Output), `scan.ps1` (structuré : tableau + foreach + if), `reconstituer.ps1` (complet : `param($id)` + fonction, exécuté avec l'argument `II`, export activé). Données en mémoire (pas de setup WSL pour PowerShell, qui s'exécute en natif).
- S'appuie sur l'infra v0.16.0 (runValidation mode script + export). Reste : Python, compilés, narration des Voies statiques.

---

## v0.16.0 — Scripts complets, export & univers « Réveil » (Voie du Bash) (2026-06-19)

L'objectif du logiciel est d'apprendre à **écrire des scripts**, pas seulement des commandes. Or les Voies s'arrêtaient aux one-liners. Première livraison (Voie par Voie) : la **Voie du Bash**.

### Architecture commune (faite une fois)
- **Actes « projet »** : champ `project: true` (+ `scriptName`, `args`). En validation, le code est écrit dans un **vrai fichier script** et **exécuté avec ses arguments** — `terminal.js` `runValidation(lang, code, project, args)` : bash/php/c/cpp/csharp/java via fichier WSL + `chmod`/compilation + run avec args ; python/powershell via fichier temp Windows lancé avec args. `useCodeRunner.validate` transmet `project`/`args`.
- **Export** : IPC `app:saveScript` (dialog « Enregistrer sous » + écriture) ; bouton **« ↓ Exporter »** sur les actes projet dans `MissionPlay.jsx` → l'apprenant garde un artefact réutilisable.

### Univers partagé « Réveil »
- **ANIMA** : une IA démantelée, ses fragments éparpillés à travers les langages, qui se réveille. Chaque Voie = récupérer un fragment ; final global (plus tard) : la **contenir** ou la **libérer**. La Voie du Bash = la **Machine** (Fragment I) ; narration reliée (synopsis/e5/finale).

### Voie du Bash : +3 actes projet (21 → 24)
- **p1** `etat.sh` : premier vrai script (shebang + variable + echo).
- **p2** `scan.sh` : script structuré (variables + boucle `for` + condition) qui inspecte des fichiers semés.
- **p3** `reconstituer.sh` : script complet avec **fonction + argument `$1`** (exécuté avec l'argument `I`, export activé).

Prochaines livraisons : PowerShell, Python, puis compilés, puis narration « Réveil » des Voies statiques.

---

## v0.15.1 — Fil narratif continu pour la Voie du Bash (2026-06-19)

- **Problème** : à partir du palier Intermédiaire, le champ `story` de la Voie du Bash décrivait la commande (redondant avec `teach`) au lieu de raconter une histoire ; les `reward` se réduisaient à « Palier X terminé ». L'aspect jeu disparaissait (constaté à l'acte 11/21).
- **Correctif** : réécriture des **seuls champs narratifs** (`story`, `reward`, `synopsis`, `tagline`, `finale`) de `mission-voie-bash.json` en **un arc continu « Prisonnier de la Machine »** (Le Réveil → Les Entrailles du Serveur → Sur la piste de l'Ombre → Reprendre le contrôle), avec un protagoniste, une menace (« l'Ombre ») et un objectif (s'évader). Champs techniques (`teach`/`brief`/`setup`/`correction`/`expectedOutput`/`hint`/`tier`) **inchangés** → validation identique.
- À faire ensuite : même traitement pour les autres Voies (Python, PowerShell, SQL…).

---

## v0.15.0 — Labs : terminal Linux réel (WASM v86) + jeu (2026-06-19)

Nouveau type de mission **« Lab »** inspiré des labs d'Analyst SOC Training : **un seul terminal** où l'on tape les commandes directement (fini l'éditeur séparé + terminal), dans un **vrai Linux** exécuté en WebAssembly.

- **Terminal Linux réel (v86)** : `WasmTerminal.jsx` boote un kernel Linux 6.8 + BusyBox via l'émulateur x86 v86 (WebAssembly), **totalement sandboxé** (aucun WSL requis). Assets (~12 Mo : kernel, v86.wasm, BIOS) dans `src/renderer/public/v86/`, embarqués via `asarUnpack: ["**/v86/**"]`. Chargement par buffers + `wasm_fn` (pas de problème MIME en prod). Fichiers du lab injectés au boot (heredoc, en silence → données non dévoilées).
- **Jeu — 4 mécaniques combinées** (`MissionLab.jsx`) : ① jauge de **menace** qui descend, ② objectifs **sysadmin** (réparer + confirmer), ③ **cascade live** (la checklist s'illumine dès que la sortie attendue apparaît — moteur de détection par regex sur le flux du terminal), ④ **Le Coffre** (chaque objectif révèle un fragment ; composer le code final débloque la fin).
- **Schéma** : `kind: "lab"` + `seedFiles`, `objectives[{detect, hint, fragment, reward}]`, `vault{code, prompt}`, `threatMax`, `finale`. Loader/catalogue génériques ; route `/lab/:labId` ; section « Labs » dans `Missions.jsx`.
- **Contenu** : `lab-intrusion.json` — *Le Serveur Compromis* (enquête d'intrusion Bash : grep/cat → ls -a/find → mv quarantaine → coffre 4271).
- Portée : **Bash d'abord**. Les Voies (15 langages) et le terminal node-pty (cours) restent inchangés.

> ⚠️ À TESTER en app packagée : boot du Linux WASM, terminal interactif, détection live des objectifs, coffre. Non vérifiable hors GUI.

---

## v0.14.0 — Vrai terminal (node-pty) : Tab, historique, édition de ligne (2026-06-18)

- **Problème** : le terminal lançait bash/powershell/python via `spawn` à tubes (pas de pseudo-terminal). Sans TTY, readline restait en mode dégradé → pas de complétion Tab, pas d'historique ↑, pas d'édition de ligne, pas de Ctrl+C.
- **Correctif** : passage à **node-pty** (vrai PTY, comme le terminal de VS Code). `terminal.js` crée les sessions via `pty.spawn` (write/resize/kill/onData) ; `Terminal.jsx` écrit le flux **brut** dans xterm (plus de découpage par lignes) et envoie la taille (cols/rows) + le resize au PTY.
- **Validation découplée** : avec un PTY, le shell réaffiche (écho) la commande, ce qui fausserait la comparaison. La validation passe donc par un nouvel IPC **`terminal:runValidation`** qui exécute le code **en coulisses** (processus jetable, sans écho) et renvoie une sortie propre. `useCodeRunner` (missions) et `Exercise.jsx` (cours) l'utilisent ; le sentinel/poll est supprimé. Bonus : règle les soucis de REPL Python multi-lignes et rend les langages compilés déterministes. L'aperçu PHP est alimenté directement par cette sortie.
- **Packaging** : node-pty est un module natif **N-API** (binaires prébuildés portables Node↔Electron). `npmRebuild: false` (pas de Visual Studio requis) + `files`/`asarUnpack` incluent `node_modules/node-pty/**`.

> ⚠️ À tester dans l'app packagée : complétion Tab, historique, Ctrl+C, et que la validation reste correcte (réussite/échec) sur un échantillon (bash, python, powershell, sql, php, C).

---

## v0.13.1 — Setup de mission réellement invisible (2026-06-18)

- **Problème** : la commande de préparation (`setup`, ex. `mkdir … && printf "…OUVERTE…" > portes.txt`) s'exécutait dans la session bash **affichée** (au chargement de l'acte et à chaque exécution/validation). Bash interactif l'écho à l'écran → les données (et donc la réponse) étaient **dévoilées dans le terminal**.
- **Correctif** : nouveau IPC `terminal:runSetup` qui exécute le `setup` dans une **invocation WSL séparée et non affichée** (`wsl.exe -e bash`, script via stdin). Comme `/tmp` est partagé dans la même instance WSL, les fichiers restent accessibles à la session du terminal, mais la commande n'apparaît jamais.
- `useCodeRunner` ne préfixe plus le setup au code (run/validate envoient uniquement le code de l'élève) ; `MissionPlay` appelle `runSetup` en coulisses au chargement de l'acte et avant chaque Exécuter/Valider (idempotent).

---

## v0.13.0 — Voies (vague 5) : PHP, C, C++, C#, Java — couverture complète (2026-06-18)

Cinq dernières Voies (langages **compilés/exécutés via WSL**) :
- **La Voie du PHP** (15 actes) : echo/variables/calculs/if/for → tableaux/foreach/fonctions/associatifs → chaînes/ternaire → classes/synthèse. (php-cli)
- **La Voie du C** (13 actes) : printf/variables/if/for → tableaux/fonctions → while/compter → multi-params/synthèse. (gcc)
- **La Voie du C++** (13 actes) : cout/string → vecteurs/fonctions → while → structs/synthèse. (g++)
- **La Voie du C#** (13 actes) : WriteLine → tableaux/méthodes → while → classes/synthèse. (mono)
- **La Voie de Java** (13 actes) : println → tableaux/méthodes → while → classes/synthèse. (default-jdk)

Acts exécutés : `starterCode` = squelette (boilerplate non révélateur), sortie validée par `expectedOutput`. Nécessitent la toolchain WSL correspondante (ToolchainBanner avertit sinon).

**Couverture COMPLÈTE : 15 langages** ont leur Voie débutant→expert (Bash, Python, PowerShell, SQL, Regex, Git, KQL, SPL, YAML, HTML, PHP, C, C++, C#, Java). Section « à venir » retirée.

---

## v0.12.0 — Voies (vague 4) : KQL, SPL, YAML, HTML (2026-06-18)

Quatre nouvelles Voies, toutes **statiques** (validation par mots-clés) :
- **La Voie du KQL** (17 actes) : take/where/project/count/sort → summarize/extend/ago/contains → top/dcount/let → join/bin/synthèse.
- **La Voie du SPL** (17 actes) : index/table/head/where → stats/eval/sort → top/dedup/rename → timechart/lookup/synthèse.
- **La Voie du YAML** (15 actes) : clés-valeurs/types → listes/imbrication → ancres/alias/multi-doc → multi-ligne/manifeste.
- **La Voie du HTML** (17 actes) : structure/texte/liens/images → listes/tableaux/div → formulaires → sémantique/meta/page complète.

**Couverture : 10 langages** (Bash, Python, PowerShell, SQL, Regex, Git, KQL, SPL, YAML, HTML). Restent : PHP, C, C++, C#, Java (langages compilés, prochaine vague).

---

## v0.11.0 — Voies (vagues 2 & 3) : PowerShell, SQL, Regex, Git (2026-06-18)

Poursuite des « Voies » (parcours débutant→expert par langage), par vagues.

### Vague 2
- **La Voie de PowerShell** (17 actes, exécutée en session, données en mémoire) : Write-Output, variables, calculs, if, foreach → tableaux, Where-Object, Measure-Object → Sort-Object, hashtables, méthodes → fonctions, paramètres, synthèse.
- **La Voie du SQL** (17 actes, statique/mots-clés) : SELECT, DISTINCT, WHERE, ORDER BY → comparaisons, AND, IN, LIKE → COUNT, AVG, GROUP BY, HAVING → JOIN, sous-requêtes, synthèse.

### Vague 3
- **La Voie du Regex** (17 actes, statique) : littéraux, `.`, `\d`, `\w`, `+` → `[a-z]`, `{n,m}`, ancres, `\s` → alternative, optionnel, échappement → groupes, classes négatives, email.
- **La Voie de Git** (17 actes, statique) : init/status/add/commit/log → branch/switch/merge/diff → remote/push/pull/clone → stash/revert/cycle complet.

Tous suivent le format Voie (paliers + tier + actes de révision réutilisant les acquis). Couverture actuelle : Bash, Python, PowerShell, SQL, Regex, Git. Restent à venir : KQL, SPL, YAML, HTML, PHP, C, C++, C#, Java.

---

## v0.10.0 — Missions « Voies » : parcours débutant → expert (2026-06-18)

Refonte des missions en **parcours complets par langage** : jouer une Voie mène un débutant jusqu'au niveau **expert**, avec apprentissage par répétition (livraison **par vagues** — vague 1 : Bash + Python).

### Concept « Voie »
- Une Voie = une grande campagne mono-langage, ordonnée en **4 paliers** (Débutant → Intermédiaire → Avancé → Expert).
- Schéma campagne : `kind: "voie" | "scenario"`, `language`. Schéma chapitre : `tier` (palier).
- **Répétition** : actes de **révision/synthèse** qui réutilisent explicitement des commandes des paliers précédents ; les `teach` rappellent « (revu de l'acte X) ».

### Contenu livré (vague 1)
- **La Voie du Bash** (21 actes) : fusion des 4 anciennes campagnes bash + 2 actes de révision. echo/ls/cat/grep/pipe → cd/head/sort/redirection/cp → find/cut/awk/sed → variables/for/if/while/fonctions.
- **La Voie du Python** (17 actes) : SOS Robot étendu jusqu'à expert. print/var/if/for → listes/dict/fonctions → f-strings/compréhensions/try-except → fonctions multi-params/classes/synthèse.
- Anciennes campagnes bash/python fusionnées **supprimées** ; Blackout + Boutique conservées comme **Scénarios** (`kind: "scenario"`).

### UI
- `Missions.jsx` : sections **« Parcours complets »** (Voies, + Voies « à venir » pour les autres langages) et **« Scénarios »**. Carte de Voie avec **palier qui grimpe** (échelle Débutant→Expert) et badge **« Expert ✓ »** à 100 %.
- `MissionPlay.jsx` : palier courant affiché (`Acte X / N · Intermédiaire`) + séparateurs de palier dans le fil d'actes.

> Note : la progression des anciennes missions (ids fusionnés) est repartie de zéro (les Voies ont de nouveaux identifiants).

---

## v0.9.2 — Ollama non reconfiguré à chaque mise à jour (2026-06-18)

- **Problème** : `build/setup-ollama.ps1` est relancé à chaque installation (mises à jour comprises). Le binaire Ollama n'était déjà pas réinstallé s'il était présent, mais la fenêtre de sélection du modèle, `ollama pull` et les dialogues se rejouaient à chaque mise à jour.
- **Correctif** : bloc de **détection « déjà configuré »** ajouté en tête du script. Sortie anticipée silencieuse (`exit 0`) si les trois conditions sont réunies : Ollama installé + `installer-ai-config.json` présent + modèle configuré présent dans `ollama list`. Sinon, flux normal (installation fraîche ou auto-réparation si le modèle a été supprimé).
- ⚠️ Ne profite qu'aux mises à jour **futures** (l'installateur corrigé doit être en place ; la prochaine mise à jour exécute encore l'ancien script).

---

## v0.9.1 — Contrôles fenêtre + calendrier d'activité (2026-06-18)

- **Contrôles fenêtre repositionnés** : réduire/agrandir/fermer déplacés de l'en-tête de la sidebar (haut gauche, collés au logo) vers une fine barre de titre en **haut à droite** de la fenêtre (convention Windows). `AppLayout.jsx` ajoute une colonne droite avec barre draggable + `WindowControls` ; `Sidebar.jsx` ne contient plus les contrôles (logo seul).
- **Calendrier d'activité visible** : les cases vides du heatmap 365 jours utilisaient `#111110` (= fond de la carte) → grille invisible. Passées à `#2e2b26` (`Dashboard.jsx` `ActivityCalendar`).

---

## v0.9.0 — Missions débutant → expert + préparation cachée (2026-06-18)

### Préparation des données cachée (`setup`)
- Nouveau champ chapitre **`setup`** : commandes bash qui créent les fichiers de données d'un acte. Exécutées **en coulisses** (avant le code de l'apprenant, via `useCodeRunner`), **jamais affichées dans l'éditeur**. Corrige le défaut où la ligne `mkdir && printf "…"` encombrait l'éditeur et **dévoilait la réponse**.
- `MissionPlay.jsx` : exécute le `setup` au chargement de l'acte (exploration libre) et le préfixe à chaque exécution/validation. L'anti-triche reste basé sur le code apprenant (éditeur vide → échec).
- `starterCode` ne contient plus que le commentaire-guide.

### Progression complète débutant → expert (apprentissage par répétition)
Catalogue à **4 niveaux** (Débutant / Intermédiaire / Avancé / Expert) ; chaque campagne **réutilise** les commandes vues avant et en introduit de nouvelles. **7 campagnes** :
- **Débutant** : *Le Terminal Perdu* (echo, ls, cat, grep, pipe) · *SOS Robot* (Python : print, variables, calculs, if, for).
- **Intermédiaire** : *Blackout* (SOC multi-langages) · *La Boutique en Panne* (SQL + bash) · *Le Serveur Oublié* (cd/pwd, head/tail, sort/uniq, redirection `>`, cp/mv — réutilise ls/cat/grep/wc).
- **Avancé** : *La Trace* (find, cut, awk, sed — réutilise grep/wc).
- **Expert** : *L'Automate* (scripting : variables/calculs, for, if/test, while, fonctions — réutilise grep/wc/echo).

Exécution via WSL conservée pour les missions (choix utilisateur : pas de terminal simulé). `MissionPlay` mis à jour : `index.js` (DIFF_RANK + niveau expert), `Missions.jsx` (4 sections).

---

## v0.8.1 — Missions jouables & progressives (2026-06-18)

Correctif + extension du mode jeu suite aux retours de test.

### Problèmes corrigés
- **Solution pré-remplie** : l'Acte I de *Blackout* contenait déjà la commande dans `starterCode` → l'acte se validait sans rien écrire. Règle appliquée à toutes les campagnes : `starterCode` ne contient que la mise en place (commentaires/données qui n'impriment rien), jamais la ligne-solution ; `expectedOutput` n'est produit que par l'action correcte du joueur.
- **Niveau inadapté aux débutants** : *Blackout* (multi-langages) supposait des bases. Le catalogue est désormais **structuré par niveaux**.

### Missions auto-apprenantes
- Nouveau champ chapitre **`teach`** : un exemple corrigé et commenté de la notion, affiché dans un encart « Comment t'y prendre » **avant** la saisie (rendu dans `MissionPlay.jsx`). On apprend en jouant, sans prérequis.

### Catalogue par niveaux
- `Missions.jsx` affiche 3 sections **Débutant / Intermédiaire / Avancé** ; tri par niveau puis `order` dans `content/missions/index.js` (`DIFF_RANK`).

### Campagnes livrées (4)
- **Débutant — « Le Terminal Perdu »** (Bash) : echo, ls, cat, grep, pipe `|`/`wc -l`, narration d'évasion.
- **Débutant — « SOS Robot »** (Python) : print, variables, calculs, `if`, boucle `for`.
- **Intermédiaire — « Blackout »** (réécrite) : enquête SOC bash→regex→kql→sql→python, avec `teach` par acte et starters sans solution.
- **Intermédiaire — « La Boutique en Panne »** (SQL + Bash) : diagnostic d'un bug de facturation (SELECT/WHERE/COUNT/GROUP BY + logs serveur).
- Section Avancé : cartes « à venir » (format prêt pour de nouvelles campagnes).

---

## v0.8.0 — Mode jeu « Missions » + langages compilés C/C++/C#/Java (2026-06-18)

### Mode jeu narratif « Missions » (nouvelle section)

Nouvelle entrée de barre latérale `missions`, distincte des cours. Une **campagne** est une histoire découpée en **actes** ; chaque acte présente une narration puis une **énigme de code** à résoudre. La réussite révèle la suite de l'intrigue (`reward`) et débloque l'acte suivant, jusqu'à un écran de **finale** (débrief formulé pour un CV).

- **Campagne livrée — « Blackout »** (parcours SOC, 5 actes multi-langages) : enquête d'incident `bash` → `regex` → `kql` → `sql` → `python`. Les indices se chaînent d'un acte à l'autre.
- Le catalogue affiche aussi des campagnes « à venir » (portfolio dev web, journée d'entretien, astreinte sysadmin).

**Fichiers :**
- `content/missions/<id>.json` : schéma campagne (`chapters[]` avec `story`, `brief`, `starterCode`, `validationType`, `expectedOutput`/`requiredKeywords`, `hint`, `correction`, `reward` + `finale`).
- `content/missions/index.js` : loader séparé (`listCampaigns`, `getCampaign`).
- `pages/Missions.jsx` (catalogue) + `pages/MissionPlay.jsx` (jeu plein écran, route `/mission/:campaignId` hors AppLayout).
- Progression réutilise le store générique : chapitre réussi = `markExerciseDone(profileId, "<campagne>:<chapitre>")`.

### Langages compilés C, C++, C#, Java

Ajout de 4 langages (track « Fondamentaux » chacun : 1 niveau, 3 modules, exécutés via WSL).

- **Exécution** : compilation + run dans la session bash WSL via heredoc (même principe que PHP) — `gcc`, `g++`, `javac/java`, `mcs/mono`. Java impose la classe `Main` ; C# utilise Mono.
- **Détection toolchain** : `terminal:toolAvailable` (IPC) + `ToolchainBanner.jsx` affiche la commande d'installation si l'outil manque dans WSL.
- **Coloration** : modes `clike` (c, cpp, java, csharp) de `@codemirror/legacy-modes`.

### Socle technique partagé (refactoring)

- **`lib/langs.js`** : source de vérité UNIQUE des langages (`LANG_META`, `LANG_COLORS`, `LANG_LABELS`, `STATIC_LANGS`, `isStatic`, `termShellFor`, `getLangExtension`, `buildRunData`, `sentinelCommand`, `stripAnsi`, `TOOLCHAINS`). Remplace les tables dupliquées d'Exercise/Sandbox/Course.
- **`lib/useCodeRunner.js`** : hook d'exécution + validation (sentinel pour exécuté, mots-clés pour statique) utilisé par MissionPlay.
- `Exercise.jsx`, `Sandbox.jsx`, `Course.jsx` adoptent `lib/langs` — comportement inchangé pour les exercices existants.

---

## v0.6.0 — HTML et PHP avec panneau de prévisualisation (2026-06-01)

### Nouveaux langages complémentaires

**HTML** (3 niveaux, 11 modules) — validation par mots-clés, prévisualisation temps réel :
- L1 : Structure de base, Texte/mise en forme, Liens/images, Listes/tableaux
- L2 : Formulaires, Sémantique HTML5, Attributs et classes
- L3 : Accessibilité ARIA, Métadonnées SEO, Projet final

**PHP** (3 niveaux, 11 modules) — exécution WSL bash, prévisualisation après run :
- L1 : Syntaxe de base, Variables/opérateurs, Conditions/boucles, Fonctions
- L2 : Tableaux, Chaînes de caractères, Fichiers et JSON
- L3 : POO, Sécurité, Projet final

### Architecture

**`PreviewPane.jsx`** (nouveau) : iframe `srcdoc` sandboxée (`allow-scripts`, PAS `allow-same-origin` → les scripts de l'iframe ne peuvent pas accéder à `window.electronAPI`)

**`Exercise.jsx`** :
- `STATIC_LANGS` étendu avec `html` (validation keywords)
- `PREVIEW_LANGS = ['html', 'php']`
- `previewSrc` state pour PHP
- PHP `handleRun` : heredoc bash avec `'PHPEOF'` en single-quotes (protège les `$` PHP)
- PHP `validate` : extrait la sortie HTML du buffer et met à jour `previewSrc`
- Layout : HTML → PreviewPane plein panneau | PHP → Terminal (60%) + PreviewPane (40%)

**`Sandbox.jsx`** : bouton "↻ Aperçu PHP" pour actualiser manuellement

**`terminal.js`** : `terminal:phpAvailable` IPC — vérifie `wsl.exe -e php --version`

**Coloration CodeMirror** :
- HTML → `html` depuis `@codemirror/legacy-modes/mode/xml`
- PHP → `javascript` depuis `@codemirror/legacy-modes/mode/javascript` (C-like)
- (`htmlmixed` et `php` modes n'existent pas dans cette version de legacy-modes)

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
