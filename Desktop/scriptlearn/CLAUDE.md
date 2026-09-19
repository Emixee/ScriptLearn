# Instructions permanentes — Claude Code (ScriptLearn)

## 1. Vérification du dépôt Git

- **Au début de chaque session**, vérifier que le dépôt local est bien connecté au bon remote GitHub :
  ```powershell
  git remote -v
  # Doit afficher :
  # origin  https://github.com/Emixee/ScriptLearn.git (fetch)
  # origin  https://github.com/Emixee/ScriptLearn.git (push)
  ```
- Si le remote est absent ou incorrect, le reconfigurer avant tout autre action :
  ```powershell
  git remote set-url origin https://github.com/Emixee/ScriptLearn.git
  ```
- **Ne jamais committer, pusher ou créer de release** sans avoir confirmé que `origin` pointe vers `https://github.com/Emixee/ScriptLearn`.
- Le code du projet se trouve dans le sous-dossier `Desktop/scriptlearn/` du dépôt :
  `https://github.com/Emixee/ScriptLearn/tree/main/Desktop/scriptlearn`

## 2. Documentation du projet (`CONVERSATION.md`)

- **Avant chaque session de travail**, lire le fichier `docs/CONVERSATION.md` via GitHub CLI pour connaître l'état exact du projet, les décisions prises, les bugs connus et les tâches en attente.
- **Après chaque modification significative** (nouvelle fonctionnalité, correctif, refactoring, release), mettre à jour `docs/CONVERSATION.md` pour refléter fidèlement l'état courant du projet.
- Le fichier `CONVERSATION.md` est la **source de vérité** du projet : il doit toujours être à jour et complet.
- Fichier sur GitHub : `https://github.com/Emixee/ScriptLearn/blob/main/Desktop/scriptlearn/docs/CONVERSATION.md`

## 3. Lecture des fichiers GitHub

- **Toujours utiliser le GitHub CLI (`gh`)** pour lire les fichiers hébergés sur GitHub. Ne jamais utiliser d'URL web directement.
- Commandes de référence :
  ```powershell
  # Recharger le PATH si gh n'est pas reconnu
  $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")

  # Lire CONVERSATION.md (contenu décodé depuis base64)
  gh api repos/Emixee/ScriptLearn/contents/Desktop/scriptlearn/docs/CONVERSATION.md --jq '.content' | base64 -d

  # Lire n'importe quel autre fichier du dépôt
  gh api repos/Emixee/ScriptLearn/contents/Desktop/scriptlearn/<chemin/vers/fichier> --jq '.content' | base64 -d
  ```

## 4. Commentaires dans le code

- **Toujours commenter le code produit** en expliquant le **"Pourquoi"** avec un **objectif pédagogique** : un développeur débutant doit pouvoir lire le code et comprendre non seulement ce que fait chaque partie, mais pourquoi elle est écrite ainsi, quelle contrainte elle résout et quelles erreurs elle évite.
- Les commentaires doivent expliquer :
  - La **raison du choix technique** (pourquoi cette approche plutôt qu'une autre)
  - La **contrainte ou le problème** que le code résout
  - Le **cas limite ou le piège** évité
  - Le **lien entre les parties** quand deux fichiers ou deux systèmes doivent rester synchronisés
- Exemples de bons commentaires pédagogiques :
  ```js
  // On utilise une Map (O(1)) plutôt qu'un find() sur le tableau (O(N)) car
  // cette fonction est appelée à chaque navigation entre leçons — la performance compte.

  // key={id} force React à détruire et recréer le composant à chaque changement de leçon.
  // Sans ça, React réutilise le même composant et l'état local (réponses, score) n'est pas réinitialisé.

  // right: 138px laisse la place aux boutons natifs Windows (fermer/réduire/agrandir).
  // WebkitAppRegion:'drag' est nécessaire car titleBarStyle:'hidden' supprime
  // la barre de titre native — sans cette propriété, la fenêtre devient impossible à déplacer.

  // IMPORTANT : ce tableau doit rester synchronisé avec XP_THRESHOLDS dans electron/main.js.
  // Les deux fichiers ne peuvent pas s'importer mutuellement (ESM vs CommonJS),
  // donc la constante est dupliquée volontairement — toute modification doit être faite aux deux endroits.
  ```

## 5. Versioning et releases

### Numérotation sémantique (SemVer)

Un numéro de version DOIT prendre la forme **X.Y.Z** où X, Y et Z sont des entiers non négatifs et NE DOIVENT PAS être préfixés par des zéros :

| Identifiant | Lettre | Quand l'incrémenter |
|---|---|---|
| **Majeure** | X | Changement incompatible avec les versions précédentes |
| **Mineure** | Y | Nouvelle fonctionnalité rétrocompatible |
| **Correction** | Z | Correctif de bug rétrocompatible |

Exemples : `1.0.0` → `1.0.1` (bug fix) → `1.1.0` (nouvelle feature) → `2.0.0` (breaking change)

### Procédure obligatoire après chaque push

> ⚠️ **Ce projet n'utilise PAS `electron-updater`.** Ce n'est pas une dépendance du
> projet. La mise à jour est assurée par `src/main/updater.js` (updater maison sur
> l'API GitHub), et les installateurs publiés sont produits par **Inno Setup**
> (`installer/*.iss`), pas par le NSIS d'electron-builder. Toute consigne demandant
> de publier un `.blockmap` ou de « faire comme electron-updater » est périmée.

**Le chemin normal est un seul script** — il fait tout, dans le bon ordre, avec les
vérifications préalables :

```powershell
.\scripts\release.ps1            # bump patch (X.Y.Z → X.Y.Z+1)
.\scripts\release.ps1 minor      # nouvelle fonctionnalité
.\scripts\release.ps1 major      # changement incompatible
.\scripts\release.ps1 -DryRun    # simule (affiche la version cible, ne touche à rien)
```

Ce qu'il enchaîne :

1. **Vérifie** `ISCC.exe`, `gh` et que `origin` pointe bien sur `Emixee/ScriptLearn`
   — avant le build, pas après plusieurs minutes perdues.
2. Bumpe la version (`npm version --no-git-tag-version`).
3. `npm run build` puis `npm run package` (electron-vite + electron-builder).
4. Compile les installateurs Inno Setup **Hybrid** et **Offline**.
5. Commit + tag `vX.Y.Z` + push (`main` et le tag).
6. Génère `installer/output/latest.yml` (**sha512 en base64** de l'installateur
   Hybrid) et crée la release GitHub avec `ScriptLearn-Setup-Hybrid.exe`,
   `latest.yml` et, s'il existe, `ScriptLearn-Setup-Offline.exe`.

**Puis, à la main** : mettre `docs/CONVERSATION.md` à jour (version + changements)
et committer.

#### Pourquoi `latest.yml` est indispensable

`src/main/updater.js` télécharge l'installateur puis **l'exécute**. Il lit la ligne
`sha512:` de `latest.yml` et **refuse d'exécuter** un fichier dont l'empreinte ne
correspond pas. Sans ce fichier dans la release, la mise à jour fonctionne encore
mais n'est plus vérifiée (seule la taille est contrôlée) — et l'app le signale.

> ⚠️ Ne jamais téléverser `latest.yml` via l'interface web GitHub — GitHub bloque
> les `.yml`. Toujours passer par le CLI `gh` (ce que fait `release.ps1`).
>
> ⚠️ Toujours préciser `--repo Emixee/ScriptLearn` dans une commande
> `gh release create` lancée à la main : le dépôt racine pointe sur un autre remote
> par défaut.
>
> ⚠️ L'updater choisit l'asset **Hybrid**. Ne pas publier d'autre `.exe` dont le nom
> contient « Hybrid », et ne pas renommer celui-là sans adapter `updater.js`.

## 6. Vérifications avant de committer

```powershell
npm run verify        # lint + tests + intégrité du contenu + build
```

ou séparément :

| Commande | Rôle |
|---|---|
| `npm run lint` | ESLint + `react-hooks` (`eslint.config.mjs`) |
| `npm test` | Vitest (validateurs) |
| `npm run content:check` | intégrité du contenu pédagogique (`scripts/check-content.mjs`) |
| `npm run build` | build electron-vite |

**`content:check` est le plus important** : il détecte les validations impossibles à
échouer, les exercices dont la correction ne satisfait pas ses propres mots-clés,
les modules référencés sans fichier (et l'inverse), et les dossiers de langage
absents du glob de `loader.js` (qui seraient silencieusement ignorés). La dette déjà
inventoriée vit dans `scripts/content-known-issues.json` : en corriger une, c'est
retirer son id de ce fichier.

## 7. Pièges connus du projet

- **`package.json` → `build.files`** ne package que `out/**` et
  `node_modules/node-pty`. **Toute dépendance npm importée par le processus
  principal serait absente de l'application installée** (elle marcherait en dev et
  planterait en production). C'est pourquoi `updater.js` extrait le sha512 de
  `latest.yml` à la regex plutôt qu'avec `js-yaml`.
- **`loader.js`** liste les langages en dur dans `import.meta.glob` (Vite exige un
  littéral) : ajouter `content/<langue>/` sans l'ajouter à cette liste rend le
  contenu invisible. `content:check` le détecte.
- **Fins de ligne** : le dépôt est normalisé en LF via `.gitattributes` (les `.ps1`,
  `.iss`, `.nsh`, `.cmd` restent en CRLF). Après un changement dans ce fichier :
  `git add --renormalize .`.
- **WSL a été supprimé en v0.18.0.** Les commentaires « WSL » qui subsistent dans le
  code sont historiques : le bash utilisé est celui de PortableGit
  (`resources/git/bin/bash.exe`).
