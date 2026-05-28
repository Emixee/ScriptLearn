/**
 * Utilitaires de communication avec Ollama — côté renderer.
 *
 * POURQUOI on passe par window.electronAPI.ollama (IPC) et non par fetch() :
 * Chromium applique la "Private Network Access" policy : une page chargée
 * depuis file:// (origine "null") ne peut pas appeler localhost directement —
 * le préflight OPTIONS déclenché par Chromium échoue (Ollama répond 403).
 * Toutes les requêtes HTTP vers Ollama sont donc déléguées au processus
 * principal (main process Node.js) via IPC, où aucune restriction CORS n'existe.
 */

/**
 * Génère un feedback pédagogique pour un exercice (réussi ou non).
 * Retourne null si Ollama est indisponible (l'UI affiche alors la correction statique).
 */
export async function askOllama({ url, model, exercise, code, isCorrect, lang }) {
  // Construire le nom du langage lisible pour le prompt
  const langName = lang === 'powershell' ? 'PowerShell'
    : lang === 'python' ? 'Python'
    : lang === 'kql' ? 'KQL (Kusto Query Language)'
    : 'Bash'

  // Prompt adapté selon le langage (KQL a un contexte spécifique Sentinel)
  // et selon si l'exercice est réussi ou en échec
  const prompt = lang === 'kql'
    ? isCorrect
      ? `Tu es un expert Microsoft Sentinel et KQL. L'apprenant a réussi l'exercice "${exercise.title}".

Sa requête KQL :
\`\`\`kql
${code}
\`\`\`

Félicite-le en 1 phrase et donne 1 conseil d'optimisation ou une variante avancée de cette requête. Sois concis. Réponds en français.`
      : `Tu es un expert Microsoft Sentinel et KQL. L'apprenant travaille sur l'exercice "${exercise.title}".
Consigne : ${exercise.instructions.slice(0, 400)}
Table requise : ${exercise.requiredTable ?? ''}

Sa requête :
\`\`\`kql
${code}
\`\`\`

Donne un indice précis en 2 phrases sur ce qui manque ou est incorrect dans la requête, sans donner la solution complète. Réponds en français.`
    : isCorrect
      ? `Tu es un assistant pédagogique pour apprendre le scripting ${langName}.

L'apprenant a réussi l'exercice "${exercise.title}".

Son code :
\`\`\`
${code}
\`\`\`

Félicite-le brièvement et explique en 2 phrases pourquoi son approche est bonne. Sois concis et encourageant. Réponds en français.`
      : `Tu es un assistant pédagogique pour apprendre le scripting ${langName}.

L'apprenant travaille sur l'exercice "${exercise.title}".
Instructions : ${exercise.instructions.slice(0, 300)}
Résultat attendu : ${exercise.expectedOutput ?? ''}

Son code :
\`\`\`
${code}
\`\`\`

Donne un indice utile en 2 phrases sans donner la solution directement. Sois encourageant. Réponds en français.`

  // Délégation au processus principal via IPC — pas de fetch direct
  return window.electronAPI.ollama.generate({ url, model, prompt })
}

/**
 * Appel générique à Ollama pour l'assistant IA chat.
 * Retourne la réponse texte ou null si Ollama est indisponible.
 */
export async function chatOllama({ url, model, prompt }) {
  // Délégation au processus principal via IPC — pas de fetch direct
  return window.electronAPI.ollama.generate({ url, model, prompt })
}

/**
 * Vérifie si Ollama est accessible et retourne les modèles disponibles.
 * Appelée par la page Paramètres pour le bouton "Tester la connexion".
 *
 * Retourne : { ok: boolean, models: string[] }
 */
export async function checkOllama(url) {
  // Délégation au processus principal via IPC — pas de fetch direct
  return window.electronAPI.ollama.check(url)
}
