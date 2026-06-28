import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Trash2, User } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function Agentes() {
  const { user } = useAuth()
  const [agentes, setAgentes] = useState([])
  const [form, setForm] = useState({ nombre: '', email: '', password: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => { fetchAgentes() }, [])

  async function fetchAgentes() {
    const { data } = await supabase.from('usuarios').select('*').eq('rol', 'agente').order('created_at')
    if (data) setAgentes(data)
  }

  async function handleCrear(e) {
    e.preventDefault()
    if (!form.nombre || !form.email || !form.password) return
    setLoading(true)
    const { error } = await supabase.from('usuarios').insert({
      nombre: form.nombre, email: form.email.toLowerCase(),
      password: form.password, rol: 'agente',
    })
    if (error) alert('Error: ' + error.message)
    else { setForm({ nombre: '', email: '', password: '' }); fetchAgentes() }
    setLoading(false)
  }

  async function handleEliminar(id, nombre) {
    // Contar clientes asignados (la FK impide borrar si tiene)
    const { count } = await supabase.from('clientes').select('id', { count: 'exact', head: true }).eq('agente_id', id)
    const n = count || 0
    const msg = n > 0
      ? `El agente "${nombre}" tiene ${n} cliente${n > 1 ? 's' : ''} asignado${n > 1 ? 's' : ''}.\nSi lo eliminás, esos clientes quedarán SIN agente (podrás reasignarlos después).\n\n¿Continuar?`
      : `¿Eliminar al agente "${nombre}"?`
    if (!confirm(msg)) return
    // Desasignar clientes para no violar la clave foránea
    if (n > 0) {
      const up = await supabase.from('clientes').update({ agente_id: null, agente_nombre: null }).eq('agente_id', id)
      if (up.error) { alert('Error al desasignar clientes: ' + up.error.message); return }
    }
    const del = await supabase.from('usuarios').delete().eq('id', id)
    if (del.error) { alert('No se pudo eliminar el agente: ' + del.error.message); return }
    fetchAgentes()
  }

  if (user?.rol !== 'admin') return null

  return (
    <div style={{ padding: '32px 36px', maxWidth: '700px', display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Gestión de Agentes</h2>
        <p style={{ fontSize: '13px', color: '#4a6fa5', marginTop: '2px' }}>Creá y administrá los agentes del CRM</p>
      </div>

      {/* Crear agente */}
      <form onSubmit={handleCrear} style={{
        background: '#0d1117', border: '1px solid #1a2744', borderRadius: '14px', padding: '22px',
        display: 'flex', flexDirection: 'column', gap: '14px',
      }}>
        <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0', marginBottom: '2px' }}>Nuevo Agente</p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
          {[
            { key: 'nombre', placeholder: 'Nombre completo' },
            { key: 'email', placeholder: 'Email', type: 'email' },
            { key: 'password', placeholder: 'Contraseña', type: 'password' },
          ].map(f => (
            <input key={f.key} type={f.type || 'text'} placeholder={f.placeholder}
              value={form[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              style={{
                padding: '9px 12px', background: '#080c14', border: '1px solid #1a2744',
                borderRadius: '9px', fontSize: '13px', color: '#e2e8f0', outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = '#1a2744'}
            />
          ))}
        </div>
        <button type="submit" disabled={loading} style={{
          alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '9px 18px', borderRadius: '9px', fontSize: '13px', fontWeight: '600',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none',
          color: 'white', cursor: 'pointer', opacity: loading ? 0.6 : 1,
        }}>
          <Plus size={14} /> Crear Agente
        </button>
      </form>

      {/* Lista agentes */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid #111827' }}>
          <p style={{ fontSize: '11px', fontWeight: '600', color: '#2d4a7a', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Agentes activos ({agentes.length})
          </p>
        </div>
        {agentes.length === 0 ? (
          <p style={{ padding: '32px', textAlign: 'center', color: '#2d4a7a', fontSize: '13px' }}>No hay agentes creados</p>
        ) : agentes.map((a, i) => (
          <div key={a.id} style={{
            padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: i < agentes.length - 1 ? '1px solid #111827' : 'none',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '36px', height: '36px', borderRadius: '10px',
                background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <User size={15} color="#60a5fa" />
              </div>
              <div>
                <p style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>{a.nombre}</p>
                <p style={{ fontSize: '12px', color: '#4a6fa5' }}>{a.email}</p>
              </div>
            </div>
            <button onClick={() => handleEliminar(a.id, a.nombre)} style={{
              padding: '7px', borderRadius: '8px', border: '1px solid rgba(239,68,68,0.2)',
              background: 'rgba(239,68,68,0.08)', color: '#f87171', cursor: 'pointer',
            }}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
