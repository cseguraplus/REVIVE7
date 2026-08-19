import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Cambia el estado del perfil de aliada: suspended | active | inactive.
// También sincroniza User.account_status para active/suspended.
const ALLOWED = ['suspended', 'active', 'inactive'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { profile_id, status, reason } = body;
    if (!profile_id) return Response.json({ error: 'profile_id obligatorio' }, { status: 400 });
    if (!ALLOWED.includes(status)) return Response.json({ error: 'status inválido' }, { status: 400 });
    if (status === 'suspended' && (!reason || !String(reason).trim())) return Response.json({ error: 'Motivo obligatorio para suspender' }, { status: 400 });

    const profile = await base44.asServiceRole.entities.AliadaProfile.get(profile_id);
    if (!profile) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

    const oldValue = { status: profile.status };
    await base44.asServiceRole.entities.AliadaProfile.update(profile_id, { status });

    if (profile.user_id) {
      try {
        const accountStatus = status === 'active' ? 'active' : status === 'suspended' ? 'suspended' : 'inactive';
        await base44.asServiceRole.entities.User.update(profile.user_id, { account_status: accountStatus });
      } catch (e) { /* best-effort */ }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id, action: 'set_aliada_profile_status',
      entity_type: 'AliadaProfile', entity_id: profile_id,
      old_value_json: JSON.stringify(oldValue),
      new_value_json: JSON.stringify({ status }),
      reason: reason || `Cambio a ${status}`, timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, profile_id, status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});