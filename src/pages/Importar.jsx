import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react'

export default function Importar() {
  const [status, setStatus] = useState(null) // null | 'loading' | 'ok' | 'error'
  const [mensaje, setMensaje] = useState('')
  const [preview, setPreview] = useState([])

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

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setStatus('loading')
    setPreview([])

    const text = await file.text()
    const rows = parseCSV(text)
    const clientes = rows.map(mapHubspot).filter(c => c.nombre !== 'Sin nombre')

    setPreview(clientes.slice(0, 5))

    const { error } = await supabase.from('clientes').insert(clientes)

    if (error) {
      setStatus('error')
      setMensaje('Error al importar: ' + error.message)
    } else {
      setStatus('ok')
      setMensaje(`${clientes.length} clientes importados correctamente`)
    }
    e.target.value = ''
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Importar desde HubSpot</h2>
        <p className="text-slate-400 text-sm mt-0.5">Exportá tus contactos de HubSpot como CSV y subílos acá</p>
      </div>

      {/* Instrucciones */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-5">
        <h3 className="font-semibold text-blue-400 mb-2">Cómo exportar de HubSpot</h3>
        <ol className="space-y-1 text-sm text-slate-300 list-decimal list-inside">
          <li>Andá a <strong>Contactos</strong> en HubSpot</li>
          <li>Hacé clic en <strong>Exportar</strong> (arriba a la derecha)</li>
          <li>Seleccioná formato <strong>CSV</strong></li>
          <li>Descargá el archivo y subílo acá</li>
        </ol>
      </div>

      {/* Drop zone */}
      <label className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-600 rounded-xl cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all">
        <Upload size={32} className="text-slate-400 mb-3" />
        <p className="text-slate-300 font-medium">Hacé clic o arrastrá el CSV acá</p>
        <p className="text-slate-500 text-sm mt-1">Solo archivos .csv exportados de HubSpot</p>
        <input type="file" accept=".csv" className="hidden" onChange={handleFile} />
      </label>

      {/* Estado */}
      {status === 'loading' && (
        <div className="flex items-center gap-2 text-yellow-400">
          <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          Importando clientes...
        </div>
      )}
      {status === 'ok' && (
        <div className="flex items-center gap-2 text-green-400">
          <CheckCircle size={18} /> {mensaje}
        </div>
      )}
      {status === 'error' && (
        <div className="flex items-center gap-2 text-red-400">
          <AlertCircle size={18} /> {mensaje}
        </div>
      )}

      {/* Preview */}
      {preview.length > 0 && (
        <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-700">
            <FileText size={16} className="text-slate-400" />
            <span className="text-sm font-medium text-white">Preview (primeros 5)</span>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700">
                {['Nombre', 'Empresa', 'Email', 'Teléfono'].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-slate-400 uppercase px-4 py-2">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((c, i) => (
                <tr key={i} className="border-b border-slate-700 last:border-0">
                  <td className="px-4 py-2 text-sm text-white">{c.nombre}</td>
                  <td className="px-4 py-2 text-sm text-slate-300">{c.empresa || '—'}</td>
                  <td className="px-4 py-2 text-sm text-slate-300">{c.email || '—'}</td>
                  <td className="px-4 py-2 text-sm text-slate-300">{c.telefono || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
