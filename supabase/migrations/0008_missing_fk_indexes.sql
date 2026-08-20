-- Cierra el hallazgo "unindexed_foreign_keys" del advisor de performance:
-- 25 foreign keys que no tenían índice de cobertura (0005_indexes.sql cubrió
-- las columnas que el código ya usaba en .filter(), pero se quedaron fuera
-- varias FK que no tenían un caller directo hoy pero sí importan para joins).

create index if not exists idx_app_settings_active_generation_id on public.app_settings(active_generation_id);
create index if not exists idx_audit_logs_actor_user_id on public.audit_logs(actor_user_id);
create index if not exists idx_correction_requests_requested_by on public.correction_requests(requested_by);
create index if not exists idx_correction_requests_resolved_by on public.correction_requests(resolved_by);
create index if not exists idx_daily_checkins_enrollment_id on public.daily_checkins(enrollment_id);
create index if not exists idx_inventory_movements_created_by_id on public.inventory_movements(created_by_id);
create index if not exists idx_inventory_movements_related_weekly_cycle_id on public.inventory_movements(related_weekly_cycle_id);
create index if not exists idx_reassignment_requests_clienta_id on public.reassignment_requests(clienta_id);
create index if not exists idx_reassignment_requests_from_aliada_id on public.reassignment_requests(from_aliada_id);
create index if not exists idx_reassignment_requests_requested_by on public.reassignment_requests(requested_by);
create index if not exists idx_reassignment_requests_resolved_by on public.reassignment_requests(resolved_by);
create index if not exists idx_reassignment_requests_to_aliada_id on public.reassignment_requests(to_aliada_id);
create index if not exists idx_safety_screenings_alert_id on public.safety_screenings(alert_id);
create index if not exists idx_safety_screenings_journey_id on public.safety_screenings(journey_id);
create index if not exists idx_safety_screenings_reviewed_by on public.safety_screenings(reviewed_by);
create index if not exists idx_sales_enrollment_id on public.sales(enrollment_id);
create index if not exists idx_sales_generation_id on public.sales(generation_id);
create index if not exists idx_sales_related_movement_id on public.sales(related_movement_id);
create index if not exists idx_sales_reversal_movement_id on public.sales(reversal_movement_id);
create index if not exists idx_sales_weekly_cycle_id on public.sales(weekly_cycle_id);
create index if not exists idx_test_control_updated_by on public.test_control(updated_by);
create index if not exists idx_training_exam_attempts_exam_id on public.training_exam_attempts(exam_id);
create index if not exists idx_video_progress_enrollment_id on public.video_progress(enrollment_id);
create index if not exists idx_weekly_cycles_sale_id on public.weekly_cycles(sale_id);
create index if not exists idx_weekly_metrics_enrollment_id on public.weekly_metrics(enrollment_id);
