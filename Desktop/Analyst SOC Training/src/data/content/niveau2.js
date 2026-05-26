const niveau2 = {
  id: 2,
  name: 'Analyste SOC Junior',
  badge: '🔍',
  duration: 100,
  certifications: ['CompTIA Security+', 'CompTIA CySA+'],
  description: 'SIEM, Splunk, Elastic Stack, analyse de logs, MITRE ATT&CK, Threat Intelligence. Niveau BAC+3.',
  modules: [
    {
      id: 'n2-m1',
      title: 'Le SOC et le SIEM',
      lessons: [
        {
          id: 'n2-m1-l1',
          title: 'Le SOC — Organisation, Niveaux et Processus',
          description: 'Comprendre l\'organisation d\'un SOC, les niveaux Tier 1/2/3, les workflows d\'investigation et les KPIs.',
          duration: 45,
          xpReward: 120,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Comprendre la structure et les rôles d\'un SOC',
            'Distinguer les niveaux Tier 1, 2 et 3',
            'Maîtriser le cycle de vie d\'une alerte',
            'Connaître les KPIs d\'un SOC',
          ],
          theory: `# Le Security Operations Center (SOC)

## Qu\'est-ce qu\'un SOC ?

Un SOC est une équipe centralisée qui **surveille, détecte, analyse et répond** aux incidents de cybersécurité en continu (24/7/365 pour les grandes organisations).

## Organisation par niveaux (Tiers)

### Tier 1 — Analyste de première ligne
**Vous démarrez ici.** Responsable de :
- Surveiller les alertes du SIEM
- Trier les alertes (triage)
- Qualifier les faux positifs / vrais positifs
- Escalader vers Tier 2 si nécessaire

**Compétences** : Connaissances réseau de base, utilisation du SIEM, playbooks

### Tier 2 — Analyste incident
**Cible pour la suite de votre formation :**
- Analyser les incidents escaladés par Tier 1
- Investigation approfondie (forensics)
- Corrélation d\'événements
- Rédiger les rapports d\'incident

**Compétences** : Forensics, malware analysis, threat intelligence

### Tier 3 — Expert / Threat Hunter
**Niveau expert :**
- Threat Hunting proactif
- Développement de nouvelles règles de détection
- Tests de pénétration internes
- Architecture de sécurité

**Compétences** : Reverse engineering, pentest, OSINT, threat intelligence avancée

---

## Le Cycle de Vie d\'une Alerte SOC

\`\`\`
1. GÉNÉRATION        → Le SIEM génère une alerte
          ↓
2. RÉCEPTION         → Tier 1 reçoit l\'alerte dans la file
          ↓
3. TRIAGE            → Est-ce un faux positif ou un vrai incident ?
          ↓
4. INVESTIGATION     → Collecte de contexte (IP, hash, user)
          ↓
5. QUALIFICATION     → Vrai positif confirmé ?
          ↓
    OUI ───────────→ 6. ESCALADE vers Tier 2
    NON ───────────→ FERMETURE (faux positif documenté)
          ↓
7. RÉPONSE           → Confinement, éradication
          ↓
8. CLÔTURE           → Rapport, leçons apprises
\`\`\`

---

## KPIs d\'un SOC

| KPI | Signification | Objectif |
|-----|--------------|---------|
| **MTTD** | Mean Time to Detect | < 24h (idéal < 1h) |
| **MTTR** | Mean Time to Respond | < 4h |
| **Alert Volume** | Volume d\'alertes | Gérable pour l\'équipe |
| **False Positive Rate** | Taux de faux positifs | < 50% |
| **Escalation Rate** | Taux d\'escalade Tier1→2 | 10-20% |

---

## Types d\'incidents SOC courants

| Catégorie | Exemples |
|-----------|---------|
| Malware | Ransomware, trojan, keylogger |
| Intrusion | Brute force, exploitation de vulnérabilité |
| Phishing | Email malveillant, spear phishing |
| Data breach | Exfiltration de données |
| DDoS | Saturation de services |
| Insider threat | Employé malveillant ou négligent |
| APT | Attaque persistante avancée |

---

## Les Outils du SOC

\`\`\`
SIEM (Splunk, Elastic)     → Corrélation et alerting
SOAR (Shuffle, XSOAR)     → Automatisation des réponses
EDR (CrowdStrike, Defender) → Détection endpoint
NDR (Darktrace, Vectra)   → Détection réseau
TIP (MISP, OpenCTI)       → Threat Intelligence
Ticketing (ServiceNow, Jira) → Gestion des incidents
\`\`\``,
          quiz: [
            {
              id: 'n2-m1-l1-q1',
              xpReward: 60,
              question: 'Quel est le rôle principal d\'un analyste SOC Tier 1 ?',
              options: [
                'Effectuer des tests de pénétration',
                'Surveiller les alertes, effectuer le triage et escalader',
                'Développer de nouvelles règles de détection',
                'Gérer l\'infrastructure réseau',
              ],
              correct: 1,
              explanation: 'Le **Tier 1** est la première ligne de défense. Il surveille les alertes du SIEM, effectue le triage (vraie alarme ou faux positif ?) et escalade les incidents confirmés au Tier 2 pour une investigation approfondie.',
            },
            {
              id: 'n2-m1-l1-q2',
              xpReward: 60,
              question: 'Que signifie MTTD dans le contexte d\'un SOC ?',
              options: [
                'Maximum Time To Deploy',
                'Mean Time To Detect',
                'Minimal Threat To Determine',
                'Managed Threat Detection Tool',
              ],
              correct: 1,
              explanation: '**MTTD (Mean Time To Detect)** est le temps moyen entre le début d\'un incident et sa détection par le SOC. C\'est un KPI clé — plus il est court, mieux c\'est. Un MTTD inférieur à 24h est un objectif courant.',
            },
          ],
        },
        {
          id: 'n2-m1-l2',
          title: 'SIEM — Architecture et Fonctionnement',
          description: 'Comprendre comment fonctionne un SIEM : collecte, normalisation, corrélation et alerting.',
          duration: 55,
          xpReward: 140,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Comprendre l\'architecture d\'un SIEM',
            'Maîtriser les concepts de collecte et normalisation',
            'Comprendre la corrélation d\'événements',
            'Savoir créer des règles de détection de base',
          ],
          theory: `# SIEM — Security Information and Event Management

## Qu\'est-ce qu\'un SIEM ?

Un SIEM collecte, normalise, corrèle et analyse des logs provenant de sources multiples pour détecter des incidents de sécurité.

## Architecture d\'un SIEM

\`\`\`
Sources de logs :
├── Firewalls (Palo Alto, Fortinet)
├── IDS/IPS (Snort, Suricata)
├── Endpoints (Windows Event Logs, Sysmon)
├── Serveurs (Apache, Nginx, SSH)
├── Active Directory (Domain Controller)
├── Bases de données (MySQL, Oracle)
└── Applications métier

           ↓ [Agents / Syslog / API]

[COLLECTE] → [NORMALISATION] → [STOCKAGE] → [CORRÉLATION] → [ALERTING]
                                                                    ↓
                                                             [Analyste SOC]
\`\`\`

## Normalisation et Parsing

Les logs arrivent dans des formats différents. Le SIEM les normalise en un format commun.

\`\`\`
Log Apache brut :
192.168.1.50 - - [25/May/2026:08:14:32 +0000] "GET /admin HTTP/1.1" 403 512

Log Windows EventID 4625 :
<EventData>
  <Data Name="TargetUserName">Administrator</Data>
  <Data Name="IpAddress">185.220.101.45</Data>
</EventData>

Format normalisé (Common Event Format) :
src_ip=192.168.1.50 event_type=web_access url=/admin status=403
src_ip=185.220.101.45 event_type=auth_failure user=Administrator
\`\`\`

## Corrélation d\'événements

La corrélation est le cœur du SIEM. Elle détecte des patterns sur plusieurs événements.

### Exemple de règle de corrélation (brute force)

\`\`\`
RULE "Brute Force SSH Detected"
WHEN:
  event_type = "auth_failure"
  AND protocol = "SSH"
  AND src_ip = SAME_IP
WITHIN: 5 minutes
COUNT: >= 10
THRESHOLD: 10 tentatives en 5 minutes
ACTION: ALERT "Brute Force SSH depuis {src_ip}"
\`\`\`

### Exemple de règle (impossible travel)

\`\`\`
RULE "Impossible Travel"
WHEN:
  user logged in from Country_A
  AND user logged in from Country_B (different)
  WITHIN: 30 minutes
  AND distance(Country_A, Country_B) > 1000km
ACTION: ALERT "Connexion géographiquement impossible pour {user}"
\`\`\`

## SIEM Populaires

| SIEM | Éditeur | Particularité |
|------|---------|--------------|
| **Splunk** | Splunk | Le plus utilisé, SPL puissant |
| **Elastic SIEM** | Elastic | Open source, EQL |
| **Microsoft Sentinel** | Microsoft | Cloud Azure, KQL |
| **IBM QRadar** | IBM | Très présent en grandes entreprises |
| **LogRhythm** | LogRhythm | UEBA intégré |
| **Wazuh** | Wazuh (OSS) | Open source, excellent rapport qualité/prix |`,
          quiz: [
            {
              id: 'n2-m1-l2-q1',
              xpReward: 60,
              question: 'Quelle est la fonction principale de la corrélation dans un SIEM ?',
              options: [
                'Compresser les logs pour économiser de l\'espace',
                'Détecter des patterns d\'attaque sur plusieurs événements en liant des logs de sources différentes',
                'Chiffrer les logs pour leur intégrité',
                'Accélérer la recherche dans les logs historiques',
              ],
              correct: 1,
              explanation: 'La **corrélation** est la capacité du SIEM à **relier des événements de sources différentes** pour détecter des patterns d\'attaque. Une seule connexion SSH échouée n\'est pas alarmante — 100 en 5 minutes de la même IP, c\'est du brute force.',
            },
          ],
        },
      ],
    },
    {
      id: 'n2-m2',
      title: 'Splunk — Analyse de logs',
      lessons: [
        {
          id: 'n2-m2-l1',
          title: 'Splunk — Fondamentaux et SPL',
          description: 'Maîtriser Splunk et le Search Processing Language (SPL) pour analyser des logs et détecter des menaces.',
          duration: 75,
          xpReward: 180,
          hasQuiz: true,
          hasLab: true,
          objectives: [
            'Comprendre l\'architecture Splunk',
            'Maîtriser les commandes SPL de base (search, stats, table, where)',
            'Créer des requêtes d\'investigation SOC',
            'Construire des dashboards de sécurité',
          ],
          theory: `# Splunk et SPL pour le SOC

## Architecture Splunk

\`\`\`
[Sources] → [Forwarders (UF)] → [Indexers] → [Search Heads]
                                     ↓
                                  [Index]
                                     ↑
                              Analyste SOC (UI/SPL)
\`\`\`

- **Universal Forwarder** : Agent léger installé sur les sources
- **Indexer** : Stocke et indexe les données
- **Search Head** : Interface de recherche pour les analystes

---

## SPL — Search Processing Language

### Structure d\'une requête SPL

\`\`\`spl
index=* sourcetype=syslog
| search "Failed password"
| where src_ip="185.220.101.45"
| stats count by src_ip, user
| sort -count
| head 10
\`\`\`

### Commandes SPL essentielles

#### Recherche de base
\`\`\`spl
index=security sourcetype="WinEventLog:Security" EventCode=4625
\`\`\`

#### Filtrer avec where
\`\`\`spl
index=web source="access.log"
| where status=403 OR status=401
| table _time, src_ip, uri_path, status
\`\`\`

#### Statistiques avec stats
\`\`\`spl
index=security EventCode=4625
| stats count by src_ip, user
| sort -count
| head 20
\`\`\`

#### Détecter le brute force
\`\`\`spl
index=security EventCode=4625 earliest=-1h
| stats count as failed_attempts by src_ip, user
| where failed_attempts > 10
| sort -failed_attempts
\`\`\`

#### Analyse des connexions réussies après échecs
\`\`\`spl
index=security EventCode=4625 OR EventCode=4624 earliest=-24h
| transaction src_ip maxspan=10m
| where eventcount > 5 AND EventCode=4624
| table src_ip, user, starttime, eventcount
\`\`\`

#### Top des URLs suspectes
\`\`\`spl
index=web sourcetype="access_combined"
| where status>=400
| top url by status
| table url, status, count
\`\`\`

#### Détection de scan de ports
\`\`\`spl
index=network sourcetype=firewall action=blocked
| stats dc(dest_port) as unique_ports by src_ip
| where unique_ports > 100
| sort -unique_ports
\`\`\`

#### Timeline d\'un incident
\`\`\`spl
index=* src_ip="185.220.101.45" earliest=-24h
| table _time, sourcetype, host, action, user, dest_ip, dest_port
| sort _time
\`\`\`

---

## Dashboards SOC dans Splunk

Un bon dashboard SOC contient :
1. **Alertes ouvertes** : Panneau des alertes actives
2. **Statistiques d\'authentification** : 4624/4625 par heure
3. **Top IPs suspectes** : Basé sur les règles de détection
4. **Volume de logs** : Par source
5. **Carte géographique** : Origines des connexions

---

## Cas d\'usage SOC avec Splunk

| Cas d\'usage | SPL clé |
|------------|--------|
| Brute force SSH | EventCode=4625 \\| stats count by src_ip |
| Connexion nocturne | EventCode=4624 \\| where hour(_time) < 6 |
| Exfiltration DNS | sourcetype=dns query_length>60 |
| Lateral movement | EventCode=4648 \\| stats dc(dest) by src_ip |
| Nouveau compte admin | EventCode=4728 Group="Domain Admins" |`,
          quiz: [
            {
              id: 'n2-m2-l1-q1',
              xpReward: 70,
              question: 'Quelle commande SPL utilisez-vous pour compter les événements par adresse IP source ?',
              options: [
                '| count src_ip',
                '| stats count by src_ip',
                '| group by src_ip count',
                '| sum(count) src_ip',
              ],
              correct: 1,
              explanation: 'En SPL Splunk, la commande **\`| stats count by src_ip\`** compte le nombre d\'événements pour chaque adresse IP source. C\'est l\'une des commandes les plus utilisées pour détecter des comportements répétitifs.',
            },
            {
              id: 'n2-m2-l1-q2',
              xpReward: 70,
              question: 'Quelle requête SPL détecte les brute force SSH (plus de 10 tentatives en 1 heure) ?',
              options: [
                'index=security EventCode=4625 earliest=-1h | stats count as attempts by src_ip | where attempts > 10',
                'index=security EventCode=4625 | count > 10',
                'search brute_force earliest=-1h',
                'index=security failed > 10',
              ],
              correct: 0,
              explanation: 'La requête correcte : 1) Filtre sur EventCode=4625 (échecs d\'authentification) dans la dernière heure, 2) Utilise \`stats count\` par IP source, 3) Filtre avec \`where\` les IP avec > 10 tentatives.',
            },
          ],
          lab: {
            id: 'lab-n2-m2-l1',
            title: 'Investigation Splunk — Analyse d\'un incident de sécurité',
            description: 'Utilisez les logs fournis pour simuler une investigation Splunk et identifier un incident de sécurité.',
            xpReward: 300,
            files: {
              'splunk_events.txt': `2026-05-25 10:00:01 EventCode=4624 user=alice src_ip=192.168.1.10 domain=CORP
2026-05-25 10:00:02 EventCode=4624 user=bob src_ip=192.168.1.20 domain=CORP
2026-05-25 10:05:00 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:01 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:02 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:03 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:04 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:05 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:06 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:07 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:08 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:09 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:10 EventCode=4624 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:15 EventCode=4688 user=admin process=cmd.exe parent=svchost.exe
2026-05-25 10:05:20 EventCode=4672 user=admin privileges=SeDebugPrivilege
2026-05-25 10:06:00 EventCode=4728 group=Domain Admins new_member=backdoor_user`,
            },
            commands: {
              'grep "EventCode=4625" splunk_events.txt': `2026-05-25 10:05:00 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:01 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:02 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:03 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:04 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:05 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:06 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:07 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:08 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP
2026-05-25 10:05:09 EventCode=4625 user=admin src_ip=45.33.32.156 domain=CORP`,
            },
            questions: [
              {
                id: 'lab-spl1',
                text: 'Combien de tentatives de connexion échouées (EventCode=4625) l\'IP 45.33.32.156 a-t-elle effectuées ?',
                answer: '10',
                placeholder: 'Nombre de tentatives',
              },
              {
                id: 'lab-spl2',
                text: 'Quel processus suspect a été lancé après la connexion réussie (EventCode=4688) ?',
                answer: 'cmd.exe',
                placeholder: 'Nom du processus',
              },
              {
                id: 'lab-spl3',
                text: 'Quel utilisateur malveillant a été créé/ajouté au groupe Domain Admins ?',
                answer: 'backdoor_user',
                placeholder: 'Nom du compte',
              },
            ],
            hints: [
              'Cherchez EventCode=4625 pour compter les échecs, puis 4624 pour voir si la connexion a réussi.',
              'EventCode=4688 indique la création d\'un processus — cmd.exe lancé par un attaquant est suspect.',
              'EventCode=4728 avec "Domain Admins" montre l\'escalade de privilèges.',
            ],
          },
        },
      ],
    },
    {
      id: 'n2-m3',
      title: 'MITRE ATT&CK et Threat Intelligence',
      lessons: [
        {
          id: 'n2-m3-l1',
          title: 'MITRE ATT&CK Framework',
          description: 'Comprendre et utiliser le framework MITRE ATT&CK pour catégoriser les techniques d\'attaque et améliorer la détection.',
          duration: 60,
          xpReward: 150,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Comprendre la structure du framework ATT&CK (tactiques, techniques, sous-techniques)',
            'Mapper des comportements d\'attaquants sur ATT&CK',
            'Utiliser ATT&CK pour améliorer les règles de détection',
            'Comprendre les matrices Enterprise, Mobile, ICS',
          ],
          theory: `# MITRE ATT&CK Framework

## Qu\'est-ce que MITRE ATT&CK ?

MITRE ATT&CK (Adversarial Tactics, Techniques and Common Knowledge) est une **base de connaissances** des comportements d\'attaquants réels, utilisée mondialement par les équipes de sécurité.

## Structure

\`\`\`
Tactique (POURQUOI ?)
└── Technique (COMMENT ?)
    └── Sous-technique (Plus précis)
\`\`\`

Exemple :
- **Tactique** : Credential Access (TA0006)
  - **Technique** : OS Credential Dumping (T1003)
    - **Sous-technique** : LSASS Memory (T1003.001)

---

## Les 14 Tactiques ATT&CK (Enterprise)

| # | Tactique | Description | Exemple |
|---|---------|-------------|---------|
| 1 | Reconnaissance (TA0043) | Collecte d\'info avant l\'attaque | Scan Shodan |
| 2 | Resource Development (TA0042) | Préparation infrastructure | Achat domaine |
| 3 | Initial Access (TA0001) | Accès initial au système | Phishing, exploit |
| 4 | Execution (TA0002) | Exécution de code | PowerShell, WMI |
| 5 | Persistence (TA0003) | Maintien de l\'accès | Registry Run keys |
| 6 | Privilege Escalation (TA0004) | Augmentation des privilèges | Token impersonation |
| 7 | Defense Evasion (TA0005) | Contournement des défenses | Obfuscation |
| 8 | Credential Access (TA0006) | Vol de credentials | Mimikatz |
| 9 | Discovery (TA0007) | Reconnaissance interne | net user, ipconfig |
| 10 | Lateral Movement (TA0008) | Déplacement latéral | PsExec, RDP |
| 11 | Collection (TA0009) | Collecte de données | Keylogging |
| 12 | Command & Control (TA0011) | Communication C2 | DNS tunneling |
| 13 | Exfiltration (TA0010) | Fuite de données | HTTPS vers serveur ext. |
| 14 | Impact (TA0040) | Impact final | Chiffrement (ransomware) |

---

## Techniques Importantes en SOC

### T1566 — Phishing (Initial Access)
\`\`\`
T1566.001 — Spearphishing Attachment (pièce jointe)
T1566.002 — Spearphishing Link (lien dans l\'email)
T1566.003 — Spearphishing via Service (Teams, WhatsApp)
\`\`\`
**Détection** : Analyse des emails entrants, sandbox des pièces jointes

### T1059 — Command and Scripting Interpreter (Execution)
\`\`\`
T1059.001 — PowerShell
T1059.003 — Windows Command Shell (cmd.exe)
T1059.004 — Unix Shell (bash)
T1059.007 — JavaScript
\`\`\`
**Détection** : EventID 4688, ligne de commande suspecte, base64 encodé

### T1078 — Valid Accounts (Defense Evasion/Persistence)
Utilisation de comptes légitimes volés.
**Détection** : Connexions depuis des IP inhabituelles, heures anormales

### T1021 — Remote Services (Lateral Movement)
\`\`\`
T1021.001 — RDP (Remote Desktop Protocol)
T1021.002 — SMB/Windows Admin Shares
T1021.004 — SSH
T1021.006 — Windows Remote Management (WinRM)
\`\`\`
**Détection** : EventID 4648 (connexion réseau avec credentials), connexions RDP anormales

---

## Utilisation Pratique en SOC

### Mapper un incident sur ATT&CK

Exemple de ransomware :
\`\`\`
1. Email phishing         → T1566.001 (Phishing Attachment)
2. Macro Office           → T1059.005 (Visual Basic)
3. Persistence registry   → T1547.001 (Registry Run Keys)
4. Dump LSASS            → T1003.001 (OS Credential Dumping)
5. Lateral move (RDP)    → T1021.001 (Remote Desktop)
6. Data encrypted         → T1486 (Data Encrypted for Impact)
\`\`\`

### ATT&CK Navigator
Outil gratuit (https://mitre-attack.github.io/attack-navigator/) pour visualiser la couverture de détection.

---

## Threat Groups sur ATT&CK

ATT&CK documente les groupes d\'attaquants connus :
- **APT28** (Fancy Bear) — Russie, gouvernements
- **APT29** (Cozy Bear) — Russie, renseignement
- **Lazarus Group** — Corée du Nord, financier
- **Equation Group** — NSA (présumé)
- **FIN7** — Cybercriminalité financière`,
          quiz: [
            {
              id: 'n2-m3-l1-q1',
              xpReward: 70,
              question: 'Dans MITRE ATT&CK, quelle est la différence entre une "tactique" et une "technique" ?',
              options: [
                'Ce sont des synonymes avec différents niveaux de détail',
                'La tactique représente le POURQUOI (objectif), la technique représente le COMMENT (méthode)',
                'La tactique concerne Windows, la technique concerne Linux',
                'La technique est plus ancienne que la tactique',
              ],
              correct: 1,
              explanation: 'Dans ATT&CK, la **tactique** représente l\'objectif de l\'attaquant (POURQUOI — ex: Credential Access), et la **technique** représente comment il atteint cet objectif (COMMENT — ex: T1003 OS Credential Dumping via Mimikatz).',
            },
            {
              id: 'n2-m3-l1-q2',
              xpReward: 70,
              question: 'Un attaquant utilise PowerShell encodé en base64 pour exécuter du code. Quelle technique ATT&CK correspond ?',
              options: [
                'T1003 — OS Credential Dumping',
                'T1059.001 — PowerShell',
                'T1021 — Remote Services',
                'T1566 — Phishing',
              ],
              correct: 1,
              explanation: '**T1059.001 (PowerShell)** correspond à l\'utilisation de PowerShell pour exécuter du code. L\'encodage base64 est une technique d\'obfuscation courante pour contourner les détections. C\'est une sous-technique de T1059 (Command and Scripting Interpreter).',
            },
          ],
        },
        {
          id: 'n2-m3-l2',
          title: 'Threat Intelligence — IoC et Sources',
          description: 'Comprendre et utiliser la Threat Intelligence pour améliorer la détection et la réponse aux incidents.',
          duration: 55,
          xpReward: 140,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Distinguer IoC, IoA et TTP',
            'Connaître les principales sources de Threat Intelligence',
            'Utiliser VirusTotal, AbuseIPDB et MISP',
            'Enrichir des alertes avec la Threat Intelligence',
          ],
          theory: `# Threat Intelligence pour le SOC

## Types d\'indicateurs

### IoC — Indicators of Compromise
Preuves qu\'une compromission a eu lieu.

\`\`\`
Exemples d\'IoC :
• Hashes de fichiers malveillants : SHA256 5e884898da280...
• Adresses IP de C2 : 185.220.101.45
• Domaines malveillants : malware-c2.evil.com
• URLs malveillantes : http://evil.com/payload.exe
• Adresses email d\'attaquant : hacker@protonmail.com
• Clés de registre : HKLM\Run\backdoor = cmd.exe
\`\`\`

### IoA — Indicators of Attack
Indicateurs d\'une attaque en cours (comportemental).

\`\`\`
Exemples d\'IoA :
• Scan de ports depuis un hôte interne
• Connexion SSH à 3h du matin
• Exécution de cmd.exe depuis Word
• Énumération d\'utilisateurs AD
• Tentatives d\'escalade de privilèges
\`\`\`

### TTP — Tactics, Techniques, Procedures
Comportements généraux d\'un groupe d\'attaquants (= ATT&CK).

---

## Sources de Threat Intelligence

### Sources gratuites

| Source | URL | Contenu |
|--------|-----|---------|
| **VirusTotal** | virustotal.com | Hashes, URLs, IPs |
| **AbuseIPDB** | abuseipdb.com | Réputation IP |
| **Shodan** | shodan.io | IoT exposé, services |
| **MalwareBazaar** | bazaar.abuse.ch | Samples malware |
| **URLVoid** | urlvoid.com | Réputation URLs |
| **OTX AlienVault** | otx.alienvault.com | IoC communautaires |
| **Feodo Tracker** | feodotracker.abuse.ch | Botnet C2 |
| **URLhaus** | urlhaus.abuse.ch | URLs malveillantes |

### Plateformes TI professionnelles

| Plateforme | Type |
|-----------|------|
| **MISP** | Open source, partage d\'IoC |
| **OpenCTI** | Open source, graphe de relations |
| **Recorded Future** | Commercial, enrichissement |
| **Mandiant Intelligence** | Commercial, rapports APT |
| **CrowdStrike Intel** | Commercial |

---

## Utilisation Pratique : Enrichir une Alerte

\`\`\`
Alerte reçue : Connexion depuis 185.220.101.45

Étapes d\'enrichissement :
1. AbuseIPDB → Score: 100% malicious, Tor exit node
2. VirusTotal → IP dans 24/85 blocklists
3. Shodan → Open ports: 22, 80, 443, 9001 (Tor)
4. OTX → Associé à plusieurs campagnes de brute force

Conclusion : IP Tor connue, utilisée pour brute force SSH.
Actions : Bloquer sur firewall, vérifier compromission.
\`\`\`

---

## Pyramide de la Douleur (Pyramid of Pain)

Créée par David Bianco, montre l\'impact du blocage d\'indicateurs sur l\'attaquant :

\`\`\`
              ▲
          [TTPs]        ← Plus difficile à changer (douleur max pour l\'attaquant)
        [Outils]
      [Artefacts réseau]
     [Artefacts hôte]
    [Adresses IP]        ← Facile à changer (faible douleur)
   [Hachages de fichiers]
              ▼
\`\`\`

**Leçon** : Bloquer des hashes est facile mais contournable. Détecter les TTPs est bien plus efficace.`,
          quiz: [
            {
              id: 'n2-m3-l2-q1',
              xpReward: 60,
              question: 'Quelle est la différence entre un IoC et un IoA ?',
              options: [
                'Un IoC est interne, un IoA est externe',
                'Un IoC est la preuve d\'une compromission passée, un IoA est un signe d\'attaque en cours',
                'Un IoC est pour Windows, un IoA pour Linux',
                'Un IoC est un hash, un IoA est une IP',
              ],
              correct: 1,
              explanation: '**IoC (Indicator of Compromise)** = preuve qu\'une compromission a eu lieu (hash, IP connue, domaine). **IoA (Indicator of Attack)** = comportement en cours qui indique une attaque active (ex: scan de ports, exécution suspecte). Les IoA permettent de détecter une attaque avant la compromission.',
            },
            {
              id: 'n2-m3-l2-q2',
              xpReward: 60,
              question: 'Selon la Pyramide de la Douleur, quel type d\'indicateur est le plus difficile à changer pour un attaquant ?',
              options: ['Hashes de fichiers', 'Adresses IP', 'TTPs (Tactics, Techniques, Procedures)', 'Domaines C2'],
              correct: 2,
              explanation: 'Selon la **Pyramide de la Douleur**, les **TTPs** sont au sommet — les changer nécessite de réécrire entièrement les outils et méthodes de l\'attaquant. À l\'inverse, changer un hash de fichier ou une IP est trivial.',
            },
          ],
        },
      ],
    },
  ],
}

export default niveau2
