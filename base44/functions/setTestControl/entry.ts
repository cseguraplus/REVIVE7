import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Sets per-account test control (simulated effective datetime). Superadmin only.
// Only works on accounts flagged is_test_account=true — simulated date never
// affects normal users. Upserts TestControl by user_id. Audits every change.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin') return Response.json({ error: 'Forbidden — superadmin only' }, { status: 403 });

    const body = await req.json();
    const { user_id, enabled, effective_datetime, allow_reset, reason } = body;
    if (!user_id) return Response.json({ error: 'user_id obligatorio' }, { status: 400 });

    let target = null;
    try { target = await base44.asServiceRole.entities.User.get(user_id); } catch (e) { /* not found */ }
    if (!target) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const isTestAccount = !!(target.is_test_account || (target.data && target.data.is_test_account));
    if (!isTestAccount) return Response.json({ error: 'La cuenta no es piloto (is_test_account=false). La fecha simulada no afecta a usuarios normales.' }, { status: 403 });

    const enabledBool = enabled === true;
    const dt = effective_datetime === null || effective_datetime === undefined ? null : String(effective_datetime).slice(0, 19);
    if (enabledBool && !dt) return Response.json({ error: 'effective_datetime obligatorio cuando enabled=true' }, { status: 400 });

    const existing = await base44.asServiceRole.entities.TestControl.filter({ user_id });
    const tc = existing && existing[0];
    const oldValue = tc ? { enabled: tc.enabled, effective_datetime: tc.effective_datetime || null, allow_reset: tc.allow_reset } : null;
    const newValue = { enabled: enabledBool, effective_datetime: dt, allow_reset: allow_reset === true, updated_by: user.id, updated_at: new Date().toISOString() };

    let saved;
    if (tc) {
      saved = await base44.asServiceRole.entities.TestControl.update(tc.id, newValue);
    } else {
      saved = await base44.asServiceRole.entities.TestControl.create({ user_id, ...newValue });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id,
      action: 'set_test_control',
      entity_type: 'TestControl',
      entity_id: saved.id,
      old_value_json: JSON.stringify(oldValue),
      new_value_json: JSON.stringify(newValue),
      reason: reason || (enabledBool ? `Simulación para ${user_id}: ${dt}` : 'Deshabilitar simulación (fecha real)'),
      timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, message: 'TestControl actualizado', test_control: { ...newValue, id: saved.id } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});