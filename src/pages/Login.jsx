import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#080c14',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Inter', sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: '400px', padding: '0 24px',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '14px',
            background: '#0d1320', border: '1.5px solid #1e3a6e',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', margin: '0 auto 16px',
          }}>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb', letterSpacing: '1px', lineHeight: 1 }}>CRM</span>
            <span style={{ fontSize: '13px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '2px', lineHeight: 1.3 }}>JO</span>
          </div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>CRM JO</h1>
          <p style={{ fontSize: '13px', color: '#4a6fa5', marginTop: '4px' }}>Ingresá con tu cuenta</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} style={{
          background: '#0d1117', border: '1px solid #1a2744',
          borderRadius: '20px', padding: '32px',
          display: 'flex', flexDirection: 'column', gap: '18px',
        }}>
          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'block', marginBottom: '6px' }}>
              Email
            </label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="tu@email.com" required
              style={{
                width: '100%', padding: '11px 14px',
                background: '#080c14', border: '1px solid #1a2744',
                borderRadius: '10px', fontSize: '14px', color: '#e2e8f0',
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = '#1a2744'}
            />
          </div>

          <div>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'block', marginBottom: '6px' }}>
              Contraseña
            </label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
              style={{
                width: '100%', padding: '11px 14px',
                background: '#080c14', border: '1px solid #1a2744',
                borderRadius: '10px', fontSize: '14px', color: '#e2e8f0',
                outline: 'none',
              }}
              onFocus={e => e.target.style.borderColor = '#2563eb'}
              onBlur={e => e.target.style.borderColor = '#1a2744'}
            />
          </div>

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: '8px', padding: '10px 14px',
              fontSize: '13px', color: '#f87171',
            }}>{error}</div>
          )}

          <button type="submit" disabled={loading} style={{
            width: '100%', padding: '12px',
            background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
            border: 'none', borderRadius: '10px',
            fontSize: '14px', fontWeight: '600', color: 'white',
            cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1,
            boxShadow: '0 4px 14px rgba(37,99,235,0.35)',
            marginTop: '4px',
          }}>
            {loading ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '12px', color: '#2d4a7a', marginTop: '24px' }}>
          CRM JO Pro Suite · v1.0
        </p>
      </div>
    </div>
  )
}
