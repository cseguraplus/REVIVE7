import { requireRole, serviceClient } from '../_shared/auth.ts';

// Registra la aceptación de lineamientos por la aliada.
Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['aliada', 'superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const { data: profiles } = await svc.from('aliada_profiles').select('*').eq('user_id', auth.user.id);
    if (!profiles || !profiles[0]) return Response.json({ error: 'Perfil de aliada no encontrado' }, { status: 404 });

    const now = new Date().toISOString();
    await svc.from('aliada_profiles').update({ guidelines_accepted_at: now }).eq('id', profiles[0].id);

    return Response.json({ ok: true, guidelines_accepted_at: now });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
