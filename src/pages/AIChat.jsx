import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { chatWithData } from '../lib/claude'
import { Bot, Send, User, Sparkles, Zap } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const suggestions = [
  '¿Quiénes son los clientes potenciales?',
  '¿Cuántos clientes tengo en proceso?',
  '¿A quién no llamamos esta semana?',
  '¿Cuál es el cliente con más llamadas?',
]

export default function AIChat() {
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend(text) {
    const q = (text || input).trim()
    if (!q || loading) return
    setMessages(m => [...m, { role: 'user', text: q }])
    setInput('')
    setLoading(true)
    try {
      let query = supabase.from('clientes').select('*')
      if (!isAdmin) query = query.eq('agente_id', user?.id)
      const { data } = await query
      const respuesta = await chatWithData(q, data || [])
      setMessages(m => [...m, { role: 'assistant', text: respuesta }])
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', text: 'Error al consultar: ' + e.message }])
    }
    setLoading(false)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '28px 36px 0', gap: '20px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(99,102,241,0.35)' }}>
            <Sparkles size={18} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.4px' }}>IA Chat</h2>
            <p style={{ fontSize: '12px', color: '#4a6fa5' }}>Consultá tu base de datos en lenguaje natural</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(99,102,241,0.25)', borderRadius: '20px', padding: '5px 12px' }}>
          <Zap size={12} color="#818cf8" />
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#818cf8' }}>Claude Sonnet</span>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Welcome state */}
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '20px', paddingBottom: '40px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '20px', background: 'linear-gradient(135deg,rgba(99,102,241,0.2),rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Bot size={30} color="#818cf8" />
              </div>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9', marginBottom: '6px' }}>¿En qué puedo ayudarte?</p>
                <p style={{ fontSize: '13px', color: '#4a6fa5' }}>Preguntame sobre tus clientes, llamadas, seguimientos y más</p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '100%', maxWidth: '480px' }}>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => handleSend(s)} style={{
                    textAlign: 'left', padding: '10px 14px', background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', cursor: 'pointer',
                    fontSize: '12px', color: '#94a3b8', transition: 'all .15s', lineHeight: 1.4,
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.25)'; e.currentTarget.style.color = '#c7d2fe' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; e.currentTarget.style.color = '#94a3b8' }}
                  >{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Messages list */}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: m.role === 'assistant' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : 'rgba(255,255,255,0.08)', border: m.role === 'user' ? '1px solid rgba(255,255,255,0.1)' : 'none' }}>
                {m.role === 'assistant' ? <Bot size={15} color="#fff" /> : <User size={15} color="#94a3b8" />}
              </div>
              <div style={{
                maxWidth: '72%', padding: '10px 14px', borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                background: m.role === 'user' ? 'linear-gradient(135deg,#4f46e5,#7c3aed)' : 'rgba(255,255,255,0.05)',
                border: m.role === 'assistant' ? '1px solid rgba(255,255,255,0.07)' : 'none',
                fontSize: '13px', color: '#f1f5f9', lineHeight: '1.6', whiteSpace: 'pre-wrap',
              }}>
                {m.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bot size={15} color="#fff" />
              </div>
              <div style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: '5px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#6366f1', animation: 'bounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px', display: 'flex', gap: '10px', flexShrink: 0 }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Preguntá algo sobre tus clientes..."
            style={{
              flex: 1, padding: '10px 16px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px',
              fontSize: '13px', color: '#f1f5f9', outline: 'none', fontFamily: 'inherit',
              transition: 'border-color .15s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
            onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            style={{
              width: '40px', height: '40px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: loading || !input.trim() ? 'rgba(255,255,255,0.05)' : 'linear-gradient(135deg,#4f46e5,#7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', flexShrink: 0,
            }}
          >
            <Send size={15} color={loading || !input.trim() ? '#4a6fa5' : '#fff'} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0) }
          30% { transform: translateY(-5px) }
        }
      `}</style>
    </div>
  )
}
