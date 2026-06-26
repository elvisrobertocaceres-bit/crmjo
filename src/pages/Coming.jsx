import { useState, useEffect } from 'react'
import { listarClientesComing, actualizarCapital, darBono, procesarRetiro, crearCuentaComing, eliminarClienteComing, toggleIA } from '../lib/coming'
import { supabase } from '../lib/supabase'
import { TrendingUp, TrendingDown, Gift, Eye, X, Loader, RefreshCw, Plus, User, Search, Trash2, Bot } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const TIPOS = [
  { key: 'deposit',    label: 'Acreditar', icon: TrendingUp,   color: '#34d399', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
  { key: 'bonus',      label: 'Bono',      icon: Gift,         color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' },
  { key: 'withdrawal', label: 'Retiro',    icon: TrendingDown, color: '#f87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)'  },
]

export default function ComingPage() {
  const { user } = useAuth()
  const [clientes, setClientes] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Modal operación
  const [modal, setModal] = useState(null)
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [opLoading, setOpLoading] = useState(false)
  const [opMsg, setOpMsg] = useState(null)

  // Modal detalle
  const [detalle, setDetalle] = useState(null)

  // Modal eliminar
  const [eliminarModal, setEliminarModal] = useState(null)
  const [elimLoading, setElimLoading] = useState(false)
  const [elimMsg, setElimMsg] = useState(null)

  // Toggle IA por cliente
  const [iaLoading, setIaLoading] = useState(null)

  // Ordenamiento de tabla
  const [sort, setSort] = useState({ key: null, dir: 'asc' })

  // Modal crear cuenta
  const [crearModal, setCrearModal] = useState(false)
  const [crearForm, setCrearForm] = useState({ nombre: '', apellido: '', email: '', capital: '' })
  const [crearLoading, setCrearLoading] = useState(false)
  const [crearResult, setCrearResult] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const data = await listarClientesComing()
      setClientes(Array.isArray(data) ? data : data.clients || [])
    } catch (e) {
      setError(e.message)
    }
    setLoading(false)
  }

  async function handleOperacion() {
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0)
      return setOpMsg({ ok: false, txt: 'Ingresá un monto válido' })
    setOpLoading(true)
    setOpMsg(null)
    try {
      const acc = modal.cliente.account_number
      if (modal.tipo === 'deposit')    await actualizarCapital(acc, Number(monto), 'deposit', descripcion)
      else if (modal.tipo === 'bonus') await darBono(acc, Number(monto), descripcion || 'Bono')
      else                             await procesarRetiro(acc, Number(monto), descripcion || 'Retiro')
      setOpMsg({ ok: true, txt: '¡Operación realizada!' })
      setTimeout(() => { setModal(null); setMonto(''); setDescripcion(''); setOpMsg(null); fetchData() }, 1200)
    } catch (e) { setOpMsg({ ok: false, txt: e.message }) }
    setOpLoading(false)
  }

  async function handleEliminar() {
    setElimLoading(true)
    setElimMsg(null)
    try {
      await eliminarClienteComing(eliminarModal.account_number)
      setElimMsg({ ok: true })
      setTimeout(() => { setEliminarModal(null); setElimMsg(null); fetchData() }, 1000)
    } catch (e) { setElimMsg({ ok: false, txt: e.message }) }
    setElimLoading(false)
  }

  async function handleToggleIA(c) {
    const acc = c.account_number
    const nuevo = !(c.ia_enabled === true)
    setIaLoading(acc)
    setClientes(prev => prev.map(x => x.account_number === acc ? { ...x, ia_enabled: nuevo } : x))
    try {
      await toggleIA(acc, nuevo)
    } catch {
      // revertir en caso de error
      setClientes(prev => prev.map(x => x.account_number === acc ? { ...x, ia_enabled: !nuevo } : x))
    }
    setIaLoading(null)
  }

  async function handleCrearCuenta() {
    if (!crearForm.nombre || !crearForm.email) return setCrearResult({ ok: false, txt: 'Nombre y email son requeridos' })
    setCrearLoading(true)
    setCrearResult(null)
    try {
      const result = await crearCuentaComing({
        nombre: crearForm.nombre,
        apellido: crearForm.apellido,
        email: crearForm.email,
        capital: Number(crearForm.capital) || 0,
      })
      // Intentar vincular con cliente de Supabase por email
      await supabase.from('clientes')
        .update({ coming_account: result.accountNumber })
        .eq('email', crearForm.email)
      setCrearResult({ ok: true, account: result.accountNumber, password: result.password })
      fetchData()
    } catch (e) { setCrearResult({ ok: false, txt: e.message }) }
    setCrearLoading(false)
  }

  const fmtUSD = (v) => v != null ? `$${Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` : '—'

  const filtrados = clientes.filter(c => {
    const q = busqueda.toLowerCase()
    return !q || (c.nombre || '').toLowerCase().includes(q) ||
      (c.apellido || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.account_number || '').toLowerCase().includes(q)
  })

  // Columnas (type null = no ordenable)
  const columnas = [
    { label: 'Cliente',   key: 'nombre',         type: 'text' },
    { label: 'Cuenta #',  key: 'account_number', type: 'text' },
    { label: 'Balance',   key: 'capital',        type: 'num' },
    { label: 'IA',        key: 'ia_enabled',     type: 'bool' },
    { label: 'Acreditar', key: null },
    { label: 'Bono',      key: null },
    { label: 'Retiro',    key: null },
    { label: 'Detalle',   key: null },
    { label: '',          key: null },
  ]

  function handleSort(col) {
    if (!col.type) return
    setSort(prev => prev.key === col.key
      ? { key: col.key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
      : { key: col.key, dir: (col.type === 'num' || col.type === 'bool') ? 'desc' : 'asc' })
  }

  const ordenados = (() => {
    if (!sort.key) return filtrados
    const col = columnas.find(c => c.key === sort.key)
    const acc = col.type === 'num'
      ? (c) => Number(c.capital ?? c.balance ?? 0)
      : col.type === 'bool'
        ? (c) => (c.ia_enabled ? 1 : 0)
        : sort.key === 'nombre'
          ? (c) => `${c.nombre || c.name || ''} ${c.apellido || ''}`.trim().toLowerCase()
          : (c) => (c[sort.key] || '').toString().toLowerCase()
    return [...filtrados].sort((a, b) => {
      const va = acc(a), vb = acc(b)
      if (va < vb) return sort.dir === 'asc' ? -1 : 1
      if (va > vb) return sort.dir === 'asc' ? 1 : -1
      return 0
    })
  })()

  const totalCapital = clientes.reduce((sum, c) => sum + (Number(c.capital) || 0), 0)

  return (
    <div style={{ padding: '32px 36px', height: '100%', display: 'flex', flexDirection: 'column', gap: '24px', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>
            Coming<span style={{ color: '#f0b429' }}>.</span> Gestión
          </h2>
          <p style={{ fontSize: '13px', color: '#4a6fa5', marginTop: '2px' }}>
            {clientes.length} cuentas · Capital total: <span style={{ color: '#34d399', fontWeight: '700' }}>{fmtUSD(totalCapital)}</span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={() => { setCrearModal(true); setCrearForm({ nombre: '', apellido: '', email: '', capital: '' }); setCrearResult(null) }} style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 16px', borderRadius: '9px', fontSize: '13px', fontWeight: '600',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none', color: 'white', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
          }}>
            <Plus size={14} /> Nueva cuenta
          </button>
          <button onClick={fetchData} style={{
            display: 'flex', alignItems: 'center', gap: '7px',
            padding: '9px 14px', borderRadius: '9px', fontSize: '13px',
            background: '#0d1117', border: '1px solid #1a2744', color: '#4a6fa5', cursor: 'pointer',
          }}>
            <RefreshCw size={13} />
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '14px' }}>
        {[
          { label: 'Cuentas activas', value: clientes.length, color: '#60a5fa', bg: 'rgba(37,99,235,0.1)', border: 'rgba(37,99,235,0.2)' },
          { label: 'Capital total',   value: fmtUSD(totalCapital), color: '#34d399', bg: 'rgba(16,185,129,0.1)', border: 'rgba(16,185,129,0.2)' },
          { label: 'Promedio/cuenta', value: clientes.length ? fmtUSD(totalCapital / clientes.length) : '—', color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)' },
        ].map(s => (
          <div key={s.label} style={{ background: '#0d1117', border: `1px solid ${s.border}`, borderRadius: '14px', padding: '18px 20px' }}>
            <p style={{ fontSize: '11px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>{s.label}</p>
            <p style={{ fontSize: '24px', fontWeight: '800', color: s.color, letterSpacing: '-0.5px' }}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Búsqueda */}
      <div style={{ position: 'relative', maxWidth: '320px' }}>
        <Search size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4a6fa5' }} />
        <input
          type="text" placeholder="Buscar cliente, cuenta, email..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)}
          style={{ width: '100%', paddingLeft: '36px', paddingRight: '14px', paddingTop: '9px', paddingBottom: '9px', background: '#0d1117', border: '1px solid #1a2744', borderRadius: '9px', fontSize: '13px', color: '#e2e8f0', outline: 'none' }}
        />
      </div>

      {/* Tabla */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '14px', overflow: 'hidden', flex: 1 }}>
        {/* Encabezado */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 1.1fr 0.9fr 1fr 1fr 1fr 0.8fr 0.8fr', gap: '12px', padding: '12px 20px', borderBottom: '1px solid #111827' }}>
          {columnas.map((col, idx) => (
            <span key={col.label || idx}
              onClick={() => handleSort(col)}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                fontSize: '11px', fontWeight: '600',
                color: sort.key === col.key && col.key ? '#60a5fa' : '#2d4a7a',
                textTransform: 'uppercase', letterSpacing: '0.7px',
                userSelect: 'none', cursor: col.type ? 'pointer' : 'default',
              }}>
              {col.label}
              {col.type && sort.key === col.key && <span style={{ fontSize: '9px' }}>{sort.dir === 'asc' ? '▲' : '▼'}</span>}
            </span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', color: '#4a6fa5' }}>
            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Cargando cuentas de Coming...
          </div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <p style={{ color: '#f87171', fontSize: '13px', marginBottom: '8px' }}>Error: {error}</p>
            <p style={{ color: '#4a6fa5', fontSize: '12px' }}>Verificá que VITE_COMING_API y VITE_COMING_ADMIN_PASS estén configurados en Vercel</p>
          </div>
        ) : ordenados.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#2d4a7a', fontSize: '13px' }}>
            {busqueda ? 'Sin resultados para esa búsqueda' : 'No hay cuentas creadas en Coming aún'}
          </div>
        ) : ordenados.map((c, i) => (
          <div key={c.account_number || i}
            style={{ display: 'grid', gridTemplateColumns: '2fr 1.3fr 1.1fr 0.9fr 1fr 1fr 1fr 0.8fr 0.8fr', gap: '12px', padding: '14px 20px', alignItems: 'center', borderBottom: i < ordenados.length - 1 ? '1px solid #0d1220' : 'none', transition: 'background 0.1s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#0a0f1a'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            {/* Cliente */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '34px', height: '34px', borderRadius: '10px', background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#60a5fa' }}>
                  {(c.nombre || c.name || '?')[0].toUpperCase()}
                </span>
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{c.nombre || c.name} {c.apellido || c.lastName || ''}</p>
                <p style={{ fontSize: '11px', color: '#4a6fa5' }}>{c.email}</p>
              </div>
            </div>

            {/* Cuenta */}
            <span style={{ fontSize: '13px', color: '#60a5fa', fontFamily: 'monospace', fontWeight: '600' }}>{c.account_number}</span>

            {/* Balance */}
            <span style={{ fontSize: '14px', fontWeight: '800', color: '#34d399' }}>{fmtUSD(c.capital ?? c.balance)}</span>

            {/* Toggle IA */}
            <button onClick={() => handleToggleIA(c)} disabled={iaLoading === c.account_number}
              title={c.ia_enabled ? 'IA habilitada — clic para deshabilitar' : 'IA deshabilitada — clic para habilitar'}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                padding: '7px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '700', cursor: 'pointer',
                background: c.ia_enabled ? 'rgba(16,185,129,0.12)' : 'rgba(148,163,184,0.06)',
                border: c.ia_enabled ? '1px solid rgba(16,185,129,0.3)' : '1px solid #1a2744',
                color: c.ia_enabled ? '#34d399' : '#64748b',
                opacity: iaLoading === c.account_number ? 0.5 : 1,
              }}>
              {iaLoading === c.account_number ? <Loader size={11} style={{ animation: 'spin 1s linear infinite' }} /> : <Bot size={12} />}
              {c.ia_enabled ? 'ON' : 'OFF'}
            </button>

            {/* Botones */}
            {TIPOS.map(tipo => (
              <button key={tipo.key} onClick={() => { setModal({ cliente: c, tipo: tipo.key }); setMonto(''); setDescripcion(''); setOpMsg(null) }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px',
                padding: '7px 8px', borderRadius: '8px', fontSize: '11px', fontWeight: '600',
                background: tipo.bg, border: `1px solid ${tipo.border}`, color: tipo.color, cursor: 'pointer',
              }}>
                <tipo.icon size={11} /> {tipo.label}
              </button>
            ))}

            {/* Detalle */}
            <button onClick={() => setDetalle(c)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px', borderRadius: '8px', background: 'rgba(255,255,255,0.03)', border: '1px solid #1a2744', color: '#4a6fa5', cursor: 'pointer' }}>
              <Eye size={13} />
            </button>

            {/* Eliminar */}
            <button onClick={() => { setEliminarModal(c); setElimMsg(null) }} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '7px', borderRadius: '8px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', color: '#f87171', cursor: 'pointer' }}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>

      {/* ── Modal operación ── */}
      {modal && (() => {
        const t = TIPOS.find(x => x.key === modal.tipo)
        const nombre = `${modal.cliente.nombre || modal.cliente.name || ''} ${modal.cliente.apellido || modal.cliente.lastName || ''}`.trim()
        return (
          <div style={overlay}>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: t.color }}>{t.label}</p>
                  <p style={{ fontSize: '12px', color: '#4a6fa5', marginTop: '2px' }}>{nombre} · {modal.cliente.account_number}</p>
                </div>
                <button onClick={() => setModal(null)} style={closeBtn}><X size={18} /></button>
              </div>
              <div>
                <label style={labelStyle}>Monto (USD)</label>
                <input type="number" min="0" step="0.01" placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} autoFocus
                  style={{ ...inputStyle, border: `1px solid ${t.border}`, fontSize: '16px', fontWeight: '700' }} />
              </div>
              <div>
                <label style={labelStyle}>Descripción (opcional)</label>
                <input type="text" placeholder="Ej: Depósito inicial" value={descripcion} onChange={e => setDescripcion(e.target.value)} style={inputStyle} />
              </div>
              {opMsg && <MsgBox ok={opMsg.ok} txt={opMsg.txt} />}
              <button onClick={handleOperacion} disabled={opLoading} style={{ ...actionBtn, background: t.bg, border: `1px solid ${t.border}`, color: t.color, opacity: opLoading ? 0.7 : 1 }}>
                {opLoading ? <><Loader size={14} style={spin} /> Procesando...</> : <><t.icon size={14} /> Confirmar {t.label}</>}
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Modal detalle ── */}
      {detalle && (
        <div style={overlay}>
          <div style={{ ...card, width: '520px', maxHeight: '80vh', overflowY: 'auto', gap: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>{detalle.nombre} {detalle.apellido}</p>
                <p style={{ fontSize: '12px', color: '#60a5fa', fontFamily: 'monospace' }}>{detalle.account_number}</p>
              </div>
              <button onClick={() => setDetalle(null)} style={closeBtn}><X size={18} /></button>
            </div>

            {/* Info rápida */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { label: 'Email',    value: detalle.email },
                { label: 'Capital',  value: fmtUSD(detalle.capital ?? detalle.balance) },
                { label: 'Agente',   value: detalle.agente || detalle.agent || '—' },
                { label: 'Creado',   value: detalle.createdAt ? new Date(detalle.createdAt).toLocaleDateString('es-AR') : '—' },
              ].map(f => (
                <div key={f.label} style={{ background: '#080c14', border: '1px solid #1a2744', borderRadius: '10px', padding: '12px 14px' }}>
                  <p style={{ fontSize: '10px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>{f.label}</p>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{f.value || '—'}</p>
                </div>
              ))}
            </div>

            {/* Operaciones recientes */}
            {detalle.transactions?.length > 0 && (
              <div>
                <p style={{ fontSize: '11px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '10px' }}>Últimas transacciones</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {detalle.transactions.slice(0, 8).map((tx, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#080c14', border: '1px solid #1a2744', borderRadius: '8px' }}>
                      <div>
                        <p style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0', textTransform: 'capitalize' }}>{tx.type || tx.tipo || 'Operación'}</p>
                        <p style={{ fontSize: '11px', color: '#4a6fa5' }}>{tx.description || tx.descripcion || ''}</p>
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: '700', color: (tx.type || tx.tipo) === 'withdrawal' ? '#f87171' : '#34d399' }}>
                        {(tx.type || tx.tipo) === 'withdrawal' ? '-' : '+'}{fmtUSD(tx.amount || tx.monto)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* JSON completo si no hay estructura */}
            {!detalle.transactions && (
              <pre style={{ background: '#080c14', border: '1px solid #1a2744', borderRadius: '10px', padding: '14px', fontSize: '11px', color: '#34d399', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                {JSON.stringify(detalle, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* ── Modal crear cuenta ── */}
      {crearModal && (
        <div style={overlay}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#60a5fa' }}>Nueva cuenta Coming</p>
              <button onClick={() => setCrearModal(false)} style={closeBtn}><X size={18} /></button>
            </div>
            {[
              { key: 'nombre',   label: 'Nombre',   placeholder: 'Juan', type: 'text' },
              { key: 'apellido', label: 'Apellido', placeholder: 'Pérez', type: 'text' },
              { key: 'email',    label: 'Email',    placeholder: 'juan@email.com', type: 'email' },
              { key: 'capital',  label: 'Capital inicial (USD)', placeholder: '0', type: 'number' },
            ].map(f => (
              <div key={f.key}>
                <label style={labelStyle}>{f.label}</label>
                <input type={f.type} placeholder={f.placeholder} value={crearForm[f.key]}
                  onChange={e => setCrearForm(p => ({ ...p, [f.key]: e.target.value }))}
                  style={inputStyle} />
              </div>
            ))}
            {crearResult && (
              crearResult.ok
                ? <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
                    <p style={{ fontSize: '13px', fontWeight: '700', color: '#34d399', marginBottom: '6px' }}>✅ Cuenta creada</p>
                    <p style={{ fontSize: '12px', color: '#e2e8f0' }}>Número: <strong>{crearResult.account}</strong></p>
                    <p style={{ fontSize: '12px', color: '#e2e8f0' }}>Contraseña temporal: <strong>{crearResult.password}</strong></p>
                  </div>
                : <MsgBox ok={false} txt={crearResult.txt} />
            )}
            {!crearResult?.ok && (
              <button onClick={handleCrearCuenta} disabled={crearLoading} style={{ ...actionBtn, background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa', opacity: crearLoading ? 0.7 : 1 }}>
                {crearLoading ? <><Loader size={14} style={spin} /> Creando...</> : <><Plus size={14} /> Crear cuenta</>}
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Modal eliminar ── */}
      {eliminarModal && (
        <div style={overlay}>
          <div style={{ ...card, width: '380px', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '16px', fontWeight: '700', color: '#f87171' }}>Eliminar cuenta</p>
              <button onClick={() => setEliminarModal(null)} style={closeBtn}><X size={18} /></button>
            </div>
            <div style={{ padding: '16px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)', borderRadius: '10px' }}>
              <p style={{ fontSize: '13px', color: '#e2e8f0', marginBottom: '6px' }}>
                ¿Eliminar a <strong>{eliminarModal.nombre} {eliminarModal.apellido}</strong>?
              </p>
              <p style={{ fontSize: '12px', color: '#f87171', fontFamily: 'monospace' }}>{eliminarModal.account_number}</p>
              <p style={{ fontSize: '12px', color: '#4a6fa5', marginTop: '8px' }}>Esta acción no se puede deshacer. Se eliminarán todos los datos y transacciones.</p>
            </div>
            {elimMsg && <MsgBox ok={elimMsg.ok} txt={elimMsg.ok ? '✅ Cuenta eliminada' : elimMsg.txt} />}
            {!elimMsg?.ok && (
              <div style={{ display: 'flex', gap: '10px' }}>
                <button onClick={() => setEliminarModal(null)} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'transparent', border: '1px solid #1a2744', color: '#4a6fa5', cursor: 'pointer', fontSize: '13px', fontWeight: '600' }}>
                  Cancelar
                </button>
                <button onClick={handleEliminar} disabled={elimLoading} style={{ flex: 1, padding: '10px', borderRadius: '10px', background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)', color: '#f87171', cursor: 'pointer', fontSize: '13px', fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', opacity: elimLoading ? 0.7 : 1 }}>
                  {elimLoading ? <><Loader size={13} style={spin} /> Eliminando...</> : <><Trash2 size={13} /> Eliminar</>}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function MsgBox({ ok, txt }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '500', background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', border: ok ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)', color: ok ? '#34d399' : '#f87171' }}>{txt}</div>
  )
}

const overlay  = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
const card     = { background: '#0d1117', border: '1px solid #1a2744', borderRadius: '16px', padding: '28px', width: '420px', display: 'flex', flexDirection: 'column', gap: '18px' }
const closeBtn = { background: 'none', border: 'none', color: '#4a6fa5', cursor: 'pointer' }
const labelStyle = { fontSize: '11px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'block', marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '11px 14px', background: '#080c14', border: '1px solid #1a2744', borderRadius: '10px', fontSize: '13px', color: '#e2e8f0', outline: 'none' }
const actionBtn  = { padding: '11px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none' }
const spin     = { animation: 'spin 1s linear infinite' }
