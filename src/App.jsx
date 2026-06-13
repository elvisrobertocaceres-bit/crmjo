import { Routes, Route, Navigate } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Clientes from './pages/Clientes'
import Dashboard from './pages/Dashboard'
import Llamadas from './pages/Llamadas'
import Importar from './pages/Importar'
import AIChat from './pages/AIChat'
import Configuracion from './pages/Configuracion'

export default function App() {
  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/clientes" element={<Clientes />} />
          <Route path="/llamadas" element={<Llamadas />} />
          <Route path="/importar" element={<Importar />} />
          <Route path="/ai" element={<AIChat />} />
          <Route path="/config" element={<Configuracion />} />
        </Routes>
      </main>
    </div>
  )
}
