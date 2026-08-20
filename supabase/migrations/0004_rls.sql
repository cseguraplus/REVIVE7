-- Fase Supabase 4/5: RLS. Traducción 1:1 de cada regla en base44/entities/*.jsonc.
-- Notación original Base44 → equivalente aquí:
--   user_condition: {data.app_role: "X"}   → public.current_app_role() = 'X'
--   superadmin OR operaciones (combo que se repite en casi todo) → public.is_admin_or_ops()
--   data.<campo>: "{{user.id}}"            → <campo> = auth.uid()
--   created_by_id: "{{user.id}}"           → created_by_id = auth.uid()

-- === profiles (User) ===
alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles for select
  using (public.is_admin_or_ops() or id = auth.uid());

create policy "profiles_update" on public.profiles for update
  using (public.is_admin_or_ops() or id = auth.uid())
  with check (public.is_admin_or_ops() or id = auth.uid());

create policy "profiles_delete" on public.profiles for delete
  using (public.current_app_role() = 'superadmin');

-- Field-RLS: app_role/account_status/onboarding_status/is_test_account solo
-- admin-ops (a diferencia de last_activity_at, que sí puede tocar el propio usuario).
create or replace function public.enforce_profiles_field_rls()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is not null and not public.is_admin_or_ops() then
    if new.app_role is distinct from old.app_role
      or new.account_status is distinct from old.account_status
      or new.onboarding_status is distinct from old.onboarding_status
      or new.is_test_account is distinct from old.is_test_account then
      raise exception 'app_role/account_status/onboarding_status/is_test_account solo pueden actualizarse por operaciones/superadmin';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_profiles_field_rls on public.profiles;
create trigger enforce_profiles_field_rls
  before update on public.profiles
  for each row execute function public.enforce_profiles_field_rls();

-- === aliada_profiles ===
alter table public.aliada_profiles enable row level security;

create policy "aliada_profiles_select" on public.aliada_profiles for select
  using (public.is_admin_or_ops() or user_id = auth.uid());
create policy "aliada_profiles_insert" on public.aliada_profiles for insert
  with check (public.is_admin_or_ops() or user_id = auth.uid());
create policy "aliada_profiles_update" on public.aliada_profiles for update
  using (public.is_admin_or_ops() or user_id = auth.uid())
  with check (public.is_admin_or_ops() or user_id = auth.uid());
create policy "aliada_profiles_delete" on public.aliada_profiles for delete
  using (public.is_admin_or_ops());

-- === clienta_profiles ===
alter table public.clienta_profiles enable row level security;

create policy "clienta_profiles_select" on public.clienta_profiles for select
  using (public.is_admin_or_ops() or user_id = auth.uid());
create policy "clienta_profiles_insert" on public.clienta_profiles for insert
  with check (public.is_admin_or_ops() or user_id = auth.uid());
create policy "clienta_profiles_update" on public.clienta_profiles for update
  using (public.is_admin_or_ops() or user_id = auth.uid())
  with check (public.is_admin_or_ops() or user_id = auth.uid());
create policy "clienta_profiles_delete" on public.clienta_profiles for delete
  using (public.is_admin_or_ops());

-- === generations ===
alter table public.generations enable row level security;

create policy "generations_select" on public.generations for select
  using (public.is_admin_or_ops() or public.current_app_role() = 'contenidos' or status in ('open', 'closed'));
create policy "generations_insert" on public.generations for insert with check (public.is_admin_or_ops());
create policy "generations_update" on public.generations for update using (public.is_admin_or_ops()) with check (public.is_admin_or_ops());
create policy "generations_delete" on public.generations for delete using (public.is_admin_or_ops());

-- === intensity_guides (público) ===
alter table public.intensity_guides enable row level security;

create policy "intensity_guides_select" on public.intensity_guides for select using (true);
create policy "intensity_guides_insert" on public.intensity_guides for insert with check (public.current_app_role() = 'superadmin');
create policy "intensity_guides_update" on public.intensity_guides for update using (public.current_app_role() = 'superadmin') with check (public.current_app_role() = 'superadmin');
create policy "intensity_guides_delete" on public.intensity_guides for delete using (public.current_app_role() = 'superadmin');

-- === program_days ===
alter table public.program_days enable row level security;

create policy "program_days_select" on public.program_days for select
  using (public.current_app_role() in ('superadmin', 'contenidos', 'operaciones') or publish_status = 'published');
create policy "program_days_insert" on public.program_days for insert
  with check (public.current_app_role() in ('superadmin', 'contenidos', 'operaciones'));
create policy "program_days_update" on public.program_days for update
  using (public.current_app_role() in ('superadmin', 'contenidos', 'operaciones'))
  with check (public.current_app_role() in ('superadmin', 'contenidos', 'operaciones'));
create policy "program_days_delete" on public.program_days for delete
  using (public.current_app_role() in ('superadmin', 'contenidos'));

-- === enrollments ===
alter table public.enrollments enable row level security;

create policy "enrollments_select" on public.enrollments for select
  using (public.is_admin_or_ops() or clienta_id = auth.uid());
create policy "enrollments_insert" on public.enrollments for insert with check (public.is_admin_or_ops());
create policy "enrollments_update" on public.enrollments for update using (public.is_admin_or_ops()) with check (public.is_admin_or_ops());
create policy "enrollments_delete" on public.enrollments for delete using (public.is_admin_or_ops());

-- === weekly_cycles ===
alter table public.weekly_cycles enable row level security;

create policy "weekly_cycles_select" on public.weekly_cycles for select
  using (public.is_admin_or_ops() or public.current_app_role() = 'aliada' or clienta_id = auth.uid());
create policy "weekly_cycles_insert" on public.weekly_cycles for insert with check (public.is_admin_or_ops());
create policy "weekly_cycles_update" on public.weekly_cycles for update using (public.is_admin_or_ops()) with check (public.is_admin_or_ops());
create policy "weekly_cycles_delete" on public.weekly_cycles for delete using (public.current_app_role() = 'superadmin');

-- === sales ===
alter table public.sales enable row level security;

create policy "sales_select" on public.sales for select
  using (public.is_admin_or_ops() or created_by_id = auth.uid());
create policy "sales_insert" on public.sales for insert
  with check (public.is_admin_or_ops() or public.current_app_role() = 'aliada');
create policy "sales_update" on public.sales for update
  using (public.is_admin_or_ops() or created_by_id = auth.uid())
  with check (public.is_admin_or_ops() or created_by_id = auth.uid());
create policy "sales_delete" on public.sales for delete using (public.current_app_role() = 'superadmin');

-- === daily_checkins ===
alter table public.daily_checkins enable row level security;

create policy "daily_checkins_select" on public.daily_checkins for select
  using (clienta_id = auth.uid() or public.is_admin_or_ops());
create policy "daily_checkins_insert" on public.daily_checkins for insert
  with check (public.current_app_role() = 'clienta' or public.is_admin_or_ops());
create policy "daily_checkins_update" on public.daily_checkins for update
  using (clienta_id = auth.uid() or public.is_admin_or_ops())
  with check (clienta_id = auth.uid() or public.is_admin_or_ops());
create policy "daily_checkins_delete" on public.daily_checkins for delete using (public.is_admin_or_ops());

-- === video_progress ===
alter table public.video_progress enable row level security;

create policy "video_progress_select" on public.video_progress for select
  using (clienta_id = auth.uid() or public.is_admin_or_ops());
create policy "video_progress_insert" on public.video_progress for insert
  with check (public.current_app_role() = 'clienta' or public.is_admin_or_ops());
create policy "video_progress_update" on public.video_progress for update
  using (clienta_id = auth.uid() or public.is_admin_or_ops())
  with check (clienta_id = auth.uid() or public.is_admin_or_ops());
create policy "video_progress_delete" on public.video_progress for delete using (public.is_admin_or_ops());

-- === weekly_metrics ===
alter table public.weekly_metrics enable row level security;

create policy "weekly_metrics_select" on public.weekly_metrics for select
  using (clienta_id = auth.uid() or public.is_admin_or_ops());
create policy "weekly_metrics_insert" on public.weekly_metrics for insert
  with check (public.current_app_role() = 'clienta' or public.is_admin_or_ops());
create policy "weekly_metrics_update" on public.weekly_metrics for update
  using (clienta_id = auth.uid() or public.is_admin_or_ops())
  with check (clienta_id = auth.uid() or public.is_admin_or_ops());
create policy "weekly_metrics_delete" on public.weekly_metrics for delete using (public.is_admin_or_ops());

-- === safety_screenings ===
alter table public.safety_screenings enable row level security;

create policy "safety_screenings_select" on public.safety_screenings for select
  using (public.is_admin_or_ops() or clienta_id = auth.uid());
create policy "safety_screenings_insert" on public.safety_screenings for insert
  with check (public.current_app_role() = 'clienta' or public.is_admin_or_ops());
create policy "safety_screenings_update" on public.safety_screenings for update
  using (public.is_admin_or_ops()) with check (public.is_admin_or_ops());
create policy "safety_screenings_delete" on public.safety_screenings for delete
  using (public.current_app_role() = 'superadmin');

-- === inventory ===
alter table public.inventory enable row level security;

create policy "inventory_select" on public.inventory for select
  using (public.is_admin_or_ops() or public.current_app_role() = 'aliada');
create policy "inventory_insert" on public.inventory for insert with check (public.is_admin_or_ops());
create policy "inventory_update" on public.inventory for update using (public.is_admin_or_ops()) with check (public.is_admin_or_ops());
create policy "inventory_delete" on public.inventory for delete using (public.current_app_role() = 'superadmin');

-- === inventory_movements ===
alter table public.inventory_movements enable row level security;

create policy "inventory_movements_select" on public.inventory_movements for select
  using (public.is_admin_or_ops() or created_by_id = auth.uid() or aliada_id = public.current_aliada_id());
create policy "inventory_movements_insert" on public.inventory_movements for insert with check (public.is_admin_or_ops());
create policy "inventory_movements_update" on public.inventory_movements for update using (public.is_admin_or_ops()) with check (public.is_admin_or_ops());
create policy "inventory_movements_delete" on public.inventory_movements for delete using (public.current_app_role() = 'superadmin');

-- === alerts ===
alter table public.alerts enable row level security;

create policy "alerts_select" on public.alerts for select
  using (public.is_admin_or_ops() or clienta_id = auth.uid());
create policy "alerts_insert" on public.alerts for insert with check (public.is_admin_or_ops());
create policy "alerts_update" on public.alerts for update using (public.is_admin_or_ops()) with check (public.is_admin_or_ops());
create policy "alerts_delete" on public.alerts for delete using (public.is_admin_or_ops());

-- === audit_logs ===
alter table public.audit_logs enable row level security;

create policy "audit_logs_select" on public.audit_logs for select using (public.is_admin_or_ops());
create policy "audit_logs_insert" on public.audit_logs for insert with check (public.is_admin_or_ops());
create policy "audit_logs_update" on public.audit_logs for update using (public.current_app_role() = 'superadmin') with check (public.current_app_role() = 'superadmin');
create policy "audit_logs_delete" on public.audit_logs for delete using (public.current_app_role() = 'superadmin');

-- === correction_requests ===
alter table public.correction_requests enable row level security;

create policy "correction_requests_select" on public.correction_requests for select using (public.is_admin_or_ops());
create policy "correction_requests_insert" on public.correction_requests for insert with check (public.is_admin_or_ops());
create policy "correction_requests_update" on public.correction_requests for update using (public.is_admin_or_ops()) with check (public.is_admin_or_ops());
create policy "correction_requests_delete" on public.correction_requests for delete using (public.current_app_role() = 'superadmin');

-- === reassignment_requests ===
alter table public.reassignment_requests enable row level security;

create policy "reassignment_requests_select" on public.reassignment_requests for select using (public.is_admin_or_ops());
create policy "reassignment_requests_insert" on public.reassignment_requests for insert with check (public.is_admin_or_ops());
create policy "reassignment_requests_update" on public.reassignment_requests for update using (public.is_admin_or_ops()) with check (public.is_admin_or_ops());
create policy "reassignment_requests_delete" on public.reassignment_requests for delete using (public.current_app_role() = 'superadmin');

-- === leads (creación pública vía Edge Function con service role, no RLS de cliente) ===
alter table public.leads enable row level security;

create policy "leads_select" on public.leads for select using (public.is_admin_or_ops());
create policy "leads_insert" on public.leads for insert with check (public.is_admin_or_ops());
create policy "leads_update" on public.leads for update using (public.is_admin_or_ops()) with check (public.is_admin_or_ops());
create policy "leads_delete" on public.leads for delete using (public.is_admin_or_ops());

-- === prospects ===
alter table public.prospects enable row level security;

create policy "prospects_select" on public.prospects for select
  using (public.is_admin_or_ops() or created_by_id = auth.uid());
create policy "prospects_insert" on public.prospects for insert
  with check (public.current_app_role() = 'aliada' or public.is_admin_or_ops());
create policy "prospects_update" on public.prospects for update
  using (public.is_admin_or_ops() or created_by_id = auth.uid())
  with check (public.is_admin_or_ops() or created_by_id = auth.uid());
create policy "prospects_delete" on public.prospects for delete using (public.is_admin_or_ops());

-- === solicitud_aliada (creación pública vía Edge Function con service role) ===
alter table public.solicitud_aliada enable row level security;

create policy "solicitud_aliada_select" on public.solicitud_aliada for select using (public.is_admin_or_ops());
create policy "solicitud_aliada_insert" on public.solicitud_aliada for insert with check (public.is_admin_or_ops());
create policy "solicitud_aliada_update" on public.solicitud_aliada for update using (public.is_admin_or_ops()) with check (public.is_admin_or_ops());
create policy "solicitud_aliada_delete" on public.solicitud_aliada for delete using (public.current_app_role() = 'superadmin');

-- === sales_applicants (sin RLS declarada en el original; default admin-ops-only, ver 0002) ===
alter table public.sales_applicants enable row level security;

create policy "sales_applicants_select" on public.sales_applicants for select using (public.is_admin_or_ops());
create policy "sales_applicants_insert" on public.sales_applicants for insert with check (public.is_admin_or_ops());
create policy "sales_applicants_update" on public.sales_applicants for update using (public.is_admin_or_ops()) with check (public.is_admin_or_ops());
create policy "sales_applicants_delete" on public.sales_applicants for delete using (public.is_admin_or_ops());

-- === training_modules (público) ===
alter table public.training_modules enable row level security;

create policy "training_modules_select" on public.training_modules for select using (true);
create policy "training_modules_insert" on public.training_modules for insert
  with check (public.current_app_role() in ('superadmin', 'contenidos'));
create policy "training_modules_update" on public.training_modules for update
  using (public.current_app_role() in ('superadmin', 'contenidos'))
  with check (public.current_app_role() in ('superadmin', 'contenidos'));
create policy "training_modules_delete" on public.training_modules for delete
  using (public.current_app_role() = 'superadmin');

-- === training_progress ===
alter table public.training_progress enable row level security;

create policy "training_progress_select" on public.training_progress for select
  using (public.is_admin_or_ops() or user_id = auth.uid());
create policy "training_progress_insert" on public.training_progress for insert
  with check (public.is_admin_or_ops() or user_id = auth.uid());
create policy "training_progress_update" on public.training_progress for update
  using (public.is_admin_or_ops() or user_id = auth.uid())
  with check (public.is_admin_or_ops() or user_id = auth.uid());
create policy "training_progress_delete" on public.training_progress for delete using (public.current_app_role() = 'superadmin');

-- === training_exams (público) ===
alter table public.training_exams enable row level security;

create policy "training_exams_select" on public.training_exams for select using (true);
create policy "training_exams_insert" on public.training_exams for insert with check (public.current_app_role() = 'superadmin');
create policy "training_exams_update" on public.training_exams for update using (public.current_app_role() = 'superadmin') with check (public.current_app_role() = 'superadmin');
create policy "training_exams_delete" on public.training_exams for delete using (public.current_app_role() = 'superadmin');

-- === training_exam_attempts ===
alter table public.training_exam_attempts enable row level security;

create policy "training_exam_attempts_select" on public.training_exam_attempts for select
  using (public.is_admin_or_ops() or user_id = auth.uid());
create policy "training_exam_attempts_insert" on public.training_exam_attempts for insert
  with check (public.current_app_role() = 'aliada' or public.is_admin_or_ops());
create policy "training_exam_attempts_update" on public.training_exam_attempts for update
  using (public.is_admin_or_ops()) with check (public.is_admin_or_ops());
create policy "training_exam_attempts_delete" on public.training_exam_attempts for delete using (public.current_app_role() = 'superadmin');

-- === app_settings (público) ===
alter table public.app_settings enable row level security;

create policy "app_settings_select" on public.app_settings for select using (true);
create policy "app_settings_insert" on public.app_settings for insert with check (public.current_app_role() = 'superadmin');
create policy "app_settings_update" on public.app_settings for update using (public.current_app_role() = 'superadmin') with check (public.current_app_role() = 'superadmin');
create policy "app_settings_delete" on public.app_settings for delete using (public.current_app_role() = 'superadmin');

-- === test_control ===
alter table public.test_control enable row level security;

create policy "test_control_select" on public.test_control for select
  using (public.is_admin_or_ops() or user_id = auth.uid());
create policy "test_control_insert" on public.test_control for insert with check (public.is_admin_or_ops());
create policy "test_control_update" on public.test_control for update using (public.is_admin_or_ops()) with check (public.is_admin_or_ops());
create policy "test_control_delete" on public.test_control for delete using (public.current_app_role() = 'superadmin');
