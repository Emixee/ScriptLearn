import React, { useState, useRef, useEffect } from 'react'
import { Bot, Send, X, ChevronDown, ChevronUp, Loader } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import useAppStore from '../../store/useAppStore'
import { streamOllamaResponse, buildSOCPrompt } from '../../services/ollamaService'

export default function AIAssistant({ lessonContext = '', isOpen, onToggle }) {
  const { settings } = useAppStore()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [streamBuffer, setStreamBuffer] = useState('')
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setMessages([{
        role: 'assistant',
        content: settings.lang === 'fr'
          ? '👋 Bonjour ! Je suis votre assistant IA spécialisé en cybersécurité SOC. Posez-moi une question sur ce cours, demandez des explications ou des exemples !'
          : '👋 Hello! I am your AI assistant specialized in SOC cybersecurity. Ask me anything about this lesson, request explanations or examples!',
      }])
    }
    if (isOpen) inputRef.current?.focus()
  }, [isOpen])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamBuffer])

  async function handleSend() {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages(m => [...m, { role: 'user', content: question }])
    setLoading(true)
    setStreamBuffer('')

    try {
      const prompt = buildSOCPrompt(settings.lang, lessonContext, question)
      let fullResponse = ''

      for await (const chunk of streamOllamaResponse(prompt, settings.ollamaModel, settings.ollamaUrl)) {
        fullResponse += chunk
        setStreamBuffer(fullResponse)
      }

      setMessages(m => [...m, { role: 'assistant', content: fullResponse }])
      setStreamBuffer('')
    } catch (err) {
      const msg = err?.message || ''
      let errMsg
      if (settings.lang === 'fr') {
        if (msg.includes('404') || msg.includes('model')) {
          errMsg = `❌ Modèle "${settings.ollamaModel}" introuvable. Allez dans **Paramètres → IA**, testez la connexion et sélectionnez un modèle installé.`
        } else if (msg.includes('fetch') || msg.includes('Failed') || msg.includes('connect')) {
          errMsg = '❌ Ollama n\'est pas démarré. Lancez Ollama puis réessayez.'
        } else {
          errMsg = `❌ Erreur Ollama : ${msg}. Vérifiez les Paramètres → IA.`
        }
      } else {
        if (msg.includes('404') || msg.includes('model')) {
          errMsg = `❌ Model "${settings.ollamaModel}" not found. Go to **Settings → AI**, test the connection and select an installed model.`
        } else if (msg.includes('fetch') || msg.includes('Failed') || msg.includes('connect')) {
          errMsg = '❌ Ollama is not running. Start Ollama and try again.'
        } else {
          errMsg = `❌ Ollama error: ${msg}. Check Settings → AI.`
        }
      }
      setMessages(m => [...m, { role: 'assistant', content: errMsg, isError: true }])
      setStreamBuffer('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      width: 360,
      background: 'var(--bg-surface)',
      borderLeft: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      flexShrink: 0,
    }}>
      {/* Header */}
      <div style={{
        padding: '0.75rem 1rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        cursor: 'pointer',
        background: 'var(--bg-card)',
      }} onClick={onToggle}>
        <div style={{
          width: 28, height: 28, borderRadius: 'var(--radius-md)',
          background: 'var(--accent-glow)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Bot size={16} color="var(--accent)" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Assistant IA
          </div>
          <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            {settings.ollamaModel}
          </div>
        </div>
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: 'var(--accent)',
          boxShadow: '0 0 6px var(--accent)',
        }} />
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{
            display: 'flex',
            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
            gap: '0.5rem',
            alignItems: 'flex-start',
          }}>
            {msg.role === 'assistant' && (
              <div style={{
                width: 26, height: 26, borderRadius: 'var(--radius-sm)',
                background: 'var(--accent-glow)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, marginTop: 2,
              }}>
                <Bot size={14} color="var(--accent)" />
              </div>
            )}
            <div style={{
              maxWidth: '85%',
              padding: '0.5rem 0.75rem',
              borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              background: msg.role === 'user'
                ? 'var(--accent-glow)'
                : msg.isError ? 'rgba(255,107,107,0.1)' : 'var(--bg-card)',
              border: `1px solid ${msg.role === 'user' ? 'var(--accent)33' : msg.isError ? 'var(--accent-red)33' : 'var(--border)'}`,
              fontSize: '0.82rem',
              lineHeight: 1.6,
              color: 'var(--text-primary)',
            }}>
              {msg.role === 'assistant' ? (
                <div className="markdown-content" style={{ fontSize: '0.82rem' }}>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <span>{msg.content}</span>
              )}
            </div>
          </div>
        ))}

        {/* Streaming */}
        {streamBuffer && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
            <div style={{
              width: 26, height: 26, borderRadius: 'var(--radius-sm)',
              background: 'var(--accent-glow)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, marginTop: 2,
            }}>
              <Bot size={14} color="var(--accent)" />
            </div>
            <div style={{
              maxWidth: '85%',
              padding: '0.5rem 0.75rem',
              borderRadius: '12px 12px 12px 4px',
              background: 'var(--bg-card)',
              border: '1px solid var(--border)',
              fontSize: '0.82rem',
              lineHeight: 1.6,
            }}>
              <div className="markdown-content" style={{ fontSize: '0.82rem' }}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{streamBuffer}</ReactMarkdown>
              </div>
              <span style={{ display: 'inline-block', width: 8, height: 14, background: 'var(--accent)', animation: 'pulse 1s infinite', marginLeft: 2, verticalAlign: 'middle' }} />
            </div>
          </div>
        )}

        {loading && !streamBuffer && (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0 0.5rem' }}>
            <Loader size={14} color="var(--accent)" style={{ animation: 'spin 1s linear infinite' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {settings.lang === 'fr' ? 'Réflexion en cours...' : 'Thinking...'}
            </span>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: '0.75rem',
        borderTop: '1px solid var(--border)',
        display: 'flex',
        gap: '0.5rem',
      }}>
        <input
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          placeholder={settings.lang === 'fr' ? 'Posez une question sur ce cours...' : 'Ask a question about this lesson...'}
          style={{
            flex: 1,
            background: 'var(--bg-active)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            color: 'var(--text-primary)',
            fontSize: '0.82rem',
            fontFamily: 'var(--font-sans)',
            outline: 'none',
            resize: 'none',
          }}
          onFocus={e => e.currentTarget.style.borderColor = 'var(--accent)'}
          onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          style={{
            width: 36, height: 36,
            borderRadius: 'var(--radius-md)',
            background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg-active)',
            border: '1px solid var(--border)',
            color: input.trim() && !loading ? '#0d1117' : 'var(--text-muted)',
            cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all var(--transition)',
            flexShrink: 0,
          }}
        >
          <Send size={15} />
        </button>
      </div>
    </div>
  )
}
