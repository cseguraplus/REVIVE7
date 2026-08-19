import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Suspends an account (account_status -> suspended). Superadmin or operaciones.
// Reason required.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { user_id, reason } = body;
    if (!user_id) return Response.json({ error: 'user_id obligatorio' }, { status: 400 });
    if (!reason || !String(reason).trim()) return Response.json({ error: 'Motivo obligatorio' }, { status: 400 });

    let target = null;
    try { target = await base44.asServiceRole.entities.User.get(user_id); } catch (e) { /* not found */ }
    if (!target) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const oldValue = { account_status: target.account_status || (target.data && target.data.account_status) || null };
    await base44.asServiceRole.entities.User.update(user_id, { account_status: 'suspended' });

    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id,
      action: 'suspend_account',
      entity_type: 'User',
      entity_id: user_id,
      old_value_json: JSON.stringify(oldValue),
      new_value_json: JSON.stringify({ account_status: 'suspended' }),
      reason: String(reason).trim(),
      timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, user_id, account_status: 'suspended' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});