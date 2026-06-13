import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import Login from './pages/Login'
import Clientes from './pages/Clientes'
import Dashboard from './pages/Dashboard'
import Llamadas from './pages/Llamadas'
import Importar from './pages/Importar'
import AIChat from './pages/AIChat'
import Configuracion from './pages/Configuracion'
import Agentes from './pages/Agentes'

export default function App() {
  const { user } = useAuth()

  if (!user) return <Login />

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
          <Route path="/agentes" element={<Agentes />} />
        </Routes>
      </main>
    </div>
  )
}
