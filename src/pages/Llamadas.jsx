import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PhoneCall, PhoneMissed, PhoneIncoming, PhoneOutgoing, TrendingUp } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const RESULTADO_CONFIG = {
  atendio:      { label: 'Atendió',       color: '#34d399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)', icon: PhoneOutgoing },
  no_contesta:  { label: 'No Contestó',   color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)', icon: PhoneMissed   },
  colgo:        { label: 'Colgó',         color: '#f87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.2)',   icon: PhoneIncoming },
}

export default function Llamadas() {
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const [llamadas, setLlamadas] = useState([])

  useEffect(() => {
    let q = supabase.from('llamadas').select('*').order('fecha', { ascending: false })
    if (!isAdmin) q = q.eq('agente_id', user?.id)
    q.then(({ data }) => data && setLlamadas(data))
  }, [])

  const total      = llamadas.length
  const atendidas  = llamadas.filter(l => l.resultado === 'atendio').length
  const noContesta = llamadas.filter(l => l.resultado === 'no_contesta').length
  const colgaron   = llamadas.filter(l => l.resultado === 'colgo').length

  const stats = [
    { label: 'Total',       value: total,      color: '#60a5fa', bg: 'rgba(37,99,235,0.12)',   border: 'rgba(37,99,235,0.25)',   icon: PhoneCall      },
    { label: 'Atendidas',   value: atendidas,  color: '#34d399', bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.25)',  icon: PhoneOutgoing  },
    { label: 'No Contestó', value: noContesta, color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.25)',  icon: PhoneMissed    },
    { label: 'Colgaron',    value: colgaron,   color: '#f87171', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.2)',    icon: PhoneIncoming  },
  ]

  return (
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: '28px', height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Historial de Llamadas</h2>
          <p style={{ fontSize: '13px', color: '#4a6fa5', marginTop: '2px' }}>{total} registros totales</p>
        </div>
        {total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '7px 14px', borderRadius: '20px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <TrendingUp size={13} color="#34d399" />
            <span style={{ fontSize: '12px', fontWeight: '600', color: '#34d399' }}>
              {total > 0 ? Math.round((atendidas / total) * 100) : 0}% tasa de contacto
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
        {stats.map(s => (
          <div key={s.label} style={{
            background: '#0d1117', border: `1px solid ${s.border}`,
            borderRadius: '14px', padding: '20px',
            display: 'flex', flexDirection: 'column', gap: '12px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '12px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{s.label}</span>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <s.icon size={15} color={s.color} />
              </div>
            </div>
            <span style={{ fontSize: '32px', fontWeight: '800', color: s.color, letterSpacing: '-1px', lineHeight: 1 }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Tabla */}
      {llamadas.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', background: '#0d1117', border: '1px solid #1a2744', borderRadius: '16px', padding: '80px' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <PhoneCall size={28} color="#2563eb" />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '15px', fontWeight: '600', color: '#f1f5f9', marginBottom: '4px' }}>Sin llamadas aún</p>
            <p style={{ fontSize: '13px', color: '#4a6fa5' }}>Las llamadas que registres desde cada cliente aparecerán acá</p>
          </div>
        </div>
      ) : (
        <div style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '16px', overflow: 'hidden' }}>
          {/* Encabezado tabla */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 2fr', gap: '12px', padding: '12px 20px', borderBottom: '1px solid #111827' }}>
            {['Cliente', 'Resultado', 'Fecha', 'Notas'].map(h => (
              <span key={h} style={{ fontSize: '11px', fontWeight: '600', color: '#2d4a7a', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{h}</span>
            ))}
          </div>

          {llamadas.map((l, i) => {
            const cfg = RESULTADO_CONFIG[l.resultado] || { label: l.resultado || 'Llamada', color: '#94a3b8', bg: 'rgba(148,163,184,0.1)', border: 'rgba(148,163,184,0.2)', icon: PhoneCall }
            const Icon = cfg.icon
            return (
              <div key={l.id}
                style={{
                  display: 'grid', gridTemplateColumns: '2fr 1.2fr 1.2fr 2fr', gap: '12px',
                  padding: '14px 20px', alignItems: 'center',
                  borderBottom: i < llamadas.length - 1 ? '1px solid #0d1220' : 'none',
                  transition: 'background 0.1s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#0a0f1a'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                {/* Cliente */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#60a5fa' }}>
                      {(l.cliente_nombre || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{l.cliente_nombre || '—'}</p>
                    {l.agente_nombre && <p style={{ fontSize: '11px', color: '#4a6fa5' }}>via {l.agente_nombre}</p>}
                  </div>
                </div>

                {/* Resultado */}
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                  padding: '5px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600',
                  background: cfg.bg, border: `1px solid ${cfg.border}`, color: cfg.color,
                  width: 'fit-content',
                }}>
                  <Icon size={11} /> {cfg.label}
                </span>

                {/* Fecha */}
                <span style={{ fontSize: '12px', color: '#4a6fa5' }}>
                  {new Date(l.fecha).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })}
                </span>

                {/* Notas */}
                <span style={{ fontSize: '13px', color: l.notas ? '#cbd5e1' : '#2d4a7a', fontStyle: l.notas ? 'normal' : 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {l.notas || 'Sin notas'}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
