// Inserta clientes de prueba en Supabase (lee credenciales de ../.env)
// Uso: node scripts/seed-clientes.mjs
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

const env = Object.fromEntries(
  readFileSync(new URL('../.env', import.meta.url), 'utf8')
    .split(/\r?\n/)
    .filter(l => l.includes('=') && !l.trim().startsWith('#'))
    .map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()] })
)

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY)

const clientes = [
  { nombre: 'Juan Pérez',      empresa: 'Inversiones JP',  email: 'juan.perez@demo.com',   telefono: '+54 9 11 5555-1001', estado: 'potencial' },
  { nombre: 'María González',  empresa: 'González Capital', email: 'maria.gonzalez@demo.com', telefono: '+54 9 11 5555-1002', estado: 'recien_llegado' },
  { nombre: 'Carlos López',    empresa: 'López Trading',   email: 'carlos.lopez@demo.com', telefono: '+54 9 11 5555-1003', estado: 'en_proceso' },
  { nombre: 'Ana Martínez',    empresa: 'AM Finanzas',     email: 'ana.martinez@demo.com', telefono: '+54 9 11 5555-1004', estado: 'negociacion' },
  { nombre: 'Diego Fernández', empresa: 'DF Invest',       email: 'diego.fernandez@demo.com', telefono: '+54 9 11 5555-1005', estado: 'convertido' },
  { nombre: 'Lucía Romero',    empresa: 'Romero & Co',     email: 'lucia.romero@demo.com', telefono: '+54 9 11 5555-1006', estado: 'cita_agendada' },
]

const { data, error } = await supabase.from('clientes').insert(clientes).select()
if (error) { console.error('ERROR:', error.message); process.exit(1) }
console.log('OK: insertados ' + data.length + ' clientes de prueba')
data.forEach(c => console.log('  - ' + c.nombre + '  (id ' + c.id + ')'))
