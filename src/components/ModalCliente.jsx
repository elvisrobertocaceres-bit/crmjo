import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { summarizeCall, generarSpeech } from '../lib/claude'
import { ESTADOS_CONFIG, getEstadoStyle } from '../lib/i18n'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'
import { X, Save, Phone, Brain, Building2, Mail, User, MessageSquare, Sparkles, ChevronDown, ChevronUp, UserCheck } from 'lucide-react'

function Input({ label, icon: Icon, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '11px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {Icon && <Icon size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#2d4a7a' }} />}
        <input
          {...props}
          style={{
            width: '100%',
            padding: Icon ? '10px 14px 10px 34px' : '10px 14px',
            background: '#080c14', border: '1px solid #1a2744',
            borderRadius: '10px', fontSize: '13.5px', color: '#e2e8f0',
            outline: 'none', transition: 'border-color 0.15s',
          }}
          onFocus={e => e.target.style.borderColor = '#2563eb'}
          onBlur={e => e.target.style.borderColor = '#1a2744'}
        />
      </div>
    </div>
  )
}

export default function ModalCliente({ cliente, onClose, onSave }) {
  const { t, lang } = useLang()
  const { user } = useAuth()
  const isAdmin = user?.rol === 'admin'
  const isNew = !cliente
  const [form, setForm] = useState({
    nombre: cliente?.nombre || '',
    empresa: cliente?.empresa || '',
    email: cliente?.email || '',
    telefono: cliente?.telefono || '',
    estado: cliente?.estado || 'recien_llegado',
    notas: cliente?.notas || '',
  })
  const [llamadaNota, setLlamadaNota] = useState('')
  const [resultadoLlamada, setResultadoLlamada] = useState(null)
  const [loading, setLoading] = useState(false)
  const [aiResumen, setAiResumen] = useState(null)
  const [speeches, setSpeeches] = useState(null)
  const [speechLoading, setSpeechLoading] = useState(false)
  const [speechExpandido, setSpeechExpandido] = useState(null)
  const [historialLlamadas, setHistorialLlamadas] = useState([])
  const [agentes, setAgentes] = useState([])
  const [agenteSeleccionado, setAgenteSeleccionado] = useState(cliente?.agente_id || '')

  useEffect(() => {
    if (!isNew) fetchHistorial()
    if (isAdmin) fetchAgentes()
  }, [])

  async function fetchAgentes() {
    const { data } = await supabase.from('usuarios').select('id, nombre').eq('rol', 'agente')
    if (data) setAgentes(data)
  }

  async function fetchHistorial() {
    const { data } = await supabase
      .from('llamadas').select('*')
      .eq('cliente_id', cliente.id)
      .order('fecha', { ascending: false }).limit(5)
    if (data) setHistorialLlamadas(data)
  }

  async function handleGenerarSpeeches() {
    if (historialLlamadas.length === 0) { alert(t('sin_llamadas')); return }
    setSpeechLoading(true)
    try {
      const result = await generarSpeech(historialLlamadas, cliente)
      setSpeeches(result)
      setSpeechExpandido(0)
    } catch (e) { alert('Error IA: ' + e.message) }
    setSpeechLoading(false)
  }

  function change(field, value) { setForm(f => ({ ...f, [field]: value })) }

  async function handleReasignar() {
    if (!agenteSeleccionado) return alert('Seleccioná un agente')
    const agente = agentes.find(a => a.id === agenteSeleccionado)
    if (!agente) return
    setLoading(true)
    await supabase.from('clientes').update({
      agente_id: agente.id,
      agente_nombre: agente.nombre,
      reasignado: true,
      agente_anterior: cliente.agente_nombre || null,
      updated_at: new Date().toISOString(),
    }).eq('id', cliente.id)
    setLoading(false)
    onSave()
  }

  async function handleSave() {
    if (!form.nombre.trim()) return alert('El nombre es requerido')
    setLoading(true)
    const now = new Date().toISOString()
    let error
    if (isNew) {
      const agenteData = !isAdmin ? { agente_id: user.id, agente_nombre: user.nombre } : {}
      const res = await supabase.from('clientes').insert({ ...form, ...agenteData, created_at: now, updated_at: now, cantidad_llamadas: 0 })
      error = res.error
    } else {
      const res = await supabase.from('clientes').update({ ...form, updated_at: now }).eq('id', cliente.id)
      error = res.error
    }
    setLoading(false)
    if (error) {
      alert('Error al guardar: ' + error.message)
      console.error('Supabase error:', error)
      return
    }
    onSave()
  }

  async function handleRegistrarLlamada() {
    if (!llamadaNota.trim()) return alert('Escribi notas de la llamada')
    setLoading(true)
    const now = new Date().toISOString()
    const nuevaCantidad = (cliente.cantidad_llamadas || 0) + 1

    // Determinar nuevo estado según resultado
    let nuevoEstado = form.estado
    if (resultadoLlamada === 'colgo') {
      nuevoEstado = 'colgo'
    } else if (resultadoLlamada === 'no_contesta') {
      // Contar cuántas llamadas anteriores sin respuesta hay
      const noContestaAntes = historialLlamadas.filter(l =>
        l.notas?.toLowerCase().includes('no contesta') ||
        l.notas?.toLowerCase().includes('no atiende') ||
        l.resultado === 'no_contesta'
      ).length
      nuevoEstado = noContestaAntes >= 2 ? 'nunca_responde' : 'no_contesta'
    }

    const textoFinal = resultadoLlamada === 'no_contesta'
      ? `[No contestó] ${llamadaNota}`
      : resultadoLlamada === 'colgo'
      ? `[Colgó] ${llamadaNota}`
      : llamadaNota

    const { error: errInsert } = await supabase.from('llamadas').insert({
      cliente_id: cliente.id, cliente_nombre: cliente.nombre,
      notas: textoFinal, resultado: resultadoLlamada, fecha: now,
    })
    if (errInsert) {
      alert('Error al guardar llamada: ' + errInsert.message)
      console.error('Supabase llamada error:', errInsert)
      setLoading(false)
      return
    }
    await supabase.from('clientes').update({
      ultima_llamada: now,
      cantidad_llamadas: nuevaCantidad,
      estado: nuevoEstado,
      updated_at: now,
    }).eq('id', cliente.id)

    // Actualizar estado en el form local también
    setForm(f => ({ ...f, estado: nuevoEstado }))

    try {
      const resumen = await summarizeCall(textoFinal, cliente.nombre)
      setAiResumen(resumen)
    } catch (_) {}
    setLlamadaNota('')
    setResultadoLlamada(null)
    setLoading(false)
    fetchHistorial()
    onSave()
  }

  const tonoColor = {
    formal:   { color: '#60a5fa', bg: 'rgba(37,99,235,0.1)',   border: 'rgba(37,99,235,0.2)' },
    amigable: { color: '#34d399', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.2)' },
    urgente:  { color: '#f87171', bg: 'rgba(239,68,68,0.1)',   border: 'rgba(239,68,68,0.2)' },
  }

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 50, padding: '20px',
    }}>
      <div style={{
        background: '#0d1117', border: '1px solid #1a2744', borderRadius: '20px',
        width: '100%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>

        {/* Header */}
        <div style={{
          padding: '24px 28px 20px', borderBottom: '1px solid #111827',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: '#0d1117', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '42px', height: '42px', borderRadius: '12px',
              background: 'rgba(37,99,235,0.12)', border: '1px solid rgba(37,99,235,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <User size={18} color="#60a5fa" />
            </div>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#f1f5f9' }}>
                {isNew ? t('nuevo_cliente_titulo') : cliente.nombre}
              </h3>
              <p style={{ fontSize: '12px', color: '#4a6fa5', marginTop: '1px' }}>
                {isNew ? t('datos_cliente') : t('editando')}
              </p>
            </div>
          </div>
          <button onClick={onClose} style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid #1a2744',
            color: '#4a6fa5', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Contenido */}
        <div style={{ padding: '24px 28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Campos */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Input label={t('nombre_req')} icon={User} type="text" value={form.nombre} onChange={e => change('nombre', e.target.value)} placeholder="Juan Perez" />
            <Input label={t('empresa')} icon={Building2} type="text" value={form.empresa} onChange={e => change('empresa', e.target.value)} placeholder="Empresa S.A." />
            <Input label={t('email')} icon={Mail} type="email" value={form.email} onChange={e => change('email', e.target.value)} placeholder="juan@empresa.com" />
            <Input label={t('telefono')} icon={Phone} type="tel" value={form.telefono} onChange={e => change('telefono', e.target.value)} placeholder="+54 9 11..." />
          </div>

          {/* Estado */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'block', marginBottom: '10px' }}>
              {t('estado_cliente')}
            </label>
            <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
              {ESTADOS_CONFIG.map(e => (
                <button key={e.key} onClick={() => change('estado', e.key)} style={{
                  padding: '5px 13px', borderRadius: '20px', fontSize: '11.5px', fontWeight: '600',
                  border: form.estado === e.key ? `1px solid ${e.border}` : '1px solid #1a2744',
                  background: form.estado === e.key ? e.bg : 'transparent',
                  color: form.estado === e.key ? e.color : '#4a6fa5',
                  cursor: 'pointer', transition: 'all 0.15s',
                }}>
                  {e.label[lang] || e.label.es}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'block', marginBottom: '6px' }}>
              {t('notas')}
            </label>
            <textarea rows={3} value={form.notas} onChange={e => change('notas', e.target.value)}
              placeholder={t('notas_ph')}
              style={{
                width: '100%', padding: '10px 14px',
                background: '#080c14', border: '1px solid #1a2744',
                borderRadius: '10px', fontSize: '13.5px', color: '#e2e8f0',
                outline: 'none', resize: 'none', fontFamily: 'inherit',
              }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = '#1a2744'}
            />
          </div>

          {/* Historial de llamadas */}
          {!isNew && historialLlamadas.length > 0 && (
            <div style={{ background: '#080c14', border: '1px solid #1a2744', borderRadius: '14px', padding: '18px' }}>
              <p style={{ fontSize: '11px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '12px' }}>
                Historial de llamadas ({historialLlamadas.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {historialLlamadas.map((ll, i) => (
                  <div key={ll.id} style={{
                    background: '#0d1117', border: '1px solid #1a2744', borderRadius: '10px', padding: '12px 14px',
                    borderLeft: '3px solid rgba(16,185,129,0.4)',
                  }}>
                    <p style={{ fontSize: '11px', color: '#2d4a7a', marginBottom: '6px' }}>
                      {new Date(ll.fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>{ll.notas}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Registrar llamada */}
          {!isNew && (
            <div style={{ background: '#080c14', border: '1px solid #1a2744', borderRadius: '14px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Phone size={14} color="#34d399" />
                </div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{t('registrar_llamada')}</p>
              </div>

              {/* Resultado de la llamada */}
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '11px', color: '#4a6fa5', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '8px' }}>¿Cómo resultó la llamada?</p>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {[
                    { key: 'atendio',     label: '✅ Atendió',      color: '#34d399', bg: 'rgba(16,185,129,0.1)',  border: 'rgba(16,185,129,0.3)'  },
                    { key: 'no_contesta', label: '📵 No Contestó', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.3)'  },
                    { key: 'colgo',       label: '📞 Colgó',        color: '#f97316', bg: 'rgba(249,115,22,0.1)', border: 'rgba(249,115,22,0.3)'  },
                  ].map(r => (
                    <button key={r.key} onClick={() => setResultadoLlamada(resultadoLlamada === r.key ? null : r.key)} style={{
                      padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                      border: resultadoLlamada === r.key ? `1px solid ${r.border}` : '1px solid #1a2744',
                      background: resultadoLlamada === r.key ? r.bg : 'transparent',
                      color: resultadoLlamada === r.key ? r.color : '#4a6fa5',
                      transition: 'all 0.15s',
                    }}>{r.label}</button>
                  ))}
                </div>
                {resultadoLlamada === 'no_contesta' && (
                  <p style={{ fontSize: '11px', color: '#f59e0b', marginTop: '6px', fontStyle: 'italic' }}>
                    {historialLlamadas.filter(l => l.resultado === 'no_contesta' || l.notas?.startsWith('[No contestó]')).length >= 2
                      ? '⚠️ 3ra vez sin respuesta — se marcará como Nunca Responde'
                      : '→ Se marcará como No Contesta'}
                  </p>
                )}
                {resultadoLlamada === 'colgo' && (
                  <p style={{ fontSize: '11px', color: '#f97316', marginTop: '6px', fontStyle: 'italic' }}>→ Se marcará como Colgó</p>
                )}
              </div>

              <textarea rows={2} placeholder={t('notas_llamada')} value={llamadaNota}
                onChange={e => setLlamadaNota(e.target.value)}
                style={{
                  width: '100%', padding: '10px 14px',
                  background: '#0d1117', border: '1px solid #1a2744',
                  borderRadius: '10px', fontSize: '13px', color: '#e2e8f0',
                  outline: 'none', resize: 'none', fontFamily: 'inherit', marginBottom: '12px',
                }}
                onFocus={e => e.target.style.borderColor = '#34d399'}
                onBlur={e => e.target.style.borderColor = '#1a2744'}
              />
              <button onClick={handleRegistrarLlamada} disabled={loading} style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)',
                color: '#34d399', padding: '8px 16px', borderRadius: '9px',
                fontSize: '12px', fontWeight: '600', cursor: 'pointer', opacity: loading ? 0.5 : 1,
              }}>
                <Brain size={13} /> {t('registrar_ia')}
              </button>

              {aiResumen && (
                <div style={{
                  marginTop: '14px', background: 'rgba(139,92,246,0.08)',
                  border: '1px solid rgba(139,92,246,0.2)', borderRadius: '10px', padding: '14px',
                }}>
                  <p style={{ fontSize: '11px', fontWeight: '700', color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '6px' }}>{t('resumen_ia')}</p>
                  <p style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6 }}>{aiResumen.resumen}</p>
                  <p style={{ fontSize: '12px', color: '#4a6fa5', marginTop: '6px' }}>{t('siguiente_accion')}: {aiResumen.siguiente_accion}</p>
                </div>
              )}
            </div>
          )}

          {/* Speeches IA */}
          {!isNew && (
            <div style={{ background: '#080c14', border: '1px solid #1a2744', borderRadius: '14px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '8px',
                    background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <MessageSquare size={14} color="#a78bfa" />
                  </div>
                  <div>
                    <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{t('speeches_titulo')}</p>
                    <p style={{ fontSize: '11px', color: '#4a6fa5', marginTop: '1px' }}>{t('speeches_desc')}</p>
                  </div>
                </div>
                <button onClick={handleGenerarSpeeches} disabled={speechLoading} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '9px', fontSize: '12px', fontWeight: '600',
                  background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)',
                  color: '#a78bfa', cursor: speechLoading ? 'default' : 'pointer', opacity: speechLoading ? 0.6 : 1,
                }}>
                  <Sparkles size={13} />
                  {speechLoading ? t('generando') : t('generar_ia')}
                </button>
              </div>

              {historialLlamadas.length === 0 && !speeches && (
                <p style={{ fontSize: '12px', color: '#2d4a7a', fontStyle: 'italic' }}>{t('sin_llamadas')}</p>
              )}

              {speeches && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{
                    background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
                    borderRadius: '10px', padding: '10px 14px',
                    display: 'flex', alignItems: 'flex-start', gap: '8px',
                  }}>
                    <Sparkles size={13} color="#fbbf24" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <p style={{ fontSize: '12px', color: '#fbbf24', lineHeight: 1.6 }}>{speeches.consejo}</p>
                  </div>

                  {speeches.speeches.map((s, i) => {
                    const tc = tonoColor[s.tono] || tonoColor.formal
                    const abierto = speechExpandido === i
                    return (
                      <div key={i} style={{
                        background: '#0d1117', border: abierto ? '1px solid rgba(139,92,246,0.3)' : '1px solid #1a2744',
                        borderRadius: '12px', overflow: 'hidden',
                      }}>
                        <button onClick={() => setSpeechExpandido(abierto ? null : i)} style={{
                          width: '100%', padding: '12px 16px',
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                          background: 'none', border: 'none', cursor: 'pointer',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{
                              fontSize: '11px', fontWeight: '700', padding: '3px 10px', borderRadius: '20px',
                              background: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                              textTransform: 'capitalize',
                            }}>{s.tono}</span>
                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{s.titulo}</span>
                          </div>
                          {abierto ? <ChevronUp size={15} color="#4a6fa5" /> : <ChevronDown size={15} color="#4a6fa5" />}
                        </button>
                        {abierto && (
                          <div style={{ padding: '0 16px 16px' }}>
                            <div style={{ background: '#080c14', borderRadius: '10px', padding: '14px', border: '1px solid #1a2744' }}>
                              <p style={{ fontSize: '13.5px', color: '#cbd5e1', lineHeight: 1.75, fontStyle: 'italic' }}>
                                "{s.texto}"
                              </p>
                            </div>
                            <button onClick={() => navigator.clipboard.writeText(s.texto)} style={{
                              marginTop: '8px', fontSize: '11px', color: '#4a6fa5',
                              background: 'none', border: 'none', cursor: 'pointer',
                            }}>
                              {t('copiar')}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Reasignación — solo admin en cliente existente */}
          {!isNew && isAdmin && (
            <div style={{ background: '#080c14', border: '1px solid rgba(139,92,246,0.2)', borderRadius: '14px', padding: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '8px',
                  background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <UserCheck size={14} color="#a78bfa" />
                </div>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>Reasignar cliente</p>
                  {cliente.agente_nombre && (
                    <p style={{ fontSize: '11px', color: '#4a6fa5', marginTop: '1px' }}>
                      Agente actual: <span style={{ color: '#60a5fa' }}>{cliente.agente_nombre}</span>
                      {cliente.agente_anterior && ` · Antes: ${cliente.agente_anterior}`}
                    </p>
                  )}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <select value={agenteSeleccionado} onChange={e => setAgenteSeleccionado(e.target.value)} style={{
                  flex: 1, padding: '9px 12px', background: '#0d1117', border: '1px solid #1a2744',
                  borderRadius: '9px', fontSize: '13px', color: '#e2e8f0', outline: 'none',
                }}>
                  <option value="">Seleccioná un agente</option>
                  {agentes.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
                <button onClick={handleReasignar} disabled={loading || !agenteSeleccionado} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '9px 16px', borderRadius: '9px', fontSize: '12px', fontWeight: '600',
                  background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)',
                  color: '#a78bfa', cursor: 'pointer', whiteSpace: 'nowrap',
                  opacity: loading || !agenteSeleccionado ? 0.5 : 1,
                }}>
                  <UserCheck size={13} /> Reasignar
                </button>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: '18px 28px', borderTop: '1px solid #111827',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
          background: '#080c14', borderRadius: '0 0 20px 20px',
          position: 'sticky', bottom: 0,
        }}>
          {/* Eliminar — solo admin en cliente existente */}
          {!isNew && isAdmin ? (
            <button onClick={async () => {
              if (!confirm('¿Eliminar este cliente? Esta acción no se puede deshacer.')) return
              await supabase.from('llamadas').delete().eq('cliente_id', cliente.id)
              await supabase.from('clientes').delete().eq('id', cliente.id)
              onSave()
            }} style={{
              display: 'flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '500',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#f87171', cursor: 'pointer',
            }}>
              🗑 Eliminar cliente
            </button>
          ) : <div />}

          <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onClose} style={{
            padding: '9px 20px', borderRadius: '10px', fontSize: '13px', fontWeight: '500',
            background: 'transparent', border: '1px solid #1a2744', color: '#4a6fa5', cursor: 'pointer',
          }}>
            {t('cancelar')}
          </button>
          <button onClick={handleSave} disabled={loading} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            padding: '9px 22px', borderRadius: '10px', fontSize: '13px', fontWeight: '600',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            border: 'none', color: 'white', cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
            opacity: loading ? 0.6 : 1,
          }}>
            <Save size={14} /> {isNew ? t('crear') : t('guardar')}
          </button>
          </div>

      </div>
    </div>
  )
}
