const CLAUDE_API_KEY = import.meta.env.VITE_CLAUDE_API_KEY

export async function scoreClient(client) {
  const prompt = `Analizá este cliente potencial y asignale un puntaje del 1 al 100 según su potencial de conversión.
Respondé SOLO con JSON en este formato: {"score": number, "nivel": "alto"|"medio"|"bajo", "razon": "string corto"}

Cliente:
- Nombre: ${client.nombre}
- Empresa: ${client.empresa || 'N/A'}
- Email: ${client.email || 'N/A'}
- Teléfono: ${client.telefono || 'N/A'}
- Estado actual: ${client.estado}
- Notas: ${client.notas || 'Sin notas'}
- Última interacción: ${client.ultima_interaccion || 'Nunca'}
- Cantidad de llamadas: ${client.cantidad_llamadas || 0}`

  return await callClaude(prompt)
}

export async function summarizeCall(transcripcion, clienteNombre) {
  const prompt = `Resumí esta llamada comercial en 3 puntos clave.
Respondé SOLO con JSON: {"resumen": "string", "puntos": ["string","string","string"], "siguiente_accion": "string"}

Cliente: ${clienteNombre}
Transcripción/Notas: ${transcripcion}`

  return await callClaude(prompt)
}

export async function suggestAction(client) {
  const prompt = `Dado el historial de este cliente, sugerí la mejor acción comercial a tomar AHORA.
Respondé SOLO con JSON: {"accion": "string", "prioridad": "alta"|"media"|"baja", "cuando": "string", "motivo": "string"}

Cliente: ${client.nombre}
Estado: ${client.estado}
Última llamada: ${client.ultima_llamada || 'Nunca'}
Notas: ${client.notas || 'Sin notas'}
Score IA: ${client.ai_score || 'No calculado'}`

  return await callClaude(prompt)
}

export async function chatWithData(pregunta, contexto) {
  const prompt = `Sos un asistente de CRM. Tenés acceso a los siguientes datos de clientes y debés responder la pregunta del usuario.
Respondé de forma concisa y útil en español.

DATOS:
${JSON.stringify(contexto, null, 2)}

PREGUNTA: ${pregunta}`

  const res = await callClaude(prompt, false)
  return res
}

export async function generarSpeech(historialLlamadas, cliente) {
  const historial = historialLlamadas.map((l, i) =>
    `Llamada ${i + 1} (${new Date(l.fecha).toLocaleDateString('es-AR')}): ${l.notas}`
  ).join('\n')

  const prompt = `Sos un experto en ventas y comunicación comercial. Basándote en el historial de llamadas con este cliente, generá 3 posibles speeches o guiones para la PRÓXIMA llamada.
Cada speech debe adaptarse a lo que se habló antes y buscar avanzar en la negociación.

Respondé SOLO con JSON en este formato:
{
  "speeches": [
    {
      "titulo": "string corto (ej: Apertura directa)",
      "tono": "formal"|"amigable"|"urgente",
      "texto": "el speech completo de 3-5 oraciones listo para leer"
    },
    { ... },
    { ... }
  ],
  "consejo": "un consejo breve sobre cómo manejar esta llamada"
}

Cliente: ${cliente.nombre} — ${cliente.empresa || 'Sin empresa'}
Estado: ${cliente.estado}
Historial:
${historial}`

  return await callClaude(prompt)
}

async function callClaude(prompt, parseJson = true) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) throw new Error(`Claude API error: ${response.status}`)

  const data = await response.json()
  const text = data.content[0].text

  if (!parseJson) return text

  const match = text.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('No JSON en respuesta')
  return JSON.parse(match[0])
}
