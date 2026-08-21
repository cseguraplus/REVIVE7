import { requireRole, serviceClient } from '../_shared/auth.ts';

// Sets per-account test control (simulated effective datetime). Superadmin only.
// Only works on accounts flagged is_test_account=true — simulated date never
// affects normal users. Upserts test_control by user_id. Audits every change.
Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['superadmin']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { user_id, enabled, effective_datetime, allow_reset, reason } = body;
    if (!user_id) return Response.json({ error: 'user_id obligatorio' }, { status: 400 });

    const { data: target } = await svc.from('profiles').select('*').eq('id', user_id).maybeSingle();
    if (!target) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const isTestAccount = !!target.is_test_account;
    if (!isTestAccount) return Response.json({ error: 'La cuenta no es piloto (is_test_account=false). La fecha simulada no afecta a usuarios normales.' }, { status: 403 });

    const enabledBool = enabled === true;
    const dt = effective_datetime === null || effective_datetime === undefined ? null : String(effective_datetime).slice(0, 19);
    if (enabledBool && !dt) return Response.json({ error: 'effective_datetime obligatorio cuando enabled=true' }, { status: 400 });

    const { data: existing } = await svc.from('test_control').select('*').eq('user_id', user_id);
    const tc = existing && existing[0];
    const oldValue = tc ? { enabled: tc.enabled, effective_datetime: tc.effective_datetime || null, allow_reset: tc.allow_reset } : null;
    const newValue = { enabled: enabledBool, effective_datetime: dt, allow_reset: allow_reset === true, updated_by: auth.user.id, updated_at: new Date().toISOString() };

    // deno-lint-ignore no-explicit-any
    let saved: any;
    if (tc) {
      const { data } = await svc.from('test_control').update(newValue).eq('id', tc.id).select().single();
      saved = data;
    } else {
      const { data } = await svc.from('test_control').insert({ user_id, ...newValue }).select().single();
      saved = data;
    }

    await svc.from('audit_logs').insert({
      actor_user_id: auth.user.id,
      action: 'set_test_control',
      entity_type: 'TestControl',
      entity_id: saved?.id,
      old_value_json: JSON.stringify(oldValue),
      new_value_json: JSON.stringify(newValue),
      reason: reason || (enabledBool ? `Simulación para ${user_id}: ${dt}` : 'Deshabilitar simulación (fecha real)'),
      timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, message: 'TestControl actualizado', test_control: { ...newValue, id: saved?.id } });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
