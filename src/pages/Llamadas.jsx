import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PhoneCall, Calendar, Clock, FileText, PhoneMissed, PhoneIncoming, PhoneOutgoing } from 'lucide-react'

export default function Llamadas() {
  const [llamadas, setLlamadas] = useState([])

  useEffect(() => {
    supabase
      .from('llamadas')
      .select('*')
      .order('fecha', { ascending: false })
      .then(({ data }) => data && setLlamadas(data))
  }, [])

  const getTipoIcon = (tipo) => {
    if (tipo === 'entrante') return <PhoneIncoming size={14} className="text-blue-400" />
    if (tipo === 'perdida') return <PhoneMissed size={14} className="text-red-400" />
    return <PhoneOutgoing size={14} className="text-green-400" />
  }

  const getTipoBadge = (tipo) => {
    if (tipo === 'entrante') return { bg: 'rgba(59,130,246,0.12)', color: '#60a5fa', label: 'Entrante' }
    if (tipo === 'perdida') return { bg: 'rgba(239,68,68,0.12)', color: '#f87171', label: 'Perdida' }
    return { bg: 'rgba(16,185,129,0.12)', color: '#34d399', label: 'Saliente' }
  }

  return (
    <div style={{ padding: '28px 32px', minHeight: '100vh', background: 'var(--bg, #0f1117)' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <PhoneCall size={18} color="#34d399" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', margin: 0 }}>Historial de Llamadas</h2>
          </div>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0, paddingLeft: '46px' }}>
            {llamadas.length} {llamadas.length === 1 ? 'registro' : 'registros'}
          </p>
        </div>

        {/* Stats rápidas */}
        <div style={{ display: 'flex', gap: '12px' }}>
          {[
            { label: 'Total', value: llamadas.length, color: '#94a3b8' },
            { label: 'Salientes', value: llamadas.filter(l => !l.tipo || l.tipo === 'saliente').length, color: '#34d399' },
            { label: 'Entrantes', value: llamadas.filter(l => l.tipo === 'entrante').length, color: '#60a5fa' },
            { label: 'Perdidas', value: llamadas.filter(l => l.tipo === 'perdida').length, color: '#f87171' },
          ].map(s => (
            <div key={s.label} style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '10px', padding: '10px 16px', textAlign: 'center', minWidth: '70px' }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: s.color }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabla o estado vacío */}
      {llamadas.length === 0 ? (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', padding: '80px 40px', textAlign: 'center' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(100,116,139,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <PhoneCall size={28} color="#475569" />
          </div>
          <p style={{ color: '#f1f5f9', fontSize: '16px', fontWeight: '600', margin: '0 0 8px' }}>Sin llamadas registradas</p>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0 }}>Las llamadas que registres desde el perfil de cada cliente aparecerán aquí.</p>
        </div>
      ) : (
        <div style={{ background: '#1e293b', border: '1px solid #334155', borderRadius: '16px', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #334155', background: 'rgba(15,23,42,0.5)' }}>
                {['Cliente', 'Tipo', 'Fecha', 'Duración', 'Notas'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '12px 16px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {llamadas.map((l, i) => {
                const badge = getTipoBadge(l.tipo)
                return (
                  <tr key={l.id} style={{ borderBottom: i < llamadas.length - 1 ? '1px solid #1e293b' : 'none', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'rgba(99,102,241,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <span style={{ fontSize: '12px', fontWeight: '700', color: '#818cf8' }}>
                            {(l.cliente_nombre || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9' }}>{l.cliente_nombre || '—'}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', background: badge.bg, color: badge.color }}>
                        {getTipoIcon(l.tipo)}
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px' }}>
                        <Calendar size={13} />
                        {new Date(l.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      {l.duracion ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94a3b8', fontSize: '13px' }}>
                          <Clock size={13} />
                          {l.duracion}
                        </div>
                      ) : <span style={{ color: '#475569', fontSize: '13px' }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px', maxWidth: '320px' }}>
                      {l.notas ? (
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <FileText size={13} color="#64748b" style={{ marginTop: '2px', flexShrink: 0 }} />
                          <span style={{ fontSize: '13px', color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.notas}</span>
                        </div>
                      ) : <span style={{ color: '#475569', fontSize: '13px' }}>Sin notas</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
