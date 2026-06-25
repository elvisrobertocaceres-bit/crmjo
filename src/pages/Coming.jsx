import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { crearCuentaComing, obtenerClienteComing, actualizarCapital, darBono, procesarRetiro } from '../lib/coming'
import { Plus, RefreshCw, TrendingUp, TrendingDown, Gift, Eye, X, Loader } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

const TIPOS = [
  { key: 'deposit',    label: 'Acreditar', icon: TrendingUp,   color: '#34d399', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.25)' },
  { key: 'bonus',      label: 'Bono',      icon: Gift,         color: '#a78bfa', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.25)' },
  { key: 'withdrawal', label: 'Retiro',    icon: TrendingDown, color: '#f87171', bg: 'rgba(239,68,68,0.1)',  border: 'rgba(239,68,68,0.2)'  },
]

export default function ComingPage() {
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'

  const [clientes, setClientes] = useState([])
  const [sinCuenta, setSinCuenta] = useState([])
  const [balances, setBalances] = useState({})
  const [loading, setLoading] = useState(true)

  // Modal operación
  const [modal, setModal] = useState(null)
  const [monto, setMonto] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [opLoading, setOpLoading] = useState(false)
  const [opMsg, setOpMsg] = useState(null)

  // Modal crear cuenta
  const [crearModal, setCrearModal] = useState(null)
  const [capitalInicial, setCapitalInicial] = useState('')
  const [crearLoading, setCrearLoading] = useState(false)

  // Modal detalle
  const [detalle, setDetalle] = useState(null)
  const [detalleData, setDetalleData] = useState(null)

  useEffect(() => { fetchData() }, [])

  async function fetchData() {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('id, nombre, email, coming_account').order('nombre')
    if (!data) { setLoading(false); return }

    setClientes(data.filter(c => c.coming_account))
    setSinCuenta(data.filter(c => !c.coming_account))

    const bals = {}
    await Promise.all(data.filter(c => c.coming_account).map(async c => {
      try {
        const d = await obtenerClienteComing(c.coming_account)
        bals[c.coming_account] = d.capital ?? d.balance ?? 0
      } catch { bals[c.coming_account] = null }
    }))
    setBalances(bals)
    setLoading(false)
  }

  async function handleOperacion() {
    if (!monto || isNaN(Number(monto)) || Number(monto) <= 0)
      return setOpMsg({ ok: false, txt: 'Ingresá un monto válido' })
    setOpLoading(true)
    setOpMsg(null)
    try {
      const { cliente, tipo } = modal
      if (tipo === 'deposit') await actualizarCapital(cliente.coming_account, Number(monto), 'deposit', descripcion)
      else if (tipo === 'bonus') await darBono(cliente.coming_account, Number(monto), descripcion || 'Bono')
      else await procesarRetiro(cliente.coming_account, Number(monto), descripcion || 'Retiro')
      setOpMsg({ ok: true, txt: '¡Operación realizada!' })
      setTimeout(() => { setModal(null); setMonto(''); setDescripcion(''); setOpMsg(null); fetchData() }, 1200)
    } catch (e) { setOpMsg({ ok: false, txt: e.message }) }
    setOpLoading(false)
  }

  async function handleCrearCuenta() {
    if (!crearModal) return
    setCrearLoading(true)
    try {
      const partes = (crearModal.nombre || '').split(' ')
      const nombre = partes[0]
      const apellido = partes.slice(1).join(' ')
      const result = await crearCuentaComing({ nombre, apellido, email: crearModal.email || '', capital: Number(capitalInicial) || 0 })
      await supabase.from('clientes').update({ coming_account: result.accountNumber }).eq('id', crearModal.id)
      alert(`✅ Cuenta creada\nNúmero: ${result.accountNumber}\nContraseña: ${result.password}`)
      setCrearModal(null)
      setCapitalInicial('')
      fetchData()
    } catch (e) { alert('Error: ' + e.message) }
    setCrearLoading(false)
  }

  async function verDetalle(cliente) {
    setDetalle(cliente)
    setDetalleData(null)
    try {
      const d = await obtenerClienteComing(cliente.coming_account)
      setDetalleData(d)
    } catch (e) { setDetalleData({ error: e.message }) }
  }

  const fmtBal = (acc) => {
    const v = balances[acc]
    if (v === null || v === undefined) return '—'
    return `$${Number(v).toLocaleString('es-AR', { minimumFractionDigits: 2 })}`
  }

  return (
    <div style={{ padding: '32px 36px', height: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>
            Coming<span style={{ color: '#f0b429' }}>.</span> Gestión
          </h2>
          <p style={{ fontSize: '13px', color: '#4a6fa5', marginTop: '2px' }}>
            {clientes.length} cuentas activas · {sinCuenta.length} clientes sin cuenta
          </p>
        </div>
        <button onClick={fetchData} style={{
          display: 'flex', alignItems: 'center', gap: '7px',
          padding: '9px 16px', borderRadius: '9px', fontSize: '13px', fontWeight: '500',
          background: '#0d1117', border: '1px solid #1a2744', color: '#4a6fa5', cursor: 'pointer',
        }}>
          <RefreshCw size={13} /> Actualizar
        </button>
      </div>

      {/* Clientes sin cuenta */}
      {sinCuenta.length > 0 && (
        <div style={{ background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.2)', borderRadius: '12px', padding: '16px 20px' }}>
          <p style={{ fontSize: '12px', fontWeight: '600', color: '#fbbf24', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Sin cuenta Coming ({sinCuenta.length}) — hacé clic para crear
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
            {sinCuenta.map(c => (
              <button key={c.id} onClick={() => { setCrearModal(c); setCapitalInicial('') }} style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '7px 13px', borderRadius: '8px', fontSize: '12px', fontWeight: '500',
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.25)',
                color: '#fbbf24', cursor: 'pointer',
              }}>
                <Plus size={12} /> {c.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Tabla */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '14px', overflow: 'hidden', flex: 1 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #111827', display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 1fr 1fr 1fr', gap: '12px' }}>
          {['Cliente', 'Cuenta #', 'Balance', 'Acreditar', 'Bono', 'Retiro'].map(h => (
            <span key={h} style={{ fontSize: '11px', fontWeight: '600', color: '#2d4a7a', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{h}</span>
          ))}
        </div>

        {loading ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#4a6fa5', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> Cargando cuentas...
          </div>
        ) : clientes.length === 0 ? (
          <p style={{ padding: '48px', textAlign: 'center', color: '#2d4a7a', fontSize: '13px' }}>
            No hay clientes con cuenta Coming todavía
          </p>
        ) : clientes.map((c, i) => (
          <div key={c.id}
            style={{
              padding: '14px 20px', display: 'grid', gridTemplateColumns: '2fr 1.4fr 1fr 1fr 1fr 1fr',
              gap: '12px', alignItems: 'center',
              borderBottom: i < clientes.length - 1 ? '1px solid #0d1220' : 'none',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#0a0f1a'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div>
              <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{c.nombre}</p>
              <p style={{ fontSize: '11px', color: '#4a6fa5' }}>{c.email}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '13px', color: '#60a5fa', fontFamily: 'monospace' }}>{c.coming_account}</span>
              <button onClick={() => verDetalle(c)} title="Ver detalle" style={{ background: 'none', border: 'none', color: '#2d4a7a', cursor: 'pointer', padding: '2px' }}>
                <Eye size={13} />
              </button>
            </div>
            <span style={{ fontSize: '14px', fontWeight: '700', color: '#34d399' }}>{fmtBal(c.coming_account)}</span>
            {TIPOS.map(tipo => (
              <button key={tipo.key} onClick={() => { setModal({ cliente: c, tipo: tipo.key }); setMonto(''); setDescripcion(''); setOpMsg(null) }} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '5px',
                padding: '7px 10px', borderRadius: '8px', fontSize: '12px', fontWeight: '600',
                background: tipo.bg, border: `1px solid ${tipo.border}`, color: tipo.color, cursor: 'pointer',
              }}>
                <tipo.icon size={12} /> {tipo.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* ── Modal operación ── */}
      {modal && (() => {
        const t = TIPOS.find(x => x.key === modal.tipo)
        return (
          <div style={overlay}>
            <div style={card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <p style={{ fontSize: '16px', fontWeight: '700', color: t.color }}>{t.label}</p>
                  <p style={{ fontSize: '12px', color: '#4a6fa5', marginTop: '2px' }}>{modal.cliente.nombre} · {modal.cliente.coming_account}</p>
                </div>
                <button onClick={() => setModal(null)} style={closeBtn}><X size={18} /></button>
              </div>
              <div>
                <label style={labelStyle}>Monto (USD)</label>
                <input type="number" min="0" placeholder="0.00" value={monto} onChange={e => setMonto(e.target.value)} autoFocus
                  style={{ ...inputStyle, border: `1px solid ${t.border}`, fontSize: '16px', fontWeight: '700' }} />
              </div>
              <div>
                <label style={labelStyle}>Descripción (opcional)</label>
                <input type="text" placeholder="Ej: Primer depósito" value={descripcion} onChange={e => setDescripcion(e.target.value)}
                  style={inputStyle} />
              </div>
              {opMsg && <MsgBox ok={opMsg.ok} txt={opMsg.txt} />}
              <button onClick={handleOperacion} disabled={opLoading} style={{ ...actionBtn, background: t.bg, border: `1px solid ${t.border}`, color: t.color }}>
                {opLoading ? <><Loader size={14} style={spin} /> Procesando...</> : <><t.icon size={14} /> Confirmar {t.label}</>}
              </button>
            </div>
          </div>
        )
      })()}

      {/* ── Modal crear cuenta ── */}
      {crearModal && (
        <div style={overlay}>
          <div style={card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#60a5fa' }}>Crear cuenta Coming</p>
                <p style={{ fontSize: '12px', color: '#4a6fa5', marginTop: '2px' }}>{crearModal.nombre}</p>
              </div>
              <button onClick={() => setCrearModal(null)} style={closeBtn}><X size={18} /></button>
            </div>
            <div>
              <label style={labelStyle}>Capital inicial (USD)</label>
              <input type="number" min="0" placeholder="0" value={capitalInicial} onChange={e => setCapitalInicial(e.target.value)} autoFocus
                style={{ ...inputStyle, fontSize: '16px', fontWeight: '700' }} />
            </div>
            <button onClick={handleCrearCuenta} disabled={crearLoading} style={{ ...actionBtn, background: 'rgba(37,99,235,0.15)', border: '1px solid rgba(37,99,235,0.3)', color: '#60a5fa' }}>
              {crearLoading ? <><Loader size={14} style={spin} /> Creando...</> : <><Plus size={14} /> Crear cuenta</>}
            </button>
          </div>
        </div>
      )}

      {/* ── Modal detalle ── */}
      {detalle && (
        <div style={overlay}>
          <div style={{ ...card, maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>{detalle.nombre}</p>
                <p style={{ fontSize: '12px', color: '#4a6fa5' }}>{detalle.coming_account}</p>
              </div>
              <button onClick={() => setDetalle(null)} style={closeBtn}><X size={18} /></button>
            </div>
            {!detalleData
              ? <div style={{ padding: '24px', textAlign: 'center', color: '#4a6fa5', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}><Loader size={14} style={spin} /> Cargando...</div>
              : detalleData.error
                ? <p style={{ color: '#f87171', fontSize: '13px' }}>{detalleData.error}</p>
                : <pre style={{ background: '#080c14', border: '1px solid #1a2744', borderRadius: '10px', padding: '16px', fontSize: '12px', color: '#34d399', overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                    {JSON.stringify(detalleData, null, 2)}
                  </pre>
            }
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

function MsgBox({ ok, txt }) {
  return (
    <div style={{
      padding: '10px 14px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
      background: ok ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)',
      border: ok ? '1px solid rgba(16,185,129,0.2)' : '1px solid rgba(239,68,68,0.2)',
      color: ok ? '#34d399' : '#f87171',
    }}>{txt}</div>
  )
}

const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }
const card = { background: '#0d1117', border: '1px solid #1a2744', borderRadius: '16px', padding: '28px', width: '400px', display: 'flex', flexDirection: 'column', gap: '18px' }
const closeBtn = { background: 'none', border: 'none', color: '#4a6fa5', cursor: 'pointer' }
const labelStyle = { fontSize: '11px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'block', marginBottom: '6px' }
const inputStyle = { width: '100%', padding: '11px 14px', background: '#080c14', border: '1px solid #1a2744', borderRadius: '10px', fontSize: '13px', color: '#e2e8f0', outline: 'none' }
const actionBtn = { padding: '11px', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', border: 'none' }
const spin = { animation: 'spin 1s linear infinite' }
