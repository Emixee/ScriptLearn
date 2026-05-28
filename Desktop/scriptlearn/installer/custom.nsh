; ==============================================================================
; ScriptLearn — Extension NSIS : configuration Ollama & modèle IA
; Inclus via package.json > build > nsis > include
;
; POURQUOI ce fichier :
; electron-builder génère un installateur NSIS standard qui copie les fichiers
; de l'application. On étend ce comportement via le macro "customInstall"
; qu'electron-builder appelle automatiquement APRÈS la copie des fichiers.
;
; Ce macro extrait le script PowerShell "setup-ollama.ps1" depuis les ressources
; de l'installateur, l'exécute, puis le supprime du dossier temp.
;
; Le script PowerShell (build/setup-ollama.ps1) :
;   1. Affiche une fenêtre de sélection du modèle IA (Windows Forms)
;   2. Télécharge et installe Ollama si nécessaire
;   3. Lance "ollama pull <modèle>" pour télécharger le modèle choisi
;   4. Écrit %APPDATA%\ScriptLearn\installer-ai-config.json
;      → ScriptLearn lit ce fichier au premier démarrage pour se configurer
; ==============================================================================

!macro customInstall
  ; Afficher une information dans la barre de détail du NSIS pendant l'extraction
  SetDetailsPrint both
  DetailPrint "Configuration de l'assistant IA (Ollama)..."

  ; Extraire le script PowerShell vers le dossier temporaire de Windows.
  ; "${BUILD_RESOURCES_DIR}" pointe vers le dossier build/ du projet —
  ; electron-builder passe cette variable au compilateur NSIS.
  ; La directive "File" bundle le fichier DANS l'installateur à la compilation
  ; et l'extrait au bon endroit à l'installation.
  SetOutPath "$TEMP"
  File "${BUILD_RESOURCES_DIR}\setup-ollama.ps1"

  ; Exécuter le script PowerShell et ATTENDRE sa fin avant de continuer.
  ; -ExecutionPolicy Bypass : nécessaire car le script n'est pas signé.
  ; -WindowStyle Normal     : affiche la fenêtre PowerShell à l'utilisateur.
  ; -NonInteractive         : évite les prompts de profil PowerShell.
  ; ExecWait bloque l'installateur jusqu'à la fermeture du script.
  ExecWait 'powershell.exe -ExecutionPolicy Bypass -NonInteractive -WindowStyle Normal -File "$TEMP\setup-ollama.ps1"'

  ; Remettre le dossier de sortie sur $INSTDIR pour la suite de l'installation
  SetOutPath "$INSTDIR"

  ; Supprimer le script temporaire après exécution
  Delete "$TEMP\setup-ollama.ps1"

  SetDetailsPrint lastused
!macroend
