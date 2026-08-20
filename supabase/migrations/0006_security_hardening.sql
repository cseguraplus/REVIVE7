-- Fase Supabase 6/6 (hardening): cierra los hallazgos WARN del linter de
-- seguridad de Supabase tras aplicar 0001-0005. Ninguno era una fuga de
-- datos real, pero son buenas prácticas de defensa en profundidad.

-- 1) search_path mutable: pin a las 5 funciones a las que se me olvidó
-- ponérselo (current_app_role, current_aliada_id y handle_new_user ya lo
-- tenían desde su CREATE original).
alter function public.set_updated_at() set search_path = public;
alter function public.is_admin_or_ops() set search_path = public;
alter function public.enforce_profiles_field_rls() set search_path = public;
alter function public.enforce_daily_checkin_field_rls() set search_path = public;
alter function public.enforce_video_progress_field_rls() set search_path = public;

-- 2) handle_new_user solo la debe invocar el trigger on_auth_user_created
-- (que corre con los privilegios del dueño de la función por ser SECURITY
-- DEFINER, sin necesitar que el rol disparador tenga EXECUTE). No hay razón
-- para que quede expuesta como RPC pública en /rest/v1/rpc/handle_new_user.
revoke execute on function public.handle_new_user() from public, anon, authenticated;

-- 3) current_app_role()/current_aliada_id() sí las necesita el rol
-- "authenticated" (las políticas RLS las evalúan en su nombre), pero no hay
-- razón para que "anon" pueda invocarlas directo vía RPC.
revoke execute on function public.current_app_role() from anon;
revoke execute on function public.current_aliada_id() from anon;
