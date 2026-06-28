import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, CheckCircle, AlertCircle, FileText, ArrowRight, Users, Cloud, Zap } from 'lucide-react'

const steps = [
  { n: '1', label: 'Contactos', desc: 'Andá a Contactos en HubSpot' },
  { n: '2', label: 'Exportar',  desc: 'Hacé clic en Exportar (arriba a la derecha)' },
  { n: '3', label: 'CSV',       desc: 'Seleccioná formato CSV' },
  { n: '4', label: 'Subir',     desc: 'Descargá el archivo y subílo acá' },
]

export default function Importar() {
  const [status, setStatus] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [preview, setPreview] = useState([])
  const [dragging, setDragging] = useState(false)
  const [count, setCount] = useState(0)
  const inputRef = useRef()

  // Parser de una línea CSV que respeta comillas (campos con comas adentro)
  function parseCSVLine(line) {
    const out = []
    let cur = '', inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (inQ) {
        if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else inQ = false }
        else cur += ch
      } else {
        if (ch === '"') inQ = true
        else if (ch === ',') { out.push(cur); cur = '' }
        else cur += ch
      }
    }
    out.push(cur)
    return out.map(v => v.trim())
  }

  function parseCSV(text) {
    const lines = text.replace(/\r\n?/g, '\n').trim().split('\n').filter(l => l.trim())
    const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase())
    return lines.slice(1).map(line => {
      const vals = parseCSVLine(line)
      const obj = {}
      headers.forEach((h, i) => { obj[h] = vals[i] || '' })
      return obj
    })
  }

  function mapHubspot(row) {
    const get = (...keys) => { for (const k of keys) { if (row[k] && row[k].trim()) return row[k].trim() } return '' }
    const nombre =
      (row['first name'] && row['last name']) ? `${row['first name']} ${row['last name']}`.trim()
      : (row['firstname'] && row['lastname']) ? `${row['firstname']} ${row['lastname']}`.trim()
      : get('name', 'nombre', 'nombre completo', 'nombre y apellido', 'full name', 'contacto', 'razón social', 'razon social', 'cliente') || 'Sin nombre'
    const email = get('email', 'correo', 'e-mail', 'correo electrónico', 'correo electronico')
    return {
      nombre,
      empresa: get('company', 'empresa', 'negocio', 'organización', 'organizacion'),
      email: email || null,
      telefono: get('phone number', 'phone', 'telefono', 'teléfono', 'telefono/whatsapp', 'teléfono/whatsapp', 'whatsapp', 'celular', 'móvil', 'movil', 'tel'),
      estado: 'recien_llegado',
      notas: get('notes', 'notas', 'observaciones'),
      cantidad_llamadas: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  async function processFile(file) {
    if (!file) return
    setStatus('loading')
    setPreview([])
    const text = await file.text()
    const rows = parseCSV(text)
    const clientes = rows.map(mapHubspot).filter(c => c.nombre !== 'Sin nombre')
    setPreview(clientes.slice(0, 5))
    setCount(clientes.length)
    const { error } = await supabase.from('clientes').insert(clientes)
    if (error) { setStatus('error'); setMensaje(error.message) }
    else { setStatus('ok'); setMensaje(`${clientes.length} contactos importados exitosamente`) }
  }

  function handleFile(e) { processFile(e.target.files[0]); e.target.value = '' }
  function handleDrop(e) { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]) }

  return (
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: '28px', height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #f97316, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 20px rgba(249,115,22,0.3)' }}>
            <Cloud size={18} color="#fff" />
          </div>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Importar desde HubSpot</h2>
            <p style={{ fontSize: '13px', color: '#4a6fa5' }}>Subí tu CSV y mapeamos los contactos automáticamente</p>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Steps */}
        <div style={{ background: '#0d1117', border: '1px solid rgba(249,115,22,0.2)', borderRadius: '16px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Zap size={14} color="#f97316" />
            <p style={{ fontSize: '12px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Cómo exportar de HubSpot</p>
          </div>
          {steps.map((s, i) => (
            <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '12px 14px', borderRadius: '10px', background: 'rgba(249,115,22,0.04)', border: '1px solid rgba(249,115,22,0.1)' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '13px', fontWeight: '800', color: '#f97316' }}>{s.n}</div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: '600', color: '#f1f5f9' }}>{s.label}</p>
                <p style={{ fontSize: '11px', color: '#4a6fa5', marginTop: '1px' }}>{s.desc}</p>
              </div>
              {i < steps.length - 1 && <ArrowRight size={12} color="#1a2744" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
            </div>
          ))}
          <p style={{ fontSize: '11px', color: '#2d4a7a', marginTop: '8px', paddingTop: '12px', borderTop: '1px solid #111827' }}>
            También funciona con CSVs genéricos (nombre, email, teléfono, empresa)
          </p>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragging ? '#3b82f6' : '#1a2744'}`,
            borderRadius: '16px',
            background: dragging ? 'rgba(59,130,246,0.06)' : '#0d1117',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '16px', cursor: 'pointer', minHeight: '260px', transition: 'all .2s',
            position: 'relative', overflow: 'hidden',
          }}
        >
          {/* Glow de fondo */}
          <div style={{ position: 'absolute', width: '200px', height: '200px', borderRadius: '50%', background: dragging ? 'rgba(59,130,246,0.08)' : 'rgba(37,99,235,0.04)', filter: 'blur(40px)', pointerEvents: 'none' }} />

          <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: dragging ? 'rgba(59,130,246,0.2)' : 'rgba(37,99,235,0.1)', border: `1px solid ${dragging ? 'rgba(59,130,246,0.5)' : 'rgba(37,99,235,0.2)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s', zIndex: 1 }}>
            <Upload size={28} color={dragging ? '#3b82f6' : '#2563eb'} style={{ transition: 'color .2s' }} />
          </div>
          <div style={{ textAlign: 'center', zIndex: 1 }}>
            <p style={{ fontSize: '15px', fontWeight: '700', color: dragging ? '#93c5fd' : '#f1f5f9', marginBottom: '6px', transition: 'color .2s' }}>
              {dragging ? 'Soltá el archivo aquí' : 'Arrastrá tu CSV o hacé clic'}
            </p>
            <p style={{ fontSize: '12px', color: '#4a6fa5' }}>Archivos .csv · HubSpot o formato genérico</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 14px', borderRadius: '20px', background: 'rgba(37,99,235,0.08)', border: '1px solid rgba(37,99,235,0.15)', zIndex: 1 }}>
            <FileText size={11} color="#4a6fa5" />
            <span style={{ fontSize: '11px', color: '#4a6fa5', fontWeight: '500' }}>Solo archivos .csv</span>
          </div>
          <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
        </div>
      </div>

      {/* Status */}
      {status === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 22px', background: 'rgba(234,179,8,0.06)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '12px' }}>
          <div style={{ width: '18px', height: '18px', border: '2px solid #eab308', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#fbbf24' }}>Procesando...</p>
            <p style={{ fontSize: '12px', color: '#4a6fa5', marginTop: '2px' }}>Leyendo CSV e importando contactos a la base de datos</p>
          </div>
        </div>
      )}

      {status === 'ok' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '20px 24px', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '14px' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(16,185,129,0.15)', border: '1px solid rgba(16,185,129,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={22} color="#10b981" />
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#34d399', marginBottom: '2px' }}>¡Importación exitosa!</p>
            <p style={{ fontSize: '13px', color: '#4a6fa5' }}>{mensaje}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px', borderRadius: '10px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)' }}>
            <Users size={16} color="#34d399" />
            <span style={{ fontSize: '18px', fontWeight: '800', color: '#34d399' }}>{count}</span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '18px 22px', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px' }}>
          <AlertCircle size={20} color="#ef4444" />
          <div>
            <p style={{ fontSize: '13px', fontWeight: '700', color: '#f87171' }}>Error al importar</p>
            <p style={{ fontSize: '12px', color: '#4a6fa5', marginTop: '2px' }}>{mensaje}</p>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 20px', borderBottom: '1px solid #111827' }}>
            <FileText size={14} color="#4a6fa5" />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>Preview — primeros {preview.length} contactos</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '5px', padding: '4px 10px', borderRadius: '20px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)' }}>
              <CheckCircle size={11} color="#34d399" />
              <span style={{ fontSize: '11px', color: '#34d399', fontWeight: '600' }}>Guardados en CRM</span>
            </div>
          </div>
          <div style={{ padding: '12px 20px', display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 1.5fr', gap: '12px', borderBottom: '1px solid #111827' }}>
            {['Nombre', 'Empresa', 'Email', 'Teléfono'].map(h => (
              <span key={h} style={{ fontSize: '11px', fontWeight: '600', color: '#2d4a7a', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{h}</span>
            ))}
          </div>
          {preview.map((c, i) => (
            <div key={i} style={{
              display: 'grid', gridTemplateColumns: '2fr 1.5fr 2fr 1.5fr', gap: '12px',
              padding: '12px 20px', alignItems: 'center',
              borderBottom: i < preview.length - 1 ? '1px solid #0d1220' : 'none',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#0a0f1a'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#e2e8f0' }}>{c.nombre}</span>
              <span style={{ fontSize: '13px', color: '#4a6fa5' }}>{c.empresa || '—'}</span>
              <span style={{ fontSize: '13px', color: '#4a6fa5' }}>{c.email || '—'}</span>
              <span style={{ fontSize: '13px', color: '#4a6fa5' }}>{c.telefono || '—'}</span>
            </div>
          ))}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
