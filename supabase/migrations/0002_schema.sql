-- Fase Supabase 2/5: tablas del modelo vigente (28 entidades Base44 → 28 tablas).
-- No incluye el modelo legacy "vendedora" (Clienta, Compra, Vendedora, Kit,
-- ContenidoDiario, ProgresoDiario) — ver base44/LEGACY_MIGRATION_PLAN.md (Fase 3).
-- Las foreign keys circulares (sales↔weekly_cycles, sales↔inventory_movements,
-- safety_screenings↔alerts) se agregan con ALTER TABLE justo después de crear
-- ambas tablas involucradas, más abajo en este mismo archivo.

-- === Perfiles funcionales ===

create table public.aliada_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  public_name text,
  whatsapp text,
  aliada_code text unique,
  referral_slug text,
  status text not null default 'pending_training' check (status in ('pending_training', 'active', 'suspended', 'inactive')),
  training_status text not null default 'not_started' check (training_status in ('not_started', 'in_progress', 'completed')),
  guidelines_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- id del AliadaProfile del usuario actual, si tiene uno. Usada por las
-- políticas RLS de 0004_rls.sql (ej. inventory_movements). Va aquí porque
-- necesita que aliada_profiles ya exista: Postgres valida la tabla al crear
-- una función "language sql".
create or replace function public.current_aliada_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.aliada_profiles where user_id = auth.uid();
$$;

create table public.clienta_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  aliada_id uuid references public.aliada_profiles(id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'active', 'paused', 'completed', 'dropped')),
  safety_flag boolean not null default false,
  start_goal text,
  share_emotional_default boolean not null default true,
  prep_checklist_json text,
  phone text,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  referral_code text,
  intensity_choice text check (intensity_choice in ('renueva_7', 'activa_7', 'evoluciona_7')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Estructura del programa ===

create table public.generations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  week_index numeric,
  start_date date,
  end_date date,
  enrollment_cutoff timestamptz,
  status text not null default 'open' check (status in ('draft', 'open', 'closed', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.intensity_guides (
  id uuid primary key default gen_random_uuid(),
  intensity text not null check (intensity in ('renueva_7', 'activa_7', 'evoluciona_7')),
  name text not null,
  price numeric not null,
  description text,
  instructions text,
  daily_packs text,
  general_recommendations text,
  preventive_notices text,
  sort_order numeric not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.program_days (
  id uuid primary key default gen_random_uuid(),
  day_number numeric not null,
  week_number numeric not null,
  day_of_week text check (day_of_week in ('lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo')),
  day_type text not null default 'standard' check (day_type in ('standard', 'rest', 'checkpoint', 'intro', 'welcome', 'daily', 'consolida')),
  title text not null,
  summary text,
  vimeo_url text,
  vimeo_video_id text,
  vimeo_privacy_hash text,
  required_percent numeric not null default 80,
  publish_status text not null default 'draft' check (publish_status in ('draft', 'published', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Inscripción y ventas ===

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  clienta_id uuid not null references auth.users(id) on delete cascade,
  aliada_id uuid references public.aliada_profiles(id) on delete set null,
  generation_id uuid references public.generations(id) on delete set null,
  intensity text not null check (intensity in ('renueva_7', 'activa_7', 'evoluciona_7')),
  status text not null default 'active' check (status in ('active', 'completed', 'paused', 'cancelled')),
  start_date date,
  end_date date,
  override_day_number numeric,
  override_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_cycles (
  id uuid primary key default gen_random_uuid(),
  journey_id uuid not null references public.enrollments(id) on delete cascade, -- Enrollment (ProgramJourney) ID
  clienta_id uuid not null references auth.users(id) on delete cascade,
  week_number numeric not null,
  intensity text not null check (intensity in ('renueva_7', 'activa_7', 'evoluciona_7')),
  sale_id uuid, -- FK a sales agregada en 0003 (referencia circular)
  status text not null default 'pending' check (status in ('pending', 'active', 'completed', 'cancelled')),
  unlock_start_date date,
  unlock_end_date date,
  days_unlocked numeric not null default 7,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  clienta_id uuid not null references auth.users(id) on delete cascade,
  aliada_id uuid references public.aliada_profiles(id) on delete set null,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  weekly_cycle_id uuid references public.weekly_cycles(id) on delete set null,
  generation_id uuid references public.generations(id) on delete set null,
  intensity text check (intensity in ('renueva_7', 'activa_7', 'evoluciona_7')),
  kit_id text, -- legacy, se conserva por compatibilidad de datos
  kit_name text,
  official_price numeric,
  amount numeric not null,
  discount_amount numeric not null default 0,
  discount_reason text,
  payment_method text check (payment_method in ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'partial', 'paid', 'cancelled', 'authorized_complimentary')),
  delivery_date date,
  sale_date date,
  status text not null default 'pending' check (status in ('pending', 'active', 'cancelled', 'refunded')),
  exception_authorized boolean not null default false,
  exception_reason text,
  activated boolean not null default false,
  related_movement_id uuid, -- FK a inventory_movements agregada en 0003
  reversal_movement_id uuid,
  notes text,
  created_by_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.weekly_cycles
  add constraint weekly_cycles_sale_id_fkey foreign key (sale_id) references public.sales(id) on delete set null;

-- === Progreso diario ===

create table public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  clienta_id uuid not null references auth.users(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  video_completed boolean not null default false,
  objective_video boolean not null default false,
  objective_dailypacks boolean not null default false,
  objective_hydration boolean not null default false,
  objective_nutrition boolean not null default false,
  objective_movement boolean not null default false,
  objective_rest boolean not null default false,
  emotional_state text check (emotional_state in ('great', 'good', 'neutral', 'low', 'bad')),
  emotional_comment text,
  share_with_aliada boolean not null default true,
  -- completed / completed_at: en Base44 tenían RLS de campo (solo admin/operaciones
  -- pueden escribirlos). Aquí se protegen con el trigger enforce_field_rls (0004_rls.sql)
  -- y, sobre todo, porque el backend real los setea con la service_role key (bypassa RLS),
  -- igual que las Edge Functions equivalentes a validateVideoCompletion/completeDailyCheckin.
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.video_progress (
  id uuid primary key default gen_random_uuid(),
  clienta_id uuid not null references auth.users(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  program_day_id uuid not null references public.program_days(id) on delete cascade,
  duration_seconds numeric,
  watched_buckets_json text,
  unique_watched_seconds numeric not null default 0,
  valid_percent numeric not null default 0, -- field-RLS: solo service role / admin-ops (ver nota arriba)
  last_position_seconds numeric not null default 0,
  completed boolean not null default false, -- field-RLS: idem
  completed_at timestamptz, -- field-RLS: idem
  last_saved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.weekly_metrics (
  id uuid primary key default gen_random_uuid(),
  clienta_id uuid not null references auth.users(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  capture_type text not null check (capture_type in ('initial', 'weekly', 'final')),
  weight numeric,
  waist numeric,
  energy numeric,
  sleep numeric,
  digestion numeric,
  stress numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.safety_screenings (
  id uuid primary key default gen_random_uuid(),
  clienta_id uuid not null references auth.users(id) on delete cascade,
  journey_id uuid references public.enrollments(id) on delete set null, -- Enrollment (ProgramJourney) ID
  questionnaire_json text,
  risk_level text not null default 'none' check (risk_level in ('none', 'low', 'medium', 'high')),
  alert_id uuid, -- FK a alerts agregada en 0003
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Inventario ===

create table public.inventory (
  id uuid primary key default gen_random_uuid(),
  intensity text not null check (intensity in ('renueva_7', 'activa_7', 'evoluciona_7')),
  kit_id text,
  kit_name text,
  available numeric not null default 0,
  reserved numeric not null default 0,
  status text not null default 'in_stock' check (status in ('in_stock', 'low_stock', 'out_of_stock')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  intensity text not null check (intensity in ('renueva_7', 'activa_7', 'evoluciona_7')),
  aliada_id uuid references public.aliada_profiles(id) on delete set null,
  movement_type text not null check (movement_type in ('receipt', 'adjustment', 'return', 'sale', 'sale_reversal')),
  quantity numeric not null default 1,
  related_sale_id uuid references public.sales(id) on delete set null,
  related_weekly_cycle_id uuid references public.weekly_cycles(id) on delete set null,
  status text not null default 'confirmed' check (status in ('pending', 'confirmed', 'reversed')),
  reason text,
  created_by_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.sales
  add constraint sales_related_movement_id_fkey foreign key (related_movement_id) references public.inventory_movements(id) on delete set null,
  add constraint sales_reversal_movement_id_fkey foreign key (reversal_movement_id) references public.inventory_movements(id) on delete set null;

-- === Alertas y operaciones ===

create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in (
    'no_activity', 'low_completion', 'safety', 'at_risk', 'onboarding',
    'incomplete_previous_day', 'con_dificultad', 'week_ending_soon',
    'week_ended_no_renewal', 'prep_incomplete', 'low_inventory'
  )),
  clienta_id uuid references auth.users(id) on delete cascade,
  aliada_id uuid references public.aliada_profiles(id) on delete set null,
  reason text,
  severity text not null default 'low' check (severity in ('low', 'medium', 'high')),
  cycle_key text,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  created_at timestamptz not null default now()
);

alter table public.safety_screenings
  add constraint safety_screenings_alert_id_fkey foreign key (alert_id) references public.alerts(id) on delete set null;

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid not null references auth.users(id),
  action text not null,
  entity_type text,
  entity_id text,
  old_value_json text,
  new_value_json text,
  reason text,
  "timestamp" timestamptz not null default now()
);

create table public.correction_requests (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null,
  entity_id text not null,
  field text not null,
  old_value text,
  new_value text,
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by uuid references auth.users(id),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reassignment_requests (
  id uuid primary key default gen_random_uuid(),
  clienta_id uuid not null references auth.users(id) on delete cascade,
  from_aliada_id uuid references public.aliada_profiles(id),
  to_aliada_id uuid not null references public.aliada_profiles(id),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  requested_by uuid references auth.users(id),
  resolved_by uuid references auth.users(id),
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Captación de leads ===

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  source_domain text not null,
  lead_type text not null check (lead_type in ('aliada_application', 'clienta_or_prospect', 'general_prospect')),
  full_name text not null,
  email text,
  phone text not null,
  ciudad text,
  intensity_interest text check (intensity_interest in ('renueva_7', 'activa_7', 'evoluciona_7', 'orientacion')),
  referral_code text,
  campaign text,
  consent boolean not null default false,
  assigned_aliada_id uuid references public.aliada_profiles(id) on delete set null,
  assignment_status text not null default 'general_prospect' check (assignment_status in ('assigned_to_aliada', 'general_prospect', 'pending')),
  ip text,
  status text not null default 'new' check (status in ('new', 'contacted', 'qualified', 'rejected')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.prospects (
  id uuid primary key default gen_random_uuid(),
  aliada_id uuid references public.aliada_profiles(id) on delete cascade,
  nombre text not null,
  telefono text not null,
  origen text,
  interes text,
  next_action text,
  next_action_date date,
  status text not null default 'nuevo' check (status in ('nuevo', 'contactado', 'interesado', 'pendiente', 'compra_realizada', 'no_interesado', 'seguimiento_futuro')),
  nota text,
  created_by_id uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.solicitud_aliada (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  email text not null,
  telefono text not null,
  ciudad text,
  ocupacion text,
  experiencia_venta text,
  tiempo_disponible text,
  mensaje text,
  estado text not null default 'submitted' check (estado in ('submitted', 'under_review', 'approved', 'rejected', 'waitlist')),
  source_domain text,
  campaign text,
  ip text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- NOTA: SalesApplicant.jsonc no traía ninguna regla "rls" declarada en el
-- código original (a diferencia de todas las demás entidades). Lo trato aquí
-- como admin/operaciones-only por default seguro, igual que solicitud_aliada
-- (mismo propósito: postulantes internos). Señálalo si en producción alguien
-- más debía poder leerlo/escribirlo.
create table public.sales_applicants (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text not null,
  phone text not null,
  years_experience text check (years_experience in ('0-1', '2-3', '4-5', '6+')),
  status text not null default 'nuevo' check (status in ('nuevo', 'contactado', 'en_proceso', 'aceptado', 'rechazado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- === Capacitación ===

create table public.training_modules (
  id uuid primary key default gen_random_uuid(),
  module_key text not null unique,
  title text not null,
  description text,
  content_url text,
  sort_order numeric not null default 0,
  required_for_roles text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.training_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  module_key text not null,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'completed')),
  score numeric,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.training_exams (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  questions_json text,
  passing_score numeric not null default 70,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.training_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  exam_id uuid not null references public.training_exams(id) on delete cascade,
  score numeric not null,
  passed boolean not null default false,
  answers_json text,
  taken_at timestamptz not null default now()
);

-- === Configuración ===

create table public.app_settings (
  id uuid primary key default gen_random_uuid(),
  timezone text not null default 'America/Mexico_City',
  weekly_cutoff text default 'domingo 20:00',
  required_video_percent numeric not null default 80,
  support_email text,
  current_terms_version text not null default '1.0',
  current_privacy_version text not null default '1.0',
  test_mode boolean not null default false,
  simulated_datetime timestamptz,
  active_generation_id uuid references public.generations(id),
  daily_summary_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.test_control (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  enabled boolean not null default false,
  effective_datetime timestamptz,
  allow_reset boolean not null default false,
  updated_by uuid references auth.users(id),
  updated_at timestamptz not null default now()
);
