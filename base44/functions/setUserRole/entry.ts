import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Changes a user's app_role. Superadmin only. The browser can never change roles
// (User.app_role has field-level RLS; this runs as service role with audit).
const ALLOWED_ROLES = ['clienta', 'aliada', 'operaciones', 'contenidos', 'superadmin'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin') return Response.json({ error: 'Forbidden — superadmin only' }, { status: 403 });

    const body = await req.json();
    const { user_id, app_role, reason } = body;
    if (!user_id) return Response.json({ error: 'user_id obligatorio' }, { status: 400 });
    if (!ALLOWED_ROLES.includes(app_role)) return Response.json({ error: 'app_role inválido' }, { status: 400 });

    let target = null;
    try { target = await base44.asServiceRole.entities.User.get(user_id); } catch (e) { /* not found */ }
    if (!target) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const oldValue = { app_role: target.app_role || (target.data && target.data.app_role) || null };
    await base44.asServiceRole.entities.User.update(user_id, { app_role });

    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id,
      action: 'set_user_role',
      entity_type: 'User',
      entity_id: user_id,
      old_value_json: JSON.stringify(oldValue),
      new_value_json: JSON.stringify({ app_role }),
      reason: reason || `Cambio de rol a ${app_role}`,
      timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, user_id, app_role });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});