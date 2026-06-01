# ScriptLearn — Installeurs Windows

Deux variantes d'installeur sont disponibles :

| Variante | Fichiers | Internet requis | Description |
|----------|----------|-----------------|-------------|
| **Hybrid** | 1 `.exe` (~79 Mo) | Oui (WSL Ubuntu, Ollama, modèle) | Partage facile, télécharge les composants pendant l'install |
| **Offline** | 1 `.exe` + 1 `.bin` (~5 Go total) | **Non** | Tout embarqué (Ubuntu 24.04, Ollama, llama3.2:3b), 100% hors-ligne |

> **Offline — 2 fichiers obligatoires** : la limite Windows des fichiers `.exe` est 4,2 Go. Le package Offline dépasse cette taille (Ubuntu + Ollama + modèle). Inno Setup génère donc un `.exe` lanceur + un `.bin` de données. **Les deux doivent être dans le même dossier** pour que l'installation fonctionne. Distribuez-les ensemble (dossier partagé, archive zip, clé USB, etc.).

---

## Prérequis de build

1. **Node.js 18+** et npm
2. **Inno Setup 6+** → https://jrsoftware.org/isdl.php
3. Les dépendances npm installées (`npm install` à la racine du projet)

---

## Installeur Hybrid (recommandé pour partage normal)

```powershell
# Depuis la racine du projet
cd installer
.\build-hybrid.ps1
```

Produit : `installer\output\ScriptLearn-Setup-Hybrid.exe`

L'utilisateur final aura besoin d'une connexion Internet pour :
- Télécharger Ubuntu 22.04 via `wsl --install`
- Télécharger `OllamaSetup.exe` (~90 Mo)
- Télécharger le modèle IA (1-5 Go selon son choix)

---

## Installeur Offline (tout embarqué)

```powershell
# Depuis la racine du projet
cd installer
.\build-offline.ps1
```

Ce script fait automatiquement :
1. Télécharge `OllamaSetup.exe` dans `installer\assets\`
2. Installe Ollama localement et pull `llama3.2:3b`
3. Zippe les blobs du modèle dans `installer\assets\ollama-models.zip`
4. Build l'app Electron (`npm run package`)
5. Compile l'installeur Inno Setup

Produit : `installer\output\ScriptLearn-Setup-Offline.exe` (~3-5 Go)

### Modèle différent (offline)

```powershell
.\build-offline.ps1 -Model "mistral:7b"
```

---

## Ce que l'installeur fait chez l'utilisateur final

### Installeur Hybrid
1. Vérifie Windows 10+ et droits admin (un seul message d'erreur si ko, sinon silencieux)
2. **Affiche uniquement le choix du modèle IA** → l'utilisateur clique "Installer →"
3. Barre de progression pendant l'installation
4. Installe ScriptLearn dans `C:\Program Files\ScriptLearn\`
5. Télécharge et installe WSL2 + Ubuntu 22.04 (silencieux)
6. Télécharge et installe Ollama + le modèle choisi (silencieux)
7. Lance ScriptLearn automatiquement — pas d'écran de fin

### Installeur Offline
1. Vérifie Windows 10+ et droits admin (un seul message d'erreur si ko)
2. **Zéro interaction** — seule la barre de progression est visible
3. Installe tout automatiquement, lance ScriptLearn
4. Pas d'écran de fin

### Note sur le redémarrage WSL

Si WSL n'était pas encore activé, un redémarrage est nécessaire.
L'installeur **n'affiche pas de popup** : il crée un fichier
`ScriptLearn-Redémarrage-Requis.txt` sur le Bureau de l'utilisateur
avec les instructions. ScriptLearn fonctionne sans WSL (Python et
PowerShell restent disponibles).

---

## Structure des fichiers

```
installer/
├── ScriptLearn-Hybrid.iss      ← Script Inno Setup (hybrid)
├── ScriptLearn-Offline.iss     ← Script Inno Setup (offline)
├── build-hybrid.ps1            ← Script de build hybrid
├── build-offline.ps1           ← Script de build offline
├── scripts/
│   ├── check-requirements.ps1  ← Vérifie Windows version + droits admin
│   ├── install-wsl.ps1         ← Active WSL2 + installe Ubuntu 22.04
│   ├── install-ollama-online.ps1  ← Télécharge + installe Ollama + pull modèle
│   └── install-ollama-offline.ps1 ← Installe Ollama depuis assets + extrait modèle
├── assets/                     ← Généré par build-offline.ps1 (ne pas committer)
│   ├── OllamaSetup.exe
│   └── ollama-models.zip
└── output/                     ← Installeurs compilés (ne pas committer)
    ├── ScriptLearn-Setup-Hybrid.exe
    └── ScriptLearn-Setup-Offline.exe
```

---

## Chemin Inno Setup personnalisé

Si Inno Setup est installé dans un chemin différent :

```powershell
.\build-hybrid.ps1 -InnoCompiler "D:\Tools\InnoSetup\ISCC.exe"
```

---

## .gitignore recommandé

Ajouter à `.gitignore` :

```
installer/assets/
installer/output/
```
