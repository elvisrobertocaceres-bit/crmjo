import { createContext, useContext, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext()

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('crm_user')
    return saved ? JSON.parse(saved) : null
  })

  async function login(email, password) {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email.trim().toLowerCase())
      .eq('password', password)
      .single()
    if (error || !data) throw new Error('Email o contraseña incorrectos')
    localStorage.setItem('crm_user', JSON.stringify(data))
    setUser(data)
    return data
  }

  function logout() {
    localStorage.removeItem('crm_user')
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() { return useContext(AuthContext) }
