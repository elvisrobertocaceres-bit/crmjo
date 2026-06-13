import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PhoneCall, Calendar } from 'lucide-react'

export default function Llamadas() {
  const [llamadas, setLlamadas] = useState([])

  useEffect(() => {
    supabase
      .from('llamadas')
      .select('*')
      .order('fecha', { ascending: false })
      .then(({ data }) => data && setLlamadas(data))
  }, [])

  return (
    <div className="p-6 space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-white">Historial de Llamadas</h2>
        <p className="text-slate-400 text-sm mt-0.5">{llamadas.length} registros</p>
      </div>

      <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              {['Cliente', 'Fecha', 'Notas'].map(h => (
                <th key={h} className="text-left text-xs font-medium text-slate-400 uppercase tracking-wider px-4 py-3">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700">
            {llamadas.length === 0 ? (
              <tr><td colSpan={3} className="text-center text-slate-400 py-10 text-sm">No hay llamadas registradas</td></tr>
            ) : llamadas.map(l => (
              <tr key={l.id} className="hover:bg-slate-750">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <PhoneCall size={15} className="text-green-400" />
                    <span className="text-sm font-medium text-white">{l.cliente_nombre}</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Calendar size={13} />
                    {new Date(l.fecha).toLocaleString('es-AR')}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-slate-300 max-w-md truncate">{l.notas}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
