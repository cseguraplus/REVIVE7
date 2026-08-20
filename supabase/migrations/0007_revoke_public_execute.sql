-- Postgres otorga EXECUTE a PUBLIC (pseudo-rol que anon/authenticated heredan
-- implícitamente) al crear una función, sin importar los GRANT/REVOKE
-- explícitos a roles nombrados. El REVOKE ... FROM anon de 0006 no alcanzaba
-- por eso — el advisor de seguridad lo confirmó tras aplicar 0006. Se revoca
-- de PUBLIC y se re-otorga explícito solo a authenticated (las políticas RLS
-- lo necesitan para usuarios logueados).

revoke execute on function public.current_app_role() from public;
revoke execute on function public.current_aliada_id() from public;

grant execute on function public.current_app_role() to authenticated;
grant execute on function public.current_aliada_id() to authenticated;
