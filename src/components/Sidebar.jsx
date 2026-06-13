import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, PhoneCall, Upload, Bot, Settings } from 'lucide-react'
import { useLang } from '../context/LangContext'

export default function Sidebar() {
  const { t } = useLang()

  const links = [
    { to: '/dashboard', icon: LayoutDashboard, key: 'dashboard' },
    { to: '/clientes',  icon: Users,           key: 'clientes' },
    { to: '/llamadas',  icon: PhoneCall,        key: 'llamadas' },
    { to: '/importar',  icon: Upload,           key: 'importar' },
    { to: '/ai',        icon: Bot,              key: 'ia_chat' },
    { to: '/config',    icon: Settings,         key: 'configuracion' },
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

      <nav style={{ flex: 1, padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <p style={{ fontSize: '10px', color: '#2d4a7a', fontWeight: '600', letterSpacing: '1px', textTransform: 'uppercase', padding: '8px 12px 4px' }}>
          {t('dashboard') === 'Dashboard' ? 'Navegación' : ''}
        </p>
        {links.map(({ to, icon: Icon, key }) => (
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
            {t(key)}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '16px 24px', borderTop: '1px solid #1a2744' }}>
        <p style={{ fontSize: '11px', color: '#1e3a5f', fontWeight: '500' }}>v1.0.0 — Build estable</p>
      </div>
    </aside>
  )
}
