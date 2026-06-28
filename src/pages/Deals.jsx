import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Plus, X, Trash2, Loader, Briefcase } from 'lucide-react'

const STAGES = [
  { key: 'nuevo',        label: 'Nuevo',        color: '#60a5fa', bg: 'rgba(37,99,235,0.1)',  border: 'rgba(37,99,235,0.25)' },
  { key: 'calificacion', label: 'Calificación', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' },
  { key: 'propuesta',    label: 'Propuesta',    color: '#38bdf8', bg: 'rgba(56,189,248,0.1)', border: 'rgba(56,189,248,0.25)' },
  { key: 'negociacion',  label: 'Negociación',  color: '#fb923c', bg: 'rgba(251,146,60,0.1)', border: 'rgba(251,146,60,0.25)' },
  { key: 'cierre',       label: 'Cierre',       color: '#fbbf24', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.25)' },
  { key: 'ganado',       label: 'Ganado',       color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.3)' },
  { key: 'perdido',      label: 'Perdido',      color: '#f87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.25)' },
]
const stageOf = (k) => STAGES.find(s => s.key === k) || STAGES[0]
const fmtUSD = (v) => (v != null && v !== '') ? '$' + Number(v).toLocaleString('es-AR', { minimumFractionDigits: 0 }) : '$0'

export default function Deals() {
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const [deals, setDeals] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(null) // 'nuevo' | deal
  const [saving, setSaving] = useState(false)

  useEffect(() => { fetchDeals(); fetchClientes() }, [])

  async function fetchDeals() {
    setLoading(true); setError(null)
    let q = supabase.from('deals').select('*').order('created_at', { ascending: false })
    if (!isAdmin) q = q.eq('agente_id', user.id)
    const { data, error } = await q
    if (error) setError(error.message)
    else setDeals(data || [])
    setLoading(false)
  }
  async function fetchClientes() {
    let q = supabase.from('clientes').select('id, nombre, agente_id, agente_nombre').order('nombre')
    if (!isAdmin) q = q.eq('agente_id', user.id)
    const { data } = await q
    if (data) setClientes(data)
  }

  async function changeStage(deal, etapa) {
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, etapa } : d))
    await supabase.from('deals').update({ etapa, updated_at: new Date().toISOString() }).eq('id', deal.id)
  }
  async function handleDelete(deal) {
    if (!confirm(`¿Eliminar la oportunidad "${deal.titulo || deal.cliente_nombre}"?`)) return
    await supabase.from('deals').delete().eq('id', deal.id)
    fetchDeals()
  }

  const totalAbierto = deals.filter(d => !['ganado', 'perdido'].includes(d.etapa)).reduce((s, d) => s + (Number(d.monto) || 0), 0)
  const totalGanado = deals.filter(d => d.etapa === 'ganado').reduce((s, d) => s + (Number(d.monto) || 0), 0)

  return (
    <div style={{ padding: '28px 32px', height: '100%', display: 'flex', flexDirection: 'column', gap: '20px', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Briefcase size={20} color="#60a5fa" /> Oportunidades
          </h2>
          <p style={{ fontSize: '13px', color: '#4a6fa5', marginTop: '2px' }}>
            {deals.length} deals · Pipeline abierto: <span style={{ color: '#fbbf24', fontWeight: 700 }}>{fmtUSD(totalAbierto)}</span> · Ganado: <span style={{ color: '#34d399', fontWeight: 700 }}>{fmtUSD(totalGanado)}</span>
          </p>
        </div>
        <button onClick={() => setModal('nuevo')} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', color: 'white',
          padding: '10px 18px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
          border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
        }}><Plus size={15} /> Nueva oportunidad</button>
      </div>

      {error ? (
        <div style={{ padding: '40px', textAlign: 'center', color: '#f87171', fontSize: '13px' }}>
          Error: {error}<br />
          <span style={{ color: '#4a6fa5', fontSize: '12px' }}>¿Creaste la tabla "deals" en Supabase? (ver el SQL que te pasé)</span>
        </div>
      ) : loading ? (
        <div style={{ padding: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#4a6fa5' }}>
          <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Cargando oportunidades...
        </div>
      ) : (
        /* Kanban */
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', flex: 1, paddingBottom: '8px' }}>
          {STAGES.map(stage => {
            const items = deals.filter(d => (d.etapa || 'nuevo') === stage.key)
            const sum = items.reduce((s, d) => s + (Number(d.monto) || 0), 0)
            return (
              <div key={stage.key} style={{ minWidth: '250px', width: '250px', flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', borderRadius: '10px 10px 0 0', background: stage.bg, border: `1px solid ${stage.border}`, borderBottom: 'none' }}>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: stage.color }}>{stage.label}</span>
                  <span style={{ fontSize: '11px', color: '#4a6fa5' }}>{items.length} · {fmtUSD(sum)}</span>
                </div>
                <div style={{ flex: 1, background: '#0a0f1a', border: '1px solid #1a2744', borderRadius: '0 0 10px 10px', padding: '8px', display: 'flex', flexDirection: 'column', gap: '8px', overflowY: 'auto', minHeight: '120px' }}>
                  {items.length === 0 && <p style={{ fontSize: '11px', color: '#2d4a7a', textAlign: 'center', padding: '16px 0' }}>—</p>}
                  {items.map(d => (
                    <div key={d.id} style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '10px', padding: '10px 12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '6px' }}>
                        <p style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', cursor: 'pointer' }} onClick={() => setModal(d)}>{d.titulo || d.cliente_nombre}</p>
                        <button onClick={() => handleDelete(d)} style={{ background: 'none', border: 'none', color: '#4a6fa5', cursor: 'pointer', flexShrink: 0 }}><Trash2 size={13} /></button>
                      </div>
                      {d.titulo && <p style={{ fontSize: '11px', color: '#4a6fa5', marginTop: '1px' }}>{d.cliente_nombre}</p>}
                      <p style={{ fontSize: '15px', fontWeight: 800, color: '#34d399', margin: '6px 0' }}>{fmtUSD(d.monto)}</p>
                      {(d.agente_nombre || d.producto) && <p style={{ fontSize: '11px', color: '#4a6fa5' }}>{[d.producto, d.agente_nombre].filter(Boolean).join(' · ')}</p>}
                      <select value={d.etapa || 'nuevo'} onChange={e => changeStage(d, e.target.value)}
                        style={{ width: '100%', marginTop: '8px', padding: '5px 8px', background: '#080c14', border: '1px solid #1a2744', borderRadius: '7px', fontSize: '11px', color: '#94a3b8', outline: 'none', cursor: 'pointer' }}>
                        {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {modal && (
        <DealModal
          deal={modal === 'nuevo' ? null : modal}
          clientes={clientes}
          saving={saving}
          onClose={() => setModal(null)}
          onSave={async (form) => {
            setSaving(true)
            const cli = clientes.find(c => c.id === form.cliente_id)
            const payload = {
              cliente_id: form.cliente_id || null,
              cliente_nombre: cli?.nombre || form.cliente_nombre || '',
              titulo: form.titulo || '',
              etapa: form.etapa || 'nuevo',
              monto: form.monto === '' ? null : Number(form.monto),
              producto: form.producto || '',
              fecha_cierre: form.fecha_cierre || null,
              notas: form.notas || '',
              agente_id: cli?.agente_id || (isAdmin ? null : user.id),
              agente_nombre: cli?.agente_nombre || (isAdmin ? null : user.nombre),
              updated_at: new Date().toISOString(),
            }
            let err
            if (modal === 'nuevo') {
              payload.created_at = new Date().toISOString()
              err = (await supabase.from('deals').insert(payload)).error
            } else {
              err = (await supabase.from('deals').update(payload).eq('id', modal.id)).error
            }
            setSaving(false)
            if (err) { alert('Error: ' + err.message); return }
            setModal(null); fetchDeals()
          }}
        />
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function DealModal({ deal, clientes, saving, onClose, onSave }) {
  const [form, setForm] = useState({
    cliente_id: deal?.cliente_id || '', titulo: deal?.titulo || '', etapa: deal?.etapa || 'nuevo',
    monto: deal?.monto ?? '', producto: deal?.producto || '', fecha_cierre: deal?.fecha_cierre || '', notas: deal?.notas || '',
  })
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))
  const inp = { width: '100%', padding: '10px 12px', background: '#080c14', border: '1px solid #1a2744', borderRadius: '9px', fontSize: '13px', color: '#e2e8f0', outline: 'none' }
  const lbl = { display: 'block', fontSize: '11px', fontWeight: 600, color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '16px', padding: '28px', width: '440px', maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>{deal ? 'Editar oportunidad' : 'Nueva oportunidad'}</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#4a6fa5', cursor: 'pointer' }}><X size={18} /></button>
        </div>
        <div><label style={lbl}>Cliente</label>
          <select value={form.cliente_id} onChange={e => set('cliente_id', e.target.value)} style={inp}>
            <option value="">— Seleccionar cliente —</option>
            {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </div>
        <div><label style={lbl}>Título (opcional)</label><input value={form.titulo} onChange={e => set('titulo', e.target.value)} placeholder="Ej: Plan Premium anual" style={inp} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div><label style={lbl}>Monto (USD)</label><input type="number" value={form.monto} onChange={e => set('monto', e.target.value)} placeholder="0" style={inp} /></div>
          <div><label style={lbl}>Etapa</label>
            <select value={form.etapa} onChange={e => set('etapa', e.target.value)} style={inp}>
              {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div><label style={lbl}>Producto</label><input value={form.producto} onChange={e => set('producto', e.target.value)} placeholder="Producto/servicio" style={inp} /></div>
          <div><label style={lbl}>Cierre estimado</label><input type="date" value={form.fecha_cierre || ''} onChange={e => set('fecha_cierre', e.target.value)} style={inp} /></div>
        </div>
        <div><label style={lbl}>Notas</label><textarea rows={2} value={form.notas} onChange={e => set('notas', e.target.value)} style={{ ...inp, resize: 'none', fontFamily: 'inherit' }} /></div>
        <button onClick={() => onSave(form)} disabled={saving || !form.cliente_id} style={{
          padding: '11px', borderRadius: '10px', border: 'none', fontSize: '14px', fontWeight: 700,
          background: (saving || !form.cliente_id) ? '#1a2744' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
          color: (saving || !form.cliente_id) ? '#4a6fa5' : '#fff', cursor: (saving || !form.cliente_id) ? 'not-allowed' : 'pointer',
        }}>{saving ? 'Guardando...' : (deal ? 'Guardar cambios' : 'Crear oportunidad')}</button>
      </div>
    </div>
  )
}
