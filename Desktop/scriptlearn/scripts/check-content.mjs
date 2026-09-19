// ============================================================================
// check-content.mjs — Vérifications d'intégrité du CONTENU pédagogique.
//
// POURQUOI ce script : le contenu (213 modules, ~800 exercices, 23 campagnes)
// est du JSON écrit à la main, et rien ne le vérifiait. L'audit de septembre 2026
// a trouvé, entre autres : des validations impossibles à échouer, des exercices
// dont la correction de référence ne satisfait pas ses propres mots-clés, et 80
// titres différents entre index.json et le fichier du module. Ce sont exactement
// les défauts qu'un humain ne voit pas en relisant, et qu'une machine attrape en
// une seconde.
//
// Usage :  node scripts/check-content.mjs [--strict]
//   --strict : les AVERTISSEMENTS deviennent bloquants (utile en CI une fois le
//              contenu nettoyé).
// Sortie : code 1 si au moins une ERREUR (ou un avertissement en --strict).
//
// Aucune dépendance : node seul, pour pouvoir tourner en CI sans installer l'app.
// ============================================================================
import { readdirSync, readFileSync, existsSync, statSync } from 'fs'
import { join, dirname, resolve, basename } from 'path'
import { fileURLToPath } from 'url'

// ROOT ancré sur l'emplacement DU SCRIPT et non sur le répertoire courant :
// lancé depuis un autre dossier, un `resolve('...')` viserait n'importe où.
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CONTENT = join(ROOT, 'src/renderer/src/content')

const STRICT = process.argv.includes('--strict')
const errors = []
const warnings = []
const debts = []
const err = (msg) => errors.push(msg)
const warn = (msg) => warnings.push(msg)
// Dette CONNUE : un défaut réel, déjà inventorié, qui ne doit pas bloquer la CI
// tant qu'il n'est pas traité. Le compteur reste affiché pour que la dette ne
// devienne pas invisible.
const debt = (msg) => debts.push(msg)

const readJson = (p) => JSON.parse(readFileSync(p, 'utf8'))

const KNOWN = existsSync(join(ROOT, 'scripts/content-known-issues.json'))
  ? readJson(join(ROOT, 'scripts/content-known-issues.json'))
  : { keywordMismatch: [], titleMismatch: [] }
const knownKeyword = new Set(KNOWN.keywordMismatch ?? [])
const knownTitle = new Set(KNOWN.titleMismatch ?? [])

// ── 1. Catalogue : index.json ↔ fichiers de leçons ──────────────────────────
const index = readJson(join(CONTENT, 'index.json'))

// Références déclarées par index.json : { id → { title, lang } }
const declared = new Map()
for (const level of index.levels ?? []) {
  for (const [lang, refs] of Object.entries(level.languages ?? {})) {
    for (const ref of refs ?? []) declared.set(ref.id, { title: ref.title, lang, levelId: level.id })
  }
}
for (const [trackKey, track] of Object.entries(index.complementary?.tracks ?? {})) {
  for (const level of track.levels ?? []) {
    for (const mod of level.modules ?? []) declared.set(mod.id, { title: mod.title, lang: trackKey, levelId: level.id })
  }
}

// Fichiers de leçons présents sur le disque.
const lessonFiles = []
for (const entry of readdirSync(CONTENT)) {
  const dir = join(CONTENT, entry)
  if (!statSync(dir).isDirectory() || entry === 'missions') continue
  for (const sub of readdirSync(dir)) {
    const levelDir = join(dir, sub)
    if (!statSync(levelDir).isDirectory()) continue
    for (const f of readdirSync(levelDir)) {
      if (f.endsWith('.json')) lessonFiles.push({ path: join(levelDir, f), folderLang: entry, levelFolder: sub })
    }
  }
}

// Langages couverts par le glob de loader.js : Vite exige un littéral, donc la
// liste est écrite en dur là-bas — un dossier hors de cette liste serait
// silencieusement IGNORÉ au chargement (getModule renverrait null).
const loaderSrc = readFileSync(join(CONTENT, 'loader.js'), 'utf8')
const globMatch = /import\.meta\.glob\('\.\/\{([^}]+)\}/.exec(loaderSrc)
const globLangs = globMatch ? globMatch[1].split(',').map(s => s.trim()) : []
if (!globLangs.length) err('loader.js : impossible de lire la liste de langages du glob.')

const seenIds = new Map()
const modulesById = new Map()
for (const { path, folderLang } of lessonFiles) {
  let mod
  try { mod = readJson(path) } catch (e) { err(`${path} : JSON invalide — ${e.message}`); continue }
  if (!mod.id) { err(`${path} : champ "id" manquant.`); continue }
  if (seenIds.has(mod.id)) err(`id dupliqué "${mod.id}" : ${basename(path)} et ${basename(seenIds.get(mod.id))} (MODULE_MAP en écrase un silencieusement)`)
  seenIds.set(mod.id, path)
  modulesById.set(mod.id, { mod, path, folderLang })

  if (basename(path, '.json') !== mod.id) warn(`${basename(path)} : le nom de fichier ne correspond pas à l'id "${mod.id}".`)
  if (mod.lang && mod.lang !== folderLang) err(`${mod.id} : lang="${mod.lang}" mais le module est dans le dossier "${folderLang}".`)
  if (!globLangs.includes(folderLang)) err(`dossier "${folderLang}" absent du glob de loader.js : ses modules ne seront JAMAIS chargés.`)
  if (!declared.has(mod.id)) err(`${mod.id} : présent sur le disque mais absent d'index.json (invisible dans l'app).`)
  else {
    const d = declared.get(mod.id)
    if (d.title !== mod.title && !knownTitle.has(mod.id)) warn(`${mod.id} : titre différent entre index.json ("${d.title}") et le module ("${mod.title}").`)
  }
}
for (const id of declared.keys()) {
  if (!modulesById.has(id)) err(`${id} : référencé par index.json mais aucun fichier de leçon (page vide dans l'app).`)
}
for (const lang of globLangs) {
  if (!existsSync(join(CONTENT, lang))) warn(`glob de loader.js : le dossier "${lang}" n'existe pas (entrée inutile).`)
}

// ── 2. Validations : rien ne doit être impossible à échouer ──────────────────
// Vocabulaire accepté. Les valeurs « moteur » déclenchent un validateur réel
// (lib/validators/), les autres décrivent une comparaison de sortie ou de
// mots-clés (cf. lib/useCodeRunner.js).
const ENGINE_TYPES = new Set(['sql', 'dom', 'regex', 'yaml', 'git', 'structured'])
const OTHER_TYPES  = new Set(['keywords', 'contains', 'output_contains', 'output_nonempty'])
// Langages sans exécution possible : validés par moteur ou, à défaut, mots-clés.
const STATIC_LANGS = new Set(['kql', 'sql', 'regex', 'git', 'spl', 'yaml', 'html'])

const stripComments = (code, lang) => {
  if (lang === 'sql')  return code.replace(/--[^\n]*/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ')
  if (lang === 'kql' || lang === 'spl') return code.replace(/\/\/[^\n]*/g, ' ')
  if (lang === 'yaml' || lang === 'git') return code.replace(/(^|\s)#[^\n]*/g, ' ')
  if (lang === 'html') return code.replace(/<!--[\s\S]*?-->/g, ' ')
  return code
}
const norm = (s) => String(s).toLowerCase().replace(/\s+/g, ' ').trim()

let exCount = 0
let engineCount = 0
for (const { mod, path } of modulesById.values()) {
  const lang = mod.lang ?? 'bash'
  if (!Array.isArray(mod.exercises) || mod.exercises.length === 0) {
    warn(`${mod.id} : aucun exercice.`)
  }
  for (const ex of mod.exercises ?? []) {
    exCount++
    const where = `${mod.id}/${ex.id ?? '(sans id)'}`
    if (!ex.id) err(`${where} : exercice sans id.`)
    if (!ex.instructions) warn(`${where} : consigne vide.`)

    const t = ex.validationType
    if (t && !ENGINE_TYPES.has(t) && !OTHER_TYPES.has(t)) err(`${where} : validationType inconnu "${t}".`)
    const hasEngine = ENGINE_TYPES.has(t) ||
      ex.domAssertions || ex.regexTests || ex.yamlAssertions || ex.gitChecks || ex.pipeline
    if (hasEngine) engineCount++

    // 2a. Validation impossible à échouer.
    if (!hasEngine) {
      if (STATIC_LANGS.has(lang)) {
        const kws = ex.requiredKeywords ?? []
        if (!kws.length && !ex.requiredTable) {
          err(`${where} : langage statique sans moteur NI mots-clés requis → validation toujours vraie.`)
        }
      } else if (t !== 'output_nonempty' && !ex.expectedOutput) {
        err(`${where} : ni moteur, ni resultat attendu (expectedOutput) → rien à comparer.`)
      }
      if (t === 'output_nonempty') {
        warn(`${where} : output_nonempty — valide dès que la commande produit une sortie (validation faible).`)
      }
    }

    // 2b. La correction de référence satisfait-elle ses propres mots-clés ?
    // Si non, l'élève qui recopie la solution affichée obtient « Pas tout à fait ».
    const kws = ex.requiredKeywords ?? []
    if (kws.length && ex.correction && !hasEngine) {
      const wantsComment = [...kws, ex.requiredTable ?? ''].some(k => /^\s*(--|\/\/|#|<!--)/.test(String(k)))
      const body = norm(wantsComment ? ex.correction : stripComments(ex.correction, lang))
      const missing = kws.filter(k => !body.includes(norm(k)))
      if (missing.length) {
        const msg = `${where} : la correction de référence ne contient pas ${JSON.stringify(missing)} — l'exercice est impossible à valider en recopiant la solution.`
        if (knownKeyword.has(ex.id)) debt(msg)
        else err(msg)
      }
    }

    // 2c. Moteurs : la charge attendue doit être présente.
    if (t === 'sql'        && !ex.correction)     err(`${where} : validationType "sql" sans requête de référence (correction).`)
    if (t === 'regex'      && !ex.regexTests)     err(`${where} : validationType "regex" sans regexTests.`)
    if (t === 'yaml'       && !ex.yamlAssertions) err(`${where} : validationType "yaml" sans yamlAssertions.`)
    if (t === 'dom'        && !ex.domAssertions)  err(`${where} : validationType "dom" sans domAssertions.`)
    if (t === 'git'        && !ex.gitChecks)      err(`${where} : validationType "git" sans gitChecks.`)
    if (t === 'structured' && !ex.pipeline)       err(`${where} : validationType "structured" sans pipeline.`)
  }
}

// ── 3. Missions et labs ─────────────────────────────────────────────────────
const missionsDir = join(CONTENT, 'missions')
const missionIds = new Set()
let chapterCount = 0
for (const f of readdirSync(missionsDir)) {
  if (!f.endsWith('.json')) continue
  const path = join(missionsDir, f)
  let camp
  try { camp = readJson(path) } catch (e) { err(`${path} : JSON invalide — ${e.message}`); continue }
  if (!camp.id) { err(`${f} : campagne sans id.`); continue }
  if (missionIds.has(camp.id)) err(`campagne en double : ${camp.id}`)
  missionIds.add(camp.id)

  // Les labs (kind:"lab") ont une structure propre : objectives + vault.
  if (camp.kind === 'lab') {
    if (!Array.isArray(camp.objectives) || !camp.objectives.length) err(`${camp.id} : lab sans objectifs.`)
    for (const o of camp.objectives ?? []) {
      if (!o.detect) err(`${camp.id}/${o.id ?? '?'} : objectif sans expression "detect" → jamais validable.`)
      else { try { new RegExp(o.detect) } catch (e) { err(`${camp.id}/${o.id} : detect n'est pas une regex valide — ${e.message}`) } }
    }
    continue
  }

  if (!Array.isArray(camp.chapters) || !camp.chapters.length) { err(`${camp.id} : campagne sans chapitres.`); continue }
  for (const ch of camp.chapters) {
    chapterCount++
    const where = `${camp.id}/${ch.id ?? '(sans id)'}`
    if (!ch.id) err(`${where} : chapitre sans id.`)
    // Un acte « choix » n'a pas de code à valider.
    if (Array.isArray(ch.options) && ch.options.length) continue
    const t = ch.validationType
    if (t && !ENGINE_TYPES.has(t) && !OTHER_TYPES.has(t)) err(`${where} : validationType inconnu "${t}".`)
    const hasEngine = ENGINE_TYPES.has(t) ||
      ch.domAssertions || ch.regexTests || ch.yamlAssertions || ch.gitChecks || ch.pipeline
    const kws = ch.requiredKeywords ?? []
    if (!hasEngine && !ch.expectedOutput && !kws.length && t !== 'output_nonempty') {
      err(`${where} : ni moteur, ni résultat attendu, ni mots-clés → acte impossible à échouer.`)
    }
    if (ch.requiredCmd) {
      try { new RegExp(ch.requiredCmd) } catch (e) { err(`${where} : requiredCmd n'est pas une regex valide — ${e.message}`) }
    }
  }
}

// ── Rapport ─────────────────────────────────────────────────────────────────
console.log(`Contenu : ${modulesById.size} modules, ${exCount} exercices (${engineCount} avec moteur réel), ${missionIds.size} campagnes, ${chapterCount} chapitres.`)
if (debts.length) {
  console.log(`\n${debts.length} dette(s) de contenu connue(s) (scripts/content-known-issues.json) :`)
  for (const d of debts) console.log('  · ' + d)
}
if (warnings.length) {
  console.log(`\n${warnings.length} avertissement(s) :`)
  for (const w of warnings) console.log('  ~ ' + w)
}
if (errors.length) {
  console.log(`\n${errors.length} ERREUR(S) :`)
  for (const e of errors) console.log('  ✗ ' + e)
}
if (!errors.length && !warnings.length && !debts.length) console.log('\nAucun problème détecté.')
// Une dette « corrigée » doit sortir de la liste : sinon elle masquerait une
// régression future sur le même exercice.
for (const id of knownKeyword) {
  if (!debts.some(d => d.includes('/' + id + ' '))) {
    warn(`content-known-issues.json : "${id}" n'est plus en défaut (ou n'existe plus) — retire-le de la liste.`)
  }
}

const failed = errors.length > 0 || (STRICT && warnings.length > 0)
process.exit(failed ? 1 : 0)
