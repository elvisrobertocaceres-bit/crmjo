-- ════════════════════════════════════════════════════════════
-- Migración CRM Call Center — correr en Supabase → SQL Editor
-- Seguro de re-ejecutar (todo es IF NOT EXISTS).
-- ════════════════════════════════════════════════════════════

-- 1) Columnas de segmentación / comerciales en "clientes"
alter table clientes
  add column if not exists apellido text,
  add column if not exists pais text,
  add column if not exists ciudad text,
  add column if not exists zona_horaria text,
  add column if not exists idioma text,
  add column if not exists fuente text,
  add column if not exists campana text,
  add column if not exists producto_interes text,
  add column if not exists subestado text,
  add column if not exists temperatura text,
  add column if not exists resultado_ultimo_contacto text,
  add column if not exists cantidad_intentos integer,
  add column if not exists proximo_seguimiento date,
  add column if not exists capacidad_pago text,
  add column if not exists decisor text,
  add column if not exists objecion text,
  add column if not exists valor_potencial numeric,
  add column if not exists monto_vendido numeric,
  add column if not exists estado_pago text,
  add column if not exists do_not_call boolean,
  add column if not exists consentimiento_contacto boolean,
  add column if not exists whatsapp_valido boolean,
  add column if not exists score_qa integer,
  add column if not exists motivo_perdida text;

-- 2) Tabla de oportunidades (Deals)
create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid references clientes(id) on delete set null,
  cliente_nombre text,
  titulo text,
  etapa text default 'nuevo',
  monto numeric,
  producto text,
  fecha_cierre date,
  notas text,
  agente_id uuid,
  agente_nombre text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
