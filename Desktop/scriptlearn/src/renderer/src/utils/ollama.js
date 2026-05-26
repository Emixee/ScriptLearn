/**
 * Appelle l'API Ollama locale pour obtenir un feedback pédagogique.
 * Retourne null en cas d'erreur (timeout, Ollama non lancé, etc.)
 */
export async function askOllama({ url, model, exercise, code, isCorrect, lang }) {
  const langName = lang === 'powershell' ? 'PowerShell'
    : lang === 'python' ? 'Python'
    : lang === 'kql' ? 'KQL (Kusto Query Language)'
    : 'Bash'

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

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90000)

    const resp = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (!resp.ok) return null
    const json = await resp.json()
    return json.response?.trim() || null
  } catch {
    return null
  }
}

/** Appel générique à Ollama (pour l'assistant IA chat) */
export async function chatOllama({ url, model, prompt }) {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 90000)
    const resp = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, prompt, stream: false }),
      signal: controller.signal
    })
    clearTimeout(timeout)
    if (!resp.ok) return null
    const json = await resp.json()
    return json.response?.trim() || null
  } catch {
    return null
  }
}

/** Vérifie si Ollama est accessible et retourne les modèles disponibles */
export async function checkOllama(url) {
  try {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), 3000)
    const resp = await fetch(`${url}/api/tags`, { signal: controller.signal })
    if (!resp.ok) return { ok: false, models: [] }
    const json = await resp.json()
    const models = (json.models ?? []).map(m => m.name)
    return { ok: true, models }
  } catch {
    return { ok: false, models: [] }
  }
}
