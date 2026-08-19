import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Marca un módulo de capacitación como completado (aliada o admin).
// Avanza AliadaProfile.training_status a in_progress.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { module_key } = body;
    if (!module_key) return Response.json({ error: 'module_key obligatorio' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.TrainingProgress.filter({ user_id: user.id, module_key });
    const now = new Date().toISOString();
    if (existing && existing[0]) {
      await base44.asServiceRole.entities.TrainingProgress.update(existing[0].id, { status: 'completed', completed_at: now });
    } else {
      await base44.asServiceRole.entities.TrainingProgress.create({ user_id: user.id, module_key, status: 'completed', completed_at: now });
    }

    const profiles = await base44.asServiceRole.entities.AliadaProfile.filter({ user_id: user.id });
    if (profiles && profiles[0] && profiles[0].training_status === 'not_started') {
      await base44.asServiceRole.entities.AliadaProfile.update(profiles[0].id, { training_status: 'in_progress' });
    }

    return Response.json({ ok: true, module_key, completed_at: now });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});