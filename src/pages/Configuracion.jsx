import { useState, useEffect } from 'react'
import { Save, Eye, EyeOff, Globe } from 'lucide-react'
import { IDIOMAS } from '../lib/i18n'
import { useLang } from '../context/LangContext'

export default function Configuracion() {
  const { t, lang, cambiarIdioma } = useLang()
  const [form, setForm] = useState({ supabase_url: '', supabase_key: '', claude_key: '' })
  const [show, setShow] = useState({})
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setForm({
      supabase_url: localStorage.getItem('SUPABASE_URL') || '',
      supabase_key: localStorage.getItem('SUPABASE_KEY') || '',
      claude_key: localStorage.getItem('CLAUDE_KEY') || '',
    })
  }, [])

  function handleSave() {
    localStorage.setItem('SUPABASE_URL', form.supabase_url)
    localStorage.setItem('SUPABASE_KEY', form.supabase_key)
    localStorage.setItem('CLAUDE_KEY', form.claude_key)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const fields = [
    { key: 'supabase_url', label: 'Supabase URL', placeholder: 'https://xxxx.supabase.co' },
    { key: 'supabase_key', label: 'Supabase Anon Key', placeholder: 'eyJ...' },
    { key: 'claude_key',   label: 'Claude API Key',    placeholder: 'sk-ant-...' },
  ]

  return (
    <div style={{ padding: '32px 36px', display: 'flex', flexDirection: 'column', gap: '28px', maxWidth: '640px' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: '700', color: '#f1f5f9', letterSpacing: '-0.5px' }}>{t('configuracion')}</h2>
        <p style={{ fontSize: '13px', color: '#4a6fa5', marginTop: '2px' }}>{t('credenciales')}</p>
      </div>

      {/* Selector de idioma */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '14px', padding: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '8px',
            background: 'rgba(37,99,235,0.1)', border: '1px solid rgba(37,99,235,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Globe size={15} color="#60a5fa" />
          </div>
          <p style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0' }}>{t('idioma')}</p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
          {IDIOMAS.map(idioma => (
            <button
              key={idioma.code}
              onClick={() => cambiarIdioma(idioma.code)}
              style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                padding: '8px 16px', borderRadius: '10px', fontSize: '13px', fontWeight: '500',
                border: lang === idioma.code ? '1px solid rgba(37,99,235,0.5)' : '1px solid #1a2744',
                background: lang === idioma.code ? 'rgba(37,99,235,0.15)' : 'rgba(255,255,255,0.02)',
                color: lang === idioma.code ? '#60a5fa' : '#4a6fa5',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '16px' }}>{idioma.flag}</span>
              {idioma.label}
            </button>
          ))}
        </div>
      </div>

      {/* Credenciales */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '14px', padding: '22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{
          background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.2)',
          borderRadius: '10px', padding: '12px 16px', fontSize: '12px', color: '#fbbf24',
        }}>
          Las claves se guardan localmente. Para cambiarlas permanentemente, editá el archivo <code style={{ background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: '4px' }}>.env</code>.
        </div>

        {fields.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: '#4a6fa5', textTransform: 'uppercase', letterSpacing: '0.7px', display: 'block', marginBottom: '6px' }}>{label}</label>
            <div style={{ position: 'relative' }}>
              <input
                type={show[key] ? 'text' : 'password'}
                value={form[key]}
                onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{
                  width: '100%', padding: '10px 40px 10px 14px',
                  background: '#080c14', border: '1px solid #1a2744', borderRadius: '10px',
                  fontSize: '13px', color: '#e2e8f0', outline: 'none',
                }}
                onFocus={e => e.target.style.borderColor = '#2563eb'}
                onBlur={e => e.target.style.borderColor = '#1a2744'}
              />
              <button
                onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))}
                style={{
                  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: '#4a6fa5', cursor: 'pointer',
                }}
              >
                {show[key] ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
        ))}

        <button onClick={handleSave} style={{
          display: 'flex', alignItems: 'center', gap: '8px', alignSelf: 'flex-start',
          background: 'linear-gradient(135deg, #2563eb, #1d4ed8)', border: 'none',
          color: 'white', padding: '10px 20px', borderRadius: '10px',
          fontSize: '13px', fontWeight: '600', cursor: 'pointer',
          boxShadow: '0 4px 14px rgba(37,99,235,0.3)',
        }}>
          <Save size={14} /> {saved ? t('guardado') : t('guardar_config')}
        </button>
      </div>

      {/* SQL Setup */}
      <div style={{ background: '#0d1117', border: '1px solid #1a2744', borderRadius: '14px', padding: '22px' }}>
        <p style={{ fontSize: '14px', fontWeight: '600', color: '#e2e8f0', marginBottom: '12px' }}>{t('setup_db')}</p>
        <pre style={{
          background: '#080c14', border: '1px solid #1a2744', borderRadius: '10px',
          padding: '16px', fontSize: '11px', color: '#34d399', overflow: 'auto',
          whiteSpace: 'pre-wrap', lineHeight: 1.7,
        }}>
{`create table clientes (
  id uuid default gen_random_uuid() primary key,
  nombre text not null,
  empresa text, email text, telefono text,
  estado text default 'potencial',
  notas text, ai_score int, ai_nivel text, ai_razon text,
  cantidad_llamadas int default 0,
  ultima_llamada timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table llamadas (
  id uuid default gen_random_uuid() primary key,
  cliente_id uuid references clientes(id),
  cliente_nombre text, notas text,
  fecha timestamptz default now()
);

alter table clientes enable row level security;
alter table llamadas enable row level security;
create policy "allow all" on clientes for all using (true);
create policy "allow all" on llamadas for all using (true);`}
        </pre>
      </div>
    </div>
  )
}
