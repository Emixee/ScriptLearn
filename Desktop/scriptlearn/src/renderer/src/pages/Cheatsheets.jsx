import { useState } from 'react'

const LANG_COLORS = { bash: '#22d3ee', python: '#f59e0b', powershell: '#6366f1', kql: '#e879f9', sql: '#34d399', regex: '#fb923c', git: '#60a5fa', spl: '#a78bfa', yaml: '#facc15' }

const SHEETS = {
  bash: {
    label: 'Bash',
    sections: [
      { title: 'Navigation', items: [
        { cmd: 'pwd', desc: 'Répertoire courant' },
        { cmd: 'ls -la', desc: 'Lister les fichiers (détails)' },
        { cmd: 'cd ~/Documents', desc: 'Changer de répertoire' },
        { cmd: 'cd ..', desc: 'Remonter d\'un niveau' },
        { cmd: 'cd -', desc: 'Revenir au répertoire précédent' },
      ]},
      { title: 'Fichiers & Dossiers', items: [
        { cmd: 'touch fichier.txt', desc: 'Créer un fichier' },
        { cmd: 'mkdir -p dossier/sous', desc: 'Créer un dossier (récursif)' },
        { cmd: 'cp src dest', desc: 'Copier' },
        { cmd: 'mv src dest', desc: 'Déplacer / renommer' },
        { cmd: 'rm -rf dossier/', desc: 'Supprimer (récursif)' },
        { cmd: 'cat fichier', desc: 'Afficher le contenu' },
        { cmd: 'head -n 10 f', desc: 'Premières lignes' },
        { cmd: 'tail -f log.txt', desc: 'Suivre un fichier en temps réel' },
      ]},
      { title: 'Texte & Recherche', items: [
        { cmd: 'grep -r "mot" .', desc: 'Chercher dans les fichiers' },
        { cmd: 'grep -i "mot" f', desc: 'Insensible à la casse' },
        { cmd: 'grep -v "mot" f', desc: 'Inverser le filtre' },
        { cmd: 'find . -name "*.log"', desc: 'Trouver des fichiers' },
        { cmd: 'sed \'s/ancien/nouveau/g\'', desc: 'Remplacer du texte' },
        { cmd: 'awk \'{print $1}\'', desc: 'Extraire une colonne' },
        { cmd: 'sort | uniq -c', desc: 'Trier et compter' },
        { cmd: 'wc -l fichier', desc: 'Compter les lignes' },
      ]},
      { title: 'Variables & Scripts', items: [
        { cmd: 'VAR="valeur"', desc: 'Déclarer une variable' },
        { cmd: 'echo $VAR', desc: 'Afficher une variable' },
        { cmd: 'export VAR=val', desc: 'Variable d\'environnement' },
        { cmd: 'read -p "Nom: " N', desc: 'Lire l\'entrée utilisateur' },
        { cmd: '$1, $2, $@', desc: 'Arguments du script' },
        { cmd: '$?', desc: 'Code de retour dernière commande' },
        { cmd: '&&  ||  ;', desc: 'Opérateurs de chaînage' },
      ]},
      { title: 'Conditions & Boucles', items: [
        { cmd: 'if [ -f "f" ]; then…fi', desc: 'Condition (fichier existe)' },
        { cmd: '[ -d dir ]  [ -z "$v" ]', desc: 'Tests courants' },
        { cmd: 'for i in 1 2 3; do…done', desc: 'Boucle for' },
        { cmd: 'for f in *.txt; do…done', desc: 'Boucle sur fichiers' },
        { cmd: 'while read line; do…done', desc: 'Lire ligne par ligne' },
      ]},
      { title: 'Processus & Réseau', items: [
        { cmd: 'ps aux | grep proc', desc: 'Chercher un processus' },
        { cmd: 'kill -9 PID', desc: 'Tuer un processus' },
        { cmd: 'top / htop', desc: 'Moniteur de ressources' },
        { cmd: 'curl -s URL', desc: 'Requête HTTP' },
        { cmd: 'wget URL', desc: 'Télécharger un fichier' },
        { cmd: 'ss -tlnp', desc: 'Ports en écoute' },
        { cmd: 'chmod +x script.sh', desc: 'Rendre exécutable' },
      ]},
    ]
  },
  python: {
    label: 'Python',
    sections: [
      { title: 'Bases', items: [
        { cmd: 'print("texte", end="")', desc: 'Afficher' },
        { cmd: 'x = input("Prompt: ")', desc: 'Lire l\'entrée' },
        { cmd: 'type(x)  isinstance(x, int)', desc: 'Type d\'une variable' },
        { cmd: 'int("42")  str(42)  float("3.14")', desc: 'Conversions' },
        { cmd: 'f"Bonjour {nom}"', desc: 'f-string' },
        { cmd: 'len(obj)  range(n)', desc: 'Fonctions utiles' },
      ]},
      { title: 'Collections', items: [
        { cmd: 'liste = [1, 2, 3]', desc: 'Liste' },
        { cmd: 'liste[0]  liste[-1]  liste[1:3]', desc: 'Accès / slice' },
        { cmd: 'liste.append(x)  liste.pop()', desc: 'Modifier une liste' },
        { cmd: 'd = {"a": 1}  d.get("b", 0)', desc: 'Dictionnaire' },
        { cmd: 'd.keys()  d.values()  d.items()', desc: 'Itérer un dict' },
        { cmd: 's = {1, 2, 3}  s.add(4)', desc: 'Ensemble' },
        { cmd: '[x*2 for x in lst if x > 0]', desc: 'List comprehension' },
      ]},
      { title: 'Contrôle', items: [
        { cmd: 'if x > 0:\n  …\nelif …:\n  …\nelse:', desc: 'Condition' },
        { cmd: 'for i in range(10):', desc: 'Boucle for' },
        { cmd: 'for k, v in d.items():', desc: 'Boucle dict' },
        { cmd: 'while cond:\n  …', desc: 'Boucle while' },
        { cmd: 'break  continue  pass', desc: 'Contrôle boucle' },
        { cmd: 'try:\n  …\nexcept ValueError as e:', desc: 'Exception' },
      ]},
      { title: 'Fonctions', items: [
        { cmd: 'def f(x, y=10, *args, **kw):', desc: 'Définir une fonction' },
        { cmd: 'lambda x: x * 2', desc: 'Fonction anonyme' },
        { cmd: 'map(f, lst)  filter(f, lst)', desc: 'map / filter' },
        { cmd: 'sorted(lst, key=lambda x: x.name)', desc: 'Trier' },
      ]},
      { title: 'Fichiers & OS', items: [
        { cmd: 'with open("f","r") as f:\n  data = f.read()', desc: 'Lire un fichier' },
        { cmd: 'with open("f","w") as f:\n  f.write(s)', desc: 'Écrire un fichier' },
        { cmd: 'import os; os.listdir(".")', desc: 'Lister dossier' },
        { cmd: 'os.path.exists(p)  os.makedirs(p)', desc: 'Vérifier / créer chemin' },
        { cmd: 'import json; json.load(f)', desc: 'Lire JSON' },
        { cmd: 'import csv; csv.reader(f)', desc: 'Lire CSV' },
        { cmd: 'import subprocess; subprocess.run(["ls"])', desc: 'Appel système' },
      ]},
    ]
  },
  powershell: {
    label: 'PowerShell',
    sections: [
      { title: 'Navigation', items: [
        { cmd: 'Get-Location (pwd)', desc: 'Répertoire courant' },
        { cmd: 'Get-ChildItem (ls)', desc: 'Lister les fichiers' },
        { cmd: 'Set-Location (cd) chemin', desc: 'Changer de répertoire' },
        { cmd: 'Get-Content (cat) fichier', desc: 'Lire un fichier' },
        { cmd: 'Get-Help Get-Process', desc: 'Aide sur une commande' },
      ]},
      { title: 'Fichiers & Dossiers', items: [
        { cmd: 'New-Item -Type File f.txt', desc: 'Créer un fichier' },
        { cmd: 'New-Item -Type Directory d', desc: 'Créer un dossier' },
        { cmd: 'Copy-Item src dest', desc: 'Copier' },
        { cmd: 'Move-Item src dest', desc: 'Déplacer' },
        { cmd: 'Remove-Item -Recurse -Force', desc: 'Supprimer' },
        { cmd: 'Set-Content f "texte"', desc: 'Écrire dans un fichier' },
        { cmd: 'Add-Content f "texte"', desc: 'Ajouter à un fichier' },
      ]},
      { title: 'Variables & Types', items: [
        { cmd: '$var = "valeur"', desc: 'Variable' },
        { cmd: '$env:PATH', desc: 'Variable d\'environnement' },
        { cmd: '[int]$n = 42', desc: 'Typage explicite' },
        { cmd: '"Bonjour $nom"', desc: 'Interpolation' },
        { cmd: '@{Nom="Alice"; Age=30}', desc: 'Hashtable' },
        { cmd: '@(1, 2, 3)', desc: 'Tableau' },
        { cmd: '$a = [PSCustomObject]@{…}', desc: 'Objet personnalisé' },
      ]},
      { title: 'Pipeline & Filtres', items: [
        { cmd: '| Where-Object { $_.Age -gt 18 }', desc: 'Filtrer' },
        { cmd: '| Select-Object Name, Age', desc: 'Projeter des colonnes' },
        { cmd: '| Sort-Object -Property Name', desc: 'Trier' },
        { cmd: '| ForEach-Object { … }', desc: 'Itérer' },
        { cmd: '| Group-Object Property', desc: 'Grouper' },
        { cmd: '| Measure-Object -Sum', desc: 'Mesurer' },
        { cmd: '| Out-File rapport.txt', desc: 'Exporter' },
      ]},
      { title: 'Conditions & Boucles', items: [
        { cmd: 'if ($x -gt 0) {…} else {…}', desc: 'Condition' },
        { cmd: 'foreach ($x in $tableau) {…}', desc: 'Boucle for each' },
        { cmd: 'while ($i -lt 10) {…}', desc: 'Boucle while' },
        { cmd: '-eq  -ne  -lt  -gt  -like  -match', desc: 'Opérateurs de comparaison' },
        { cmd: 'try {…} catch {…} finally {…}', desc: 'Gestion d\'erreurs' },
      ]},
      { title: 'Système & Réseau', items: [
        { cmd: 'Get-Process | Stop-Process -Name…', desc: 'Gérer les processus' },
        { cmd: 'Get-Service | Start-Service', desc: 'Gérer les services' },
        { cmd: 'Get-EventLog -Log System', desc: 'Journaux d\'événements' },
        { cmd: 'Invoke-WebRequest -Uri URL', desc: 'Requête HTTP' },
        { cmd: 'Test-NetConnection -Port 443', desc: 'Tester la connectivité' },
        { cmd: 'Get-LocalUser  Get-LocalGroup', desc: 'Utilisateurs locaux' },
      ]},
    ]
  },
  sql: {
    label: 'SQL',
    sections: [
      { title: 'SELECT de base', items: [
        { cmd: 'SELECT * FROM table;', desc: 'Toutes les colonnes' },
        { cmd: 'SELECT col1, col2 FROM table;', desc: 'Colonnes spécifiques' },
        { cmd: 'SELECT DISTINCT col FROM table;', desc: 'Valeurs uniques' },
        { cmd: 'SELECT col AS alias FROM table;', desc: 'Renommer une colonne' },
        { cmd: 'SELECT * FROM table LIMIT 10;', desc: 'Limiter les résultats' },
      ]},
      { title: 'Filtrage & Tri', items: [
        { cmd: 'WHERE col = \'valeur\'', desc: 'Égalité' },
        { cmd: 'WHERE col > 100 AND col2 = \'x\'', desc: 'Condition multiple' },
        { cmd: 'WHERE col BETWEEN 10 AND 50', desc: 'Plage de valeurs' },
        { cmd: 'WHERE col LIKE \'A%\'', desc: 'Recherche avec joker' },
        { cmd: 'WHERE col IN (\'a\', \'b\')', desc: 'Liste de valeurs' },
        { cmd: 'WHERE col IS NULL', desc: 'Valeur nulle' },
        { cmd: 'ORDER BY col DESC', desc: 'Tri décroissant' },
      ]},
      { title: 'Agrégations', items: [
        { cmd: 'COUNT(*)', desc: 'Nombre de lignes' },
        { cmd: 'SUM(col)  AVG(col)', desc: 'Somme / Moyenne' },
        { cmd: 'MAX(col)  MIN(col)', desc: 'Maximum / Minimum' },
        { cmd: 'GROUP BY col', desc: 'Grouper les résultats' },
        { cmd: 'HAVING COUNT(*) > 5', desc: 'Filtrer sur un groupe' },
      ]},
      { title: 'Jointures & Sous-requêtes', items: [
        { cmd: 'INNER JOIN t2 ON t1.id = t2.fk', desc: 'Lignes correspondantes' },
        { cmd: 'LEFT JOIN t2 ON …', desc: 'Toutes les lignes gauche' },
        { cmd: 'WHERE id IN (SELECT …)', desc: 'Sous-requête IN' },
        { cmd: 'WHERE EXISTS (SELECT 1 …)', desc: 'Sous-requête EXISTS' },
        { cmd: 'CREATE VIEW v AS SELECT …', desc: 'Créer une vue' },
      ]},
    ]
  },
  regex: {
    label: 'Regex',
    sections: [
      { title: 'Métacaractères', items: [
        { cmd: '.', desc: 'N\'importe quel caractère' },
        { cmd: '\\d  \\D', desc: 'Chiffre / Non-chiffre' },
        { cmd: '\\w  \\W', desc: 'Mot / Non-mot' },
        { cmd: '\\s  \\S', desc: 'Espace / Non-espace' },
        { cmd: '[abc]  [a-z]', desc: 'Classe de caractères' },
        { cmd: '[^abc]', desc: 'Sauf ces caractères' },
      ]},
      { title: 'Quantificateurs', items: [
        { cmd: '*', desc: '0 ou plusieurs' },
        { cmd: '+', desc: '1 ou plusieurs' },
        { cmd: '?', desc: '0 ou 1 (optionnel)' },
        { cmd: '{n}  {n,m}', desc: 'Exactement n / entre n et m' },
        { cmd: '*?  +?', desc: 'Lazy (minimum)' },
      ]},
      { title: 'Ancres & Groupes', items: [
        { cmd: '^  $', desc: 'Début / Fin de chaîne' },
        { cmd: '\\b', desc: 'Word boundary' },
        { cmd: '(...)  (?:...)', desc: 'Groupe / Non-capturant' },
        { cmd: '(?P<nom>...)', desc: 'Groupe nommé' },
        { cmd: 'A|B', desc: 'Alternance (OU)' },
      ]},
      { title: 'Assertions & Python re', items: [
        { cmd: '(?=...)  (?!...)', desc: 'Lookahead positif/négatif' },
        { cmd: '(?<=...)  (?<!...)', desc: 'Lookbehind positif/négatif' },
        { cmd: 're.search(r\'pat\', s)', desc: '1er match' },
        { cmd: 're.findall(r\'pat\', s)', desc: 'Liste des matchs' },
        { cmd: 're.sub(r\'pat\', repl, s)', desc: 'Remplacer' },
        { cmd: 're.split(r\'pat\', s)', desc: 'Découper' },
        { cmd: 're.compile(r\'pat\')', desc: 'Compiler (performance)' },
      ]},
    ]
  },
  git: {
    label: 'Git',
    sections: [
      { title: 'Dépôt local', items: [
        { cmd: 'git init', desc: 'Initialiser un dépôt' },
        { cmd: 'git status', desc: 'État des fichiers' },
        { cmd: 'git add .', desc: 'Stager tous les fichiers' },
        { cmd: 'git add fichier.txt', desc: 'Stager un fichier' },
        { cmd: 'git commit -m "msg"', desc: 'Créer un commit' },
        { cmd: 'git log --oneline', desc: 'Historique condensé' },
        { cmd: 'git diff', desc: 'Changements non stagés' },
      ]},
      { title: 'Branches', items: [
        { cmd: 'git branch', desc: 'Lister les branches' },
        { cmd: 'git branch nom', desc: 'Créer une branche' },
        { cmd: 'git switch nom', desc: 'Basculer sur une branche' },
        { cmd: 'git switch -c nom', desc: 'Créer + basculer' },
        { cmd: 'git merge branche', desc: 'Fusionner une branche' },
        { cmd: 'git branch -d nom', desc: 'Supprimer (fusionnée)' },
        { cmd: 'git log --graph --all', desc: 'Graphe des branches' },
      ]},
      { title: 'Remote', items: [
        { cmd: 'git clone URL', desc: 'Cloner un dépôt' },
        { cmd: 'git remote -v', desc: 'Voir les remotes' },
        { cmd: 'git push origin main', desc: 'Pousser' },
        { cmd: 'git push -u origin nom', desc: 'Push + tracking' },
        { cmd: 'git pull', desc: 'Récupérer + fusionner' },
        { cmd: 'git fetch origin', desc: 'Récupérer seulement' },
        { cmd: 'git push origin --delete n', desc: 'Supprimer branche remote' },
      ]},
      { title: 'Avancé', items: [
        { cmd: 'git stash', desc: 'Mettre en pause' },
        { cmd: 'git stash pop', desc: 'Restaurer le stash' },
        { cmd: 'git tag -a v1.0 -m "…"', desc: 'Créer un tag annoté' },
        { cmd: 'git rebase main', desc: 'Rebaser sur main' },
        { cmd: 'git reset --soft HEAD~1', desc: 'Annuler commit (garde staging)' },
        { cmd: 'git reset --hard HEAD~1', desc: 'Annuler (DESTRUCTIF)' },
        { cmd: 'git revert abc123', desc: 'Annuler proprement' },
        { cmd: 'git cherry-pick abc123', desc: 'Copier un commit' },
      ]},
    ]
  },
  kql: {
    label: 'KQL',
    sections: [
      { title: 'Tables courantes', items: [
        { cmd: 'SecurityEvent', desc: 'Logs Windows (4624, 4625…)' },
        { cmd: 'SigninLogs', desc: 'Connexions Azure AD' },
        { cmd: 'Syslog', desc: 'Logs Linux' },
        { cmd: 'AzureActivity', desc: 'Actions sur l\'abonnement Azure' },
        { cmd: 'SecurityAlert', desc: 'Alertes Defender/Sentinel' },
        { cmd: 'DnsEvents', desc: 'Requêtes DNS' },
        { cmd: 'NetworkCommunicationEvents', desc: 'Connexions réseau' },
      ]},
      { title: 'Opérateurs essentiels', items: [
        { cmd: '| where TimeGenerated > ago(24h)', desc: 'Filtrer par temps' },
        { cmd: '| where EventID == 4625', desc: 'Filtrer par valeur' },
        { cmd: '| project Col1, Col2', desc: 'Sélectionner des colonnes' },
        { cmd: '| extend NewCol = expression', desc: 'Ajouter une colonne calculée' },
        { cmd: '| summarize Count=count() by IP', desc: 'Agréger' },
        { cmd: '| sort by Count desc', desc: 'Trier' },
        { cmd: '| take 100', desc: 'Limiter les résultats' },
        { cmd: '| distinct Column', desc: 'Valeurs uniques' },
      ]},
      { title: 'Fonctions temporelles', items: [
        { cmd: 'ago(1h)  ago(7d)  ago(30m)', desc: 'Temps relatif' },
        { cmd: 'bin(TimeGenerated, 1h)', desc: 'Regrouper par intervalle' },
        { cmd: 'hourofday(TimeGenerated)', desc: 'Heure (0-23)' },
        { cmd: 'dayofweek(TimeGenerated)', desc: 'Jour de semaine (0=dim)' },
        { cmd: 'startofday(now())', desc: 'Début du jour' },
        { cmd: 'datetime("2024-01-01")', desc: 'Date littérale' },
      ]},
      { title: 'Fonctions de texte', items: [
        { cmd: 'has "mot"  has_any (list)', desc: 'Recherche de mot' },
        { cmd: 'contains "sous-chaîne"', desc: 'Contient (insensible)' },
        { cmd: 'matches regex @"pattern"', desc: 'Expression régulière' },
        { cmd: 'extract(@"IP:(\\d+\\.\\d+)", 1, s)', desc: 'Extraire avec regex' },
        { cmd: 'split(str, ",")', desc: 'Diviser une chaîne' },
        { cmd: 'strcat(a, b)', desc: 'Concaténer' },
        { cmd: 'strlen(col)', desc: 'Longueur' },
      ]},
      { title: 'Agrégations', items: [
        { cmd: 'count()  countif(cond)', desc: 'Compter' },
        { cmd: 'dcount(col)', desc: 'Nb valeurs distinctes' },
        { cmd: 'sum(col)  avg(col)  max(col)', desc: 'Mathématiques' },
        { cmd: 'make_set(col)  make_list(col)', desc: 'Créer un tableau' },
        { cmd: 'arg_max(Time, *)', desc: 'Ligne avec valeur max' },
        { cmd: 'percentile(col, 95)', desc: 'Percentile' },
      ]},
      { title: 'Avancé', items: [
        { cmd: 'let threshold = 10;', desc: 'Variable réutilisable' },
        { cmd: 'join kind=inner (…) on $left.Col', desc: 'Jointure' },
        { cmd: 'union Table1, Table2', desc: 'Fusionner des tables' },
        { cmd: 'render timechart', desc: 'Graphique temporel' },
        { cmd: 'render barchart', desc: 'Graphique en barres' },
        { cmd: '// commentaire', desc: 'Commentaire' },
      ]},
    ]
  },
  spl: {
    label: 'SPL',
    sections: [
      { title: 'Recherche de base', items: [
        { cmd: 'index=main', desc: 'Chercher dans un index' },
        { cmd: 'index=security sourcetype=wineventlog', desc: 'Filtrer par sourcetype' },
        { cmd: 'index=web host=srv01 status=404', desc: 'Filtres en base' },
        { cmd: 'EventCode=4625', desc: 'Filtre de champ' },
      ]},
      { title: 'Commandes fondamentales', items: [
        { cmd: '| head 10  | tail 10', desc: 'Premières / Dernières lignes' },
        { cmd: '| fields host, user, EventCode', desc: 'Sélectionner des champs' },
        { cmd: '| fields -_raw', desc: 'Exclure un champ' },
        { cmd: '| table col1, col2', desc: 'Affichage tabulaire' },
        { cmd: '| rename EventCode AS code', desc: 'Renommer un champ' },
        { cmd: '| sort -count', desc: 'Trier (décroissant)' },
        { cmd: '| dedup user', desc: 'Dédoublonner' },
      ]},
      { title: 'Filtrage & Transformation', items: [
        { cmd: '| where EventCode=4625', desc: 'Filtre booléen' },
        { cmd: '| where user!="SYSTEM"', desc: 'Exclusion' },
        { cmd: '| search "error" OR "failed"', desc: 'Recherche texte' },
        { cmd: '| eval f = if(c<400,"OK","ERR")', desc: 'Champ calculé' },
        { cmd: '| eval ts = strftime(_time,"%H:%M")', desc: 'Formater date' },
        { cmd: '| rex field=_raw "src=(?P<ip>[\\d.]+)"', desc: 'Extraire par regex' },
      ]},
      { title: 'Statistiques', items: [
        { cmd: '| stats count BY user', desc: 'Compter par groupe' },
        { cmd: '| stats count, dc(host)', desc: 'Plusieurs aggrégations' },
        { cmd: '| stats avg(dur) BY host', desc: 'Moyenne par groupe' },
        { cmd: '| top 10 src_ip', desc: 'Top 10 valeurs' },
        { cmd: '| rare user', desc: 'Valeurs rares (anomalies)' },
        { cmd: '| timechart span=1h count', desc: 'Graphe temporel' },
      ]},
    ]
  },
  yaml: {
    label: 'YAML',
    sections: [
      { title: 'Syntaxe de base', items: [
        { cmd: 'clé: valeur', desc: 'Paire clé-valeur' },
        { cmd: 'actif: true', desc: 'Booléen' },
        { cmd: 'port: 8080', desc: 'Entier' },
        { cmd: 'vide: null', desc: 'Valeur nulle' },
        { cmd: '# commentaire', desc: 'Commentaire' },
        { cmd: '"yes"  "true"  "1.0"', desc: 'Forcer le type chaîne' },
      ]},
      { title: 'Listes', items: [
        { cmd: 'items:\n  - nginx\n  - redis', desc: 'Liste bloc' },
        { cmd: 'tags: [web, api, v2]', desc: 'Liste inline (flow)' },
        { cmd: 'services:\n  - name: web\n    port: 80', desc: 'Liste de mappings' },
      ]},
      { title: 'Structures imbriquées', items: [
        { cmd: 'server:\n  host: localhost\n  port: 8080', desc: 'Mapping imbriqué' },
        { cmd: 'app:\n  db:\n    host: db.local', desc: 'Imbrication profonde' },
        { cmd: 'env: {NODE_ENV: prod}', desc: 'Mapping inline (flow)' },
      ]},
      { title: 'Chaînes multi-lignes', items: [
        { cmd: 'script: |\n  ligne 1\n  ligne 2', desc: 'Littéral | (sauts conservés)' },
        { cmd: 'desc: >\n  longue ligne\n  repliée', desc: 'Replié > (fusionne lignes)' },
      ]},
      { title: 'Ancres & Alias', items: [
        { cmd: 'defaults: &defaults\n  timeout: 30', desc: 'Définir une ancre' },
        { cmd: 'prod:\n  <<: *defaults', desc: 'Alias avec merge key' },
        { cmd: 'prod:\n  <<: *defaults\n  timeout: 5', desc: 'Override après merge' },
      ]},
      { title: 'Multi-documents & Types', items: [
        { cmd: '---', desc: 'Séparateur de documents' },
        { cmd: 'port: !!int "8080"', desc: 'Forcer entier' },
        { cmd: 'version: !!str 1.0', desc: 'Forcer chaîne' },
        { cmd: 'version: "3.9"', desc: 'Docker Compose (string)' },
      ]},
    ]
  }
}

function Section({ section, color }) {
  return (
    <div className="mb-4">
      <h3 className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color }}>{section.title}</h3>
      <div className="space-y-1">
        {section.items.map((item, i) => (
          <div key={i} className="flex gap-3 py-1 border-b border-[#1a1d2e]">
            <code className="text-xs font-mono flex-shrink-0 w-48 text-slate-200 leading-relaxed">{item.cmd}</code>
            <span className="text-xs text-slate-500 leading-relaxed">{item.desc}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Cheatsheets() {
  const [lang, setLang] = useState('bash')
  const sheet = SHEETS[lang]
  const color = LANG_COLORS[lang]

  const handlePrint = () => window.print()

  return (
    <div className="p-8 overflow-y-auto h-full">
      <div className="flex items-center gap-4 mb-6">
        <h1 className="text-2xl font-bold text-white">Aide-mémoire</h1>
        <div className="flex gap-2 ml-2">
          {Object.keys(SHEETS).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                lang === l ? 'text-white' : 'bg-[#1a1d2e] text-slate-400 hover:text-white border border-[#2d3748]'
              }`}
              style={lang === l ? { backgroundColor: LANG_COLORS[l] } : {}}
            >
              {SHEETS[l].label}
            </button>
          ))}
        </div>
        <button
          onClick={handlePrint}
          className="ml-auto flex items-center gap-2 bg-[#232640] hover:bg-[#2d3258] text-slate-300 px-4 py-2 rounded-lg text-sm transition-colors"
        >
          🖨️ Imprimer
        </button>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {sheet.sections.map((section, i) => (
          <div key={i} className="bg-[#1a1d2e] rounded-xl p-5 border border-[#2d3748]">
            <Section section={section} color={color} />
          </div>
        ))}
      </div>
    </div>
  )
}
