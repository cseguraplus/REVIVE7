-- Fase Supabase 5/5: índices sobre columnas usadas en los .filter()/.get() que
-- ya existían en el código de las funciones backend (base44/functions/*/entry.ts).
-- Sin esto, cada get{Aliada,Clienta}Data/generateDailyAlerts hace table scans.

create index if not exists idx_aliada_profiles_user_id on public.aliada_profiles(user_id);
create index if not exists idx_aliada_profiles_aliada_code on public.aliada_profiles(aliada_code);
create index if not exists idx_aliada_profiles_status on public.aliada_profiles(status);

create index if not exists idx_clienta_profiles_user_id on public.clienta_profiles(user_id);
create index if not exists idx_clienta_profiles_aliada_id on public.clienta_profiles(aliada_id);
create index if not exists idx_clienta_profiles_status on public.clienta_profiles(status);

create index if not exists idx_enrollments_clienta_id on public.enrollments(clienta_id);
create index if not exists idx_enrollments_aliada_id on public.enrollments(aliada_id);
create index if not exists idx_enrollments_generation_id on public.enrollments(generation_id);
create index if not exists idx_enrollments_status on public.enrollments(status);

create index if not exists idx_weekly_cycles_journey_id on public.weekly_cycles(journey_id);
create index if not exists idx_weekly_cycles_clienta_id on public.weekly_cycles(clienta_id);

create index if not exists idx_sales_clienta_id on public.sales(clienta_id);
create index if not exists idx_sales_aliada_id on public.sales(aliada_id);
create index if not exists idx_sales_created_by_id on public.sales(created_by_id);
create index if not exists idx_sales_payment_status on public.sales(payment_status);

create index if not exists idx_daily_checkins_clienta_id on public.daily_checkins(clienta_id);
create index if not exists idx_daily_checkins_program_day_id on public.daily_checkins(program_day_id);

create index if not exists idx_video_progress_clienta_id on public.video_progress(clienta_id);
create index if not exists idx_video_progress_program_day_id on public.video_progress(program_day_id);

create index if not exists idx_weekly_metrics_clienta_id on public.weekly_metrics(clienta_id);
create index if not exists idx_safety_screenings_clienta_id on public.safety_screenings(clienta_id);

create index if not exists idx_inventory_movements_aliada_id on public.inventory_movements(aliada_id);
create index if not exists idx_inventory_movements_related_sale_id on public.inventory_movements(related_sale_id);

create index if not exists idx_alerts_clienta_id on public.alerts(clienta_id);
create index if not exists idx_alerts_aliada_id on public.alerts(aliada_id);
create index if not exists idx_alerts_status on public.alerts(status);

create index if not exists idx_prospects_aliada_id on public.prospects(aliada_id);
create index if not exists idx_prospects_created_by_id on public.prospects(created_by_id);

create index if not exists idx_leads_assigned_aliada_id on public.leads(assigned_aliada_id);
create index if not exists idx_leads_email on public.leads(email);
create index if not exists idx_leads_phone on public.leads(phone);

create index if not exists idx_training_progress_user_id on public.training_progress(user_id);
create index if not exists idx_training_exam_attempts_user_id on public.training_exam_attempts(user_id);

create index if not exists idx_program_days_day_number on public.program_days(day_number);
create index if not exists idx_program_days_publish_status on public.program_days(publish_status);
