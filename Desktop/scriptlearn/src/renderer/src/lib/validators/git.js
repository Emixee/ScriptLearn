// ============================================================================
// validators/git.js — Validation RÉELLE des actes capstone Git.
//
// POURQUOI ce module : valider Git par mots-clés (« la réponse contient-elle
// "commit" ? ») ne prouve rien. Ici, les commandes de l'élève sont EXÉCUTÉES
// dans un vrai dépôt git temporaire (côté main, via WSL — voir terminal.js
// runGit), puis des commandes d'inspection révèlent l'ÉTAT obtenu. On compare
// cet état au résultat attendu. C'est l'usage réel de Git.
//
// Forme attendue (chapter.gitChecks) : une liste de vérifications, chacune =
//   { run: 'git rev-list --count HEAD', equals: '1' }     // sortie == valeur exacte
//   { run: 'git ls-files | sort | tr "\\n" " "', contains: 'a.txt' }  // sortie contient
//   { label?: '...' }  // libellé lisible (sinon dérivé de `run`)
// Le main exécute chaque `run` après les commandes de l'élève et renvoie les
// sorties dans le même ordre.
// ============================================================================

export async function validateGit(chapter, code) {
  const checks = chapter.gitChecks ?? []
  if (checks.length === 0) return { correct: false, output: 'Aucune vérification Git définie.' }

  let res
  try {
    res = await window.electronAPI.terminal.runGit({
      commands: code,
      checks: checks.map((c) => c.run),
    })
  } catch (e) {
    return { correct: false, output: 'Exécution Git impossible : ' + String(e?.message ?? e) }
  }
  const outputs = res?.outputs ?? []
  if (res?.error) return { correct: false, output: 'Git indisponible : ' + res.error }

  const lines = []
  let allOk = true
  checks.forEach((c, i) => {
    const got = (outputs[i] ?? '').trim()
    const label = c.label ?? c.run
    let ok
    if ('equals' in c) ok = got === c.equals
    else if ('contains' in c) ok = got.includes(c.contains)
    else ok = got.length > 0 // par défaut : la commande renvoie quelque chose
    if (!ok) allOk = false
    lines.push(`${ok ? '✅' : '❌'} ${label}${ok ? '' : ` (obtenu "${got}")`}`)
  })
  return { correct: allOk, output: lines.join('\n') }
}
