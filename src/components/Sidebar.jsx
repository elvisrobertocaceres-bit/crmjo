import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, PhoneCall, Upload, Bot, Settings, UserCog, LogOut, TrendingUp, Briefcase, CalendarClock } from 'lucide-react'
import { useLang } from '../context/LangContext'
import { useAuth } from '../context/AuthContext'

export default function Sidebar() {
  const { t } = useLang()
  const { user, logout } = useAuth()
  const isAdmin = user?.rol === 'admin'

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
    { to: '/clientes',  icon: Users,           key: 'clientes' },
    { to: '/llamadas',  icon: PhoneCall,        key: 'llamadas' },
    { to: '/importar',  icon: Upload,           key: 'importar' },
    { to: '/ai',        icon: Bot,              key: 'ia_chat' },
    { to: '/deals',     icon: Briefcase,  key: 'deals', label: 'Oportunidades' },
    { to: '/seguimientos', icon: CalendarClock, key: 'seguimientos', label: 'Seguimientos' },
    { to: '/config',    icon: Settings,   key: 'configuracion' },
    ...(isAdmin ? [{ to: '/agentes', icon: UserCog,     key: 'agentes', label: 'Agentes' }] : []),
    ...(isAdmin ? [{ to: '/coming',  icon: TrendingUp,  key: 'coming',  label: 'Coming' }] : []),
  ]

  return (
    <aside style={{
      width: '220px',
      background: 'linear-gradient(180deg, #0d1117 0%, #0a0f1a 100%)',
      borderRight: '1px solid #1a2744',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ padding: '28px 24px 24px', borderBottom: '1px solid #1a2744' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '12px',
            background: '#0d1320', border: '1.5px solid #1e3a6e',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#2563eb', letterSpacing: '1px', lineHeight: 1 }}>CRM</span>
            <span style={{ fontSize: '10px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '2px', lineHeight: 1.4 }}>JO</span>
          </div>
          <div>
            <p style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.3px' }}>CRM JO</p>
            <p style={{ fontSize: '10px', color: '#4a6fa5', fontWeight: '500', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Pro Suite</p>
          </div>
        </div>
      </div>

      {/* Usuario actual */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #111827' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: isAdmin ? 'rgba(139,92,246,0.15)' : 'rgba(37,99,235,0.1)',
            border: isAdmin ? '1px solid rgba(139,92,246,0.3)' : '1px solid rgba(37,99,235,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <span style={{ fontSize: '12px' }}>{isAdmin ? '👑' : '👤'}</span>
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: '12px', fontWeight: '600', color: '#e2e8f0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.nombre}</p>
            <p style={{ fontSize: '10px', color: isAdmin ? '#a78bfa' : '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{isAdmin ? 'Admin' : 'Agente'}</p>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {links.map(({ to, icon: Icon, key, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '9px 12px', borderRadius: '8px',
            fontSize: '13.5px', fontWeight: isActive ? '600' : '400',
            color: isActive ? '#f1f5f9' : '#4a6fa5',
            background: isActive ? 'linear-gradient(135deg, #1e3a6e, #1a3260)' : 'transparent',
            textDecoration: 'none', transition: 'all 0.15s',
            borderLeft: isActive ? '2px solid #2563eb' : '2px solid transparent',
          })}>
            <Icon size={16} />
            {label || t(key)}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '12px', borderTop: '1px solid #1a2744' }}>
        <button onClick={logout} style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '8px',
          padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
          background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)',
          color: '#f87171', cursor: 'pointer',
        }}>
          <LogOut size={14} /> Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
