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

Après chaque `git push`, **toujours** :

1. Bumper la version dans `package.json` selon SemVer
2. Builder l'installateur : `npm run package`
3. Créer la release GitHub avec les trois fichiers requis par `electron-updater` :
   ```
   ScriptLearn Setup X.Y.Z.exe
   ScriptLearn Setup X.Y.Z.exe.blockmap
   latest.yml
   ```
   Commande :
   ```powershell
   $env:PATH = [System.Environment]::GetEnvironmentVariable("PATH","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("PATH","User")
   gh release create vX.Y.Z `
     "dist\ScriptLearn Setup X.Y.Z.exe" `
     "dist\ScriptLearn Setup X.Y.Z.exe.blockmap" `
     "dist\latest.yml" `
     --repo Emixee/ScriptLearn `
     --title "vX.Y.Z — <résumé>" `
     --notes "<notes de version>"
   ```
4. Mettre à jour `docs/CONVERSATION.md` avec la nouvelle version et les changements.
5. Committer et pusher `docs/CONVERSATION.md` et `package.json`.

> ⚠️ Ne jamais uploader `latest.yml` via l'interface web GitHub — GitHub bloque les `.yml`.
> Toujours passer par le CLI `gh`.
>
> ⚠️ Toujours préciser `--repo Emixee/ScriptLearn` dans la commande `gh release create`
> car le dépôt racine (`C:\Users\gpiet`) pointe sur un autre remote par défaut.
