import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { scoreClient, suggestAction } from '../lib/claude'
import { ESTADOS_CONFIG, getEstadoStyle, getEstadoLabel } from '../lib/i18n'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { Plus, Search, Brain, Zap, Phone, TrendingUp, Loader, Users } from 'lucide-react'
import ModalCliente from '../components/ModalCliente'
import { crearCuentaComing } from '../lib/coming'

export default function Clientes() {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'

  const [clientes, setClientes] = useState([])
  const [agentes, setAgentes] = useState([])
  const [filtro, setFiltro] = useState('todos')
  const [filtroAgente, setFiltroAgente] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [modal, setModal] = useState(null)
  const [aiLoading, setAiLoading] = useState(null)
  const [comingLoading, setComingLoading] = useState(null)
  const [comingModal, setComingModal] = useState(null)
  const [comingResult, setComingResult] = useState(null)
  const [selected, setSelected] = useState(new Set())
  const [modalAsignar, setModalAsignar] = useState(false)
  const [asignando, setAsignando] = useState(false)

  useEffect(() => {
    fetchClientes()
    if (isAdmin) fetchAgentes()
  }, [])

  async function fetchClientes() {
    let query = supabase.from('clientes').select('*').order('created_at', { ascending: false })
    if (!isAdmin) query = query.eq('agente_id', user.id)
    const { data } = await query
    if (data) setClientes(data)
  }

  async function fetchAgentes() {
    const { data } = await supabase.from('usuarios').select('id, nombre').eq('rol', 'agente')
    if (data) setAgentes(data)
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
    .filter(c => filtroAgente === 'todos' || c.agente_id === filtroAgente)
    .filter(c => {
      const q = busqueda.toLowerCase()
      return !q || c.nombre?.toLowerCase().includes(q) || c.empresa?.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q)
    })

  async function handleCrearComing(cliente, capitalInicial) {
    setComingLoading(cliente.id)
    try {
      const [apellido = ''] = (cliente.nombre || '').split(' ').slice(1)
      const nombre = (cliente.nombre || '').split(' ')[0]
      const result = await crearCuentaComing({ nombre, apellido, email: cliente.email || '', capital: Number(capitalInicial) || 0 })
      await supabase.from('clientes').update({ coming_account: result.accountNumber }).eq('id', cliente.id)
      fetchClientes()
      setComingModal(null)
      setComingResult({ accountNumber: result.accountNumber, password: result.password, capital: result.capital })
    } catch (e) {
      alert('Error: ' + e.message)
    }
    setComingLoading(null)
  }

  function toggleSelect(id) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === filtrados.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtrados.map(c => c.id)))
    }
  }

  async function confirmarAsignacion(agenteId, agenteNombre) {
    setAsignando(true)
    const ids = Array.from(selected)
    await Promise.all(ids.map(id =>
      supabase.from('clientes').update({ agente_id: agenteId, agente_nombre: agenteNombre, reasignado: true }).eq('id', id)
    ))
    setAsignando(false)
    setModalAsignar(false)
    setSelected(new Set())
    fetchClientes()
  }

  const allSelected = filtrados.length > 0 && selected.size === filtrados.length

  const headers = isAdmin
    ? ['', t('nombre'), t('empresa'), t('telefono'), t('estado'), 'Agente', t('score_ia'), 'Llamadas', 'Coming', t('acciones')]
    : [t('nombre'), t('empresa'), t('telefono'), t('estado'), t('score_ia'), 'Llamadas', 'Coming', t('acciones')]

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
        <div style={{ position: 'relative', width: '260px' }}>
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

        {/* Filtro por agente — solo admin */}
        {isAdmin && (
          <select value={filtroAgente} onChange={e => setFiltroAgente(e.target.value)} style={{
            padding: '8px 14px', background: '#0d1117', border: '1px solid #1a2744',
            borderRadius: '9px', fontSize: '13px', color: '#e2e8f0', outline: 'none', cursor: 'pointer',
          }}>
            <option value="todos">Todos los agentes</option>
            {agentes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
          </select>
        )}

        {/* Filtros por estado */}
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

      {/* Barra bulk — solo admin */}
      {isAdmin && selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          padding: '10px 16px', background: 'rgba(37,99,235,0.1)',
          border: '1px solid rgba(37,99,235,0.3)', borderRadius: '10px',
        }}>
          <Users size={15} color="#60a5fa" />
          <span style={{ fontSize: '13px', fontWeight: '600', color: '#60a5fa' }}>
            {selected.size} seleccionado{selected.size > 1 ? 's' : ''}
          </span>
          <button onClick={() => setModalAsignar(true)} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
            background: 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff',
            border: 'none', cursor: 'pointer',
          }}>Asignar agente</button>
          <button onClick={() => setSelected(new Set())} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
            background: 'transparent', color: '#4a6fa5',
            border: '1px solid #1a2744', cursor: 'pointer',
          }}>Limpiar</button>
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '14px', overflow: 'auto', flex: 1 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a2744' }}>
              {isAdmin && (
                <th style={{ padding: '14px 8px 14px 18px', width: '36px' }}>
                  <input type="checkbox" checked={allSelected} onChange={toggleAll}
                    style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#3b82f6' }} />
                </th>
              )}
              {headers.filter(h => h !== '').map(h => (
                <th key={h} style={{
                  textAlign: 'left', fontSize: '11px', fontWeight: '600',
                  color: '#2d4a7a', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '14px 18px',
                  whiteSpace: 'nowrap',
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrados.length === 0 ? (
              <tr><td colSpan={headers.length} style={{ textAlign: 'center', color: '#2d4a7a', padding: '48px', fontSize: '14px' }}>
                No hay clientes en esta categoría
              </td></tr>
            ) : filtrados.map((c, i) => {
              const s = getEstadoStyle(c.estado)
              return (
                <tr key={c.id}
                  style={{ borderBottom: i < filtrados.length - 1 ? '1px solid #111827' : 'none', transition: 'background 0.1s', background: selected.has(c.id) ? 'rgba(37,99,235,0.06)' : 'transparent' }}
                  onMouseEnter={e => { if (!selected.has(c.id)) e.currentTarget.style.background = '#111827' }}
                  onMouseLeave={e => { e.currentTarget.style.background = selected.has(c.id) ? 'rgba(37,99,235,0.06)' : 'transparent' }}
                >
                  {isAdmin && (
                    <td style={{ padding: '14px 8px 14px 18px', width: '36px' }}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                        style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#3b82f6' }} />
                    </td>
                  )}
                  <td style={{ padding: '14px 18px' }}>
                    <button onClick={() => setModal(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>{c.nombre}</p>
                        {c.reasignado && (
                          <span style={{ fontSize: '10px', fontWeight: '600', padding: '2px 7px', borderRadius: '10px', background: 'rgba(139,92,246,0.15)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.3)' }}>
                            Reasignado
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '12px', color: '#4a6fa5', marginTop: '1px' }}>{c.email}</p>
                    </button>
                  </td>
                  <td style={{ padding: '14px 18px', fontSize: '13px', color: '#94a3b8' }}>{c.empresa || '—'}</td>
                  <td style={{ padding: '14px 18px', fontSize: '13px', color: '#94a3b8' }}>{c.telefono || '—'}</td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px',
                      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                      whiteSpace: 'nowrap',
                    }}>{getEstadoLabel(c.estado, lang)}</span>
                  </td>
                  {isAdmin && (
                    <td style={{ padding: '14px 18px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#60a5fa' }}>{c.agente_nombre || '—'}</p>
                      {c.agente_anterior && (
                        <p style={{ fontSize: '11px', color: '#4a6fa5' }}>Antes: {c.agente_anterior}</p>
                      )}
                    </td>
                  )}
                  <td style={{ padding: '14px 18px' }}>
                    {c.ai_score ? (
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%',
                        background: c.ai_nivel === 'alto' ? 'rgba(16,185,129,0.15)' : c.ai_nivel === 'medio' ? 'rgba(245,158,11,0.15)' : 'rgba(239,68,68,0.15)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '13px', fontWeight: '700',
                        color: c.ai_nivel === 'alto' ? '#34d399' : c.ai_nivel === 'medio' ? '#fbbf24' : '#f87171',
                        border: `1px solid ${c.ai_nivel === 'alto' ? 'rgba(16,185,129,0.3)' : c.ai_nivel === 'medio' ? 'rgba(245,158,11,0.3)' : 'rgba(239,68,68,0.3)'}`,
                      }}>{c.ai_score}</div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#2d4a7a' }}>{t('sin_calcular')}</span>
                    )}
                  </td>
                  <td style={{ padding: '14px 18px' }}>
                    <span style={{ background: 'rgba(37,99,235,0.1)', color: '#60a5fa', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                      {c.cantidad_llamadas || 0}
                    </span>
                  </td>
                  {/* Coming column */}
                  <td style={{ padding: '14px 18px' }}>
                    {c.coming_account ? (
                      <span style={{
                        fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px',
                        background: 'rgba(240,180,41,0.12)', color: '#f0b429',
                        border: '1px solid rgba(240,180,41,0.3)', whiteSpace: 'nowrap',
                      }}>📈 {c.coming_account}</span>
                    ) : (
                      <button
                        onClick={() => setComingModal(c)}
                        disabled={comingLoading === c.id}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '5px',
                          padding: '5px 11px', borderRadius: '8px', fontSize: '11px', fontWeight: '600',
                          border: '1px solid rgba(240,180,41,0.3)', background: 'rgba(240,180,41,0.08)',
                          color: '#f0b429', cursor: 'pointer', whiteSpace: 'nowrap',
                          opacity: comingLoading === c.id ? 0.5 : 1,
                        }}
                      >
                        {comingLoading === c.id ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <TrendingUp size={11} />}
                        Crear cuenta
                      </button>
                    )}
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

      {comingModal && (
        <ModalComingAccount
          cliente={comingModal}
          loading={comingLoading === comingModal.id}
          onClose={() => setComingModal(null)}
          onConfirm={(capital) => handleCrearComing(comingModal, capital)}
        />
      )}

      {comingResult && (
        <ModalComingResult result={comingResult} onClose={() => setComingResult(null)} />
      )}

      {modalAsignar && (
        <ModalAsignarAgente
          agentes={agentes}
          count={selected.size}
          loading={asignando}
          onClose={() => setModalAsignar(false)}
          onConfirm={confirmarAsignacion}
        />
      )}
    </div>
  )
}

function ModalAsignarAgente({ agentes, count, loading, onClose, onConfirm }) {
  const [agenteId, setAgenteId] = useState('')

  function handleConfirm() {
    const agente = agentes.find(a => a.id === agenteId)
    if (!agente) return
    onConfirm(agente.id, agente.nombre)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    }} onClick={onClose}>
      <div style={{
        background: '#0d1117', border: '1px solid #1a2744', borderRadius: '18px',
        padding: '32px', width: '400px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Users size={20} color="#60a5fa" />
          </div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>Asignar agente</div>
            <div style={{ fontSize: '12px', color: '#4a6fa5', marginTop: '2px' }}>{count} cliente{count > 1 ? 's' : ''} seleccionado{count > 1 ? 's' : ''}</div>
          </div>
        </div>

        <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
          Seleccioná el agente
        </label>
        <select value={agenteId} onChange={e => setAgenteId(e.target.value)} style={{
          width: '100%', padding: '10px 14px', marginBottom: '24px',
          background: '#111827', border: '1px solid #1a2744', borderRadius: '9px',
          fontSize: '13px', color: agenteId ? '#e2e8f0' : '#4a6fa5', outline: 'none', cursor: 'pointer',
        }}>
          <option value="">— Elegí un agente —</option>
          {agentes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
        </select>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: '9px', fontSize: '13px', fontWeight: '600',
            border: '1px solid #1a2744', background: 'transparent', color: '#4a6fa5', cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={handleConfirm} disabled={!agenteId || loading} style={{
            flex: 2, padding: '10px', borderRadius: '9px', fontSize: '13px', fontWeight: '700',
            border: 'none', background: !agenteId || loading ? '#1a2744' : 'linear-gradient(135deg,#2563eb,#1d4ed8)',
            color: !agenteId || loading ? '#4a6fa5' : '#fff',
            cursor: !agenteId || loading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            {loading ? '⏳ Asignando...' : `✓ Asignar a ${count} cliente${count > 1 ? 's' : ''}`}
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalComingResult({ result, onClose }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(`Cuenta: ${result.accountNumber}\nContraseña: ${result.password}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    }}>
      <div style={{
        background: '#0d1117', border: '1px solid #1a2744', borderRadius: '20px',
        padding: '36px', width: '420px', boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
        textAlign: 'center',
      }}>
        {/* Icono éxito */}
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', margin: '0 auto 20px',
          background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(16,185,129,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px',
        }}>✓</div>

        <div style={{ fontSize: '18px', fontWeight: '800', color: '#f1f5f9', marginBottom: '6px' }}>
          Cuenta creada en Coming
        </div>
        <div style={{ fontSize: '13px', color: '#4a6fa5', marginBottom: '28px' }}>
          Entregá estas credenciales al cliente para que acceda al portal
        </div>

        {/* Credenciales */}
        <div style={{
          background: '#080c14', border: '1px solid #1a2744', borderRadius: '14px',
          padding: '20px', marginBottom: '20px', textAlign: 'left',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <div style={{ fontSize: '10px', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Número de cuenta</div>
              <div style={{ fontSize: '22px', fontWeight: '800', color: '#f0b429', letterSpacing: '1px' }}>{result.accountNumber}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '10px', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Capital asignado</div>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#34d399' }}>${Number(result.capital).toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
            </div>
          </div>
          <div style={{ borderTop: '1px solid #1a2744', paddingTop: '14px' }}>
            <div style={{ fontSize: '10px', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '3px' }}>Contraseña temporal</div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#e2e8f0', fontFamily: 'monospace', letterSpacing: '2px' }}>{result.password}</div>
          </div>
        </div>

        {/* Botones */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={copy} style={{
            flex: 1, padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
            border: '1px solid #1a2744', background: copied ? 'rgba(16,185,129,0.1)' : 'transparent',
            color: copied ? '#34d399' : '#4a6fa5', cursor: 'pointer', transition: 'all .2s',
          }}>
            {copied ? '✓ Copiado' : '📋 Copiar credenciales'}
          </button>
          <button onClick={onClose} style={{
            flex: 1, padding: '11px', borderRadius: '10px', fontSize: '13px', fontWeight: '700',
            border: 'none', background: 'linear-gradient(135deg, #f0b429, #fcd34d)',
            color: '#000', cursor: 'pointer',
          }}>
            Listo
          </button>
        </div>
      </div>
    </div>
  )
}

function ModalComingAccount({ cliente, loading, onClose, onConfirm }) {
  const [capital, setCapital] = useState('')
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
    }} onClick={onClose}>
      <div style={{
        background: '#0d1117', border: '1px solid #1a2744', borderRadius: '16px',
        padding: '32px', width: '400px', boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
      }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '50%',
            background: 'rgba(240,180,41,0.15)', border: '1px solid rgba(240,180,41,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '20px',
          }}>📈</div>
          <div>
            <div style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>Crear cuenta Coming</div>
            <div style={{ fontSize: '12px', color: '#4a6fa5', marginTop: '2px' }}>{cliente.nombre} · {cliente.email || 'Sin email'}</div>
          </div>
        </div>

        {/* Capital input */}
        <div style={{ marginBottom: '20px' }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
            Capital inicial (USD)
          </label>
          <input
            type="number" placeholder="Ej: 1000" value={capital}
            onChange={e => setCapital(e.target.value)}
            autoFocus
            onKeyDown={e => e.key === 'Enter' && onConfirm(capital)}
            style={{
              width: '100%', padding: '10px 14px',
              background: '#111827', border: '1px solid #1a2744', borderRadius: '9px',
              fontSize: '14px', color: '#e2e8f0', outline: 'none',
            }}
          />
          <p style={{ fontSize: '11px', color: '#2d4a7a', marginTop: '6px' }}>
            Se creará la cuenta y se asignará este capital automáticamente.
          </p>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{
            flex: 1, padding: '10px', borderRadius: '9px', fontSize: '13px', fontWeight: '600',
            border: '1px solid #1a2744', background: 'transparent', color: '#4a6fa5', cursor: 'pointer',
          }}>Cancelar</button>
          <button onClick={() => onConfirm(capital)} disabled={loading} style={{
            flex: 2, padding: '10px', borderRadius: '9px', fontSize: '13px', fontWeight: '700',
            border: 'none', background: 'linear-gradient(135deg, #f0b429, #fcd34d)',
            color: '#000', cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}>
            {loading ? '⏳ Creando...' : '✓ Crear cuenta'}
          </button>
        </div>
      </div>
    </div>
  )
}
