import { requireRole, serviceClient } from '../_shared/auth.ts';

// Edita el reloj de prueba en app_settings (y opcionalmente la generación
// piloto activa). Superadmin only. Audita old → new con actor, motivo y timestamp.
Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['superadmin']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { simulated_datetime, test_mode, active_generation_id, daily_summary_enabled, reason } = body;

    const { data: s } = await svc.from('app_settings').select('*').maybeSingle();
    if (!s) return Response.json({ error: 'app_settings no configurado' }, { status: 500 });

    const oldValue = {
      test_mode: !!s.test_mode,
      simulated_datetime: s.simulated_datetime || null,
      active_generation_id: s.active_generation_id || null,
      daily_summary_enabled: !!s.daily_summary_enabled,
    };

    // deno-lint-ignore no-explicit-any
    const updates: any = {};
    if (typeof test_mode === 'boolean') updates.test_mode = test_mode;
    if (simulated_datetime !== undefined) {
      updates.simulated_datetime = simulated_datetime === null ? null : String(simulated_datetime);
      if (simulated_datetime) updates.test_mode = true;
    }
    if (active_generation_id !== undefined) updates.active_generation_id = active_generation_id || null;
    if (daily_summary_enabled !== undefined) updates.daily_summary_enabled = !!daily_summary_enabled;

    if (Object.keys(updates).length === 0) {
      return Response.json({ changed: false, app_settings: s });
    }

    const newValue = { ...oldValue, ...updates };
    await svc.from('app_settings').update(updates).eq('id', s.id);

    await svc.from('audit_logs').insert({
      actor_user_id: auth.user.id,
      action: 'set_test_effective_date',
      entity_type: 'AppSettings',
      entity_id: s.id,
      old_value_json: JSON.stringify(oldValue),
      new_value_json: JSON.stringify(newValue),
      reason: reason || (simulated_datetime ? `Simulación de fecha: ${simulated_datetime}` : 'Cambio de configuración de prueba'),
      timestamp: new Date().toISOString(),
    });

    return Response.json({ changed: true, app_settings: { ...s, ...updates } });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
