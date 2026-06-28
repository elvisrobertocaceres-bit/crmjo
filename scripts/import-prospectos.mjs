// Importa un CSV de prospectos a la tabla clientes (mismo mapeo que la UI)
// Uso: node scripts/import-prospectos.mjs "C:\\ruta\\archivo.csv"
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/).filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)
const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const file = process.argv[2]
if (!file) { console.error('Pasá la ruta del CSV'); process.exit(1) }
const text = readFileSync(file, 'utf8')

function parseLine(line) {
  const out = []; let cur = '', inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (inQ) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++ } else inQ = false } else cur += ch }
    else { if (ch === '"') inQ = true; else if (ch === ',') { out.push(cur); cur = '' } else cur += ch }
  }
  out.push(cur); return out.map(v => v.trim())
}
const lines = text.replace(/\r\n?/g, '\n').trim().split('\n').filter(l => l.trim())
const headers = parseLine(lines[0]).map(h => h.trim().toLowerCase())
const rows = lines.slice(1).map(line => { const v = parseLine(line); const o = {}; headers.forEach((h, i) => o[h] = v[i] || ''); return o })

const get = (row, ...keys) => { for (const k of keys) { if (row[k] && row[k].trim()) return row[k].trim() } return '' }
const now = new Date().toISOString()
const clientes = rows.map(row => ({
  nombre: get(row, 'name', 'nombre', 'nombre completo', 'nombre y apellido', 'full name', 'contacto', 'cliente') || 'Sin nombre',
  empresa: get(row, 'company', 'empresa', 'negocio'),
  email: get(row, 'email', 'correo', 'e-mail') || null,
  telefono: get(row, 'phone number', 'phone', 'telefono', 'teléfono', 'telefono/whatsapp', 'whatsapp', 'celular'),
  estado: 'recien_llegado', notas: get(row, 'notes', 'notas'), cantidad_llamadas: 0,
  created_at: now, updated_at: now,
})).filter(c => c.nombre !== 'Sin nombre')

console.log('Filas en CSV:', rows.length, '| A importar:', clientes.length)
const { data, error } = await supabase.from('clientes').insert(clientes).select('id, nombre')
if (error) { console.error('ERROR:', error.message); process.exit(1) }
console.log('OK: importados', data.length, 'clientes')
