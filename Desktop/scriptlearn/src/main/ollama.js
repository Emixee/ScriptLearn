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
 * via IPC. Le processus principal n'a pas de restrictions CORS/PNA.
 *
 * POURQUOI on utilise le module http natif plutôt que fetch :
 * Node.js 22 utilise undici comme implémentation de fetch. undici a des
 * comportements différents du module http natif pour les longues connexions :
 *   - AbortController ne se comporte pas toujours comme attendu sous undici
 *   - Le chargement d'un modèle 7B peut prendre 30-90s (cold start)
 *   - fetch/undici peut fermer la connexion prématurément sur de longs timeouts
 * Le module http natif avec req.setTimeout() est plus fiable pour ce cas.
 */

import { ipcMain, BrowserWindow }      from 'electron'
import { request as httpRequest }      from 'http'
import { request as httpsRequest }     from 'https'

// Timeout généreux : le premier appel charge le modèle en mémoire (cold start).
// mistral:7b = 4.1 Go → peut prendre 30-90s de chargement + temps de génération.
// 3 minutes = marge suffisante même sur une machine modeste.
const AI_TIMEOUT_MS   = 180_000   // 3 minutes pour les générations (cold start inclus)
const PING_TIMEOUT_MS =   3_000   // 3s pour la vérification de disponibilité

/**
 * Effectue une requête HTTP/HTTPS vers Ollama depuis le processus principal.
 * Utilise le module http natif de Node.js pour une fiabilité maximale sur les
 * longues connexions (génération IA = plusieurs dizaines de secondes).
 *
 * @param {string} baseUrl  - ex: "http://localhost:11434"
 * @param {string} path     - ex: "/api/generate"
 * @param {object} opts     - { method, body, timeout }
 * @returns {Promise<{ ok: boolean, json: () => Promise<any> }>}
 */
function ollamaHttpRequest(baseUrl, path, opts = {}) {
  return new Promise((resolve, reject) => {
    // Déterminer si on utilise http ou https selon le protocole de l'URL
    const fullUrl   = new URL(path, baseUrl)
    const isHttps   = fullUrl.protocol === 'https:'
    const requester = isHttps ? httpsRequest : httpRequest
    const timeout   = opts.timeout ?? AI_TIMEOUT_MS

    // Corps de la requête (JSON sérialisé)
    const bodyStr = opts.body ? JSON.stringify(opts.body) : null

    const reqOptions = {
      hostname: fullUrl.hostname,
      port:     fullUrl.port || (isHttps ? 443 : 80),
      path:     fullUrl.pathname + fullUrl.search,
      method:   opts.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent':   'ScriptLearn',
        // Content-Length obligatoire pour les requêtes POST avec body
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    }

    // Accumuler les chunks de la réponse dans un buffer
    const req = requester(reqOptions, (res) => {
      const chunks = []
      res.on('data',  chunk => chunks.push(chunk))
      res.on('end',   () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve({
          ok:     res.statusCode >= 200 && res.statusCode < 300,
          status: res.statusCode,
          // Exposer json() comme la Response API fetch pour minimiser les changements d'usage
          json: () => {
            try   { return Promise.resolve(JSON.parse(raw)) }
            catch { return Promise.reject(new Error(`JSON invalide : ${raw.slice(0, 100)}`)) }
          }
        })
      })
      res.on('error', reject)
    })

    req.on('error', reject)

    // Timeout sur le socket TCP — bien plus fiable qu'AbortController avec undici.
    // Si Ollama ne répond pas dans le délai, la requête est détruite proprement.
    req.setTimeout(timeout, () => {
      req.destroy(new Error(`Ollama timeout après ${timeout / 1000}s`))
    })

    // Envoyer le body si présent, puis fermer la requête
    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

/**
 * Enregistre les handlers IPC Ollama dans le processus principal.
 * Appelé une seule fois au démarrage depuis index.js.
 */
export function setupOllamaIPC() {

  /**
   * ollama:pull — télécharge un modèle depuis le registre Ollama.
   * Appelé depuis la page Paramètres quand l'utilisateur clique "Télécharger".
   * Envoie des événements de progression au renderer via mainWindow.webContents.send.
   *
   * POURQUOI on utilise stream:true ici (contrairement à generate) :
   * Le téléchargement peut durer plusieurs minutes. Avec stream:false, on attendrait
   * la fin sans aucun feedback. Avec stream:true, Ollama envoie des lignes NDJSON
   * de progression ({ status, completed, total }) qu'on peut relayer en temps réel.
   *
   * Format des événements envoyés au renderer :
   *   'ollama:pull-progress' → { status: string, pct: number }  (0-100)
   *   'ollama:pull-done'     → { ok: boolean, error?: string }
   */
  ipcMain.handle('ollama:pull', (_, { url, model }) => {
    // Récupérer la fenêtre principale pour envoyer les événements de progression
    // BrowserWindow est importé depuis electron en haut du fichier
    const win = BrowserWindow.getAllWindows()[0]

    return new Promise((resolve) => {
      const fullUrl   = new URL('/api/pull', url)
      const isHttps   = fullUrl.protocol === 'https:'
      const requester = isHttps ? httpsRequest : httpRequest

      const body    = JSON.stringify({ model, stream: true })
      const options = {
        hostname: fullUrl.hostname,
        port:     fullUrl.port || (isHttps ? 443 : 80),
        path:     '/api/pull',
        method:   'POST',
        headers:  {
          'Content-Type':   'application/json',
          'User-Agent':     'ScriptLearn',
          'Content-Length': Buffer.byteLength(body)
        }
      }

      const req = requester(options, (res) => {
        let buffer = ''

        res.on('data', (chunk) => {
          // Ollama envoie des lignes NDJSON (une ligne JSON par chunk de progression).
          // Chaque ligne est un objet { status, completed, total } ou { status, digest }.
          // On accumule dans buffer pour gérer les chunks partiels (une ligne peut
          // arriver en plusieurs morceaux TCP).
          buffer += chunk.toString()
          const lines = buffer.split('\n')
          // Garder la dernière ligne (peut être incomplète) pour le prochain chunk
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const data = JSON.parse(line)
              // Calculer le % si completed et total sont disponibles (phase de téléchargement)
              const pct = (data.total && data.completed)
                ? Math.round((data.completed / data.total) * 100)
                : null
              // Relayer la progression au renderer
              win?.webContents?.send('ollama:pull-progress', { status: data.status ?? '', pct })
            } catch { /* ligne JSON invalide ou incomplète — ignorer */ }
          }
        })

        res.on('end', () => {
          win?.webContents?.send('ollama:pull-done', { ok: res.statusCode < 300 })
          resolve({ ok: res.statusCode < 300 })
        })

        res.on('error', (err) => {
          win?.webContents?.send('ollama:pull-done', { ok: false, error: err.message })
          resolve({ ok: false, error: err.message })
        })
      })

      req.on('error', (err) => {
        win?.webContents?.send('ollama:pull-done', { ok: false, error: err.message })
        resolve({ ok: false, error: err.message })
      })

      // Pas de timeout fixe — un pull peut durer plusieurs minutes (4+ Go pour mistral:7b)
      req.write(body)
      req.end()
    })
  })

  /**
   * ollama:check — vérifie si Ollama tourne et liste les modèles disponibles.
   * Utilisé par la page Paramètres pour le bouton "Tester la connexion".
   *
   * Retourne : { ok: boolean, models: string[] }
   */
  ipcMain.handle('ollama:check', async (_, { url }) => {
    try {
      const resp = await ollamaHttpRequest(url, '/api/tags', { timeout: PING_TIMEOUT_MS })
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
   * Utilisé par l'assistant IA (AIAssistant.jsx) et les feedbacks des exercices.
   *
   * POURQUOI /api/chat plutôt que /api/generate :
   * /api/generate est l'ancienne API "raw completion". Elle peut être instable
   * sur certaines versions d'Ollama (body mal parsé, timeout prématuré).
   * /api/chat est l'API recommandée depuis Ollama v0.1.14 — format messages[]
   * identique à l'API OpenAI, mieux maintenu et plus robuste pour tous les modèles.
   *
   * Format /api/chat :
   *   Requête  → { model, messages: [{role:"user", content:"..."}], stream: false }
   *   Réponse  → { message: { role:"assistant", content:"..." }, done: true }
   *
   * Comportement attendu :
   *   - Premier appel : peut prendre 30-90s (cold start = chargement modèle en RAM)
   *   - Appels suivants : 5-20s (modèle déjà chargé)
   * Le timeout est de 3 minutes pour couvrir le cold start même sur machine lente.
   *
   * Retourne : string | null (null si Ollama est indisponible, en erreur ou timeout)
   */
  ipcMain.handle('ollama:generate', async (_, { url, model, prompt }) => {
    try {
      const resp = await ollamaHttpRequest(url, '/api/chat', {
        method: 'POST',
        body: {
          model,
          // Format messages[] = standard OpenAI-compatible utilisé par /api/chat
          // Le prompt est envoyé comme message utilisateur (role "user")
          messages: [{ role: 'user', content: prompt }],
          // stream: false → Ollama attend la fin de génération avant de répondre.
          // Plus simple que stream: true qui nécessite de lire le NDJSON ligne par ligne.
          stream: false
        },
        timeout: AI_TIMEOUT_MS
      })
      if (!resp.ok) return null
      const json = await resp.json()
      // /api/chat retourne la réponse dans json.message.content (pas json.response)
      return json.message?.content?.trim() || null
    } catch {
      // Timeout, erreur réseau ou JSON invalide → retourne null
      // L'UI affiche "L'IA n'est pas disponible" et l'utilisateur peut réessayer
      return null
    }
  })
}
