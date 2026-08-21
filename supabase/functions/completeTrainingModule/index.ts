import { requireRole, serviceClient } from '../_shared/auth.ts';

// Marca un módulo de capacitación como completado (aliada o admin).
// Avanza aliada_profiles.training_status a in_progress.
Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['aliada', 'superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { module_key } = body;
    if (!module_key) return Response.json({ error: 'module_key obligatorio' }, { status: 400 });

    const { data: existing } = await svc.from('training_progress').select('*').eq('user_id', auth.user.id).eq('module_key', module_key);
    const now = new Date().toISOString();
    if (existing && existing[0]) {
      await svc.from('training_progress').update({ status: 'completed', completed_at: now }).eq('id', existing[0].id);
    } else {
      await svc.from('training_progress').insert({ user_id: auth.user.id, module_key, status: 'completed', completed_at: now });
    }

    const { data: profiles } = await svc.from('aliada_profiles').select('*').eq('user_id', auth.user.id);
    if (profiles && profiles[0] && profiles[0].training_status === 'not_started') {
      await svc.from('aliada_profiles').update({ training_status: 'in_progress' }).eq('id', profiles[0].id);
    }

    return Response.json({ ok: true, module_key, completed_at: now });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
