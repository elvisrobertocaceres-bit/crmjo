import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { useLang } from '../context/LangContext'
import { getEstadoStyle, getEstadoLabel } from '../lib/i18n'
import { CalendarClock, Plus, X, Check, Phone, Loader } from 'lucide-react'

const hoyISO = () => new Date().toISOString().slice(0, 10)

export default function Seguimientos() {
  const { user } = useAuth()
  const { lang } = useLang()
  const isAdmin = user?.rol === 'admin'
  const [items, setItems] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState({ cliente_id: '', fecha: hoyISO() })
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchData(); fetchClientes() }, [])

  async function fetchData() {
    setLoading(true)
    let q = supabase.from('clientes').select('*').not('proximo_seguimiento', 'is', null).order('proximo_seguimiento', { ascending: true })
    if (!isAdmin) q = q.eq('agente_id', user.id)
    const { data } = await q
    setItems(data || [])
    setLoading(false)
  }
  async function fetchClientes() {
    let q = supabase.from('clientes').select('id, nombre').order('nombre')
    if (!isAdmin) q = q.eq('agente_id', user.id)
    const { data } = await q
    if (data) setClientes(data)
  }
  async function setFecha(id, fecha) {
    setItems(prev => prev.map(c => c.id === id ? { ...c, proximo_seguimiento: fecha } : c).filter(c => c.proximo_seguimiento))
    await supabase.from('clientes').update({ proximo_seguimiento: fecha }).eq('id', id)
    if (!fecha) fetchData()
  }
  async function agendar() {
    if (!form.cliente_id || !form.fecha) return
    setSaving(true)
    await supabase.from('clientes').update({ proximo_seguimiento: form.fecha }).eq('id', form.cliente_id)
    setSaving(false); setModal(false); setForm({ cliente_id: '', fecha: hoyISO() }); fetchData()
  }

  const hoy = hoyISO()
  const inicioSemana = hoy
  const finSemana = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  const grupos = [
    { key: 'vencidos', label: 'Vencidos', color: '#f87171', test: d => d < hoy },
    { key: 'hoy', label: 'Hoy', color: '#fbbf24', test: d => d === hoy },
    { key: 'semana', label: 'Próximos 7 días', color: '#60a5fa', test: d => d > inicioSemana && d <= finSemana },
    { key: 'despues', label: 'Más adelante', color: '#4a6fa5', test: d => d > finSemana },
  ]

  return (
    <div style={{ padding: '28px 32px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarClock size={20} color="#60a5fa" /> Seguimientos
          </h2>
          <p style={{ fontSize: '13px', color: '#4a6fa5', marginTop: '2px' }}>{items.length} seguimientos agendados</p>
        </div>
        <button onClick={() => setModal(true)} style={{
          display: 'flex', alignItems: 'center', gap: '8px', background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: 'white', padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer',
        }}><Plus size={15} /> Agendar seguimiento</button>
      </div>

      {loading ? (
        <div style={{ padding: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#4a6fa5' }}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Cargando...
        </div>
      ) : items.length === 0 ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#2d4a7a', fontSize: '13px' }}>
          No hay seguimientos agendados. Usá "Agendar seguimiento" para programar el próximo contacto de un cliente.
        </div>
      ) : grupos.map(g => {
        const list = items.filter(c => g.test(c.proximo_seguimiento))
        if (!list.length) return null
        return (
          <div key={g.key}>
            <p style={{ fontSize: '12px', fontWeight: 700, color: g.color, textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>{g.label} ({list.length})</p>
            <div style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '14px', overflow: 'hidden' }}>
              {list.map((c, i) => {
                const s = getEstadoStyle(c.estado)
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 18px', borderBottom: i < list.length - 1 ? '1px solid #111827' : 'none' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', fontWeight: 600, color: '#e2e8f0' }}>{c.nombre}</p>
                      <p style={{ fontSize: '12px', color: '#4a6fa5' }}>{[c.telefono, isAdmin && c.agente_nombre].filter(Boolean).join(' · ')}</p>
                    </div>
                    <span style={{ fontSize: '11px', fontWeight: 600, padding: '4px 10px', borderRadius: '20px', background: s.bg, color: s.color, border: `1px solid ${s.border}`, whiteSpace: 'nowrap' }}>{getEstadoLabel(c.estado, lang)}</span>
                    <input type="date" value={c.proximo_seguimiento || ''} onChange={e => setFecha(c.id, e.target.value)}
                      style={{ padding: '6px 10px', background: '#080c14', border: '1px solid #1a2744', borderRadius: '8px', fontSize: '12px', color: '#e2e8f0', outline: 'none' }} />
                    <button onClick={() => setFecha(c.id, null)} title="Marcar como hecho (quitar)" style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '7px 12px', borderRadius: '8px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#34d399', cursor: 'pointer', fontSize: '12px', fontWeight: 600 }}>
                      <Check size={13} /> Hecho
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {modal && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '16px', padding: '28px', width: '400px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>Agendar seguimiento</p>
              <button onClick={() => setModal(false)} style={{ background: 'none', border: 'none', color: '#4a6fa5', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div><label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Cliente</label>
              <select value={form.cliente_id} onChange={e => setForm(p => ({ ...p, cliente_id: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: '#080c14', border: '1px solid #1a2744', borderRadius: '9px', fontSize: '13px', color: '#e2e8f0', outline: 'none' }}>
                <option value="">— Seleccionar —</option>
                {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div><label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))} style={{ width: '100%', padding: '10px 12px', background: '#080c14', border: '1px solid #1a2744', borderRadius: '9px', fontSize: '13px', color: '#e2e8f0', outline: 'none' }} />
            </div>
            <button onClick={agendar} disabled={saving || !form.cliente_id} style={{ padding: '11px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 700, background: (saving || !form.cliente_id) ? '#1a2744' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: (saving || !form.cliente_id) ? '#4a6fa5' : '#fff', cursor: (saving || !form.cliente_id) ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Guardando...' : 'Agendar'}
            </button>
          </div>
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
