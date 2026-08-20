-- Cierra el hallazgo 'auth_rls_initplan' del advisor de performance: las
-- politicas llamaban a auth.uid()/funciones helper sin envolver en (select ...),
-- lo que fuerza a Postgres a re-evaluarlas fila por fila en vez de una vez
-- por consulta (initplan). Se recrean todas las politicas con el patron
-- recomendado: (select auth.uid()), (select public.is_admin_or_ops()), etc.

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select
  using ((select public.is_admin_or_ops()) or id = (select auth.uid()));

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles for update
  using ((select public.is_admin_or_ops()) or id = (select auth.uid()))
  with check ((select public.is_admin_or_ops()) or id = (select auth.uid()));

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles for delete
  using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "aliada_profiles_select" on public.aliada_profiles;
create policy "aliada_profiles_select" on public.aliada_profiles for select
  using ((select public.is_admin_or_ops()) or user_id = (select auth.uid()));

drop policy if exists "aliada_profiles_insert" on public.aliada_profiles;
create policy "aliada_profiles_insert" on public.aliada_profiles for insert
  with check ((select public.is_admin_or_ops()) or user_id = (select auth.uid()));

drop policy if exists "aliada_profiles_update" on public.aliada_profiles;
create policy "aliada_profiles_update" on public.aliada_profiles for update
  using ((select public.is_admin_or_ops()) or user_id = (select auth.uid()))
  with check ((select public.is_admin_or_ops()) or user_id = (select auth.uid()));

drop policy if exists "aliada_profiles_delete" on public.aliada_profiles;
create policy "aliada_profiles_delete" on public.aliada_profiles for delete
  using ((select public.is_admin_or_ops()));

drop policy if exists "clienta_profiles_select" on public.clienta_profiles;
create policy "clienta_profiles_select" on public.clienta_profiles for select
  using ((select public.is_admin_or_ops()) or user_id = (select auth.uid()));

drop policy if exists "clienta_profiles_insert" on public.clienta_profiles;
create policy "clienta_profiles_insert" on public.clienta_profiles for insert
  with check ((select public.is_admin_or_ops()) or user_id = (select auth.uid()));

drop policy if exists "clienta_profiles_update" on public.clienta_profiles;
create policy "clienta_profiles_update" on public.clienta_profiles for update
  using ((select public.is_admin_or_ops()) or user_id = (select auth.uid()))
  with check ((select public.is_admin_or_ops()) or user_id = (select auth.uid()));

drop policy if exists "clienta_profiles_delete" on public.clienta_profiles;
create policy "clienta_profiles_delete" on public.clienta_profiles for delete
  using ((select public.is_admin_or_ops()));

drop policy if exists "generations_select" on public.generations;
create policy "generations_select" on public.generations for select
  using ((select public.is_admin_or_ops()) or (select public.current_app_role()) = 'contenidos' or status in ('open', 'closed'));

drop policy if exists "generations_insert" on public.generations;
create policy "generations_insert" on public.generations for insert with check ((select public.is_admin_or_ops()));

drop policy if exists "generations_update" on public.generations;
create policy "generations_update" on public.generations for update using ((select public.is_admin_or_ops())) with check ((select public.is_admin_or_ops()));

drop policy if exists "generations_delete" on public.generations;
create policy "generations_delete" on public.generations for delete using ((select public.is_admin_or_ops()));

drop policy if exists "intensity_guides_select" on public.intensity_guides;
create policy "intensity_guides_select" on public.intensity_guides for select using (true);

drop policy if exists "intensity_guides_insert" on public.intensity_guides;
create policy "intensity_guides_insert" on public.intensity_guides for insert with check ((select public.current_app_role()) = 'superadmin');

drop policy if exists "intensity_guides_update" on public.intensity_guides;
create policy "intensity_guides_update" on public.intensity_guides for update using ((select public.current_app_role()) = 'superadmin') with check ((select public.current_app_role()) = 'superadmin');

drop policy if exists "intensity_guides_delete" on public.intensity_guides;
create policy "intensity_guides_delete" on public.intensity_guides for delete using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "program_days_select" on public.program_days;
create policy "program_days_select" on public.program_days for select
  using ((select public.current_app_role()) in ('superadmin', 'contenidos', 'operaciones') or publish_status = 'published');

drop policy if exists "program_days_insert" on public.program_days;
create policy "program_days_insert" on public.program_days for insert
  with check ((select public.current_app_role()) in ('superadmin', 'contenidos', 'operaciones'));

drop policy if exists "program_days_update" on public.program_days;
create policy "program_days_update" on public.program_days for update
  using ((select public.current_app_role()) in ('superadmin', 'contenidos', 'operaciones'))
  with check ((select public.current_app_role()) in ('superadmin', 'contenidos', 'operaciones'));

drop policy if exists "program_days_delete" on public.program_days;
create policy "program_days_delete" on public.program_days for delete
  using ((select public.current_app_role()) in ('superadmin', 'contenidos'));

drop policy if exists "enrollments_select" on public.enrollments;
create policy "enrollments_select" on public.enrollments for select
  using ((select public.is_admin_or_ops()) or clienta_id = (select auth.uid()));

drop policy if exists "enrollments_insert" on public.enrollments;
create policy "enrollments_insert" on public.enrollments for insert with check ((select public.is_admin_or_ops()));

drop policy if exists "enrollments_update" on public.enrollments;
create policy "enrollments_update" on public.enrollments for update using ((select public.is_admin_or_ops())) with check ((select public.is_admin_or_ops()));

drop policy if exists "enrollments_delete" on public.enrollments;
create policy "enrollments_delete" on public.enrollments for delete using ((select public.is_admin_or_ops()));

drop policy if exists "weekly_cycles_select" on public.weekly_cycles;
create policy "weekly_cycles_select" on public.weekly_cycles for select
  using ((select public.is_admin_or_ops()) or (select public.current_app_role()) = 'aliada' or clienta_id = (select auth.uid()));

drop policy if exists "weekly_cycles_insert" on public.weekly_cycles;
create policy "weekly_cycles_insert" on public.weekly_cycles for insert with check ((select public.is_admin_or_ops()));

drop policy if exists "weekly_cycles_update" on public.weekly_cycles;
create policy "weekly_cycles_update" on public.weekly_cycles for update using ((select public.is_admin_or_ops())) with check ((select public.is_admin_or_ops()));

drop policy if exists "weekly_cycles_delete" on public.weekly_cycles;
create policy "weekly_cycles_delete" on public.weekly_cycles for delete using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "sales_select" on public.sales;
create policy "sales_select" on public.sales for select
  using ((select public.is_admin_or_ops()) or created_by_id = (select auth.uid()));

drop policy if exists "sales_insert" on public.sales;
create policy "sales_insert" on public.sales for insert
  with check ((select public.is_admin_or_ops()) or (select public.current_app_role()) = 'aliada');

drop policy if exists "sales_update" on public.sales;
create policy "sales_update" on public.sales for update
  using ((select public.is_admin_or_ops()) or created_by_id = (select auth.uid()))
  with check ((select public.is_admin_or_ops()) or created_by_id = (select auth.uid()));

drop policy if exists "sales_delete" on public.sales;
create policy "sales_delete" on public.sales for delete using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "daily_checkins_select" on public.daily_checkins;
create policy "daily_checkins_select" on public.daily_checkins for select
  using (clienta_id = (select auth.uid()) or (select public.is_admin_or_ops()));

drop policy if exists "daily_checkins_insert" on public.daily_checkins;
create policy "daily_checkins_insert" on public.daily_checkins for insert
  with check ((select public.current_app_role()) = 'clienta' or (select public.is_admin_or_ops()));

drop policy if exists "daily_checkins_update" on public.daily_checkins;
create policy "daily_checkins_update" on public.daily_checkins for update
  using (clienta_id = (select auth.uid()) or (select public.is_admin_or_ops()))
  with check (clienta_id = (select auth.uid()) or (select public.is_admin_or_ops()));

drop policy if exists "daily_checkins_delete" on public.daily_checkins;
create policy "daily_checkins_delete" on public.daily_checkins for delete using ((select public.is_admin_or_ops()));

drop policy if exists "video_progress_select" on public.video_progress;
create policy "video_progress_select" on public.video_progress for select
  using (clienta_id = (select auth.uid()) or (select public.is_admin_or_ops()));

drop policy if exists "video_progress_insert" on public.video_progress;
create policy "video_progress_insert" on public.video_progress for insert
  with check ((select public.current_app_role()) = 'clienta' or (select public.is_admin_or_ops()));

drop policy if exists "video_progress_update" on public.video_progress;
create policy "video_progress_update" on public.video_progress for update
  using (clienta_id = (select auth.uid()) or (select public.is_admin_or_ops()))
  with check (clienta_id = (select auth.uid()) or (select public.is_admin_or_ops()));

drop policy if exists "video_progress_delete" on public.video_progress;
create policy "video_progress_delete" on public.video_progress for delete using ((select public.is_admin_or_ops()));

drop policy if exists "weekly_metrics_select" on public.weekly_metrics;
create policy "weekly_metrics_select" on public.weekly_metrics for select
  using (clienta_id = (select auth.uid()) or (select public.is_admin_or_ops()));

drop policy if exists "weekly_metrics_insert" on public.weekly_metrics;
create policy "weekly_metrics_insert" on public.weekly_metrics for insert
  with check ((select public.current_app_role()) = 'clienta' or (select public.is_admin_or_ops()));

drop policy if exists "weekly_metrics_update" on public.weekly_metrics;
create policy "weekly_metrics_update" on public.weekly_metrics for update
  using (clienta_id = (select auth.uid()) or (select public.is_admin_or_ops()))
  with check (clienta_id = (select auth.uid()) or (select public.is_admin_or_ops()));

drop policy if exists "weekly_metrics_delete" on public.weekly_metrics;
create policy "weekly_metrics_delete" on public.weekly_metrics for delete using ((select public.is_admin_or_ops()));

drop policy if exists "safety_screenings_select" on public.safety_screenings;
create policy "safety_screenings_select" on public.safety_screenings for select
  using ((select public.is_admin_or_ops()) or clienta_id = (select auth.uid()));

drop policy if exists "safety_screenings_insert" on public.safety_screenings;
create policy "safety_screenings_insert" on public.safety_screenings for insert
  with check ((select public.current_app_role()) = 'clienta' or (select public.is_admin_or_ops()));

drop policy if exists "safety_screenings_update" on public.safety_screenings;
create policy "safety_screenings_update" on public.safety_screenings for update
  using ((select public.is_admin_or_ops())) with check ((select public.is_admin_or_ops()));

drop policy if exists "safety_screenings_delete" on public.safety_screenings;
create policy "safety_screenings_delete" on public.safety_screenings for delete
  using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "inventory_select" on public.inventory;
create policy "inventory_select" on public.inventory for select
  using ((select public.is_admin_or_ops()) or (select public.current_app_role()) = 'aliada');

drop policy if exists "inventory_insert" on public.inventory;
create policy "inventory_insert" on public.inventory for insert with check ((select public.is_admin_or_ops()));

drop policy if exists "inventory_update" on public.inventory;
create policy "inventory_update" on public.inventory for update using ((select public.is_admin_or_ops())) with check ((select public.is_admin_or_ops()));

drop policy if exists "inventory_delete" on public.inventory;
create policy "inventory_delete" on public.inventory for delete using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "inventory_movements_select" on public.inventory_movements;
create policy "inventory_movements_select" on public.inventory_movements for select
  using ((select public.is_admin_or_ops()) or created_by_id = (select auth.uid()) or aliada_id = (select public.current_aliada_id()));

drop policy if exists "inventory_movements_insert" on public.inventory_movements;
create policy "inventory_movements_insert" on public.inventory_movements for insert with check ((select public.is_admin_or_ops()));

drop policy if exists "inventory_movements_update" on public.inventory_movements;
create policy "inventory_movements_update" on public.inventory_movements for update using ((select public.is_admin_or_ops())) with check ((select public.is_admin_or_ops()));

drop policy if exists "inventory_movements_delete" on public.inventory_movements;
create policy "inventory_movements_delete" on public.inventory_movements for delete using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "alerts_select" on public.alerts;
create policy "alerts_select" on public.alerts for select
  using ((select public.is_admin_or_ops()) or clienta_id = (select auth.uid()));

drop policy if exists "alerts_insert" on public.alerts;
create policy "alerts_insert" on public.alerts for insert with check ((select public.is_admin_or_ops()));

drop policy if exists "alerts_update" on public.alerts;
create policy "alerts_update" on public.alerts for update using ((select public.is_admin_or_ops())) with check ((select public.is_admin_or_ops()));

drop policy if exists "alerts_delete" on public.alerts;
create policy "alerts_delete" on public.alerts for delete using ((select public.is_admin_or_ops()));

drop policy if exists "audit_logs_select" on public.audit_logs;
create policy "audit_logs_select" on public.audit_logs for select using ((select public.is_admin_or_ops()));

drop policy if exists "audit_logs_insert" on public.audit_logs;
create policy "audit_logs_insert" on public.audit_logs for insert with check ((select public.is_admin_or_ops()));

drop policy if exists "audit_logs_update" on public.audit_logs;
create policy "audit_logs_update" on public.audit_logs for update using ((select public.current_app_role()) = 'superadmin') with check ((select public.current_app_role()) = 'superadmin');

drop policy if exists "audit_logs_delete" on public.audit_logs;
create policy "audit_logs_delete" on public.audit_logs for delete using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "correction_requests_select" on public.correction_requests;
create policy "correction_requests_select" on public.correction_requests for select using ((select public.is_admin_or_ops()));

drop policy if exists "correction_requests_insert" on public.correction_requests;
create policy "correction_requests_insert" on public.correction_requests for insert with check ((select public.is_admin_or_ops()));

drop policy if exists "correction_requests_update" on public.correction_requests;
create policy "correction_requests_update" on public.correction_requests for update using ((select public.is_admin_or_ops())) with check ((select public.is_admin_or_ops()));

drop policy if exists "correction_requests_delete" on public.correction_requests;
create policy "correction_requests_delete" on public.correction_requests for delete using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "reassignment_requests_select" on public.reassignment_requests;
create policy "reassignment_requests_select" on public.reassignment_requests for select using ((select public.is_admin_or_ops()));

drop policy if exists "reassignment_requests_insert" on public.reassignment_requests;
create policy "reassignment_requests_insert" on public.reassignment_requests for insert with check ((select public.is_admin_or_ops()));

drop policy if exists "reassignment_requests_update" on public.reassignment_requests;
create policy "reassignment_requests_update" on public.reassignment_requests for update using ((select public.is_admin_or_ops())) with check ((select public.is_admin_or_ops()));

drop policy if exists "reassignment_requests_delete" on public.reassignment_requests;
create policy "reassignment_requests_delete" on public.reassignment_requests for delete using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "leads_select" on public.leads;
create policy "leads_select" on public.leads for select using ((select public.is_admin_or_ops()));

drop policy if exists "leads_insert" on public.leads;
create policy "leads_insert" on public.leads for insert with check ((select public.is_admin_or_ops()));

drop policy if exists "leads_update" on public.leads;
create policy "leads_update" on public.leads for update using ((select public.is_admin_or_ops())) with check ((select public.is_admin_or_ops()));

drop policy if exists "leads_delete" on public.leads;
create policy "leads_delete" on public.leads for delete using ((select public.is_admin_or_ops()));

drop policy if exists "prospects_select" on public.prospects;
create policy "prospects_select" on public.prospects for select
  using ((select public.is_admin_or_ops()) or created_by_id = (select auth.uid()));

drop policy if exists "prospects_insert" on public.prospects;
create policy "prospects_insert" on public.prospects for insert
  with check ((select public.current_app_role()) = 'aliada' or (select public.is_admin_or_ops()));

drop policy if exists "prospects_update" on public.prospects;
create policy "prospects_update" on public.prospects for update
  using ((select public.is_admin_or_ops()) or created_by_id = (select auth.uid()))
  with check ((select public.is_admin_or_ops()) or created_by_id = (select auth.uid()));

drop policy if exists "prospects_delete" on public.prospects;
create policy "prospects_delete" on public.prospects for delete using ((select public.is_admin_or_ops()));

drop policy if exists "solicitud_aliada_select" on public.solicitud_aliada;
create policy "solicitud_aliada_select" on public.solicitud_aliada for select using ((select public.is_admin_or_ops()));

drop policy if exists "solicitud_aliada_insert" on public.solicitud_aliada;
create policy "solicitud_aliada_insert" on public.solicitud_aliada for insert with check ((select public.is_admin_or_ops()));

drop policy if exists "solicitud_aliada_update" on public.solicitud_aliada;
create policy "solicitud_aliada_update" on public.solicitud_aliada for update using ((select public.is_admin_or_ops())) with check ((select public.is_admin_or_ops()));

drop policy if exists "solicitud_aliada_delete" on public.solicitud_aliada;
create policy "solicitud_aliada_delete" on public.solicitud_aliada for delete using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "sales_applicants_select" on public.sales_applicants;
create policy "sales_applicants_select" on public.sales_applicants for select using ((select public.is_admin_or_ops()));

drop policy if exists "sales_applicants_insert" on public.sales_applicants;
create policy "sales_applicants_insert" on public.sales_applicants for insert with check ((select public.is_admin_or_ops()));

drop policy if exists "sales_applicants_update" on public.sales_applicants;
create policy "sales_applicants_update" on public.sales_applicants for update using ((select public.is_admin_or_ops())) with check ((select public.is_admin_or_ops()));

drop policy if exists "sales_applicants_delete" on public.sales_applicants;
create policy "sales_applicants_delete" on public.sales_applicants for delete using ((select public.is_admin_or_ops()));

drop policy if exists "training_modules_select" on public.training_modules;
create policy "training_modules_select" on public.training_modules for select using (true);

drop policy if exists "training_modules_insert" on public.training_modules;
create policy "training_modules_insert" on public.training_modules for insert
  with check ((select public.current_app_role()) in ('superadmin', 'contenidos'));

drop policy if exists "training_modules_update" on public.training_modules;
create policy "training_modules_update" on public.training_modules for update
  using ((select public.current_app_role()) in ('superadmin', 'contenidos'))
  with check ((select public.current_app_role()) in ('superadmin', 'contenidos'));

drop policy if exists "training_modules_delete" on public.training_modules;
create policy "training_modules_delete" on public.training_modules for delete
  using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "training_progress_select" on public.training_progress;
create policy "training_progress_select" on public.training_progress for select
  using ((select public.is_admin_or_ops()) or user_id = (select auth.uid()));

drop policy if exists "training_progress_insert" on public.training_progress;
create policy "training_progress_insert" on public.training_progress for insert
  with check ((select public.is_admin_or_ops()) or user_id = (select auth.uid()));

drop policy if exists "training_progress_update" on public.training_progress;
create policy "training_progress_update" on public.training_progress for update
  using ((select public.is_admin_or_ops()) or user_id = (select auth.uid()))
  with check ((select public.is_admin_or_ops()) or user_id = (select auth.uid()));

drop policy if exists "training_progress_delete" on public.training_progress;
create policy "training_progress_delete" on public.training_progress for delete using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "training_exams_select" on public.training_exams;
create policy "training_exams_select" on public.training_exams for select using (true);

drop policy if exists "training_exams_insert" on public.training_exams;
create policy "training_exams_insert" on public.training_exams for insert with check ((select public.current_app_role()) = 'superadmin');

drop policy if exists "training_exams_update" on public.training_exams;
create policy "training_exams_update" on public.training_exams for update using ((select public.current_app_role()) = 'superadmin') with check ((select public.current_app_role()) = 'superadmin');

drop policy if exists "training_exams_delete" on public.training_exams;
create policy "training_exams_delete" on public.training_exams for delete using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "training_exam_attempts_select" on public.training_exam_attempts;
create policy "training_exam_attempts_select" on public.training_exam_attempts for select
  using ((select public.is_admin_or_ops()) or user_id = (select auth.uid()));

drop policy if exists "training_exam_attempts_insert" on public.training_exam_attempts;
create policy "training_exam_attempts_insert" on public.training_exam_attempts for insert
  with check ((select public.current_app_role()) = 'aliada' or (select public.is_admin_or_ops()));

drop policy if exists "training_exam_attempts_update" on public.training_exam_attempts;
create policy "training_exam_attempts_update" on public.training_exam_attempts for update
  using ((select public.is_admin_or_ops())) with check ((select public.is_admin_or_ops()));

drop policy if exists "training_exam_attempts_delete" on public.training_exam_attempts;
create policy "training_exam_attempts_delete" on public.training_exam_attempts for delete using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "app_settings_select" on public.app_settings;
create policy "app_settings_select" on public.app_settings for select using (true);

drop policy if exists "app_settings_insert" on public.app_settings;
create policy "app_settings_insert" on public.app_settings for insert with check ((select public.current_app_role()) = 'superadmin');

drop policy if exists "app_settings_update" on public.app_settings;
create policy "app_settings_update" on public.app_settings for update using ((select public.current_app_role()) = 'superadmin') with check ((select public.current_app_role()) = 'superadmin');

drop policy if exists "app_settings_delete" on public.app_settings;
create policy "app_settings_delete" on public.app_settings for delete using ((select public.current_app_role()) = 'superadmin');

drop policy if exists "test_control_select" on public.test_control;
create policy "test_control_select" on public.test_control for select
  using ((select public.is_admin_or_ops()) or user_id = (select auth.uid()));

drop policy if exists "test_control_insert" on public.test_control;
create policy "test_control_insert" on public.test_control for insert with check ((select public.is_admin_or_ops()));

drop policy if exists "test_control_update" on public.test_control;
create policy "test_control_update" on public.test_control for update using ((select public.is_admin_or_ops())) with check ((select public.is_admin_or_ops()));

drop policy if exists "test_control_delete" on public.test_control;
create policy "test_control_delete" on public.test_control for delete using ((select public.current_app_role()) = 'superadmin');
