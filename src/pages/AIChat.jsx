import { useState, useRef, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { chatWithData } from '../lib/claude'
import { Bot, Send, User } from 'lucide-react'

export default function AIChat() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: '¡Hola! Soy tu asistente de CRM. Podés preguntarme cosas como:\n• ¿Quiénes son los clientes potenciales?\n• ¿Cuántos clientes tienen score alto?\n• ¿A quién no llamamos esta semana?' }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function handleSend() {
    const q = input.trim()
    if (!q || loading) return

    setMessages(m => [...m, { role: 'user', text: q }])
    setInput('')
    setLoading(true)

    try {
      const { data } = await supabase.from('clientes').select('*')
      const respuesta = await chatWithData(q, data || [])
      setMessages(m => [...m, { role: 'assistant', text: respuesta }])
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', text: 'Error: ' + e.message }])
    }
    setLoading(false)
  }

  return (
    <div className="flex flex-col h-screen p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">IA Chat</h2>
        <p className="text-slate-400 text-sm mt-0.5">Consultá tu base de datos en lenguaje natural</p>
      </div>

      <div className="flex-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {messages.map((m, i) => (
            <div key={i} className={`flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${m.role === 'assistant' ? 'bg-blue-600' : 'bg-slate-600'}`}>
                {m.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
              </div>
              <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
                m.role === 'assistant' ? 'bg-slate-700 text-white' : 'bg-blue-600 text-white'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center">
                <Bot size={16} />
              </div>
              <div className="bg-slate-700 px-4 py-2.5 rounded-2xl">
                <div className="flex gap-1">
                  {[0,1,2].map(i => (
                    <div key={i} className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-slate-700 p-4 flex gap-3">
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Preguntá algo sobre tus clientes..."
            className="flex-1 px-4 py-2.5 bg-slate-700 border border-slate-600 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl transition-colors"
          >
            <Send size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
