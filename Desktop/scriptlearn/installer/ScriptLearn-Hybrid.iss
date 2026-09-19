; ScriptLearn-Hybrid.iss — Version silencieuse
; Seule interaction : choix du modèle Ollama.
; Ollama + modèle téléchargés pendant l'installation ; tous les interpréteurs et
; compilateurs (Node, Python, PHP, MinGW, JDK, Go, Rust, Git/Bash) sont EMBARQUÉS
; dans dist\win-unpacked\resources (~2,6 Go) : aucun téléchargement pour eux.
;
; POURQUOI plus aucune trace de WSL : depuis la v0.18.0 les toolchains sont
; embarquées et l'application n'appelle plus WSL (cf. src/main/terminal.js).
; L'installateur activait pourtant encore WSL2 + Ubuntu — plusieurs minutes, un
; redémarrage de Windows imposé et un risque d'échec, pour une fonctionnalité que
; le logiciel n'utilise plus.
;
; Prérequis :
;   1. npm run package  (produit dist\win-unpacked\)
;   2. Inno Setup 6+    (https://jrsoftware.org/isdl.php)
;   3. Compiler ce script.

#define AppName    "ScriptLearn"
#ifndef AppVersion
  #define AppVersion "0.3.0"
#endif
#define AppExeName "ScriptLearn.exe"
#define AppSrcDir  "..\dist\win-unpacked"

[Setup]
AppId={{A3F7C8D2-1B4E-4F9A-8C3D-2E5F6A7B8C9D}
AppName={#AppName}
AppVersion={#AppVersion}
AppPublisher=ScriptLearn
DefaultDirName={autopf}\{#AppName}
DefaultGroupName={#AppName}
OutputDir=output
OutputBaseFilename=ScriptLearn-Setup-Hybrid
; SetupIconFile=..\src\renderer\src\assets\icon.ico
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=admin
MinVersion=10.0.18362
ArchitecturesInstallIn64BitMode=x64compatible

; ── Désactiver toutes les pages inutiles ──────────────────────────────────────
DisableWelcomePage=yes
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=yes
DisableFinishedPage=yes

[Languages]
Name: "french"; MessagesFile: "compiler:Languages\French.isl"

[Tasks]
Name: "desktopicon"; Description: "Icône sur le Bureau"
Name: "startmenuicon"; Description: "Raccourci Menu Démarrer"

[Files]
Source: "{#AppSrcDir}\*";              DestDir: "{app}";    Flags: ignoreversion recursesubdirs createallsubdirs
Source: "scripts\install-ollama-online.ps1"; DestDir: "{tmp}"; Flags: deleteafterinstall

[Icons]
Name: "{autodesktop}\{#AppName}";        Filename: "{app}\{#AppExeName}"; Tasks: desktopicon
Name: "{group}\{#AppName}";              Filename: "{app}\{#AppExeName}"; Tasks: startmenuicon
Name: "{group}\Désinstaller {#AppName}"; Filename: "{uninstallexe}"

[UninstallRun]
; Nettoyage HÉRITÉ : cette clé RunOnce était créée par les installateurs
; antérieurs à la v0.18.0 pour finir l'import WSL après redémarrage. On continue
; de la supprimer, sinon une machine mise à jour depuis une de ces versions
; garderait une tâche au démarrage pointant sur un script disparu.
Filename: "powershell.exe"; \
  Parameters: "-NoProfile -NonInteractive -ExecutionPolicy Bypass -Command ""Remove-ItemProperty -Path 'HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\RunOnce' -Name 'ScriptLearn-WSL-Import' -ErrorAction SilentlyContinue"""; \
  Flags: runhidden

[UninstallDelete]
; Données utilisateur : profils, progression, paramètres (electron-store)
Type: filesandordirs; Name: "{userappdata}\ScriptLearn"
; Dossier temporaire des anciennes installations (tar Ubuntu de l'ère WSL)
Type: filesandordirs; Name: "{localappdata}\ScriptLearn"
; Fichiers de log et flags laissés par l'installation
Type: files; Name: "{%TEMP}\ScriptLearn-install.log"
Type: files; Name: "{%TEMP}\sl-wsl-restart.flag"

[Run]
; Ollama + modèle choisi
Filename: "powershell.exe"; \
  Parameters: "-ExecutionPolicy Bypass -NonInteractive -File ""{tmp}\install-ollama-online.ps1"" -Model ""{code:GetSelectedModel}"""; \
  Flags: runhidden waituntilterminated; \
  StatusMsg: "Téléchargement et installation du modèle IA (peut prendre plusieurs minutes)..."

; Lancer l'application automatiquement
Filename: "{app}\{#AppExeName}"; Flags: nowait skipifsilent

[Code]
var
  ModelPage: TInputOptionWizardPage;

// ── Vérification des prérequis AVANT l'affichage du wizard ───────────────────
// MinVersion=10.0.18362 dans [Setup] bloque déjà les Windows trop anciens.
// Les droits admin restent nécessaires — non plus pour WSL, mais parce que
// l'installation écrit dans {autopf} (Program Files) et installe Ollama pour
// toute la machine.
function InitializeSetup(): Boolean;
begin
  Result := True;
  if not IsAdminInstallMode then begin
    MsgBox('ScriptLearn doit être installé en tant qu''Administrateur : l''installation écrit dans Program Files.' + #13#10 +
           'Relancez l''installeur avec un clic droit → "Exécuter en tant qu''administrateur".',
           mbError, MB_OK);
    Result := False;
  end;
end;

// ── Créer la page de sélection du modèle ─────────────────────────────────────
procedure InitializeWizard;
begin
  ModelPage := CreateInputOptionPage(
    wpWelcome,
    'Modèle IA pour ScriptLearn',
    'Sélectionnez le modèle Ollama à installer',
    'Le modèle sera téléchargé pendant l''installation et utilisé localement pour analyser votre code.' + #13#10 +
    'Choisissez selon la RAM disponible sur cette machine :',
    True,   // exclusif (bouton radio)
    False   // pas de scroll
  );
  ModelPage.Add('llama3.2:3b   (~2 Go téléchargement — recommandé, 8 Go RAM)');
  ModelPage.Add('llama3.2:1b   (~1 Go téléchargement — machines avec peu de RAM)');
  ModelPage.Add('mistral:7b    (~4 Go téléchargement — plus performant, 16 Go RAM)');
  ModelPage.Add('qwen2.5:3b    (~2 Go téléchargement — alternative légère)');
  ModelPage.SelectedValueIndex := 0;
end;

// ── Renommer le bouton "Suivant" en "Installer" sur la page modèle ────────────
procedure CurPageChanged(CurPageID: Integer);
begin
  if CurPageID = ModelPage.ID then
    WizardForm.NextButton.Caption := 'Installer →';
end;

// ── Retourner le modèle sélectionné ──────────────────────────────────────────
function GetSelectedModel(Param: String): String;
begin
  case ModelPage.SelectedValueIndex of
    0: Result := 'llama3.2:3b';
    1: Result := 'llama3.2:1b';
    2: Result := 'mistral:7b';
    3: Result := 'qwen2.5:3b';
  else
    Result := 'llama3.2:3b';
  end;
end;

// ── Sauter toutes les pages standards sauf la page modèle ────────────────────
function ShouldSkipPage(PageID: Integer): Boolean;
begin
  Result := False;
  // Garder uniquement : ModelPage, wpPreparing, wpInstalling
  // Sauter : wpWelcome, wpSelectDir, wpSelectComponents,
  //          wpSelectProgramGroup, wpSelectTasks, wpReady, wpFinished
  if (PageID = wpWelcome)             then Result := True;
  if (PageID = wpSelectDir)           then Result := True;
  if (PageID = wpSelectComponents)    then Result := True;
  if (PageID = wpSelectProgramGroup)  then Result := True;
  if (PageID = wpSelectTasks)         then Result := True;
  if (PageID = wpReady)               then Result := True;
  if (PageID = wpFinished)            then Result := True;
end;
