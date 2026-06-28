import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { scoreClient, suggestAction } from '../lib/claude'
import { ESTADOS_CONFIG, getEstadoStyle, getEstadoLabel } from '../lib/i18n'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { Plus, Search, Brain, Zap, Phone, TrendingUp, Loader, Users, Trash2, SlidersHorizontal } from 'lucide-react'
import ModalCliente from '../components/ModalCliente'
import { crearCuentaComing } from '../lib/coming'

// Badge Sí/No para campos booleanos
function boolBadge(v) {
  if (v === null || v === undefined || v === '') return <span style={{ fontSize: '12px', color: '#2d4a7a' }}>—</span>
  const yes = v === true || v === 'true' || v === 1 || v === 'si' || v === 'sí'
  return <span style={{ fontSize: '11px', fontWeight: 600, padding: '3px 9px', borderRadius: '20px', background: yes ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.1)', color: yes ? '#34d399' : '#f87171', border: `1px solid ${yes ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.25)'}` }}>{yes ? 'Sí' : 'No'}</span>
}
const fdate = (d) => d ? new Date(d).toLocaleDateString('es-AR') : '—'
const txt = (v) => (v != null && v !== '') ? v : '—'

// Columnas extra (segmentación / datos comerciales). Ocultas por defecto.
const EXTRA_COLS = [
  { key: 'pais',                       label: 'País',                  type: 'text', w: 120, render: c => txt(c.pais) },
  { key: 'ciudad',                     label: 'Ciudad',                type: 'text', w: 130, render: c => txt(c.ciudad) },
  { key: 'zona_horaria',               label: 'Zona horaria',          type: 'text', w: 130, render: c => txt(c.zona_horaria) },
  { key: 'idioma',                     label: 'Idioma',                type: 'text', w: 110, render: c => txt(c.idioma) },
  { key: 'fuente',                     label: 'Fuente',                type: 'text', w: 130, render: c => txt(c.fuente) },
  { key: 'campana',                    label: 'Campaña',               type: 'text', w: 140, render: c => txt(c.campana) },
  { key: 'fecha_ingreso',              label: 'Fecha ingreso',         type: null,   w: 130, render: c => fdate(c.created_at) },
  { key: 'ultimo_contacto',            label: 'Último contacto',       type: null,   w: 140, render: c => fdate(c.ultima_llamada) },
  { key: 'proximo_seguimiento',        label: 'Próx. seguimiento',     type: null,   w: 150, render: c => fdate(c.proximo_seguimiento) },
  { key: 'resultado_ultimo_contacto',  label: 'Result. últ. contacto', type: 'text', w: 170, render: c => txt(c.resultado_ultimo_contacto) },
  { key: 'subestado',                  label: 'Subestado',             type: 'text', w: 140, render: c => txt(c.subestado) },
  { key: 'producto_interes',           label: 'Producto interés',      type: 'text', w: 160, render: c => txt(c.producto_interes) },
  { key: 'decisor',                    label: 'Decisor',               type: 'text', w: 130, render: c => txt(c.decisor) },
  { key: 'email',                      label: 'Email',                 type: 'text', w: 200, render: c => txt(c.email) },
  { key: 'whatsapp_valido',            label: 'WhatsApp válido',       type: 'bool', w: 140, render: c => boolBadge(c.whatsapp_valido) },
  { key: 'objecion',                   label: 'Objeción',              type: 'text', w: 160, render: c => txt(c.objecion) },
  { key: 'capacidad_pago',             label: 'Capacidad pago',        type: 'text', w: 150, render: c => txt(c.capacidad_pago) },
  { key: 'valor_potencial',            label: 'Valor potencial',       type: 'num',  w: 140, render: c => (c.valor_potencial != null && c.valor_potencial !== '') ? '$' + Number(c.valor_potencial).toLocaleString('es-AR') : '—' },
  { key: 'propuesta_enviada',          label: 'Propuesta enviada',     type: 'bool', w: 150, render: c => boolBadge(c.propuesta_enviada) },
  { key: 'estado_pago',                label: 'Estado de pago',        type: 'text', w: 140, render: c => txt(c.estado_pago) },
  { key: 'consentimiento_contacto',    label: 'Consent. contacto',     type: 'bool', w: 150, render: c => boolBadge(c.consentimiento_contacto) },
  { key: 'motivo_perdida',             label: 'Motivo de pérdida',     type: 'text', w: 170, render: c => txt(c.motivo_perdida) },
]
const EXTRA_KEYS = EXTRA_COLS.map(c => c.key)

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
  const [borrando, setBorrando] = useState(false)
  const [sort, setSort] = useState({ key: null, dir: 'asc' })
  const [comentarios, setComentarios] = useState({}) // cliente_id -> última llamada

  // Visibilidad y ancho de columnas (persistido en localStorage)
  const [hiddenCols, setHiddenCols] = useState(() => {
    try { const s = localStorage.getItem('crm_cli_hidden'); return s ? new Set(JSON.parse(s)) : new Set(EXTRA_KEYS) } catch { return new Set(EXTRA_KEYS) }
  })
  const [colW, setColW] = useState(() => {
    try { return JSON.parse(localStorage.getItem('crm_cli_w') || '{}') } catch { return {} }
  })
  const [showColMenu, setShowColMenu] = useState(false)

  useEffect(() => { localStorage.setItem('crm_cli_hidden', JSON.stringify([...hiddenCols])) }, [hiddenCols])
  useEffect(() => { localStorage.setItem('crm_cli_w', JSON.stringify(colW)) }, [colW])

  const show = (key) => !hiddenCols.has(key)
  const widthOf = (col) => colW[col.key] || col.w
  function toggleCol(key) {
    setHiddenCols(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n })
  }
  function startResize(e, col) {
    e.preventDefault(); e.stopPropagation()
    const startX = e.clientX
    const startW = widthOf(col)
    const onMove = (ev) => setColW(prev => ({ ...prev, [col.key]: Math.max(70, startW + (ev.clientX - startX)) }))
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); document.body.style.userSelect = '' }
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }

  useEffect(() => {
    fetchClientes()
    if (isAdmin) fetchAgentes()
  }, [])

  async function fetchClientes() {
    let query = supabase.from('clientes').select('*').order('created_at', { ascending: false })
    if (!isAdmin) query = query.eq('agente_id', user.id)
    const { data } = await query
    if (data) { setClientes(data); fetchComentarios(data.map(c => c.id)) }
  }

  async function fetchComentarios(ids) {
    if (!ids || !ids.length) { setComentarios({}); return }
    const { data } = await supabase.from('llamadas')
      .select('cliente_id, notas, fecha')
      .in('cliente_id', ids)
      .order('fecha', { ascending: false })
    const map = {}
    if (data) for (const ll of data) { if (!map[ll.cliente_id]) map[ll.cliente_id] = ll } // la primera = la más reciente
    setComentarios(map)
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

  async function eliminarSeleccionados() {
    const ids = Array.from(selected)
    if (!ids.length) return
    if (!confirm(`¿Eliminar ${ids.length} cliente${ids.length > 1 ? 's' : ''}? Esta acción no se puede deshacer.`)) return
    setBorrando(true)
    const { error } = await supabase.from('clientes').delete().in('id', ids)
    setBorrando(false)
    if (error) { alert('Error al eliminar: ' + error.message); return }
    setSelected(new Set())
    fetchClientes()
  }

  const allSelected = filtrados.length > 0 && selected.size === filtrados.length

  // Columnas: type null = no ordenable; w = ancho por defecto (px); fixed = no se puede ocultar
  const columns = [
    { key: 'nombre',   label: t('nombre'),   type: 'text', w: 230, fixed: true },
    { key: 'empresa',  label: t('empresa'),  type: 'text', w: 150 },
    { key: 'telefono', label: t('telefono'), type: 'text', w: 140 },
    { key: 'estado',   label: t('estado'),   type: 'text', w: 130 },
    ...(isAdmin ? [{ key: 'agente_nombre', label: 'Agente', type: 'text', w: 140 }] : []),
    { key: 'ai_score', label: t('score_ia'), type: 'num', w: 100 },
    { key: 'cantidad_llamadas', label: 'Llamadas', type: 'num', w: 100 },
    { key: 'coming',   label: 'Coming',      type: 'bool', w: 140 },
    { key: 'comentario', label: 'Comentarios', type: null, w: 240 },
    ...EXTRA_COLS,
    { key: 'acciones', label: t('acciones'), type: null, w: 130, fixed: true },
  ]
  const visibleColumns = columns.filter(c => show(c.key))

  function handleSort(col) {
    if (!col.type) return
    setSort(prev => prev.key === col.key
      ? { key: col.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      // Por defecto: numérico/booleano (Coming) muestra primero los "más/sí"; texto A→Z
      : { key: col.key, dir: (col.type === 'num' || col.type === 'bool') ? 'desc' : 'asc' })
  }

  const ordenados = (() => {
    if (!sort.key) return filtrados
    const col = columns.find(c => c.key === sort.key)
    const acc = col.type === 'num'
      ? (c) => Number(c[sort.key] || 0)
      : col.type === 'bool'
        ? (c) => ((sort.key === 'coming' ? c.coming_account : c[sort.key]) ? 1 : 0)
        : (c) => (c[sort.key] || '').toString().toLowerCase()
    return [...filtrados].sort((a, b) => {
      const va = acc(a), vb = acc(b)
      if (va < vb) return sort.dir === 'asc' ? -1 : 1
      if (va > vb) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
  })()

  return (
    <div style={{ padding: '32px 36px', height: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>{t('clientes')}</h2>
          <p style={{ fontSize: '13px', color: '#4a6fa5', marginTop: '2px' }}>{filtrados.length} {t('registros')} {isAdmin && <span style={{ color: '#2563eb', fontWeight: '700' }}>· ADMIN ✓</span>}</p>
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

        {/* Selector de columnas */}
        <div style={{ position: 'relative', marginLeft: 'auto' }}>
          <button onClick={() => setShowColMenu(v => !v)} style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '8px 14px', borderRadius: '9px', fontSize: '13px', fontWeight: '500',
            background: '#0d1117', border: '1px solid #1a2744', color: '#4a6fa5', cursor: 'pointer',
          }}>
            <SlidersHorizontal size={14} /> Columnas
          </button>
          {showColMenu && (
            <>
              <div onClick={() => setShowColMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50,
                background: '#0d1117', border: '1px solid #1a2744', borderRadius: '10px',
                padding: '8px', minWidth: '200px', boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
              }}>
                <p style={{ fontSize: '10px', fontWeight: '700', color: '#2d4a7a', textTransform: 'uppercase', letterSpacing: '0.7px', padding: '4px 8px 8px' }}>Mostrar columnas</p>
                {columns.filter(c => !c.fixed).map(c => (
                  <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 8px', borderRadius: '7px', cursor: 'pointer', fontSize: '13px', color: '#e2e8f0' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#111827'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                    <input type="checkbox" checked={show(c.key)} onChange={() => toggleCol(c.key)}
                      style={{ width: '14px', height: '14px', cursor: 'pointer', accentColor: '#3b82f6' }} />
                    {c.label}
                  </label>
                ))}
              </div>
            </>
          )}
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
          <button onClick={eliminarSeleccionados} disabled={borrando} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '700',
            background: 'rgba(239,68,68,0.12)', color: '#f87171',
            border: '1px solid rgba(239,68,68,0.3)', cursor: 'pointer', opacity: borrando ? 0.5 : 1,
          }}>
            <Trash2 size={13} /> {borrando ? 'Eliminando…' : `Eliminar (${selected.size})`}
          </button>
          <button onClick={() => setSelected(new Set())} style={{
            padding: '6px 14px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
            background: 'transparent', color: '#4a6fa5',
            border: '1px solid #1a2744', cursor: 'pointer',
          }}>Limpiar</button>
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '14px', overflow: 'auto', flex: 1 }}>
        <table className="cli-table" style={{ width: visibleColumns.reduce((s, c) => s + widthOf(c), 0), minWidth: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          <colgroup>
            {visibleColumns.map(col => <col key={col.key} style={{ width: widthOf(col) + 'px' }} />)}
          </colgroup>
          <thead>
            <tr style={{ borderBottom: '1px solid #1a2744' }}>
              {visibleColumns.map((col, idx) => (
                <th key={col.key}
                  onClick={() => handleSort(col)}
                  style={{
                    position: 'relative',
                    textAlign: 'left', fontSize: '11px', fontWeight: '600',
                    color: sort.key === col.key ? '#60a5fa' : '#2d4a7a',
                    textTransform: 'uppercase', letterSpacing: '0.8px', padding: '14px 18px',
                    whiteSpace: 'nowrap', userSelect: 'none', cursor: col.type ? 'pointer' : 'default',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: idx === 0 ? '10px' : '5px', overflow: 'hidden' }}>
                    {isAdmin && idx === 0 && (
                      <input type="checkbox" checked={allSelected} onChange={toggleAll} onClick={e => e.stopPropagation()}
                        style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#3b82f6', flexShrink: 0 }} />
                    )}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{col.label}</span>
                    {col.type && sort.key === col.key && (
                      <span style={{ fontSize: '9px', flexShrink: 0 }}>{sort.dir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                  {/* Manija para redimensionar */}
                  <div onMouseDown={e => startResize(e, col)} onClick={e => e.stopPropagation()}
                    title="Arrastrá para ajustar el ancho"
                    style={{ position: 'absolute', top: 0, right: 0, width: '8px', height: '100%', cursor: 'col-resize' }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ordenados.length === 0 ? (
              <tr><td colSpan={visibleColumns.length} style={{ textAlign: 'center', color: '#2d4a7a', padding: '48px', fontSize: '14px' }}>
                No hay clientes en esta categoría
              </td></tr>
            ) : ordenados.map((c, i) => {
              const s = getEstadoStyle(c.estado)
              return (
                <tr key={c.id}
                  style={{ borderBottom: i < ordenados.length - 1 ? '1px solid #111827' : 'none', transition: 'background 0.1s', background: selected.has(c.id) ? 'rgba(37,99,235,0.06)' : 'transparent' }}
                  onMouseEnter={e => { if (!selected.has(c.id)) e.currentTarget.style.background = '#111827' }}
                  onMouseLeave={e => { e.currentTarget.style.background = selected.has(c.id) ? 'rgba(37,99,235,0.06)' : 'transparent' }}
                >
                  <td style={{ padding: '14px 18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      {isAdmin && (
                        <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleSelect(c.id)}
                          style={{ width: '15px', height: '15px', cursor: 'pointer', accentColor: '#3b82f6', flexShrink: 0 }} />
                      )}
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
                    </div>
                  </td>
                  {show('empresa') && <td style={{ padding: '14px 18px', fontSize: '13px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.empresa || '—'}</td>}
                  {show('telefono') && <td style={{ padding: '14px 18px', fontSize: '13px', color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.telefono || '—'}</td>}
                  {show('estado') && <td style={{ padding: '14px 18px' }}>
                    <span style={{
                      fontSize: '11px', fontWeight: '600', padding: '4px 10px', borderRadius: '20px',
                      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                      whiteSpace: 'nowrap',
                    }}>{getEstadoLabel(c.estado, lang)}</span>
                  </td>}
                  {isAdmin && show('agente_nombre') && (
                    <td style={{ padding: '14px 18px' }}>
                      <p style={{ fontSize: '12px', fontWeight: '600', color: '#60a5fa' }}>{c.agente_nombre || '—'}</p>
                      {c.agente_anterior && (
                        <p style={{ fontSize: '11px', color: '#4a6fa5' }}>Antes: {c.agente_anterior}</p>
                      )}
                    </td>
                  )}
                  {show('ai_score') && <td style={{ padding: '14px 18px' }}>
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
                  </td>}
                  {show('cantidad_llamadas') && <td style={{ padding: '14px 18px' }}>
                    <span style={{ background: 'rgba(37,99,235,0.1)', color: '#60a5fa', padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: '600' }}>
                      {c.cantidad_llamadas || 0}
                    </span>
                  </td>}
                  {/* Coming column */}
                  {show('coming') && <td style={{ padding: '14px 18px' }}>
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
                  </td>}

                  {/* Último comentario */}
                  {show('comentario') && <td style={{ padding: '14px 18px' }}>
                    {comentarios[c.id] ? (
                      <div title={comentarios[c.id].notas}>
                        <p style={{ fontSize: '12px', color: '#cbd5e1', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{comentarios[c.id].notas}</p>
                        <p style={{ fontSize: '10px', color: '#4a6fa5', marginTop: '2px' }}>{new Date(comentarios[c.id].fecha).toLocaleDateString('es-AR')}</p>
                      </div>
                    ) : (
                      <span style={{ fontSize: '12px', color: '#2d4a7a' }}>—</span>
                    )}
                  </td>}

                  {/* Columnas extra (segmentación) */}
                  {EXTRA_COLS.filter(col => show(col.key)).map(col => (
                    <td key={col.key} style={{ padding: '14px 18px', fontSize: '13px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {col.render(c)}
                    </td>
                  ))}

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
      <style>{`
        .cli-table td, .cli-table th { overflow: hidden; text-overflow: ellipsis; }
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

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
