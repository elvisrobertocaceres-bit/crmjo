import { useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, CheckCircle, AlertCircle, FileText, Cloud, ArrowRight, Users } from 'lucide-react'

const steps = [
  { n: '1', text: 'Andá a', bold: 'Contactos', rest: ' en HubSpot' },
  { n: '2', text: 'Hacé clic en', bold: 'Exportar', rest: ' (arriba a la derecha)' },
  { n: '3', text: 'Seleccioná formato', bold: 'CSV', rest: '' },
  { n: '4', text: 'Descargá el archivo y', bold: ' subílo acá', rest: '' },
]

export default function Importar() {
  const [status, setStatus] = useState(null)
  const [mensaje, setMensaje] = useState('')
  const [preview, setPreview] = useState([])
  const [dragging, setDragging] = useState(false)
  const [count, setCount] = useState(0)
  const inputRef = useRef()

  function parseCSV(text) {
    const lines = text.trim().split('\n')
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''))
    return lines.slice(1).map(line => {
      const vals = line.split(',').map(v => v.trim().replace(/"/g, ''))
      const obj = {}
      headers.forEach((h, i) => { obj[h] = vals[i] || '' })
      return obj
    })
  }

  function mapHubspot(row) {
    return {
      nombre: row['first name'] && row['last name']
        ? `${row['first name']} ${row['last name']}`
        : row['firstname'] && row['lastname']
        ? `${row['firstname']} ${row['lastname']}`
        : row['name'] || row['nombre'] || 'Sin nombre',
      empresa: row['company'] || row['empresa'] || '',
      email: row['email'] || '',
      telefono: row['phone number'] || row['phone'] || row['telefono'] || '',
      estado: 'potencial',
      notas: row['notes'] || row['notas'] || '',
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
    else { setStatus('ok'); setMensaje(`${clientes.length} contactos importados`) }
  }

  function handleFile(e) { processFile(e.target.files[0]); e.target.value = '' }

  function handleDrop(e) {
    e.preventDefault(); setDragging(false)
    processFile(e.dataTransfer.files[0])
  }

  return (
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: '28px', height: '100%', overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'linear-gradient(135deg,#f97316,#ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Cloud size={18} color="#fff" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>Importar desde HubSpot</h2>
          </div>
          <p style={{ fontSize: '13px', color: '#4a6fa5' }}>Exportá tus contactos y subí el CSV — los mapeamos automáticamente</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Steps */}
        <div style={{ background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.18)', borderRadius: '14px', padding: '20px' }}>
          <p style={{ fontSize: '12px', fontWeight: '700', color: '#f97316', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '16px' }}>
            Cómo exportar de HubSpot
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {steps.map(s => (
              <div key={s.n} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: 'rgba(249,115,22,0.15)', border: '1px solid rgba(249,115,22,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '12px', fontWeight: '700', color: '#f97316' }}>{s.n}</div>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>{s.text} <strong style={{ color: '#f1f5f9' }}>{s.bold}</strong>{s.rest}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid rgba(249,115,22,0.15)' }}>
            <p style={{ fontSize: '11px', color: '#64748b' }}>También funciona con CSVs genéricos (nombre, email, teléfono, empresa)</p>
          </div>
        </div>

        {/* Drop zone */}
        <div
          onClick={() => inputRef.current.click()}
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${dragging ? '#3b82f6' : 'rgba(255,255,255,0.1)'}`,
            borderRadius: '14px',
            background: dragging ? 'rgba(59,130,246,0.06)' : 'rgba(255,255,255,0.02)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '12px', cursor: 'pointer', minHeight: '180px', transition: 'all .2s',
          }}
        >
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: dragging ? 'rgba(59,130,246,0.15)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .2s' }}>
            <Upload size={24} color={dragging ? '#3b82f6' : '#4a6fa5'} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9', marginBottom: '4px' }}>
              {dragging ? 'Soltá el archivo acá' : 'Hacé clic o arrastrá el CSV'}
            </p>
            <p style={{ fontSize: '12px', color: '#4a6fa5' }}>Solo archivos .csv</p>
          </div>
          <input ref={inputRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={handleFile} />
        </div>
      </div>

      {/* Status */}
      {status === 'loading' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '14px 18px', background: 'rgba(234,179,8,0.08)', border: '1px solid rgba(234,179,8,0.2)', borderRadius: '12px' }}>
          <div style={{ width: '16px', height: '16px', border: '2px solid #eab308', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite', flexShrink: 0 }} />
          <span style={{ fontSize: '13px', color: '#eab308', fontWeight: '600' }}>Procesando CSV e importando contactos...</span>
        </div>
      )}

      {status === 'ok' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '16px 20px', background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '12px' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(16,185,129,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={20} color="#10b981" />
          </div>
          <div>
            <p style={{ fontSize: '14px', fontWeight: '700', color: '#10b981', marginBottom: '2px' }}>Importación exitosa</p>
            <p style={{ fontSize: '13px', color: '#64748b' }}>{mensaje}</p>
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16,185,129,0.12)', borderRadius: '20px', padding: '6px 14px' }}>
            <Users size={14} color="#10b981" />
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#10b981' }}>{count}</span>
          </div>
        </div>
      )}

      {status === 'error' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '12px' }}>
          <AlertCircle size={18} color="#ef4444" />
          <div>
            <p style={{ fontSize: '13px', fontWeight: '600', color: '#ef4444' }}>Error al importar</p>
            <p style={{ fontSize: '12px', color: '#64748b' }}>{mensaje}</p>
          </div>
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '14px', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 18px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <FileText size={15} color="#4a6fa5" />
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>Preview — primeros {preview.length} contactos</span>
            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ArrowRight size={12} color="#4a6fa5" />
              <span style={{ fontSize: '11px', color: '#4a6fa5' }}>ya guardados en CRM</span>
            </div>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Nombre', 'Empresa', 'Email', 'Teléfono'].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.06em', padding: '8px 18px' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((c, i) => (
                <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                  <td style={{ padding: '10px 18px', fontSize: '13px', color: '#f1f5f9', fontWeight: '500' }}>{c.nombre}</td>
                  <td style={{ padding: '10px 18px', fontSize: '13px', color: '#64748b' }}>{c.empresa || '—'}</td>
                  <td style={{ padding: '10px 18px', fontSize: '13px', color: '#64748b' }}>{c.email || '—'}</td>
                  <td style={{ padding: '10px 18px', fontSize: '13px', color: '#64748b' }}>{c.telefono || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
