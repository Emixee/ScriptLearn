# ==============================================================================
# ScriptLearn — Configuration de l'assistant IA (Ollama)
# Ce script est exécuté automatiquement par l'installateur NSIS juste après
# l'installation de ScriptLearn, AVANT le premier lancement de l'application.
#
# Il réalise dans l'ordre :
#   1. Afficher une fenêtre de sélection du modèle IA
#   2. Télécharger et installer Ollama si nécessaire
#   3. Télécharger (pull) le modèle choisi
#   4. Sauvegarder le choix dans %APPDATA%\ScriptLearn\installer-ai-config.json
#      → ScriptLearn lit ce fichier au premier démarrage pour se configurer
# ==============================================================================

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# ------------------------------------------------------------------------------
# FENÊTRE DE SÉLECTION DU MODÈLE
# Utilise Windows Forms pour une UI native Windows sans dépendances supplémentaires.
# La fenêtre est modale (ShowDialog) — l'installateur attend sa fermeture.
# ------------------------------------------------------------------------------
function Show-ModelSelector {
    $form = New-Object System.Windows.Forms.Form
    $form.Text       = 'ScriptLearn — Configuration de l''assistant IA'
    $form.ClientSize = New-Object System.Drawing.Size(500, 355)
    $form.StartPosition    = 'CenterScreen'
    $form.FormBorderStyle  = 'FixedDialog'
    $form.MaximizeBox      = $false
    $form.MinimizeBox      = $false
    $form.BackColor        = [System.Drawing.Color]::FromArgb(15, 17, 23)

    # Icône "S" violet — identité visuelle ScriptLearn
    $ico = New-Object System.Windows.Forms.Label
    $ico.Text      = 'S'
    $ico.Font      = New-Object System.Drawing.Font('Segoe UI', 18, [System.Drawing.FontStyle]::Bold)
    $ico.ForeColor = [System.Drawing.Color]::White
    $ico.BackColor = [System.Drawing.Color]::FromArgb(99, 102, 241)
    $ico.Location  = New-Object System.Drawing.Point(20, 20)
    $ico.Size      = New-Object System.Drawing.Size(44, 44)
    $ico.TextAlign = 'MiddleCenter'
    $form.Controls.Add($ico)

    $title = New-Object System.Windows.Forms.Label
    $title.Text      = 'Assistant IA (Ollama)'
    $title.Font      = New-Object System.Drawing.Font('Segoe UI', 13, [System.Drawing.FontStyle]::Bold)
    $title.ForeColor = [System.Drawing.Color]::White
    $title.Location  = New-Object System.Drawing.Point(76, 20)
    $title.Size      = New-Object System.Drawing.Size(400, 26)
    $form.Controls.Add($title)

    $desc = New-Object System.Windows.Forms.Label
    $desc.Text      = "ScriptLearn peut utiliser Ollama pour fournir des feedbacks IA personnalises pendant les exercices. Choisissez le modele a telecharger."
    $desc.Font      = New-Object System.Drawing.Font('Segoe UI', 9)
    $desc.ForeColor = [System.Drawing.Color]::FromArgb(148, 163, 184)
    $desc.Location  = New-Object System.Drawing.Point(20, 74)
    $desc.Size      = New-Object System.Drawing.Size(460, 40)
    $form.Controls.Add($desc)

    # Modèles disponibles avec leur taille de téléchargement
    $models = @(
        [PSCustomObject]@{ Name='mistral:7b'; Label='mistral:7b   —  Recommande, excellent francais (4.1 Go)' },
        [PSCustomObject]@{ Name='llama3.2';   Label='llama3.2    —  Leger et rapide (2.0 Go)' },
        [PSCustomObject]@{ Name='gemma2:2b';  Label='gemma2:2b   —  Ultra leger (1.6 Go)' },
        [PSCustomObject]@{ Name='phi3.5';     Label='phi3.5      —  Compact et polyvalent (2.2 Go)' },
        [PSCustomObject]@{ Name='none';       Label='Ne pas installer maintenant (configurer plus tard dans Parametres)' }
    )

    # IMPORTANT : tous les RadioButton DOIVENT partager le meme conteneur parent
    # pour que Windows Forms gere automatiquement la deselection mutuelle.
    # Chaque RadioButton dans son propre Panel = parents differents = pas de groupe
    # = impossible de decocher mistral:7b en cliquant sur un autre modele.
    # Solution : un seul GroupBox comme parent commun de tous les boutons radio.
    $grp = New-Object System.Windows.Forms.GroupBox
    $grp.Text      = 'Modele a telecharger'
    $grp.Font      = New-Object System.Drawing.Font('Segoe UI', 9)
    $grp.ForeColor = [System.Drawing.Color]::FromArgb(148, 163, 184)
    $grp.BackColor = [System.Drawing.Color]::FromArgb(26, 29, 46)
    $grp.Location  = New-Object System.Drawing.Point(20, 120)
    $grp.Size      = New-Object System.Drawing.Size(460, 175)
    $form.Controls.Add($grp)

    $radios = @()
    for ($i = 0; $i -lt $models.Count; $i++) {
        $r = New-Object System.Windows.Forms.RadioButton
        $r.Text      = $models[$i].Label
        $r.Font      = New-Object System.Drawing.Font('Segoe UI', 9)
        $r.ForeColor = [System.Drawing.Color]::White
        $r.BackColor = [System.Drawing.Color]::Transparent
        $r.Location  = New-Object System.Drawing.Point(12, (18 + $i * 30))
        $r.Size      = New-Object System.Drawing.Size(435, 24)
        # mistral:7b est le defaut suggere, mais l utilisateur peut changer
        $r.Checked   = ($i -eq 0)
        # Ajouter au GroupBox (pas au form) — c'est ce qui cree le groupe radio
        $grp.Controls.Add($r)
        $radios += $r
    }

    # Bouton Confirmer
    $btnOk = New-Object System.Windows.Forms.Button
    $btnOk.Text         = 'Confirmer'
    $btnOk.Font         = New-Object System.Drawing.Font('Segoe UI', 9, [System.Drawing.FontStyle]::Bold)
    $btnOk.BackColor    = [System.Drawing.Color]::FromArgb(99, 102, 241)
    $btnOk.ForeColor    = [System.Drawing.Color]::White
    $btnOk.FlatStyle    = 'Flat'
    $btnOk.Location     = New-Object System.Drawing.Point(350, 307)
    $btnOk.Size         = New-Object System.Drawing.Size(130, 32)
    $btnOk.DialogResult = [System.Windows.Forms.DialogResult]::OK
    $form.Controls.Add($btnOk)
    $form.AcceptButton  = $btnOk

    if ($form.ShowDialog() -ne [System.Windows.Forms.DialogResult]::OK) {
        return 'none'
    }

    # Lire la valeur reellement selectionnee au moment du clic "Confirmer"
    # (pas la valeur initiale — l utilisateur a pu changer son choix)
    for ($i = 0; $i -lt $radios.Count; $i++) {
        if ($radios[$i].Checked) { return $models[$i].Name }
    }
    return 'none'
}

# ------------------------------------------------------------------------------
# SÉLECTION DU MODÈLE
# ------------------------------------------------------------------------------
$selectedModel = Show-ModelSelector

# L'utilisateur a choisi de ne pas installer → sortir proprement
if ($selectedModel -eq 'none') {
    exit 0
}

# ------------------------------------------------------------------------------
# SAUVEGARDE DU CHOIX
# ScriptLearn lit ce fichier JSON au premier démarrage (via store.js load())
# et configure automatiquement aiModel et aiEnabled si l'utilisateur n'a pas
# encore personnalisé les paramètres.
# Chemin : %APPDATA%\ScriptLearn\installer-ai-config.json
# ------------------------------------------------------------------------------
$configDir  = Join-Path $env:APPDATA 'ScriptLearn'
$configFile = Join-Path $configDir 'installer-ai-config.json'

if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

# On écrit le JSON manuellement pour éviter toute dépendance externe
$jsonContent = "{`"model`":`"$selectedModel`",`"enabled`":true,`"installedAt`":`"$(Get-Date -Format 'yyyy-MM-ddTHH:mm:ssZ')`"}"
[System.IO.File]::WriteAllText($configFile, $jsonContent, [System.Text.Encoding]::UTF8)

# ------------------------------------------------------------------------------
# INSTALLATION OLLAMA
# On vérifie d'abord si Ollama est déjà installé pour ne pas le réinstaller.
# Emplacement standard d'Ollama sur Windows (installation utilisateur).
# ------------------------------------------------------------------------------
$ollamaUserExe   = Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'
$ollamaSystemExe = Join-Path $env:ProgramFiles 'Ollama\ollama.exe'
$ollamaExe       = if (Test-Path $ollamaUserExe) { $ollamaUserExe }
                   elseif (Test-Path $ollamaSystemExe) { $ollamaSystemExe }
                   else { $null }

if (-not $ollamaExe) {
    # Ollama n'est pas installé — demander confirmation avant de télécharger
    $confirm = [System.Windows.Forms.MessageBox]::Show(
        "Ollama va etre telecharge et installe (environ 100 Mo).`n`nConnexion internet requise.`nCela peut prendre quelques minutes.",
        'Installation Ollama',
        [System.Windows.Forms.MessageBoxButtons]::OKCancel,
        [System.Windows.Forms.MessageBoxIcon]::Information
    )

    if ($confirm -ne [System.Windows.Forms.DialogResult]::OK) {
        # L'utilisateur annule — la config est déjà sauvegardée, il pourra
        # installer Ollama manuellement plus tard depuis les Paramètres.
        exit 0
    }

    $tmpInstaller = Join-Path $env:TEMP 'OllamaSetup.exe'
    try {
        # Téléchargement de l'installateur officiel Ollama
        $wc = New-Object System.Net.WebClient
        $wc.DownloadFile('https://ollama.com/download/OllamaSetup.exe', $tmpInstaller)

        # Installation silencieuse (/S = NSIS silent mode)
        $proc = Start-Process -FilePath $tmpInstaller -ArgumentList '/S' -Wait -PassThru
        Remove-Item $tmpInstaller -Force -ErrorAction SilentlyContinue

        if ($proc.ExitCode -ne 0) {
            [System.Windows.Forms.MessageBox]::Show(
                "L'installation d'Ollama a echoue (code $($proc.ExitCode)).`nConfigurez Ollama manuellement dans les Parametres de ScriptLearn.",
                'Erreur',
                [System.Windows.Forms.MessageBoxButtons]::OK,
                [System.Windows.Forms.MessageBoxIcon]::Warning
            ) | Out-Null
            exit 0
        }

        # Attendre que le service Ollama soit prêt après installation
        Start-Sleep -Seconds 4

        # Rechercher ollama.exe à nouveau après installation
        $ollamaExe = if (Test-Path $ollamaUserExe) { $ollamaUserExe }
                     elseif (Test-Path $ollamaSystemExe) { $ollamaSystemExe }
                     else { $null }

    } catch {
        [System.Windows.Forms.MessageBox]::Show(
            "Impossible de telecharger Ollama : $($_.Exception.Message)`n`nConfigurez Ollama manuellement dans les Parametres de ScriptLearn.",
            'Erreur reseau',
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        ) | Out-Null
        exit 0
    }
}

# Si Ollama toujours introuvable après tentative d'install, on arrête
if (-not $ollamaExe) {
    exit 0
}

# ------------------------------------------------------------------------------
# TÉLÉCHARGEMENT DU MODÈLE (ollama pull)
# On lance ollama.exe pull <modèle> et on attend la fin.
# Le modèle peut peser entre 1.6 Go et 4.1 Go — prévenir l'utilisateur.
# ------------------------------------------------------------------------------
$confirm2 = [System.Windows.Forms.MessageBox]::Show(
    "Le modele '$selectedModel' va maintenant etre telecharge.`n`nCela peut prendre plusieurs minutes selon votre connexion internet.`nNe pas fermer cette fenetre.",
    "Telechargement du modele $selectedModel",
    [System.Windows.Forms.MessageBoxButtons]::OKCancel,
    [System.Windows.Forms.MessageBoxIcon]::Information
)

if ($confirm2 -ne [System.Windows.Forms.DialogResult]::OK) {
    exit 0
}

# Lancer ollama pull en attendant la fin du processus
# La sortie s'affiche dans la fenêtre console (si visible)
$pullProc = Start-Process -FilePath $ollamaExe `
    -ArgumentList "pull $selectedModel" `
    -Wait -PassThru -NoNewWindow

if ($pullProc.ExitCode -eq 0) {
    # Succès — confirmer à l'utilisateur
    [System.Windows.Forms.MessageBox]::Show(
        "Le modele '$selectedModel' a ete telecharge avec succes !`n`nScriptLearn est pret a utiliser l'assistant IA.",
        'Configuration terminee',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
    ) | Out-Null
} else {
    # Échec du pull — l'utilisateur pourra réessayer dans les Paramètres
    [System.Windows.Forms.MessageBox]::Show(
        "Le telechargement du modele a echoue.`n`nVous pourrez relancer le telechargement depuis Parametres > Intelligence artificielle dans ScriptLearn.",
        'Avertissement',
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Warning
    ) | Out-Null
}

exit 0
