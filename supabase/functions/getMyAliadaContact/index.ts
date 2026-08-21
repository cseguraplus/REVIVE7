import { requireRole, serviceClient } from '../_shared/auth.ts';

// Devuelve solo el nombre público y WhatsApp de la Aliada asignada a la
// clienta que hace la petición. aliada_profiles.select en RLS quedó
// restringido a admin/operaciones o la propia aliada (Fase 2 / 0004_rls.sql),
// así que la clienta no puede leer ese registro directamente — esta función
// hace ese único lookup necesario con el rol de servicio, sin exponer el
// resto de aliada_profiles ni el listado completo.
Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['clienta', 'superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const { data: profile } = await svc.from('clienta_profiles').select('*').eq('user_id', auth.user.id).maybeSingle();
    if (!profile || !profile.aliada_id) {
      return Response.json({ aliada: null });
    }

    const { data: aliada } = await svc.from('aliada_profiles').select('*').eq('id', profile.aliada_id).maybeSingle();
    if (!aliada) return Response.json({ aliada: null });

    return Response.json({
      aliada: { public_name: aliada.public_name || null, whatsapp: aliada.whatsapp || null },
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
