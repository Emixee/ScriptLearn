const niveau4 = {
  id: 4,
  name: 'Analyste SOC Expert',
  badge: '🏆',
  duration: 150,
  certifications: ['GIAC GCIH', 'GIAC GCFE', 'GIAC GCIA', 'OSCP'],
  description: 'Purple Teaming, SOAR, Threat Intelligence avancée, OSINT, Architecture SOC, Reverse Engineering. Niveau Mastère.',
  modules: [
    {
      id: 'n4-m1',
      title: 'Purple Teaming et Red/Blue',
      lessons: [
        {
          id: 'n4-m1-l1',
          title: 'Purple Team — Collaboration Red/Blue',
          description: 'Comprendre comment la collaboration entre équipes offensives (Red) et défensives (Blue) améliore la posture de sécurité.',
          duration: 70,
          xpReward: 220,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Distinguer Red Team, Blue Team et Purple Team',
            'Comprendre l\'approche Assume Breach',
            'Mener des exercices Purple Team efficaces',
            'Mesurer et améliorer la couverture de détection',
          ],
          theory: `# Purple Team — Collaboration Red et Blue

## Les Équipes de Sécurité

### Red Team (Équipe Rouge)
L\'équipe offensive qui **simule des attaquants réels** pour tester les défenses.

\`\`\`
Objectifs Red Team :
• Compromettre des systèmes cibles
• Rester non détecté le plus longtemps possible
• Atteindre des objectifs spécifiques (ex: accès DC, exfiltration données)
• Documenter les techniques utilisées

Différences avec pentest classique :
• Durée : semaines/mois (vs jours)
• Scope : organisation entière
• Furtivité : maximum (vs découverte active)
• Objectif : simuler APT (vs trouver des vulnérabilités)
\`\`\`

### Blue Team (Équipe Bleue)
L\'équipe **défensive** qui surveille, détecte et répond.

\`\`\`
Responsabilités Blue Team :
• Surveillance SIEM 24/7
• Règles de détection
• Réponse aux incidents
• Threat Hunting
• Hardening des systèmes
\`\`\`

### Purple Team (Équipe Violette)
La collaboration **structurée** entre Red et Blue pour améliorer les capacités de détection.

\`\`\`
Red Team exécute une technique
      ↓
Blue Team surveille et répond
      ↓
Les deux équipes comparent : "Avez-vous détecté ça ?"
      ↓
Identification des lacunes de détection
      ↓
Amélioration des règles SIEM + Threat Hunting
\`\`\`

---

## Exercice Purple Team — Structure

### Phase 1 : Planification
\`\`\`
1. Définir le périmètre (systèmes, réseaux)
2. Choisir les techniques ATT&CK à tester
3. Définir les objectifs (ex: tester T1053 - Scheduled Tasks)
4. Obtenir les autorisations (Règle d\'Or !)
\`\`\`

### Phase 2 : Exécution
\`\`\`
Red Team exécute la technique sur un système test :
• Documenter la technique exacte
• Horodater chaque action
• Noter les outils utilisés

Blue Team surveille :
• Alertes générées ?
• Logs disponibles ?
• Temps de détection ?
\`\`\`

### Phase 3 : Analyse
\`\`\`
Questions clés :
• L\'action a-t-elle été détectée ?
• Si oui, dans quel délai (MTTD) ?
• Si non, pourquoi ? (logs manquants, règle absente)
• Quelles améliorations apporter ?
\`\`\`

### Phase 4 : Amélioration
\`\`\`
Actions correctives :
• Créer/modifier des règles SIEM
• Activer des logs manquants
• Créer des hypothèses de Threat Hunting
• Mettre à jour les playbooks
\`\`\`

---

## Outils Purple Team

| Outil | Type | Usage |
|-------|------|-------|
| **Atomic Red Team** | Open source | Simulations de techniques ATT&CK |
| **CALDERA (MITRE)** | Open source | Plateforme d\'émulation adversaire |
| **Cobalt Strike** | Commercial | Red Team professionnel |
| **Vectr** | Open source | Tracking des exercices purple |
| **AttackIQ** | Commercial | Validation de sécurité continue |

---

## Approche "Assume Breach"

L\'Assume Breach est une philosophie défensive : **supposer que l\'attaquant est déjà à l\'intérieur** et se concentrer sur la détection et la limitation des dégâts.

\`\`\`
Posture traditionnelle : Empêcher toute intrusion
Posture Assume Breach : Détecter rapidement + Limiter l\'impact

Questions Assume Breach :
• Si un attaquant est dans notre LAN, comment le détectons-nous ?
• Combien de temps faut-il pour le détecter ?
• Peut-il accéder aux données les plus sensibles ?
• Nos sauvegardes sont-elles à l\'abri ?
\`\`\`

---

## KPIs du Purple Team

| Métrique | Objectif |
|---------|---------|
| Detection Rate | % de techniques ATT&CK détectées |
| MTTD (détection) | Temps moyen de détection |
| Coverage (ATT&CK) | % de tactiques couvertes |
| Alert Fidelity | % d\'alertes réelles vs faux positifs |`,
          quiz: [
            {
              id: 'n4-m1-l1-q1',
              xpReward: 90,
              question: 'Quelle est la valeur principale d\'un exercice Purple Team ?',
              options: [
                'Compromettre les systèmes pour identifier les vulnérabilités',
                'Améliorer les capacités de détection en collaborant entre Red et Blue Team',
                'Remplacer les tests de pénétration classiques',
                'Former les développeurs à la sécurité',
              ],
              correct: 1,
              explanation: 'La valeur principale du **Purple Team** est la **collaboration structurée** entre Red et Blue. Le Red exécute des techniques, le Blue observe ce qu\'il détecte (ou rate). Ensemble, ils identifient les lacunes de détection et améliorent les règles SIEM — ce que ni Red ni Blue ne peut faire seul.',
            },
            {
              id: 'n4-m1-l1-q2',
              xpReward: 90,
              question: 'Qu\'est-ce que l\'approche "Assume Breach" ?',
              options: [
                'Supposer que toutes les attaques réussiront et ne pas se défendre',
                'Supposer que l\'attaquant est déjà à l\'intérieur et se concentrer sur la détection et le confinement',
                'Forcer les employés à supposer que leurs emails sont lus',
                'Tester tous les systèmes sans exception',
              ],
              correct: 1,
              explanation: '**Assume Breach** = supposer que la compromission initiale a déjà eu lieu, et se concentrer sur : (1) détecter rapidement les mouvements latéraux, (2) limiter l\'accès aux actifs critiques, (3) minimiser le blast radius. C\'est une philosophie de Zero Trust appliquée au SOC.',
            },
          ],
        },
      ],
    },
    {
      id: 'n4-m2',
      title: 'SOAR — Automatisation',
      lessons: [
        {
          id: 'n4-m2-l1',
          title: 'SOAR — Security Orchestration, Automation and Response',
          description: 'Comprendre et implémenter des playbooks SOAR pour automatiser la réponse aux incidents courants.',
          duration: 75,
          xpReward: 230,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Comprendre l\'architecture SOAR',
            'Créer des playbooks d\'automatisation',
            'Intégrer les outils SOC dans une chaîne automatisée',
            'Mesurer le ROI de l\'automatisation',
          ],
          theory: `# SOAR — Security Orchestration, Automation and Response

## Qu\'est-ce que le SOAR ?

Le SOAR est une plateforme qui **orchestre et automatise** les actions de réponse aux incidents en intégrant tous les outils SOC.

\`\`\`
Sans SOAR :
Alerte SIEM → Analyste regarde → Copie IP → Ouvre AbuseIPDB → Copie résultat
→ Ouvre VirusTotal → Copie résultat → Ouvre ITSM → Ouvre ticket
→ Copie-colle tout → 30-60 minutes par alerte

Avec SOAR :
Alerte SIEM → Playbook automatique :
  → Lookup AbuseIPDB (2s)
  → Lookup VirusTotal (2s)
  → Geolocation IP (1s)
  → Création ticket ITSM automatique (1s)
  → Notification Slack (1s)
  → TOTAL : 7 secondes, analyste notifié avec tout le contexte
\`\`\`

---

## Architecture SOAR

\`\`\`
             ┌─────────────────────────────────────────┐
             │           SOAR Platform                  │
             │                                          │
SIEM ───────>│  Trigger   Playbook    Actions           │
EDR ─────────│   Rules  →  Engine  →  Execution         │
Emails ──────│                           │              │
             └───────────────────────────────────────── ┘
                                         │
                    ┌────────────────────┼─────────────────────┐
                    ↓                    ↓                      ↓
              Threat Intel          Ticketing               Response
           (VirusTotal, MISP)   (ServiceNow, Jira)    (Firewall, EDR, AD)
\`\`\`

---

## Playbooks SOAR — Exemples

### Playbook : Alerte Phishing

\`\`\`yaml
name: "Phishing Email Response"
trigger: "Email reported as phishing by user"

steps:
  1. Extract IOCs:
     - Sender email address
     - URLs in email
     - Attachments (hash)

  2. Threat Intel Lookup:
     - VirusTotal check on URLs
     - Hash check on attachment
     - Email sender reputation

  3. Conditional Logic:
     IF score > 70%:
       → Block sender domain (email gateway)
       → Submit to sandbox
       → Notify SOC team
       → Create P2 incident ticket
     ELSE:
       → Mark as false positive
       → Close alert

  4. User notification:
     → Email user: "Email analysé, action prise"

  5. Documentation:
     → Log all findings in ITSM
\`\`\`

### Playbook : Brute Force SSH

\`\`\`yaml
name: "SSH Brute Force Response"
trigger: "SIEM alert: >10 failed SSH attempts in 5 min"

steps:
  1. Enrich attacker IP:
     - AbuseIPDB lookup
     - MaxMind geolocation
     - Shodan lookup (open ports)

  2. Check if internal IP:
     IF src_ip in internal_ranges:
       → Escalate to Tier 2 (lateral movement suspect)
     ELSE:
       → Continue automation

  3. Block IP:
     → Add to firewall blacklist (30 days)
     → Add to SIEM watchlist

  4. Check if success:
     IF any 4624 from same IP:
       → Escalate to P1
       → Alert incident manager
       → Initiate IR playbook

  5. Ticket:
     → Create P3 ticket with all context
     → Auto-assign to SOC queue
\`\`\`

---

## Plateformes SOAR Populaires

| Plateforme | Type | Particularité |
|-----------|------|--------------|
| **Shuffle** | Open source | Facile à démarrer, Docker |
| **Cortex XSOAR** (Palo Alto) | Commercial | Le plus complet |
| **Splunk SOAR** | Commercial | Intégré à Splunk |
| **Microsoft Sentinel + Logic Apps** | Cloud | Natif Azure |
| **IBM QRadar SOAR** | Commercial | Entreprise |
| **TheHive** | Open source | Gestion d\'incidents + MISP |

---

## ROI du SOAR

\`\`\`
Calcul du ROI :

Sans SOAR :
• 50 alertes/jour × 30 min/alerte = 1500 min/jour = 25h
• Coût analyste : 50€/h = 1250€/jour

Avec SOAR :
• 80% d\'alertes automatisées (40 alertes)
• 10 alertes nécessitant analyste × 10 min = 100 min
• Coût analyste : 50€/h = 83€/jour

Économie : 1167€/jour = 425 955€/an
ROI : Très élevé dès la première année
\`\`\``,
          quiz: [
            {
              id: 'n4-m2-l1-q1',
              xpReward: 90,
              question: 'Qu\'est-ce qu\'un playbook SOAR ?',
              options: [
                'Un manuel de procédures papier pour les analystes',
                'Un workflow automatisé qui orchestre les actions de réponse à un type d\'incident',
                'Un guide de formation pour les nouveaux analystes SOC',
                'Un tableau de bord de visualisation des alertes',
              ],
              correct: 1,
              explanation: 'Un **playbook SOAR** est un **workflow automatisé** qui définit les étapes de réponse à un type d\'incident spécifique. Il orchestre des actions sur plusieurs outils (SIEM, firewall, ITSM) automatiquement, réduisant le temps de réponse de minutes à secondes.',
            },
          ],
        },
      ],
    },
    {
      id: 'n4-m3',
      title: 'OSINT et Threat Intelligence Avancée',
      lessons: [
        {
          id: 'n4-m3-l1',
          title: 'OSINT — Techniques et Outils Avancés',
          description: 'Maîtriser les techniques OSINT pour collecter des informations sur les attaquants et enrichir la Threat Intelligence.',
          duration: 70,
          xpReward: 210,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Maîtriser les techniques OSINT fondamentales',
            'Utiliser Maltego, Shodan, WHOIS pour la recherche',
            'Investiguer un domaine ou une IP suspecte',
            'Construire un graphe de relations d\'attaquants',
          ],
          theory: `# OSINT — Open Source Intelligence

## Qu\'est-ce que l\'OSINT ?

L\'OSINT (Open Source Intelligence) est la collecte et l\'analyse de renseignements à partir de **sources publiques** : Internet, réseaux sociaux, registres publics, etc.

**En SOC**, l\'OSINT est utilisé pour :
- Investiguer des IPs, domaines, emails suspects
- Profiler des groupes d\'attaquants
- Enrichir les IoC
- Anticiper les menaces ciblant votre secteur

---

## Techniques OSINT Fondamentales

### Google Dorks
Opérateurs Google pour trouver des informations cachées.

\`\`\`
site:exemple.com filetype:pdf          → PDFs sur un site
inurl:admin login                      → Pages d\'admin
intitle:"index of" "backup"            → Répertoires ouverts
"@exemple.com" filetype:xlsx           → Emails en fichiers Excel
insite:pastebin.com "exemple.com"      → Fuites sur Pastebin
"Powered by" "phpMyAdmin"              → phpMyAdmin exposé
\`\`\`

### Shodan — "Google des IoT"

\`\`\`
Shodan indexe les services exposés sur Internet.

Recherches utiles :
hostname:"exemple.com"                 → Services d\'un domaine
org:"Entreprise XYZ"                   → Infrastructure d\'une org
port:3389 country:FR                   → RDP exposé en France
"default password" product:"Cisco"    → Équipements Cisco par défaut
ssl.cert.subject.cn:"exemple.com"     → Certificats d\'un domaine
vuln:CVE-2021-44228                    → Log4Shell exposé

Filters importants :
• city, country, org, isp, port, product, os, hostname
\`\`\`

### WHOIS et Registration

\`\`\`bash
# WHOIS d\'un domaine
whois evil-domain.com

# Informations obtenues :
# Registrar, dates, serveurs DNS, emails de contact
# Note : souvent caché derrière des services de privacy

# Reverse WHOIS — trouver tous les domaines d\'un email
# ViewDNS.info, RiskIQ
\`\`\`

### DNS Investigation

\`\`\`bash
# Enregistrements DNS complets
dig evil-domain.com ANY

# Historique DNS (crucial !)
# Si un C2 change d\'IP, l\'historique révèle les anciennes IPs
# → passivedns.mnemonic.no, SecurityTrails

# Sous-domaines
# Amass, Subfinder, DNSdumpster

# Serveurs mail → qui héberge ?
dig evil-domain.com MX
\`\`\`

---

## Outils OSINT Essentiels

| Outil | Usage | Lien |
|-------|-------|------|
| **Maltego** | Graphe de relations | maltego.com |
| **Shodan** | IoT/services exposés | shodan.io |
| **SpiderFoot** | OSINT automatisé | spiderfoot.net |
| **theHarvester** | Emails, domaines | Kali Linux |
| **Recon-ng** | Framework OSINT | Kali Linux |
| **SecurityTrails** | DNS historique | securitytrails.com |
| **Censys** | Scans Internet | censys.io |
| **OSINT Framework** | Index d\'outils | osintframework.com |

---

## Investigation d\'une Campagne de Phishing

Exemple pratique d\'investigation OSINT :

\`\`\`
1. Email phishing reçu de : support@microsoft-update-security.com

2. WHOIS du domaine :
   → Enregistré il y a 3 jours (domaine très récent = suspect)
   → Registrar : Namecheap avec WhoisGuard (privacy)
   → NS: ns1.namecheap.com

3. Shodan / Censys :
   → IP hébergeant le domaine : 45.33.32.156
   → Ports ouverts : 22, 80, 443
   → Certificat SSL valide (Let\'s Encrypt)
   → Même IP héberge 15 autres domaines suspects

4. DNS historique (SecurityTrails) :
   → Domaine microsoft-update-security.com (ancienne campagne)
   → microsoft-update-center.com (encore plus ancienne)
   → Infrastructure partagée = même acteur

5. VirusTotal :
   → IP 45.33.32.156 → 45/87 moteurs la signalent

6. MISP / OpenCTI :
   → IP liée au groupe FIN7

Conclusion : Campagne de phishing attribuée à FIN7
Action : Bloquer domaine + IP, alerter utilisateurs
\`\`\`

---

## Attribution et Groupes d\'Acteurs

L\'attribution est difficile mais possible avec suffisamment de données.

**Sources pour l\'attribution** :
- MITRE ATT&CK Groups
- VirusTotal (rapport entreprises)
- Mandiant, CrowdStrike rapports publics
- MISP partages de communauté
- Rapport ANSSI, CISA

**Niveaux d\'attribution** :
1. Tactiques/outils similaires → Même cluster
2. Infrastructure réutilisée → Probable même acteur
3. Artefacts linguistiques, fuseaux → Géolocalisation
4. Sources humaines → Attribution définitive (rare)`,
          quiz: [
            {
              id: 'n4-m3-l1-q1',
              xpReward: 90,
              question: 'En OSINT, quel outil permet de trouver des services et équipements exposés sur Internet (comme des caméras, serveurs industriels) ?',
              options: ['Maltego', 'Shodan', 'Wireshark', 'Metasploit'],
              correct: 1,
              explanation: '**Shodan** est le "moteur de recherche de l\'IoT" — il scanne en permanence Internet et indexe les services exposés (caméras, routeurs, serveurs, SCADA, bases de données). C\'est un outil OSINT essentiel pour l\'investigation et la Threat Intelligence.',
            },
            {
              id: 'n4-m3-l1-q2',
              xpReward: 90,
              question: 'Lors d\'une investigation sur un domaine suspect, pourquoi vérifier l\'historique DNS ?',
              options: [
                'Pour voir si le domaine a un certificat SSL valide',
                'Pour retrouver les anciennes adresses IP associées au domaine, même si elles ont changé',
                'Pour vérifier si le domaine appartient à une grande entreprise',
                'Pour tester la latence DNS du serveur',
              ],
              correct: 1,
              explanation: 'L\'**historique DNS** révèle les **anciennes adresses IP** associées à un domaine. Les attaquants changent souvent d\'IP, mais l\'historique permet de retrouver toute l\'infrastructure passée et de l\'associer à d\'autres campagnes ou groupes. Services : SecurityTrails, PassiveTotal.',
            },
          ],
        },
      ],
    },
    {
      id: 'n4-m4',
      title: 'Architecture SOC et Gestion de Crise',
      lessons: [
        {
          id: 'n4-m4-l1',
          title: 'Architecture SOC — Design et KPIs',
          description: 'Concevoir une architecture SOC efficace, définir les KPIs de maturité et gérer une équipe de sécurité.',
          duration: 60,
          xpReward: 200,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Concevoir l\'architecture technique d\'un SOC',
            'Définir les KPIs de maturité (MITRE ATT&CK Coverage)',
            'Gérer une équipe SOC (recrutement, rétention)',
            'Justifier les investissements sécurité (ROI)',
          ],
          theory: `# Architecture SOC — Design et Management

## Architecture Technique d\'un SOC

### Composants essentiels

\`\`\`
                    [Threat Intelligence]
                           │
[Sources] ──────────────>  [SIEM]  ──────>  [SOAR]
  Firewalls                 │                  │
  EDR/XDR                   │              [Tickets]
  AD/LDAP               [Alerting]         [Playbooks]
  Emails                    │
  Cloud                [Analysts]
  Applications         T1 | T2 | T3
  ...                       │
                        [Forensics]
                        [Threat Hunt]
\`\`\`

### Matrice de sélection des outils

| Catégorie | Open Source | Commercial |
|-----------|-------------|-----------|
| SIEM | Wazuh, Elastic | Splunk, QRadar |
| EDR | Wazuh, Velociraptor | CrowdStrike, SentinelOne |
| SOAR | Shuffle, TheHive | XSOAR, Splunk SOAR |
| TI | MISP, OpenCTI | Recorded Future |
| NDR | Zeek, Suricata | Darktrace, Vectra |

---

## Modèle de Maturité SOC

\`\`\`
Niveau 0 — Inexistant
→ Pas de surveillance

Niveau 1 — Initial
→ Logs collectés, alertes basiques
→ Réponse réactive uniquement

Niveau 2 — Défini
→ SIEM configuré, playbooks basiques
→ Tiers 1/2 opérationnels

Niveau 3 — Géré
→ Threat Intelligence intégrée
→ Threat Hunting régulier
→ SOAR partiel

Niveau 4 — Optimisé
→ Purple Team régulier
→ SOAR avancé
→ ATT&CK coverage mesurée
→ Amélioration continue

Niveau 5 — Innovation
→ ML/IA pour la détection
→ Prédiction des attaques
→ Partage communautaire
\`\`\`

---

## KPIs de Maturité SOC

### Métriques Opérationnelles

| KPI | Mesure | Objectif |
|-----|--------|---------|
| MTTD | Temps moyen de détection | < 1h |
| MTTR | Temps moyen de réponse | < 4h |
| Faux Positifs | % alertes fausses | < 30% |
| Coverage ATT&CK | % techniques détectées | > 60% |
| Disponibilité SIEM | Uptime | > 99.9% |

### ATT&CK Coverage Map

Utilisez ATT&CK Navigator pour visualiser quelles techniques vous détectez :
- Rouge = non détecté
- Orange = détection partielle
- Vert = détection robuste

---

## Gestion d\'Équipe SOC

### Défis du Tier 1
- Turnover élevé (burnout, alertes répétitives)
- SOAR réduit les tâches répétitives
- Formation continue essentielle

### Structure d\'équipe type (100 personnes protégées)

\`\`\`
SOC Manager (1)
├── Tier 1 Analysts (5-8, 24/7)
├── Tier 2 Analysts (3-4)
├── Threat Hunter (1-2)
├── Incident Response Lead (1)
└── SIEM/Tool Engineer (1-2)
\`\`\`

---

## Gestion de Crise Cyber

### Plan de Continuité (PCA) et Plan de Reprise (PRA)

\`\`\`
PCA (Plan de Continuité d\'Activité) :
→ Maintenir les services pendant l\'incident
→ Mode dégradé défini à l\'avance

PRA (Plan de Reprise d\'Activité) :
→ Restaurer les services après l\'incident
→ RTO (Recovery Time Objective) : temps max d\'interruption
→ RPO (Recovery Point Objective) : perte de données max acceptée
\`\`\`

### Communication de Crise

\`\`\`
Stakeholders à notifier :
• Direction (COMEX) : Impact business, coût
• Équipe IT : Actions techniques
• RH : Si données employés touchées
• Juridique : Obligations légales (RGPD, NIS2)
• Communication : Si impact public
• ANSSI/CERT : Si critique ou OIV
• CNIL : Si données personnelles (72h RGPD)
\`\`\``,
          quiz: [
            {
              id: 'n4-m4-l1-q1',
              xpReward: 90,
              question: 'Quelle est la différence entre le PCA et le PRA en gestion de crise ?',
              options: [
                'Le PCA est pour Windows, le PRA pour Linux',
                'Le PCA maintient l\'activité pendant l\'incident (mode dégradé), le PRA la restaure après',
                'Le PCA est pour les petites entreprises, le PRA pour les grandes',
                'Ce sont des synonymes avec différents acronymes',
              ],
              correct: 1,
              explanation: '**PCA (Plan de Continuité d\'Activité)** : maintenir les services en mode dégradé **pendant** l\'incident. **PRA (Plan de Reprise d\'Activité)** : restaurer les services à leur état normal **après** l\'incident. Les deux sont essentiels et complémentaires.',
            },
            {
              id: 'n4-m4-l1-q2',
              xpReward: 90,
              question: 'Qu\'est-ce que l\'ATT&CK Coverage Map dans le contexte d\'un SOC ?',
              options: [
                'Une carte géographique des attaquants',
                'Une visualisation des techniques ATT&CK que le SOC peut détecter vs celles qu\'il ne voit pas',
                'Un diagramme des connexions réseau surveillées',
                'Un planning de rotation des équipes',
              ],
              correct: 1,
              explanation: 'L\'**ATT&CK Coverage Map** (via ATT&CK Navigator) montre visuellement quelles techniques du framework MITRE ATT&CK votre SOC peut détecter. Les zones rouges = lacunes de détection. C\'est un outil clé pour prioriser les investissements et les améliorations.',
            },
          ],
        },
      ],
    },
    {
      id: 'n4-m5',
      title: 'Reverse Engineering — Introduction',
      lessons: [
        {
          id: 'n4-m5-l1',
          title: 'Reverse Engineering — Malware Analysis Avancée',
          description: 'Introduction au reverse engineering avec Ghidra et x64dbg pour analyser des malwares en profondeur.',
          duration: 90,
          xpReward: 280,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Comprendre le format PE (Portable Executable)',
            'Utiliser Ghidra pour la désassemblage statique',
            'Utiliser x64dbg pour le débogage dynamique',
            'Identifier les patterns malveillants dans le code assembleur',
          ],
          theory: `# Reverse Engineering — Introduction

## Prérequis

Avant le reverse engineering, l\'analyse statique et dynamique de base doit être maîtrisée (Niveau 2).

---

## Format PE (Portable Executable)

Les exécutables Windows (.exe, .dll) suivent le format PE.

\`\`\`
Structure PE :
┌────────────────┐
│ DOS Header     │ → "MZ" signature (4D 5A)
│ PE Header      │ → Signature "PE\0\0"
│ Optional Header│ → ImageBase, EntryPoint, etc.
├────────────────┤
│ Section Table  │ → Liste des sections
├────────────────┤
│ .text          │ → Code exécutable
│ .data          │ → Données globales
│ .rdata         │ → Données read-only (strings, imports)
│ .rsrc          │ → Ressources (icônes, dialogs)
│ .idata         │ → Import Address Table
│ .edata         │ → Export Address Table
└────────────────┘
\`\`\`

### Imports — Ce que fait le malware

Les imports (DLL importées) révèlent les capacités du malware :

\`\`\`
kernel32.dll → Fichiers, processus, mémoire
  CreateFile, WriteFile, ReadFile → Manipulation fichiers
  CreateProcess, OpenProcess → Manipulation processus
  VirtualAlloc → Allocation mémoire (injection)

advapi32.dll → Registre, services
  RegCreateKey, RegSetValue → Persistance registre
  CreateService → Service malveillant

wininet.dll / ws2_32.dll → Réseau
  InternetOpenUrl, InternetReadFile → HTTP
  connect, send, recv → Sockets TCP

ntdll.dll → API native Windows
  NtUnmapViewOfSection → Process hollowing

wincrypt.dll → Chiffrement
  CryptEncrypt, CryptGenKey → Ransomware !
\`\`\`

---

## Ghidra — Désassembleur Statique

Ghidra est l\'outil de reverse engineering de la NSA, **gratuit et open source**.

\`\`\`
Installation :
1. Télécharger sur ghidra-sre.org
2. Nécessite Java 17+
3. Créer un projet → Importer le fichier
4. Auto-analyse → Désassemblage

Fonctions clés :
• Désassembleur : affiche le code assembleur
• Décompilateur : convertit en pseudo-C (révolutionnaire !)
• CodeBrowser : navigation dans le code
• Function Graph : graphe de contrôle de flux
\`\`\`

### Lecture du code désassemblé

\`\`\`asm
; Exemple : boucle de chiffrement XOR (classique en malware)
LEA     RCX, [RBP+data]       ; Pointeur vers données
MOV     EDX, 0xFF             ; Clé XOR = 0xFF
LOOP:
  MOVZX   EAX, BYTE [RCX]    ; Charger un octet
  XOR     EAX, EDX            ; XOR avec la clé
  MOV     [RCX], AL           ; Stocker le résultat
  INC     RCX                 ; Octet suivant
  DEC     ESI                 ; Décrémenter compteur
  JNZ     LOOP                ; Si pas zéro, répéter

; Patterns à reconnaître :
; XOR reg, reg → Mettre un registre à zéro (XOR EAX, EAX = EAX := 0)
; CALL [addr] → Appel de fonction
; JMP, JNZ, JE → Sauts conditionnels
\`\`\`

---

## x64dbg — Débogage Dynamique

x64dbg permet d\'analyser un malware **en cours d\'exécution** dans un environnement sécurisé (VM isolée !).

\`\`\`
Fonctionnalités clés :
• Breakpoints : Arrêter l\'exécution à une adresse
• Step Over/Into : Avancer instruction par instruction
• Watching : Observer des registres/variables
• Memory dump : Extraire le code déchiffré en mémoire

Workflow d\'analyse dynamique :
1. Mettre un breakpoint sur l\'entry point
2. Observer les imports appelés
3. Breakpoint sur les appels réseau (ws2_32.dll)
4. Capturer les arguments (IP C2, données envoyées)
\`\`\`

---

## Patterns Malveillants à Reconnaître

### Anti-Analyse
\`\`\`
• IsDebuggerPresent → Détecte un débogueur
• CheckRemoteDebuggerPresent
• NtQueryInformationProcess
• Timing attacks (RDTSC)
• VM detection (VMware artifacts)
\`\`\`

### Obfuscation de Strings
\`\`\`
Technique : Chiffrement XOR des strings
Le malware stocke les strings chiffrées, les déchiffre en mémoire

Exemple :
PUSH 0x7c 45 3f 2e  ; String chiffrée
CALL decrypt_string  ; Déchiffre → "powershell"
→ Chercher des appels à decrypt/deobfuscate
\`\`\`

### Code Injection
\`\`\`
1. VirtualAllocEx → Allouer mémoire dans un autre processus
2. WriteProcessMemory → Écrire le shellcode
3. CreateRemoteThread → Exécuter dans l\'autre processus
→ Chercher ces 3 API ensemble = injection classique
\`\`\``,
          quiz: [
            {
              id: 'n4-m5-l1-q1',
              xpReward: 100,
              question: 'Dans le format PE d\'un malware, que révèlent les imports (IAT - Import Address Table) ?',
              options: [
                'La date de compilation du malware',
                'Les capacités et fonctionnalités du malware (réseau, fichiers, processus...)',
                'Les credentials encodés dans le malware',
                'La liste des antivirus que le malware contourne',
              ],
              correct: 1,
              explanation: 'La **Table des imports (IAT)** liste toutes les fonctions Windows appelées par le malware. Les imports de ws2_32.dll indiquent des capacités réseau, wincrypt.dll = chiffrement (ransomware ?), CreateProcess = injection. C\'est la première étape de l\'analyse statique.',
            },
            {
              id: 'n4-m5-l1-q2',
              xpReward: 100,
              question: 'En reverse engineering, qu\'indique la séquence VirtualAllocEx → WriteProcessMemory → CreateRemoteThread ?',
              options: [
                'Une opération d\'écriture de fichier normale',
                'Une injection de code classique dans un autre processus',
                'Une connexion réseau TCP',
                'Une modification du registre Windows',
              ],
              correct: 1,
              explanation: 'La séquence **VirtualAllocEx + WriteProcessMemory + CreateRemoteThread** est le schéma classique d\'**injection de code dans un processus** : (1) allouer de la mémoire dans le processus cible, (2) écrire le shellcode, (3) créer un thread dans le processus cible pour l\'exécuter.',
            },
          ],
        },
      ],
    },
  ],
}

export default niveau4
