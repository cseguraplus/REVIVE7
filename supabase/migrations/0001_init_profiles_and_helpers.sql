-- Fase Supabase 1/5: extensiones, tabla de perfiles (extiende auth.users) y
-- funciones helper usadas por todas las políticas RLS de las migraciones siguientes.
-- Traduce el patrón Base44 "user_condition: {data.app_role: X}" (rol del usuario
-- que hace la petición, no del registro) a funciones SQL reutilizables.

create extension if not exists pgcrypto;

-- profiles extiende auth.users 1:1. Aquí viven los campos que Base44 guardaba
-- directo en la entidad User (app_role, phone, account_status, etc).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  platform_role text not null default 'user' check (platform_role in ('admin', 'user')),
  app_role text not null default 'clienta' check (app_role in ('clienta', 'aliada', 'operaciones', 'contenidos', 'superadmin')),
  phone text,
  account_status text not null default 'pending' check (account_status in ('pending', 'active', 'suspended')),
  onboarding_status text not null default 'not_started' check (onboarding_status in ('not_started', 'in_progress', 'completed')),
  is_test_account boolean not null default false,
  last_activity_at timestamptz,
  terms_accepted_at timestamptz,
  privacy_accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is 'Extiende auth.users. Equivalente a los campos custom que Base44 guardaba en la entidad User.';

-- Crea automáticamente una fila de perfil cuando Supabase Auth crea un usuario nuevo,
-- igual que Base44 aprovisionaba la entidad User implícitamente al registrarse.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- updated_at automático en cualquier tabla que lo tenga.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- === Helpers usados por las políticas RLS de 0004_rls.sql ===

-- app_role del usuario autenticado actual (NULL si no hay sesión o no tiene perfil).
create or replace function public.current_app_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select app_role from public.profiles where id = auth.uid();
$$;

-- true si el usuario actual es superadmin u operaciones (el par de roles que
-- se repite en casi todas las reglas RLS originales de Base44).
create or replace function public.is_admin_or_ops()
returns boolean
language sql
stable
as $$
  select public.current_app_role() in ('superadmin', 'operaciones');
$$;

-- current_aliada_id() se define en 0002_schema.sql, después de crear
-- aliada_profiles: Postgres valida la tabla referenciada al crear una función
-- "language sql", así que no puede declararse antes de que la tabla exista.
