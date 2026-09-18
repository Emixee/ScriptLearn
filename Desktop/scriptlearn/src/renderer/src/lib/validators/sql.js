// ============================================================================
// validators/sql.js — Validation RÉELLE des exercices et actes SQL via sql.js.
//
// POURQUOI ce module : les exercices SQL étaient validés par mots-clés (« la
// requête contient-elle "group by" ? »). C'est trompeur dans les deux sens : une
// requête qui contient les bons mots mais renvoie de mauvaises lignes passait,
// et un simple COMMENTAIRE contenant ces mots passait aussi. Ici on EXÉCUTE
// vraiment la requête de l'élève dans une base SQLite (sql.js = SQLite compilé en
// WebAssembly, 100% hors-ligne) seedée avec des tables connues, et on COMPARE le
// résultat à celui de la requête de référence. C'est exactement ce que ferait un
// vrai SGBD.
//
// DEUX modes de comparaison, choisis automatiquement :
//   1. La référence produit un JEU DE LIGNES (SELECT) → on compare les lignes.
//   2. La référence ne produit RIEN (INSERT/UPDATE/DELETE/CREATE/DROP…) → on
//      compare l'ÉTAT de la base après exécution (schéma + contenu des tables).
//      POURQUOI : sans ça, tout exercice DML/DDL avait un résultat attendu vide,
//      donc n'importe quelle instruction sans résultat (`DROP TABLE commandes` !)
//      était jugée correcte.
//
// Le WASM est chargé via locateFile depuis public/sqljs/ (asarUnpack en prod —
// même schéma que les assets v86 : un fetch file:// dans l'asar échouerait).
// ============================================================================

import initSqlJs from 'sql.js'

// ── Base de démonstration ────────────────────────────────────────────────────
// Deux schémas cohabitent volontairement (aucun nom en commun) :
//   • employes / commandes  → actes capstone de la Voie SQL (missions)
//   • employees / departments / customers / orders / … → exercices des cours
// Données FIGÉES : les résultats attendus sont calculés en exécutant la
// correction de l'auteur sur CETTE base. Modifier une ligne change donc le
// résultat attendu de tous les exercices concernés — à ne faire qu'en connaissance
// de cause (le script `npm run content:check` revérifie que chaque correction
// s'exécute toujours sans erreur).
const SEED = `
CREATE TABLE employes (id INTEGER PRIMARY KEY, nom TEXT, prenom TEXT, ville TEXT, departement TEXT, salaire INTEGER);
INSERT INTO employes VALUES
 (1,'Durand','Alice','Lyon','IT',3200),
 (2,'Martin','Bruno','Paris','IT',2600),
 (3,'Dubois','Chloe','Lyon','Finance',2400),
 (4,'Leroy','David','Paris','Finance',4100),
 (5,'Moreau','Emma','Lyon','IT',3500),
 (6,'Dupont','Felix','Nice','RH',2200),
 (7,'Bernard','Gina','Paris','Finance',3900),
 (8,'Petit','Hugo','Lyon','IT',2900),
 (9,'Roux','Ines','Nice','RH',2100),
 (10,'Garnier','Jules','Paris','Finance',3300);
CREATE TABLE commandes (id INTEGER PRIMARY KEY, employe_id INTEGER, montant INTEGER);
INSERT INTO commandes VALUES
 (1,1,500),(2,1,300),(3,4,1200),(4,5,800),(5,7,600),
 (6,2,250),(7,4,400),(8,10,900),(9,8,150),(10,5,900);

-- Schéma des COURS (parcours SQL) : anglais, volontairement distinct du schéma
-- des missions ci-dessus pour que les deux puissent vivre dans la même base.
CREATE TABLE departments (id INTEGER PRIMARY KEY, name TEXT, city TEXT);
INSERT INTO departments VALUES
 (1,'IT','Paris'),(2,'Dev','Lyon'),(3,'Sec','Paris'),(4,'RH','Nice'),(5,'Finance','Lyon');
CREATE TABLE employees (
  id INTEGER PRIMARY KEY, name TEXT, department TEXT, salary INTEGER,
  dept_id INTEGER, manager_id INTEGER, email TEXT, phone TEXT,
  hire_date TEXT, years_exp INTEGER
);
INSERT INTO employees VALUES
 (1,'Alice Durand','IT',85000,1,NULL,'alice@corp.io','0601020304','2015-03-01',12),
 (2,'Bruno Martin','IT',62000,1,1,'bruno@corp.io',NULL,'2018-09-15',6),
 (3,'Chloe Dubois','Dev',54000,2,1,'chloe@corp.io','0611121314','2019-01-20',5),
 (4,'David Leroy','Dev',91000,2,1,'david@corp.io',NULL,'2012-06-11',14),
 (5,'Emma Moreau','Sec',73000,3,1,'emma@corp.io','0621222324','2017-11-02',8),
 (6,'Felix Dupont','RH',38000,4,5,'felix@corp.io',NULL,'2021-02-08',2),
 (7,'Gina Bernard','Finance',18000,5,5,'gina@corp.io','0631323334','2022-07-25',1),
 (8,'Hugo Petit','IT',69000,1,1,'hugo@corp.io',NULL,'2016-04-19',9),
 (9,'Ines Roux','Sec',47000,3,5,'ines@corp.io','0641424344','2020-10-05',4),
 (10,'Anna Garnier','Dev',82000,NULL,1,'anna@corp.io',NULL,'2014-08-30',11);
CREATE TABLE customers (id INTEGER PRIMARY KEY, name TEXT, email TEXT);
INSERT INTO customers VALUES
 (1,'Client Alpha','alpha@client.io'),(2,'Client Beta','beta@client.io'),
 (3,'Client Gamma','gamma@client.io'),(4,'Client Delta','delta@client.io');
CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, total INTEGER);
INSERT INTO orders VALUES (1,1,500),(2,1,300),(3,2,1200),(4,3,800);
CREATE TABLE leads (id INTEGER PRIMARY KEY, email TEXT);
INSERT INTO leads VALUES (1,'lead1@mail.io'),(2,'beta@client.io');
CREATE TABLE unsubscribed (id INTEGER PRIMARY KEY, email TEXT);
INSERT INTO unsubscribed VALUES (1,'gamma@client.io');
CREATE TABLE comptes (id INTEGER PRIMARY KEY, solde INTEGER);
INSERT INTO comptes VALUES (1,2000),(2,750);
CREATE TABLE logs (message TEXT);
CREATE TABLE dim_product (id INTEGER PRIMARY KEY, category TEXT, name TEXT);
INSERT INTO dim_product VALUES (1,'Logiciel','Suite Pro'),(2,'Materiel','Station'),(3,'Logiciel','Add-on');
CREATE TABLE fact_sales (id INTEGER PRIMARY KEY, product_id INTEGER, revenue INTEGER, month TEXT);
INSERT INTO fact_sales VALUES (1,1,1500,'2024-01'),(2,2,900,'2024-01'),(3,1,1100,'2024-02'),(4,3,300,'2024-02');
CREATE TABLE sales (id INTEGER PRIMARY KEY, revenue INTEGER, quantity INTEGER);
INSERT INTO sales VALUES (1,1000,4),(2,750,0),(3,300,3);
CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT);
INSERT INTO settings VALUES ('max_users','50'),('theme','dark');
CREATE TABLE users (id INTEGER PRIMARY KEY, name TEXT);
INSERT INTO users VALUES (1,'root'),(2,'guest');
CREATE VIEW v_high_salaries AS SELECT name, salary FROM employees WHERE salary > 80000;
`

// Le module SQL.js (et son WASM) ne se charge qu'une fois — on mémorise la
// promesse pour ne pas réinstancier le runtime à chaque validation.
let sqlPromise = null
function getSql() {
  if (!sqlPromise) {
    // En dev, Vite sert public/ à la racine (/sqljs) ; en prod (file://), les
    // assets sont en ./sqljs relativement à index.html (out/renderer/sqljs),
    // dépaquetés de l'asar (asarUnpack **/sqljs/**).
    const base = import.meta.env.DEV ? '/sqljs/' : './sqljs/'
    sqlPromise = initSqlJs({ locateFile: (f) => base + f })
  }
  return sqlPromise
}

// Exécute du SQL (une ou plusieurs instructions) et renvoie les VALEURS du
// DERNIER jeu de résultats produit, ou `null` si aucune instruction n'en produit.
// On ignore les noms de colonnes : ils varient selon la frappe (COUNT(*) vs
// count) et ne doivent pas faire échouer une requête par ailleurs correcte.
function lastResult(db, sql) {
  const res = db.exec(sql)
  if (!res.length) return null
  const last = res[res.length - 1]
  return { columns: (last.columns ?? []).map(c => String(c).toLowerCase()), values: last.values }
}

// Empreinte de l'ÉTAT de la base : schéma (sémantique, pas textuel) + contenu.
// POURQUOI un schéma « sémantique » (PRAGMA table_info) plutôt que le texte du
// CREATE TABLE : deux CREATE TABLE équivalents peuvent s'écrire différemment
// (espaces, INT vs INTEGER, IF NOT EXISTS). On compare donc la liste des
// colonnes, leur type, NOT NULL, la clé primaire et la valeur par défaut.
// Limite assumée : une contrainte CHECK n'apparaît pas dans table_info, elle
// n'est donc pas comparée.
function snapshot(db) {
  const objsRes = db.exec("SELECT type, name, COALESCE(tbl_name,'') FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type, name")
  const objs = objsRes.length ? objsRes[0].values : []
  const parts = ['objets:' + JSON.stringify(objs)]
  for (const [type, name] of objs) {
    if (type !== 'table' && type !== 'view') continue
    try {
      const info = db.exec(`PRAGMA table_info("${name}")`)
      const cols = (info.length ? info[0].values : []).map(r => [r[1], String(r[2] ?? '').toLowerCase(), r[3], r[4], r[5]])
      parts.push(`colonnes:${name}:${JSON.stringify(cols)}`)
    } catch { parts.push(`colonnes:${name}:illisible`) }
    if (type !== 'table') continue
    try {
      const rows = db.exec(`SELECT * FROM "${name}"`)
      const values = (rows.length ? rows[0].values : []).map(r => JSON.stringify(r)).sort()
      parts.push(`lignes:${name}:${JSON.stringify(values)}`)
    } catch { parts.push(`lignes:${name}:illisible`) }
  }
  return parts.join('\n')
}

// Compare deux jeux de lignes. ordered=false → comparaison ensembliste (l'ordre
// des lignes n'est pas imposé) ; ordered=true → l'ordre compte (tâches ORDER BY).
function sameRows(expected, actual, ordered) {
  if (expected.length !== actual.length) return false
  const norm = (r) => JSON.stringify(r)
  let e = expected.map(norm)
  let a = actual.map(norm)
  if (!ordered) { e = e.slice().sort(); a = a.slice().sort() }
  return e.every((v, i) => v === a[i])
}

const msgOf = (e) => String(e?.message ?? e)

// validateSql(chapter, code) → { correct, output }
//   - chapter.correction : requête de RÉFÉRENCE de l'auteur (obligatoire)
//   - chapter.sqlOrdered : true si l'ordre des lignes fait partie de la consigne
export async function validateSql(chapter, code) {
  if (!chapter?.correction) {
    return { correct: false, output: 'Exercice mal configuré : aucune requête de référence.' }
  }
  let SQL
  try {
    SQL = await getSql()
  } catch (e) {
    return { correct: false, output: 'Moteur SQL indisponible : ' + msgOf(e) }
  }

  // Deux bases INDÉPENDANTES : la correction et le code de l'élève peuvent tous
  // deux modifier les données ; les exécuter dans la même base ferait dépendre
  // le résultat de l'ordre d'exécution.
  let refDb = null
  let stuDb = null
  try {
    // Le try englobe TOUT, y compris le seed et la requête de référence.
    // POURQUOI : sans catch, une erreur ici remontait hors de validateSql (donc
    // hors de useCodeRunner) — promesse rejetée et UI bloquée sur « Validation… ».
    refDb = new SQL.Database()
    stuDb = new SQL.Database()
    try {
      refDb.run(SEED)
      stuDb.run(SEED)
    } catch (e) {
      return { correct: false, output: 'Base de démonstration invalide : ' + msgOf(e) }
    }

    let expected, expectedState
    try {
      expected = lastResult(refDb, chapter.correction)
      expectedState = snapshot(refDb)
    } catch (e) {
      // Erreur dans la requête de RÉFÉRENCE : c'est un défaut de l'exercice, pas
      // de l'élève. On le dit clairement au lieu de le lui imputer.
      return { correct: false, output: "Exercice mal configuré : la correction de référence échoue (" + msgOf(e) + ')' }
    }

    let actual, actualState
    try {
      actual = lastResult(stuDb, code)
      actualState = snapshot(stuDb)
    } catch (e) {
      // Erreur SQL de l'élève (syntaxe, table/colonne inconnue) → échec lisible.
      return { correct: false, output: 'Erreur SQL : ' + msgOf(e) }
    }

    // Mode 1 : la référence renvoie des lignes → on compare les lignes.
    if (expected !== null) {
      if (actual === null) {
        return { correct: false, output: 'Aucun résultat : la requête attendue renvoie des lignes.' }
      }
      // Les NOMS de colonnes ne sont comparés que si l'exercice le demande
      // (chapter.sqlCheckColumns). POURQUOI cette option : comparer les valeurs
      // seules laisse passer un exercice « donnez un alias » sans alias ; mais
      // comparer systématiquement les noms ferait échouer une requête correcte
      // dont l'alias libre diffère. Le drapeau n'est posé que sur les exercices
      // dont la consigne nomme explicitement les alias attendus.
      if (chapter.sqlCheckColumns && JSON.stringify(expected.columns) !== JSON.stringify(actual.columns)) {
        return {
          correct: false,
          output: `Noms de colonnes attendus : ${expected.columns.join(', ')} — obtenus : ${actual.columns.join(', ') || '(aucun)'}.`
        }
      }
      const correct = sameRows(expected.values, actual.values, !!chapter.sqlOrdered)
      return {
        correct,
        output: correct
          ? `Requête correcte — ${actual.values.length} ligne(s).`
          : `Résultat inattendu : ${actual.values.length} ligne(s) obtenue(s), ${expected.values.length} attendue(s).`
      }
    }

    // Mode 2 : la référence ne renvoie rien → on compare l'ÉTAT de la base.
    const correct = actualState === expectedState
    return {
      correct,
      output: correct
        ? 'État de la base conforme au résultat attendu.'
        : "L'état de la base ne correspond pas au résultat attendu (schéma ou données)."
    }
  } finally {
    // libère la mémoire WASM de ces bases jetables
    try { refDb?.close() } catch { /* déjà fermée */ }
    try { stuDb?.close() } catch { /* déjà fermée */ }
  }
}
