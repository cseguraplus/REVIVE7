import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Edits AppSettings test clock (and optionally the active pilot generation).
// Superadmin only. Audits old → new with actor, reason and timestamp.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin') return Response.json({ error: 'Forbidden — superadmin only' }, { status: 403 });

    const body = await req.json();
    const { simulated_datetime, test_mode, active_generation_id, daily_summary_enabled, reason } = body;

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const s = settings && settings[0];
    if (!s) return Response.json({ error: 'AppSettings no configurado' }, { status: 500 });

    const oldValue = {
      test_mode: !!s.test_mode,
      simulated_datetime: s.simulated_datetime || null,
      active_generation_id: s.active_generation_id || null,
      daily_summary_enabled: !!s.daily_summary_enabled,
    };

    const updates = {};
    if (typeof test_mode === 'boolean') updates.test_mode = test_mode;
    if (simulated_datetime !== undefined) {
      // null → real date; otherwise a Mexico City wall-clock string "YYYY-MM-DDTHH:mm:ss"
      updates.simulated_datetime = simulated_datetime === null ? null : String(simulated_datetime);
      if (simulated_datetime) updates.test_mode = true; // a simulated date implies test mode
    }
    if (active_generation_id !== undefined) updates.active_generation_id = active_generation_id || null;
    if (daily_summary_enabled !== undefined) updates.daily_summary_enabled = !!daily_summary_enabled;

    if (Object.keys(updates).length === 0) {
      return Response.json({ changed: false, app_settings: s });
    }

    const newValue = { ...oldValue, ...updates };
    await base44.asServiceRole.entities.AppSettings.update(s.id, updates);

    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id,
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});