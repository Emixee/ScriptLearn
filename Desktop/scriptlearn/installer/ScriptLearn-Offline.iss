; ScriptLearn-Offline.iss — Installation entièrement silencieuse et 100% hors-ligne
; Aucune interaction utilisateur. Tout est embarqué dans le .exe.
;
; Prérequis :
;   1. npm run package  (produit dist\win-unpacked\)
;   2. Exécuter  installer\build-offline.ps1  pour générer :
;        assets\OllamaSetup.exe
;        assets\ollama-models.zip
;   3. Inno Setup 6+ puis compiler ce script.

#define AppName    "ScriptLearn"
#ifndef AppVersion
  #define AppVersion "0.1.0"
#endif
#define AppExeName "ScriptLearn.exe"
#define AppSrcDir  "..\dist\win-unpacked"
#define AssetsDir  "assets"

[Setup]
AppId={{B4E8D9F3-2C5F-5G0B-9D4E-3F6G7B8C0D1E}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=ScriptLearn
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
OutputDir=output
OutputBaseFilename=ScriptLearn-Setup-Offline
; SetupIconFile=..\src\renderer\src\assets\icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
; ── Découpage en tranches ────────────────────────────────────────────────────
; Le paquet embarque TOUT (app + toolchains ~2,6 Go + Ollama + modèle) : il
; dépasse la limite de 4,2 Go d'un .exe Windows, d'où DiskSpanning.
; POURQUOI 1,9 Go et non 3,9 : une release GitHub REFUSE tout fichier de plus de
; 2 Gio. Avec des tranches de 3,9 Go le paquet se compilait mais ne pouvait pas
; être publié — et release.ps1 ne téléversait de toute façon que le .exe, laissant
; les .bin derrière : l'utilisateur récupérait un installateur inutilisable.
; À 1,9 Go chaque tranche passe, et release.ps1 les téléverse TOUTES.
; Les fichiers doivent rester dans le MÊME dossier à l'installation.
DiskSpanning=yes
DiskSliceSize=1900000000
WizardStyle=modern
PrivilegesRequired=admin
MinVersion=10.0.18362
ArchitecturesInstallIn64BitMode=x64compatible

; ── Désactiver TOUTES les pages — zéro interaction ───────────────────────────
DisableWelcomePage=yes
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=yes
DisableFinishedPage=yes

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
; wpSelectTasks est sauté → l'état par défaut s'applique (checked = créé automatiquement)
Name: "desktopicon"; Description: "Icône sur le Bureau"
Name: "startmenuicon"; Description: "Raccourci Menu Démarrer"

[Files]
Source: "{#AppSrcDir}\*";                       DestDir: "{app}";        Flags: ignoreversion recursesubdirs createallsubdirs
Source: "scripts\install-ollama-offline.ps1";   DestDir: "{tmp}";        Flags: deleteafterinstall
Source: "{#AssetsDir}\OllamaSetup.exe";         DestDir: "{tmp}\assets"; Flags: deleteafterinstall
Source: "{#AssetsDir}\ollama-models.zip";       DestDir: "{tmp}\assets"; Flags: deleteafterinstall

[Icons]
Name: "{autodesktop}\{#AppName}";        Filename: "{app}\{#AppExeName}"; Tasks: desktopicon
Name: "{group}\{#AppName}";              Filename: "{app}\{#AppExeName}"; Tasks: startmenuicon
Name: "{group}\Désinstaller {#AppName}"; Filename: "{uninstallexe}"

[UninstallRun]
; Supprimer la clé RunOnce créée pour l'import WSL au redémarrage
Filename: "powershell.exe"; \
  Parameters: "-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ""Remove-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce' -Name 'ScriptLearn-WSL-Import' -ErrorAction SilentlyContinue"""; \
  Flags: runhidden

[UninstallDelete]
; Données utilisateur : profils, progression, paramètres (electron-store)
Type: filesandordirs; Name: "{userappdata}\ScriptLearn"
; Fichier tar Ubuntu et dossier temporaire
Type: filesandordirs; Name: "{localappdata}\ScriptLearn"
; Fichiers de log et flags laissés par l'installation
Type: files; Name: "{%TEMP}\ScriptLearn-install.log"
Type: files; Name: "{%TEMP}\sl-wsl-restart.flag"

[Run]
; Ollama + modèle embarqué — AUCUN téléchargement pendant l'installation :
; l'installateur d'Ollama et les blobs du modèle voyagent dans le paquet.
Filename: "powershell.exe"; \
  Parameters: "-ExecutionPolicy Bypass -NonInteractive -File ""{tmp}\install-ollama-offline.ps1"" -AssetsDir ""{tmp}\assets"""; \
  Flags: runhidden waituntilterminated; \
  StatusMsg: "Installation d'Ollama et du modèle IA..."

; Lancer l'application automatiquement
Filename: "{app}\{#AppExeName}"; Flags: nowait skipifsilent

[Code]
// ── Vérification des prérequis avant le lancement du wizard ─────────────────
// MinVersion=10.0.18362 dans [Setup] bloque déjà les Windows trop anciens.
function InitializeSetup(): Boolean;
begin
  Result := True;
  if not IsAdminInstallMode then begin
    MsgBox('ScriptLearn doit être installé en Administrateur : l''installation écrit dans Program Files.' + #13#10 +
           'Clic droit → "Exécuter en tant qu''administrateur".',
           mbError, MB_OK);
    Result := False;
  end;
end;

// ── Sauter TOUTES les pages : seul l'écran de progression est visible ─────────
function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := True; // Sauter toutes les pages par défaut
  // Garder wpPreparing et wpInstalling pour la barre de progression
  if (PageID = wpPreparing)  then Result := False;
  if (PageID = wpInstalling) then Result := False;
end;
