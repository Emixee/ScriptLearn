// ============================================================================
// validators/sql.js — Validation RÉELLE des actes capstone SQL via sql.js.
//
// POURQUOI ce module : les actes SQL étaient validés par mots-clés (« la requête
// contient-elle "group by" ? »). C'est trompeur : une requête qui contient les
// bons mots mais renvoie de mauvaises lignes passait quand même. Ici on EXÉCUTE
// vraiment la requête de l'élève dans une base SQLite (sql.js = SQLite compilé en
// WebAssembly, 100% hors-ligne) seedée avec des tables connues, et on COMPARE le
// jeu de lignes produit à celui de la requête de référence. C'est exactement ce
// que ferait un vrai SGBD.
//
// Le WASM est chargé via locateFile depuis public/sqljs/ (asarUnpack en prod —
// même schéma que les assets v86 : un fetch file:// dans l'asar échouerait).
// ============================================================================

import initSqlJs from 'sql.js'

// Base de démonstration : tables employes / commandes (cf. synopsis de la Voie).
// Données FIGÉES : les résultats attendus des capstones en dépendent — ne pas
// modifier sans recalculer les corrections de référence.
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

// Exécute une requête et renvoie uniquement les VALEURS des lignes (pas les noms
// de colonnes : ils varient selon la frappe — COUNT(*) vs count — et ne doivent
// pas faire échouer une requête par ailleurs correcte).
function rows(db, query) {
  const res = db.exec(query)
  return res.length ? res[0].values : []
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

// validateSql(chapter, code) → { correct, output }
//   - On seede une base neuve, on exécute la requête de référence (chapter.correction)
//     pour obtenir le résultat attendu, puis la requête de l'élève, et on compare.
//   - chapter.sqlOrdered : true si l'ordre des lignes fait partie de la consigne.
export async function validateSql(chapter, code) {
  let SQL
  try {
    SQL = await getSql()
  } catch (e) {
    return { correct: false, output: 'Moteur SQL indisponible : ' + String(e?.message ?? e) }
  }
  const db = new SQL.Database()
  try {
    db.run(SEED)
    const expected = rows(db, chapter.correction)
    let actual
    try {
      actual = rows(db, code)
    } catch (e) {
      // Erreur SQL de l'élève (syntaxe, table/colonne inconnue) → échec lisible.
      return { correct: false, output: 'Erreur SQL : ' + String(e?.message ?? e) }
    }
    const correct = sameRows(expected, actual, !!chapter.sqlOrdered)
    const output = correct
      ? `Requête correcte — ${actual.length} ligne(s).`
      : `Résultat inattendu : ${actual.length} ligne(s) obtenue(s), ${expected.length} attendue(s).`
    return { correct, output }
  } finally {
    db.close() // libère la mémoire WASM de cette base jetable
  }
}
