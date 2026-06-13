import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { scoreClient, suggestAction } from '../lib/claude'
import { ESTADOS_CONFIG, getEstadoStyle, getEstadoLabel } from '../lib/i18n'
import { useLang } from '../context/LangContext'
import { Plus, Search, Brain, Zap, Phone } from 'lucide-react'
import ModalCliente from '../components/ModalCliente'

export default function Clientes() {
  const { t, lang } = useLang()
  const [clientes, setClientes] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null)
  const [aiLoading, setAiLoading] = useState(null)

  useEffect(() => { fetchClientes() }, [])

  async function fetchClientes() {
    const { data } = await supabase.from('clientes').select('*').order('created_at', { ascending: false })
    if (data) setClientes(data)
  }

  async function handleScore(cliente) {
    setAiLoading(cliente.id + '_score')
    try {
      const result = await scoreClient(cliente)
      await supabase.from('clientes').update({
        ai_score: result.score, ai_nivel: result.nivel, ai_razon: result.razon,
      }).eq('id', cliente.id)
      fetchClientes()
    } catch (e) { alert('Error IA: ' + e.message) }
    setAiLoading(null)
  }

  async function handleSuggest(cliente) {
    setAiLoading(cliente.id + '_suggest')
    try {
      const result = await suggestAction(cliente)
      alert(`${t('speeches_titulo')}:\n\n${result.accion}\n${result.cuando}\n${result.motivo}`)
    } catch (e) { alert('Error IA: ' + e.message) }
    setAiLoading(null)
  }

  const filtrados = clientes
    .filter(c => filtro === 'todos' || c.estado === filtro)
    .filter(c => {
      const q = busqueda.toLowerCase()
      return !q || c.nombre?.toLowerCase().includes(q) || c.empresa?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    })

  return (
    <div style={{ padding: '32px 36px', height: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>{t('clientes')}</h2>
          <p style={{ fontSize: '13px', color: '#4a6fa5', marginTop: '2px' }}>{filtrados.length} {t('registros')}</p>
        </div>
        <button onClick={() => setModal('nuevo')} style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
          color: 'white', padding: '10px 18px', borderRadius: '10px',
          fontSize: '13px', fontWeight: '600', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
        }}>
          <Plus size={15} /> {t('nuevo_cliente')}
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '300px' }}>
          <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4a6fa5' }} />
          <input
            type="text" placeholder={t('buscar')} value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            style={{
              width: '100%', paddingLeft: '36px', paddingRight: '14px', paddingTop: '9px', paddingBottom: '9px',
              background: '#0d1117', border: '1px solid #1a2744', borderRadius: '9px',
              fontSize: '13px', color: '#e2e8f0', outline: 'none',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          <button onClick={() => setFiltro('todos')} style={{
            padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '500',
            border: filtro === 'todos' ? '1px solid #2563eb' : '1px solid #1a2744',
            background: filtro === 'todos' ? 'rgba(37,99,235,0.18)' : 'transparent',
            color: filtro === 'todos' ? '#60a5fa' : '#4a6fa5', cursor: 'pointer',
          }}>{t('todos')}</button>
          {ESTADOS_CONFIG.map(e => (
            <button key={e.key} onClick={() => setFiltro(e.key)} style={{
              padding: '7px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '500',
              border: filtro === e.key ? `1px solid ${e.border}` : '1px solid #1a2744',
              background: filtro === e.key ? e.bg : 'transparent',
              color: filtro === e.key ? e.color : '#4a6fa5', cursor: 'pointer',
            }}>{e.label[lang] || e.label.es}</button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '14px', overflow: 'hidden', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a2744' }}>
              {[t('nombre'), t('empresa'), t('telefono'), t('estado'), t('score_ia'), 'Llamadas', t('acciones')].map(h => (
                <th key={h} style={{
                  textAlign: 'left', fontSize: '11px', fontWeight: '600',
                  color: '#2d4a7a', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '14px 18px',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#2d4a7a', padding: '48px', fontSize: '14px' }}>
                No hay clientes en esta categoría
              </td></tr>
            ) : filtrados.map((c, i) => {
              const s = getEstadoStyle(c.estado)
              return (
                <tr key={c.id}
                  style={{ borderBottom: i < filtrados.length - 1 ? '1px solid #111827' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#111827'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <button onClick={() => setModal(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <p style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>{c.nombre}</p>
                      <p style={{ fontSize: '12px', color: '#4a6fa5', marginTop: '1px' }}>{c.email}</p>
                    </button>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: '13px', color: '#94a3b8' }}>{c.empresa || '—'}</td>
                  <td style={{ padding: '14px 18px', fontSize: '13px', color: '#94a3b8' }}>{c.telefono || '—'}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px',
                      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                    }}>{getEstadoLabel(c.estado, lang)}</span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    {c.ai_score ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%',
                          background: c.ai_nivel === 'alto' ? 'rgba(16,185,129,0.15)' : c.ai_nivel === 'medio' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '13px', fontWeight: '700',
                          color: c.ai_nivel === 'alto' ? '#34d399' : c.ai_nivel === 'medio' ? '#fbbf24' : '#f87171',
                          border: `1px solid ${c.ai_nivel === 'alto' ? 'rgba(16,185,129,0.3)' : c.ai_nivel === 'medio' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                        }}>{c.ai_score}</div>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#2d4a7a' }}>{t('sin_calcular')}</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ background: 'rgba(37,99,235,0.1)', color: '#60a5fa', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                      {c.cantidad_llamadas || 0}
                    </span>
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleScore(c)} disabled={aiLoading === c.id + '_score'} title={t('score_ia')} style={{
                        padding: '7px', borderRadius: '8px', border: '1px solid rgba(139,92,246,0.2)',
                        background: 'rgba(139,92,246,0.08)', color: '#a78bfa', cursor: 'pointer',
                        opacity: aiLoading === c.id + '_score' ? 0.4 : 1,
                      }}><Brain size={14} /></button>
                      <button onClick={() => handleSuggest(c)} disabled={aiLoading === c.id + '_suggest'} title="Sugerencia IA" style={{
                        padding: '7px', borderRadius: '8px', border: '1px solid rgba(245,158,11,0.2)',
                        background: 'rgba(245,158,11,0.08)', color: '#fbbf24', cursor: 'pointer',
                        opacity: aiLoading === c.id + '_suggest' ? 0.4 : 1,
                      }}><Zap size={14} /></button>
                      <button onClick={() => setModal(c)} title={t('registrar_llamada')} style={{
                        padding: '7px', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.2)',
                        background: 'rgba(16,185,129,0.08)', color: '#34d399', cursor: 'pointer',
                      }}><Phone size={14} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal && (
        <ModalCliente
          cliente={modal === 'nuevo' ? null : modal}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); fetchClientes() }}
        />
      )}
    </div>
  )
}
