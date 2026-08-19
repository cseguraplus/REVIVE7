import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Registra la aceptación de lineamientos por la aliada.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const profiles = await base44.asServiceRole.entities.AliadaProfile.filter({ user_id: user.id });
    if (!profiles || !profiles[0]) return Response.json({ error: 'Perfil de aliada no encontrado' }, { status: 404 });

    const now = new Date().toISOString();
    await base44.asServiceRole.entities.AliadaProfile.update(profiles[0].id, { guidelines_accepted_at: now });

    return Response.json({ ok: true, guidelines_accepted_at: now });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});