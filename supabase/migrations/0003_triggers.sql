-- Fase Supabase 3/5: updated_at automático en todas las tablas que lo tienen,
-- y protección de los campos con field-RLS en Base44 (DailyCheckin.completed/
-- completed_at, VideoProgress.valid_percent/completed/completed_at — antes solo
-- escribibles por admin/operaciones o por el propio backend con service role).

do $$
declare
  t text;
begin
  for t in
    select table_name from information_schema.columns
    where table_schema = 'public' and column_name = 'updated_at'
  loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t, t
    );
  end loop;
end $$;

-- auth.uid() es NULL cuando la petición llega sin JWT de usuario (service_role
-- key desde una Edge Function, o SQL Editor) — ahí se permite el cambio siempre.
-- Con JWT de usuario, solo se permite si es superadmin/operaciones.
create or replace function public.enforce_daily_checkin_field_rls()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin_or_ops() then
    if new.completed is distinct from old.completed or new.completed_at is distinct from old.completed_at then
      raise exception 'completed/completed_at solo pueden actualizarse por operaciones/superadmin o por el backend';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_daily_checkin_field_rls on public.daily_checkins;
create trigger enforce_daily_checkin_field_rls
  before update on public.daily_checkins
  for each row execute function public.enforce_daily_checkin_field_rls();

create or replace function public.enforce_video_progress_field_rls()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin_or_ops() then
    if new.valid_percent is distinct from old.valid_percent
      or new.completed is distinct from old.completed
      or new.completed_at is distinct from old.completed_at then
      raise exception 'valid_percent/completed/completed_at solo pueden actualizarse por operaciones/superadmin o por el backend';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_video_progress_field_rls on public.video_progress;
create trigger enforce_video_progress_field_rls
  before update on public.video_progress
  for each row execute function public.enforce_video_progress_field_rls();
