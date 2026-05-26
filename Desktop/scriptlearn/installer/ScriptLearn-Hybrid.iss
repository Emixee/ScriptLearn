; ScriptLearn-Hybrid.iss — Version silencieuse
; Seule interaction : choix du modèle Ollama.
; WSL + Ollama + modèle téléchargés pendant l'installation.
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
Source: "scripts\install-wsl.ps1";    DestDir: "{tmp}";    Flags: deleteafterinstall
Source: "scripts\install-ollama-online.ps1"; DestDir: "{tmp}"; Flags: deleteafterinstall

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
; Fichier tar Ubuntu et dossier temporaire (installeur offline uniquement)
Type: filesandordirs; Name: "{localappdata}\ScriptLearn"
; Fichiers de log et flags laissés par l'installation
Type: files; Name: "{%TEMP}\ScriptLearn-install.log"
Type: files; Name: "{%TEMP}\sl-wsl-restart.flag"

[Run]
; WSL2 + Ubuntu 22.04
Filename: "powershell.exe"; \
  Parameters: "-ExecutionPolicy Bypass -NonInteractive -File ""{tmp}\install-wsl.ps1"""; \
  Flags: runhidden waituntilterminated; \
  StatusMsg: "Installation de WSL2 + Ubuntu 22.04..."

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
// On vérifie uniquement les droits admin ici.
function InitializeSetup(): Boolean;
begin
  Result := True;
  if not IsAdminInstallMode then begin
    MsgBox('ScriptLearn doit être installé en tant qu''Administrateur pour activer WSL2.' + #13#10 +
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

// ── Popup redémarrage WSL — s'exécute après les entrées [Run] ────────────────
// ssDone est appelé après que toutes les entrées [Run] ont terminé.
// install-wsl.ps1 crée %TEMP%\sl-wsl-restart.flag si un redémarrage est requis.
procedure CurStepChanged(CurStep: TSetupStep);
var
  ResultCode: Integer;
  FlagFile: String;
begin
  if CurStep = ssDone then begin
    FlagFile := GetEnv('TEMP') + '\sl-wsl-restart.flag';
    if FileExists(FlagFile) then begin
      DeleteFile(FlagFile);
      if MsgBox(
        'WSL2 a été activé, mais un redémarrage de Windows est nécessaire' + #13#10 +
        'pour finaliser l''installation d''Ubuntu 22.04.' + #13#10 + #13#10 +
        'Le terminal Bash ne sera pas disponible dans ScriptLearn' + #13#10 +
        'tant que le redémarrage n''aura pas été effectué.' + #13#10 + #13#10 +
        'Voulez-vous redémarrer maintenant ?',
        mbConfirmation,
        MB_YESNO
      ) = IDYES then
        ShellExec('', ExpandConstant('{sys}') + '\shutdown.exe', '/r /t 5', '', SW_HIDE, ewNoWait, ResultCode);
    end;
  end;
end;
