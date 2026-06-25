import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { chatWithData } from '../lib/claude'
import { Bot, Send, User, Sparkles, Zap, MessageSquare } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const suggestions = [
  { icon: '🎯', text: '¿Quiénes son los clientes potenciales?' },
  { icon: '📞', text: '¿A quién no llamamos esta semana?' },
  { icon: '📊', text: '¿Cuántos clientes tengo en proceso?' },
  { icon: '🏆', text: '¿Cuál es el cliente con más llamadas?' },
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
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '28px 36px 0', gap: '20px', overflow: 'hidden' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ position: 'relative' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '14px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px rgba(99,102,241,0.4)' }}>
              <Sparkles size={20} color="#fff" />
            </div>
            <div style={{ position: 'absolute', bottom: '-2px', right: '-2px', width: '12px', height: '12px', borderRadius: '50%', background: '#34d399', border: '2px solid #080c14' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.4px' }}>IA Chat</h2>
            <p style={{ fontSize: '12px', color: '#4a6fa5' }}>Consultá tu base de datos en lenguaje natural</p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.2)', borderRadius: '20px', padding: '6px 14px' }}>
          <Zap size={12} color="#818cf8" />
          <span style={{ fontSize: '11px', fontWeight: '600', color: '#818cf8', letterSpacing: '0.3px' }}>Claude Sonnet</span>
        </div>
      </div>

      {/* Chat area */}
      <div style={{ flex: 1, background: '#0d1117', border: '1px solid #1a2744', borderRadius: '16px', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>

        {/* Messages */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Welcome */}
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, gap: '28px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ width: '72px', height: '72px', borderRadius: '22px', background: 'linear-gradient(135deg, rgba(99,102,241,0.2), rgba(139,92,246,0.2))', border: '1px solid rgba(99,102,241,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 40px rgba(99,102,241,0.15)' }}>
                  <Bot size={32} color="#818cf8" />
                </div>
                <p style={{ fontSize: '18px', fontWeight: '700', color: '#f1f5f9', marginBottom: '6px' }}>¿En qué puedo ayudarte?</p>
                <p style={{ fontSize: '13px', color: '#4a6fa5', maxWidth: '340px' }}>Preguntame sobre tus clientes, seguimientos, llamadas y rendimiento de tu equipo</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', width: '100%', maxWidth: '520px' }}>
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => handleSend(s.text)} style={{
                    textAlign: 'left', padding: '13px 16px',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid #1a2744',
                    borderRadius: '12px', cursor: 'pointer',
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    transition: 'all .15s',
                  }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.08)'; e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.02)'; e.currentTarget.style.borderColor = '#1a2744' }}
                  >
                    <span style={{ fontSize: '18px', lineHeight: 1 }}>{s.icon}</span>
                    <span style={{ fontSize: '12px', color: '#94a3b8', lineHeight: 1.5 }}>{s.text}</span>
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.15)' }}>
                <MessageSquare size={11} color="#34d399" />
                <span style={{ fontSize: '11px', color: '#34d399', fontWeight: '500' }}>Respuestas en tiempo real usando tus datos del CRM</span>
              </div>
            </div>
          )}

          {/* Messages list */}
          {messages.map((m, i) => (
            <div key={i} style={{ display: 'flex', gap: '12px', flexDirection: m.role === 'user' ? 'row-reverse' : 'row', alignItems: 'flex-start' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '10px', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: m.role === 'assistant'
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : 'rgba(255,255,255,0.06)',
                border: m.role === 'user' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                boxShadow: m.role === 'assistant' ? '0 0 14px rgba(99,102,241,0.3)' : 'none',
              }}>
                {m.role === 'assistant' ? <Bot size={16} color="#fff" /> : <User size={16} color="#94a3b8" />}
              </div>
              <div style={{
                maxWidth: '72%', padding: '12px 16px',
                borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, #4f46e5, #7c3aed)'
                  : 'rgba(255,255,255,0.04)',
                border: m.role === 'assistant' ? '1px solid #1a2744' : 'none',
                fontSize: '13px', color: '#f1f5f9', lineHeight: '1.65', whiteSpace: 'pre-wrap',
                boxShadow: m.role === 'user' ? '0 4px 14px rgba(79,70,229,0.3)' : 'none',
              }}>
                {m.text}
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 14px rgba(99,102,241,0.3)' }}>
                <Bot size={16} color="#fff" />
              </div>
              <div style={{ padding: '14px 18px', background: 'rgba(255,255,255,0.04)', border: '1px solid #1a2744', borderRadius: '4px 16px 16px 16px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', animation: 'bounce 1.2s ease-in-out infinite', animationDelay: `${i * 0.2}s` }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{ borderTop: '1px solid #1a2744', padding: '16px', display: 'flex', gap: '10px', flexShrink: 0, background: 'rgba(0,0,0,0.2)' }}>
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder="Preguntá sobre tus clientes..."
            style={{
              flex: 1, padding: '11px 18px',
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid #1a2744', borderRadius: '12px',
              fontSize: '13px', color: '#f1f5f9', outline: 'none', fontFamily: 'inherit',
              transition: 'border-color .15s',
            }}
            onFocus={e => e.target.style.borderColor = 'rgba(99,102,241,0.5)'}
            onBlur={e => e.target.style.borderColor = '#1a2744'}
          />
          <button
            onClick={() => handleSend()}
            disabled={loading || !input.trim()}
            style={{
              width: '42px', height: '42px', borderRadius: '12px', border: 'none', cursor: 'pointer',
              background: loading || !input.trim() ? 'rgba(255,255,255,0.04)' : 'linear-gradient(135deg, #4f46e5, #7c3aed)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all .15s', flexShrink: 0,
              boxShadow: loading || !input.trim() ? 'none' : '0 4px 14px rgba(79,70,229,0.4)',
            }}
          >
            <Send size={15} color={loading || !input.trim() ? '#4a6fa5' : '#fff'} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 60%, 100% { transform: translateY(0) }
          30% { transform: translateY(-6px) }
        }
      `}</style>
    </div>
  )
}
