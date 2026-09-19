# ScriptLearn — Installateurs Windows

Deux variantes, construites avec **Inno Setup** à partir de `dist\win-unpacked`
(produit par `npm run package`).

| Variante | Fichiers publiés | Internet requis chez l'utilisateur | Contenu |
|----------|------------------|------------------------------------|---------|
| **Hybrid** | 1 `.exe` (~1,3 Go) | Oui — Ollama + modèle IA seulement | App + toutes les toolchains embarquées |
| **Offline** | 1 `.exe` + 1 ou 2 `.bin` | **Non** | Idem + `OllamaSetup.exe` + blobs du modèle |

Dans **les deux cas**, les interpréteurs et compilateurs (Node, Python, PHP,
MinGW pour C/C++, JDK pour Java, Go, Rust, Git/Bash) sont **embarqués** : ~2,6 Go
copiés dans `resources\` à l'installation, aucun téléchargement, aucun SDK à
installer côté utilisateur. La seule différence entre les deux variantes est
l'assistant IA : Hybrid le télécharge, Offline le transporte.

> **WSL n'est plus utilisé.** Jusqu'à la v0.18.0 le terminal passait par WSL2 +
> Ubuntu ; les toolchains natives embarquées l'ont remplacé (cf.
> `src/main/terminal.js`). Les installateurs activaient pourtant encore WSL2 —
> plusieurs minutes, un redémarrage de Windows imposé et un risque d'échec pour
> une fonctionnalité morte. Tout cela a été retiré. Seul subsiste le nettoyage
> d'une clé `RunOnce` héritée, pour les machines mises à jour depuis ces versions.

> **Offline — tous les fichiers vont ensemble.** Le paquet dépasse la limite de
> 4,2 Go d'un `.exe` Windows : Inno Setup produit un `.exe` lanceur plus des
> `.bin` de données (`DiskSpanning`). **Tous doivent être dans le même dossier**
> à l'installation. Les tranches sont fixées à 1,9 Go parce qu'une release GitHub
> refuse tout fichier de plus de 2 Gio ; `scripts\release.ps1` téléverse
> l'ensemble des tranches, pas seulement le `.exe`.

---

## Prérequis de build

1. **Node.js 20+** et npm, dépendances installées (`npm install` à la racine)
2. **Inno Setup 6+** → https://jrsoftware.org/isdl.php
3. Les toolchains téléchargées une fois : `npm run toolchains` (~2,6 Go dans
   `resources\`, ignoré par git). `npm run package` le fait automatiquement via
   `prepackage`.

---

## Hybrid

```powershell
cd installer
.\build-hybrid.ps1
```

Produit `installer\output\ScriptLearn-Setup-Hybrid.exe`.

Chez l'utilisateur, la seule connexion nécessaire sert à télécharger
`OllamaSetup.exe` (~90 Mo) puis le modèle IA choisi (1 à 5 Go).

C'est **la variante lue par la mise à jour automatique** : `src/main/updater.js`
choisit l'asset « Hybrid » et vérifie son empreinte sha512 publiée dans
`latest.yml`. Un installateur découpé en tranches ne peut pas servir à cela —
d'où le maintien de cette variante en un seul fichier.

## Offline

```powershell
cd installer
.\build-offline.ps1                      # modèle par défaut : llama3.2:3b
.\build-offline.ps1 -Model "mistral:7b"  # autre modèle
```

Le script enchaîne :

1. téléchargement de `OllamaSetup.exe` dans `installer\assets\` ;
2. installation locale d'Ollama si absente, puis `ollama pull <modèle>` ;
3. extraction des **seuls** blobs de ce modèle vers `installer\assets\ollama-models.zip` ;
4. `npm run package` ;
5. compilation Inno Setup.

Les étapes 1 à 3 sont idempotentes : un fichier déjà présent dans `assets\` est
réutilisé, ce qui évite de re-télécharger plusieurs Go à chaque build.

---

## Ce que voit l'utilisateur

**Hybrid** — écran de choix du modèle IA, puis une barre de progression, puis
ScriptLearn se lance. Pas d'écran d'accueil ni de fin.

**Offline** — zéro interaction : uniquement la barre de progression.

Les deux exigent les droits administrateur, parce que l'installation écrit dans
`C:\Program Files\ScriptLearn` et installe Ollama pour toute la machine.

---

## Structure

```
installer/
├── ScriptLearn-Hybrid.iss           ← script Inno Setup (Ollama en ligne)
├── ScriptLearn-Offline.iss          ← script Inno Setup (Ollama embarqué)
├── build-hybrid.ps1                 ← build de la variante Hybrid
├── build-offline.ps1                ← préparation des assets + build Offline
├── scripts/
│   ├── install-ollama-online.ps1    ← télécharge et installe Ollama + pull du modèle
│   └── install-ollama-offline.ps1   ← installe Ollama depuis assets\ + extrait le modèle
├── assets/                          ← produit par build-offline.ps1 (non committé)
│   ├── OllamaSetup.exe
│   └── ollama-models.zip
└── output/                          ← installateurs compilés (non committé)
```

`npm run package` construit la cible `dir` d'electron-builder, c'est-à-dire
`dist\win-unpacked` seulement. **Aucun installateur NSIS n'est produit** : les
installateurs publiés sont ceux d'Inno Setup ci-dessus. La cible NSIS existait
encore et compressait inutilement ~2,6 Go à chaque release, en dupliquant la
configuration d'Ollama dans un `custom.nsh` que personne ne distribuait.

## Chemin Inno Setup personnalisé

```powershell
.\build-hybrid.ps1 -InnoCompiler "D:\Tools\InnoSetup\ISCC.exe"
```
