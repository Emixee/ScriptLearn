# Analyst SOC Training — Document de conception

> Ce document est mis à jour à chaque échange et doit être consulté avant toute action.
> Il constitue la référence unique du projet.
> Dernière mise à jour : 25/05/2026

---

## Idée d'origine (25/05/2026)

Logiciel de formation complet pour devenir analyste SOC, allant de zéro à expert.

### Exigences fondamentales

- Contenir **toutes les étapes** nécessaires pour devenir analyste SOC (débutant → expert)
- Couvrir **toutes les matières** d'un cursus informatique BAC → Mastère cybersécurité
- IA locale intégrée pour : assistance, correction des réponses, guidance
- Système d'installation via `.exe` (et `.deb` pour Linux)
- Sauvegarde du projet dans : `Bureau/Analyst SOC Training/`

---

## Décisions prises — Session 1 (25/05/2026)

| Dimension | Décision |
|-----------|----------|
| **Stack** | Electron + React |
| **IA locale** | Ollama (LLaMA 3 / Mistral) |
| **Plateforme** | Windows + Linux |
| **Contenu** | Cours théoriques + QCM + Labs pratiques + CTF intégrés |
| **Gamification** | Complète (XP, niveaux, badges, progression bloquée) |
| **Multi-profils** | Oui |
| **Langue** | Français + Anglais (bilingue, switchable) |
| **Style visuel** | Dark theme cybersécurité (#0d1117 / #00ff88) |
| **Distribution** | Gratuit / Personnel |
| **Certifications visées** | CompTIA Security+, CySA+, GIAC (GCIA, GCFE, GCIH), OSCP |
| **Labs** | Terminal intégré + vrais fichiers PCAP/logs |
| **Durée cursus** | 500h+ |

---

## Architecture technique

### Stack
```
Electron (shell) + React (UI) + Vite (bundler)
SQLite (better-sqlite3) → profils, progression, scores
Ollama API (HTTP localhost:11434) → IA
xterm.js → terminal intégré dans les labs
electron-builder → .exe (Windows) + .AppImage/.deb (Linux)
```

### Structure du projet
```
analyst-soc-training/
├── electron/
│   ├── main.js          # Process principal Electron
│   ├── preload.js       # Bridge sécurisé IPC
│   └── db.js            # Gestion SQLite
├── src/
│   ├── App.jsx
│   ├── components/      # Composants réutilisables
│   ├── pages/           # Vues principales
│   ├── services/        # Ollama, progress, content
│   ├── store/           # État global (Zustand)
│   └── data/            # Contenu des cours (JSON)
├── public/
├── package.json
└── electron-builder.yml
```

---

## Curriculum — Structure des 5 niveaux (500h+)

### Niveau 0 — Fondamentaux Informatiques (BAC) | ~50h
- Réseaux : modèle OSI, TCP/IP, protocoles (HTTP, DNS, DHCP, FTP, SSH)
- Systèmes d'exploitation : Windows & Linux de base
- Introduction à la cryptographie (symétrique, asymétrique, hachage)
- Bases de la programmation (Python, logique algorithmique)
- Bases de données SQL

### Niveau 1 — Sécurité Fondamentale (BAC+1/+2) | ~80h
- Sécurité des réseaux (firewalls, VPN, VLAN, NAT, DMZ)
- Active Directory et gestion des identités
- PKI et certificats
- Scripting sécurité (Python, Bash, PowerShell)
- Introduction OWASP Top 10
- Introduction à la cybersécurité et aux métiers SOC

### Niveau 2 — Analyste SOC Junior (BAC+3) | ~100h
- SIEM : théorie et architecture
- Splunk Fundamentals (recherches SPL, dashboards, alertes)
- Elastic Stack / ELK (Logstash, Kibana, Elasticsearch)
- Analyse de logs (Windows Event Logs, Syslog, Nginx/Apache)
- Threat Intelligence : MITRE ATT&CK, indicateurs IoC
- Forensics numérique de base
- Analyse de malware statique
- Préparation CompTIA Security+

### Niveau 3 — Analyste SOC Confirmé (BAC+4) | ~120h
- Incident Response (phases, playbooks)
- Digital Forensics avancé (mémoire, disque, artefacts)
- Malware Analysis dynamique (sandbox, comportement)
- Threat Hunting (hypothèses, chasse proactive)
- IDS/IPS (Snort, Suricata) — règles et tuning
- SIEM avancé (corrélation, cas d'usage)
- Reverse Engineering introduction
- CTF intermédiaires
- Préparation CompTIA CySA+ / GCIA

### Niveau 4 — Analyste SOC Expert (Mastère) | ~150h
- Purple Teaming (collaboration Red/Blue)
- SOAR : automatisation des réponses aux incidents
- Threat Intelligence avancée (attribution, TTPs)
- OSINT avancé (Maltego, Shodan, WHOIS)
- Architecture et management SOC
- Reverse Engineering avancé (IDA, Ghidra)
- Gestion de crise cyber (PCA, PRA, communication)
- Red Team / Pentest (compréhension offensive)
- CTF avancés (type GIAC, OSCP)
- Préparation GIAC (GCFE, GCIH) + OSCP

---

## Fonctionnalités détaillées

### Système de progression
- 5 niveaux (Niveau 0 à 4), chaque niveau débloqué par le précédent
- XP gagné par : leçon lue, quiz réussi, lab complété, CTF résolu
- Badges et récompenses à chaque jalon
- Tableau de bord de progression par matière

### IA Ollama
- Assistant contextuel dans chaque leçon
- Correction détaillée des réponses QCM
- Aide en cas de blocage sur un lab (indices progressifs)
- Génération de questions supplémentaires à la demande
- Explications alternatives adaptées au niveau

### Labs pratiques
- Terminal xterm.js intégré dans le logiciel
- Fichiers PCAP, logs Windows, logs Linux fournis
- Outils simulés : Wireshark viewer, log parser, SIEM viewer
- Validation automatique des réponses de lab

### CTF intégrés
- Défis par niveau de difficulté
- Indices progressifs via l'IA
- Classement et scoring
- Thèmes : forensics, logs, réseau, malware, crypto

### Multi-profils
- Création de profils locaux (nom, avatar)
- Progression indépendante par profil
- Sauvegarde locale SQLite

### Bilingue FR/EN
- Sélecteur de langue dans les paramètres
- Interface traduite intégralement
- Terminologie technique en anglais dans les deux langues

---

## Journal de développement

### 25/05/2026
- [x] Dossier projet créé sur le bureau
- [x] Document de conception initialisé
- [x] Toutes les questions posées et réponses collectées
- [ ] Initialisation du projet Electron + React
- [ ] Construction de l'UI principale
- [ ] Intégration Ollama
- [ ] Contenu des leçons (Niveau 0)
- [ ] Système de progression
- [ ] Labs pratiques
- [ ] CTF
- [ ] Build .exe / .AppImage
