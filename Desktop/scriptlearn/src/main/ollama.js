/**
 * Handlers IPC pour la communication avec Ollama.
 *
 * POURQUOI ce fichier existe :
 * Le renderer Electron (chargé depuis file://) est soumis à la politique
 * "Private Network Access" de Chromium — les requêtes POST vers localhost
 * déclenchent un préflight OPTIONS que Ollama rejette (403).
 * Solution : déléguer tous les appels Ollama au processus PRINCIPAL (Node.js)
 * via IPC. Le main process n'a aucune restriction CORS/PNA.
 *
 * POURQUOI http natif et non fetch() :
 * fetch() de Node.js 22 (undici) résout 'localhost' en ::1 (IPv6) sur Windows 11+,
 * alors qu'Ollama écoute sur 127.0.0.1 (IPv4) → connexion refusée silencieusement.
 * Le module http natif permet de forcer 127.0.0.1 explicitement.
 *
 * POURQUOI 127.0.0.1 et non 'localhost' :
 * Sur Windows 11+, la résolution DNS de 'localhost' peut retourner ::1 (IPv6)
 * en premier. Ollama écoute uniquement sur 127.0.0.1 (IPv4) par défaut.
 * Forcer 127.0.0.1 supprime toute ambiguïté de résolution IPv4/IPv6.
 * (Inspiré de l'implémentation Analyst SOC Training qui a résolu ce même problème.)
 */

import { ipcMain, BrowserWindow }  from 'electron'
import { request as httpRequest }  from 'http'
import { request as httpsRequest } from 'https'

// Timeouts
const PING_TIMEOUT_MS = 3_000    // 3s pour le test de disponibilité
const AI_TIMEOUT_MS   = 60_000   // 60s pour la génération (cold start inclus)

/**
 * Résout le hostname de l'URL Ollama en forçant 127.0.0.1 si c'est localhost.
 * Évite l'ambiguïté IPv4/IPv6 sur Windows 11+ (voir commentaire module).
 */
function resolveHostname(hostname) {
  return (hostname === 'localhost' || hostname === '::1') ? '127.0.0.1' : hostname
}

/**
 * Effectue une requête HTTP/HTTPS vers Ollama depuis le processus principal.
 * Retourne une Promise<{ ok, status, json }> similaire à l'API fetch.
 *
 * @param {string} baseUrl   - ex: "http://localhost:11434"
 * @param {string} path      - ex: "/api/chat"
 * @param {object} opts      - { method, body, timeout, onData }
 *   onData : callback(string) appelé pour chaque ligne NDJSON reçue (streaming)
 */
function ollamaRequest(baseUrl, path, opts = {}) {
  return new Promise((resolve, reject) => {
    const fullUrl   = new URL(path, baseUrl)
    const isHttps   = fullUrl.protocol === 'https:'
    const requester = isHttps ? httpsRequest : httpRequest
    const timeout   = opts.timeout ?? AI_TIMEOUT_MS

    const bodyStr = opts.body ? JSON.stringify(opts.body) : null

    const reqOptions = {
      // Forcer 127.0.0.1 : résolution explicite IPv4 pour éviter ::1 (IPv6 Windows 11+)
      hostname: resolveHostname(fullUrl.hostname),
      port    : parseInt(fullUrl.port || (isHttps ? '443' : '80')),
      path    : fullUrl.pathname + fullUrl.search,
      method  : opts.method ?? 'GET',
      headers : {
        'Content-Type': 'application/json',
        'User-Agent'  : 'ScriptLearn',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {})
      }
    }

    const req = requester(reqOptions, (res) => {
      // Si un callback de streaming est fourni, traiter le NDJSON ligne par ligne
      if (typeof opts.onData === 'function') {
        let lineBuffer = ''
        res.on('data', (chunk) => {
          lineBuffer += chunk.toString()
          const lines = lineBuffer.split('\n')
          lineBuffer  = lines.pop() ?? ''
          for (const line of lines) {
            if (line.trim()) opts.onData(line, res.statusCode)
          }
        })
        res.on('end',   () => resolve({ ok: res.statusCode < 300, status: res.statusCode }))
        res.on('error', reject)
        return
      }

      // Mode non-streaming : accumuler la réponse complète
      const chunks = []
      res.on('data',  chunk => chunks.push(chunk))
      res.on('end',   () => {
        const raw = Buffer.concat(chunks).toString('utf8')
        resolve({
          ok    : res.statusCode < 300,
          status: res.statusCode,
          json  : () => {
            try   { return Promise.resolve(JSON.parse(raw)) }
            catch { return Promise.reject(new Error(`JSON invalide : ${raw.slice(0, 100)}`)) }
          }
        })
      })
      res.on('error', reject)
    })

    req.on('error', reject)
    // req.setTimeout déclenche un timeout sur le socket TCP — plus fiable qu'AbortController/undici
    req.setTimeout(timeout, () => {
      req.destroy(new Error(`Ollama timeout après ${timeout / 1000}s`))
    })

    if (bodyStr) req.write(bodyStr)
    req.end()
  })
}

/**
 * Enregistre tous les handlers IPC Ollama. Appelé au démarrage depuis index.js.
 */
export function setupOllamaIPC() {

  /**
   * ollama:check — vérifie si Ollama tourne et liste les modèles disponibles.
   * Retourne : { ok: boolean, models: string[] }
   */
  ipcMain.handle('ollama:check', async (_, { url }) => {
    try {
      const resp = await ollamaRequest(url, '/api/tags', { timeout: PING_TIMEOUT_MS })
      if (!resp.ok) return { ok: false, models: [] }
      const json = await resp.json()
      const models = (json.models ?? []).map(m => m.name)
      return { ok: true, models }
    } catch {
      return { ok: false, models: [] }
    }
  })

  /**
   * ollama:generate — envoie un prompt à Ollama et retourne la réponse texte complète.
   *
   * POURQUOI /api/chat avec stream:true :
   *   - /api/chat est l'API recommandée depuis Ollama 0.1.14+ (format messages OpenAI)
   *   - stream:true permet de lire le NDJSON ligne par ligne — plus robuste que stream:false
   *     qui peut bloquer si Ollama bufferise la réponse complète avant de la renvoyer
   *   - On accumule les fragments pour retourner le texte complet une fois terminé
   *
   * Retourne : string | null
   */
  ipcMain.handle('ollama:generate', async (_, { url, model, prompt }) => {
    try {
      let fullText = ''
      let hasError = false

      await ollamaRequest(url, '/api/chat', {
        method : 'POST',
        body   : {
          model,
          // Format messages[] identique à l'API OpenAI — compatible avec tous les modèles Ollama
          messages: [{ role: 'user', content: prompt }],
          stream  : true,  // NDJSON ligne par ligne — plus robuste que stream:false
          options : { temperature: 0.7, num_predict: 1024 }
        },
        timeout: AI_TIMEOUT_MS,
        // Callback appelé pour chaque ligne NDJSON reçue du stream Ollama
        onData : (line, statusCode) => {
          if (statusCode !== 200) { hasError = true; return }
          try {
            const json = JSON.parse(line)
            if (json.error) { hasError = true; return }
            // /api/chat → json.message.content (différent de /api/generate → json.response)
            if (json.message?.content) fullText += json.message.content
          } catch { /* ligne NDJSON partielle ou invalide — ignorer */ }
        }
      })

      return hasError ? null : (fullText.trim() || null)
    } catch {
      return null
    }
  })

  /**
   * ollama:pull — télécharge un modèle depuis le registre Ollama.
   *
   * Envoie des événements de progression via event.sender.send() :
   *   'ollama:pull-progress' → { status: string, total: number, completed: number }
   *   'ollama:pull-done'     → { ok: boolean, error?: string }
   *
   * Pas de timeout fixe : un pull de 4 Go peut durer 10-30 min selon la connexion.
   */
  ipcMain.handle('ollama:pull', async (event, { url, model }) => {
    return new Promise((resolve) => {
      const fullUrl   = new URL('/api/pull', url)
      const isHttps   = fullUrl.protocol === 'https:'
      const requester = isHttps ? httpsRequest : httpRequest
      const body      = JSON.stringify({ model, stream: true })

      const reqOptions = {
        hostname: resolveHostname(fullUrl.hostname),
        port    : parseInt(fullUrl.port || (isHttps ? '443' : '80')),
        path    : '/api/pull',
        method  : 'POST',
        headers : {
          'Content-Type'  : 'application/json',
          'Content-Length': Buffer.byteLength(body)
        }
      }

      const req = requester(reqOptions, (res) => {
        if (res.statusCode !== 200) {
          let errorBody = ''
          res.on('data', chunk => { errorBody += chunk })
          res.on('end', () => {
            const msg = `HTTP ${res.statusCode} — ${errorBody}`
            if (!event.sender.isDestroyed()) event.sender.send('ollama:pull-done', { ok: false, error: msg })
            resolve({ ok: false, error: msg })
          })
          return
        }

        let lineBuffer = ''

        res.on('data', (chunk) => {
          lineBuffer += chunk.toString()
          const lines = lineBuffer.split('\n')
          lineBuffer  = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const json = JSON.parse(line)
              if (json.error) {
                if (!event.sender.isDestroyed()) event.sender.send('ollama:pull-done', { ok: false, error: json.error })
                resolve({ ok: false, error: json.error })
                return
              }
              // Relayer la progression au renderer si la fenêtre est encore ouverte
              if (!event.sender.isDestroyed()) {
                event.sender.send('ollama:pull-progress', {
                  status   : json.status    ?? '',
                  total    : json.total     ?? 0,
                  completed: json.completed ?? 0
                })
              }
              if (json.status === 'success') {
                if (!event.sender.isDestroyed()) event.sender.send('ollama:pull-done', { ok: true })
                resolve({ ok: true })
              }
            } catch { /* ligne NDJSON partielle — ignorer */ }
          }
        })

        res.on('end', () => {
          if (!event.sender.isDestroyed()) event.sender.send('ollama:pull-done', { ok: true })
          resolve({ ok: true })
        })

        res.on('error', (err) => {
          if (!event.sender.isDestroyed()) event.sender.send('ollama:pull-done', { ok: false, error: err.message })
          resolve({ ok: false, error: err.message })
        })
      })

      req.on('error', (err) => {
        if (!event.sender.isDestroyed()) event.sender.send('ollama:pull-done', { ok: false, error: err.message })
        resolve({ ok: false, error: err.message })
      })

      // Timeout généreux pour le pull : 4 Go sur connexion lente = 30 min+
      req.setTimeout(30 * 60 * 1000, () => {
        req.destroy()
        const msg = 'Timeout — Le téléchargement a pris trop de temps.'
        if (!event.sender.isDestroyed()) event.sender.send('ollama:pull-done', { ok: false, error: msg })
        resolve({ ok: false, error: msg })
      })

      req.write(body)
      req.end()
    })
  })
}
