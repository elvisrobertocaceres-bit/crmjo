const API = import.meta.env.VITE_COMING_API
const ADMIN_PASS = import.meta.env.VITE_COMING_ADMIN_PASS

let _token = null

async function getAdminToken() {
  if (_token) return _token
  const res = await fetch(`${API}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ accountNumber: 'ADMIN', password: ADMIN_PASS }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error('No se pudo autenticar con Coming')
  _token = data.token
  return _token
}

export async function crearCuentaComing({ nombre, apellido, email, capital = 0 }) {
  const token = await getAdminToken()
  const res = await fetch(`${API}/admin/clients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ nombre, apellido, email, capital }),
  })
  if (!res.ok) {
    _token = null
    throw new Error('Error al crear cuenta en Coming')
  }
  return await res.json() // { accountNumber, password, capital }
}

export async function listarClientesComing() {
  const token = await getAdminToken()
  const res = await fetch(`${API}/admin/clients`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error('Error al cargar clientes de Coming')
  return await res.json()
}

export async function actualizarCapital(accountNumber, amount, type = 'deposit', description = '') {
  const token = await getAdminToken()
  const res = await fetch(`${API}/admin/clients/${accountNumber}/transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ type, amount: Math.abs(amount), description }),
  })
  if (!res.ok) throw new Error('Error al actualizar capital')
  return await res.json()
}
