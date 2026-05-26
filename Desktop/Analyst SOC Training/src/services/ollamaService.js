const DEFAULT_URL = 'http://localhost:11434'

export async function checkOllamaConnection(baseUrl = DEFAULT_URL) {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { signal: AbortSignal.timeout(3000) })
    return res.ok
  } catch {
    return false
  }
}

export async function listOllamaModels(baseUrl = DEFAULT_URL) {
  try {
    const res = await fetch(`${baseUrl}/api/tags`)
    if (!res.ok) return []
    const data = await res.json()
    return data.models?.map(m => m.name) ?? []
  } catch {
    return []
  }
}

export async function* streamOllamaResponse(prompt, model = 'llama3', baseUrl = DEFAULT_URL) {
  const body = {
    model,
    prompt,
    stream: true,
    options: { temperature: 0.7, num_predict: 1024 },
  }

  const res = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) throw new Error(`Ollama error: ${res.status}`)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    const text = decoder.decode(value)
    const lines = text.split('\n').filter(Boolean)
    for (const line of lines) {
      try {
        const json = JSON.parse(line)
        if (json.response) yield json.response
        if (json.done) return
      } catch {
        // ignore parse errors on partial chunks
      }
    }
  }
}

export function buildSOCPrompt(lang, lessonContext, userQuestion) {
  const systemPrompt = lang === 'fr'
    ? `Tu es un expert en cybersécurité et analyste SOC expérimenté. Tu aides un étudiant à apprendre la cybersécurité et l'analyse SOC.
Tu réponds toujours en français, de façon claire, pédagogique et précise. Tu utilises des exemples concrets tirés de situations réelles en SOC.
Contexte du cours actuel : ${lessonContext}

Question de l'étudiant : ${userQuestion}

Réponds de façon concise mais complète, en utilisant des listes ou exemples si utile.`
    : `You are an expert in cybersecurity and an experienced SOC analyst. You help a student learn cybersecurity and SOC analysis.
You always respond in English, clearly, educationally, and precisely. You use concrete examples from real SOC situations.
Current lesson context: ${lessonContext}

Student question: ${userQuestion}

Respond concisely but completely, using lists or examples when helpful.`

  return systemPrompt
}

export function buildQuizCorrectionPrompt(lang, question, correctAnswer, userAnswer, explanation) {
  if (lang === 'fr') {
    return `Tu es un formateur en cybersécurité. Corrige la réponse de cet étudiant et explique pourquoi.

Question : ${question}
Bonne réponse : ${correctAnswer}
Réponse de l'étudiant : ${userAnswer}
Explication officielle : ${explanation}

Donne une correction pédagogique en 2-3 phrases.`
  }
  return `You are a cybersecurity trainer. Correct this student's answer and explain why.

Question: ${question}
Correct answer: ${correctAnswer}
Student's answer: ${userAnswer}
Official explanation: ${explanation}

Give a pedagogical correction in 2-3 sentences.`
}

export function buildLabHintPrompt(lang, labContext, question, hintsAlreadyGiven) {
  if (lang === 'fr') {
    return `Tu es un formateur SOC. Un étudiant est bloqué sur ce lab.

Contexte du lab : ${labContext}
Question : ${question}
Indices déjà donnés : ${hintsAlreadyGiven}

Donne un nouvel indice subtil qui guide sans révéler directement la réponse.`
  }
  return `You are a SOC trainer. A student is stuck on this lab.

Lab context: ${labContext}
Question: ${question}
Hints already given: ${hintsAlreadyGiven}

Give a subtle new hint that guides without directly revealing the answer.`
}
