import { useState, useRef, useEffect } from 'react'
import { useProfile } from '../contexts/ProfileContext'
import { chatOllama } from '../utils/ollama'

export default function AIAssistant({ context = '', onClose }) {
  const { settings } = useProfile()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: context
        ? 'Bonjour ! Posez-moi une question sur cet exercice ou ce cours.'
        : 'Bonjour ! Je suis votre assistant IA. Comment puis-je vous aider ?'
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async () => {
    if (!input.trim() || loading || !settings?.aiEnabled) return
    const text = input.trim()
    setInput('')
    setMessages(prev => [...prev, { role: 'user', text }])
    setLoading(true)

    const ctx = context ? `Contexte pédagogique :\n${context}\n\n` : ''
    const prompt = `${ctx}Tu es un assistant pédagogique pour apprendre le scripting. Réponds en français de manière concise (2-3 phrases max).\n\nQuestion : ${text}`

    const response = await chatOllama({
      url:   settings.aiUrl   ?? 'http://localhost:11434',
      model: settings.aiModel ?? 'llama3.2',
      prompt
    })

    setLoading(false)
    setMessages(prev => [...prev, {
      role: 'assistant',
      text: response ?? "L'IA n'est pas disponible. Vérifiez Ollama dans les Paramètres."
    }])
  }

  return (
    <div className="w-[320px] flex flex-col bg-[#1a1d2e] border-l border-[#2d3748] flex-shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2d3748] flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#6366f1] flex items-center justify-center text-xs text-white font-bold">✦</div>
          <span className="text-white text-sm font-medium">Assistant IA</span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-white hover:bg-[#232640] rounded transition-colors text-base"
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2 min-h-0">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'flex justify-end' : ''}>
            <div className={`text-xs rounded-xl p-2.5 leading-relaxed max-w-[92%] ${
              msg.role === 'assistant'
                ? 'bg-[#232640] text-slate-300'
                : 'bg-[#6366f1]/25 text-slate-200'
            }`}>
              {msg.role === 'assistant' && (
                <span className="text-[#6366f1] text-xs font-semibold block mb-1">IA</span>
              )}
              <span className="whitespace-pre-wrap">{msg.text}</span>
            </div>
          </div>
        ))}
        {loading && (
          <div className="bg-[#232640] rounded-xl p-2.5 text-xs text-slate-500 animate-pulse max-w-[92%]">
            <span className="text-[#6366f1] font-semibold block mb-1">IA</span>
            Analyse en cours…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-[#2d3748] flex-shrink-0">
        {!settings?.aiEnabled ? (
          <p className="text-slate-600 text-xs text-center py-1">
            Activez Ollama dans les Paramètres pour utiliser l'IA.
          </p>
        ) : (
          <div className="flex gap-2">
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
              placeholder="Posez une question…"
              className="flex-1 bg-[#0d0f16] border border-[#2d3748] rounded-lg px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-[#6366f1] transition-colors"
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="bg-[#6366f1] hover:bg-[#4f46e5] disabled:opacity-40 text-white text-sm px-3 py-2 rounded-lg transition-colors flex-shrink-0"
            >
              ↑
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
