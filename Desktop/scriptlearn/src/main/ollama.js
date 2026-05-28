/**
 * Handlers IPC pour la communication avec Ollama.
 *
 * POURQUOI ce fichier existe :
 * Le renderer Electron (chargé depuis file://) est soumis à la politique
 * "Private Network Access" de Chromium. Toute requête vers localhost depuis
 * une origine "null" (file://) déclenche un préflight OPTIONS que Ollama
 * ne gère pas → 403 Forbidden → fetch échoue silencieusement.
 *
 * Solution : déléguer les appels HTTP à Ollama au processus PRINCIPAL (Node.js)
 * via IPC. Le processus principal n'a pas de restrictions CORS/PNA — il fait
 * de vraies requêtes réseau Node.js, pas des requêtes navigateur.
 */

import { ipcMain } from 'electron'

// Timeout généreux pour les inférences IA : les modèles 7B peuvent prendre
// plusieurs secondes avant de répondre, surtout au premier appel (cold start).
const AI_TIMEOUT_MS   = 90_000  // 90s pour les générations
const PING_TIMEOUT_MS =  3_000  // 3s pour la simple vérification de disponibilité

/**
 * Wrapper fetch pour le processus principal.
 * Utilise le fetch natif de Node.js 18+ (bundlé avec Electron 20+),
 * qui n'est pas soumis aux restrictions CORS/PNA du renderer.
 *
 * @param {string} baseUrl   - ex: "http://localhost:11434"
 * @param {string} path      - ex: "/api/generate"
 * @param {object} opts      - { method, body, timeout }
 */
async function ollamaFetch(baseUrl, path, opts = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), opts.timeout ?? AI_TIMEOUT_MS)

  try {
    const resp = await fetch(`${baseUrl}${path}`, {
      method:  opts.method ?? 'GET',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'ScriptLearn' },
      // body n'est envoyé que pour les requêtes POST
      ...(opts.body ? { body: JSON.stringify(opts.body) } : {}),
      signal: controller.signal
    })
    clearTimeout(timer)
    return resp
  } catch (err) {
    clearTimeout(timer)
    throw err
  }
}

/**
 * Enregistre les handlers IPC Ollama dans le processus principal.
 * Appelé une seule fois au démarrage depuis index.js.
 */
export function setupOllamaIPC() {

  /**
   * ollama:check — vérifie si Ollama tourne et liste les modèles disponibles.
   * Utilisé par la page Paramètres pour le bouton "Tester la connexion".
   *
   * Retourne : { ok: boolean, models: string[] }
   */
  ipcMain.handle('ollama:check', async (_, { url }) => {
    try {
      const resp = await ollamaFetch(url, '/api/tags', { timeout: PING_TIMEOUT_MS })
      if (!resp.ok) return { ok: false, models: [] }
      const json = await resp.json()
      // L'API Ollama retourne { models: [{ name, model, size, ... }] }
      const models = (json.models ?? []).map(m => m.name)
      return { ok: true, models }
    } catch {
      // Ollama non démarré, port fermé ou timeout → pas disponible
      return { ok: false, models: [] }
    }
  })

  /**
   * ollama:generate — envoie un prompt à Ollama et retourne la réponse texte.
   * Utilisé par l'assistant IA et les feedbacks pédagogiques des exercices.
   *
   * Retourne : string | null (null si Ollama est indisponible ou en erreur)
   */
  ipcMain.handle('ollama:generate', async (_, { url, model, prompt }) => {
    try {
      const resp = await ollamaFetch(url, '/api/generate', {
        method:  'POST',
        // stream: false → Ollama attend la fin de génération et renvoie tout d'un coup
        // Si stream était true, il faudrait lire le flux NDJSON ligne par ligne
        body:    { model, prompt, stream: false },
        timeout: AI_TIMEOUT_MS
      })
      if (!resp.ok) return null
      const json = await resp.json()
      return json.response?.trim() || null
    } catch {
      return null
    }
  })
}
