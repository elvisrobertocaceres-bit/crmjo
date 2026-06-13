import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Users, PhoneCall, TrendingUp, Clock } from 'lucide-react'

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, potenciales: 0, en_proceso: 0, llamadas_hoy: 0 })
  const [recientes, setRecientes] = useState([])

  useEffect(() => { fetchStats(); fetchRecientes() }, [])

  async function fetchStats() {
    const { data } = await supabase.from('clientes').select('estado')
    if (!data) return
    setStats({
      total: data.length,
      potenciales: data.filter(c => c.estado === 'potencial').length,
      en_proceso: data.filter(c => c.estado === 'en_proceso').length,
      llamadas_hoy: 0,
    })
  }

  async function fetchRecientes() {
    const { data } = await supabase.from('clientes').select('*').order('updated_at', { ascending: false }).limit(6)
    if (data) setRecientes(data)
  }

  const estadoStyle = {
    potencial:    { color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.25)' },
    no_potencial: { color: '#f87171', bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.25)' },
    en_proceso:   { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
    convertido:   { color: '#60a5fa', bg: 'rgba(37,99,235,0.12)',  border: 'rgba(37,99,235,0.25)' },
    descartado:   { color: '#94a3b8', bg: 'rgba(100,116,139,0.12)',border: 'rgba(100,116,139,0.25)' },
  }

  const estadoLabel = {
    potencial: 'Potencial', no_potencial: 'No Potencial',
    en_proceso: 'En Proceso', convertido: 'Convertido', descartado: 'Descartado',
  }

  const cards = [
    { label: 'Total Clientes', value: stats.total, icon: Users, accent: '#2563eb', glow: 'rgba(37,99,235,0.2)' },
    { label: 'Potenciales', value: stats.potenciales, icon: TrendingUp, accent: '#10b981', glow: 'rgba(16,185,129,0.2)' },
    { label: 'En Proceso', value: stats.en_proceso, icon: Clock, accent: '#f59e0b', glow: 'rgba(245,158,11,0.2)' },
    { label: 'Llamadas Hoy', value: stats.llamadas_hoy, icon: PhoneCall, accent: '#8b5cf6', glow: 'rgba(139,92,246,0.2)' },
  ]

  return (
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: '28px', position: 'relative' }}>

      {/* Marca de agua */}
      <div style={{
        position: 'fixed', bottom: '40px', right: '48px',
        opacity: 0.04, pointerEvents: 'none', zIndex: 0,
      }}>
        <svg viewBox="0 0 400 400" width="320" height="320" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="200" r="155" fill="none" stroke="#ffffff" strokeWidth="1" strokeDasharray="6 4"/>
          <circle cx="200" cy="200" r="120" fill="none" stroke="#ffffff" strokeWidth="0.5"/>
          <rect x="120" y="120" width="160" height="160" rx="28" fill="none" stroke="#ffffff" strokeWidth="1.5"/>
          <line x1="150" y1="168" x2="250" y2="168" stroke="#ffffff" strokeWidth="0.5"/>
          <text x="200" y="210" fontSize="32" fontWeight="700" fill="#ffffff" textAnchor="middle" fontFamily="Inter,sans-serif" letterSpacing="3">CRM</text>
          <text x="200" y="245" fontSize="32" fontWeight="700" fill="#ffffff" textAnchor="middle" fontFamily="Inter,sans-serif" letterSpacing="6">JO</text>
          <line x1="150" y1="258" x2="250" y2="258" stroke="#ffffff" strokeWidth="0.5"/>
          <circle cx="140" cy="140" r="3" fill="#ffffff"/>
          <circle cx="260" cy="140" r="3" fill="#ffffff"/>
          <circle cx="140" cy="260" r="3" fill="#ffffff"/>
          <circle cx="260" cy="260" r="3" fill="#ffffff"/>
          <line x1="200" y1="50" x2="200" y2="80" stroke="#ffffff" strokeWidth="1"/>
          <line x1="185" y1="65" x2="215" y2="65" stroke="#ffffff" strokeWidth="1"/>
          <line x1="200" y1="320" x2="200" y2="350" stroke="#ffffff" strokeWidth="1"/>
          <line x1="185" y1="335" x2="215" y2="335" stroke="#ffffff" strokeWidth="1"/>
          <text x="200" y="380" fontSize="10" fill="#ffffff" textAnchor="middle" fontFamily="Inter,sans-serif" letterSpacing="4">PRO SUITE</text>
        </svg>
      </div>

      <div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Dashboard</h2>
        <p style={{ fontSize: '13px', color: '#4a6fa5', marginTop: '2px' }}>Resumen ejecutivo de tu CRM</p>
      </div>

      {/* Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
        {cards.map(({ label, value, icon: Icon, accent, glow }) => (
          <div key={label} style={{
            background: '#0d1117', border: `1px solid #1a2744`,
            borderRadius: '14px', padding: '22px',
            boxShadow: `0 0 24px ${glow}`,
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, right: 0,
              width: '80px', height: '80px',
              background: `radial-gradient(circle at top right, ${glow}, transparent)`,
            }} />
            <div style={{
              width: '38px', height: '38px', borderRadius: '10px',
              background: `rgba(${accent === '#2563eb' ? '37,99,235' : accent === '#10b981' ? '16,185,129' : accent === '#f59e0b' ? '245,158,11' : '139,92,246'},0.15)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: '14px', border: `1px solid ${glow}`,
            }}>
              <Icon size={18} color={accent} />
            </div>
            <p style={{ fontSize: '11px', color: '#4a6fa5', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{label}</p>
            <p style={{ fontSize: '32px', fontWeight: '700', color: '#f1f5f9', marginTop: '4px', letterSpacing: '-1px' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabla recientes */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '14px', overflow: 'hidden' }}>
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #1a2744', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>Actividad Reciente</p>
          <span style={{ fontSize: '11px', color: '#4a6fa5' }}>Últimos {recientes.length} registros</span>
        </div>
        {recientes.length === 0 ? (
          <p style={{ color: '#2d4a7a', fontSize: '13px', padding: '32px 22px' }}>
            No hay clientes aún. Importá desde HubSpot o agregá uno nuevo.
          </p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #111827' }}>
                {['Cliente', 'Empresa', 'Estado', 'Llamadas'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: '11px', color: '#2d4a7a', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '12px 22px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recientes.map((c, i) => {
                const s = estadoStyle[c.estado] || estadoStyle.descartado
                return (
                  <tr key={c.id} style={{ borderBottom: i < recientes.length - 1 ? '1px solid #111827' : 'none' }}>
                    <td style={{ padding: '13px 22px' }}>
                      <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{c.nombre}</p>
                      <p style={{ fontSize: '11px', color: '#4a6fa5' }}>{c.email || '—'}</p>
                    </td>
                    <td style={{ padding: '13px 22px', fontSize: '13px', color: '#94a3b8' }}>{c.empresa || '—'}</td>
                    <td style={{ padding: '13px 22px' }}>
                      <span style={{ fontSize: '11px', fontWeight: '600', padding: '3px 10px', borderRadius: '20px', background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
                        {estadoLabel[c.estado] || c.estado}
                      </span>
                    </td>
                    <td style={{ padding: '13px 22px' }}>
                      <span style={{ fontSize: '12px', fontWeight: '600', color: '#60a5fa' }}>{c.cantidad_llamadas || 0}</span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
