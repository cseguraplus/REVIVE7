import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Forces a specific day for a clienta (testing override) on their active enrollment.
// Superadmin only. Reason is mandatory. Audits old → new override.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin') return Response.json({ error: 'Forbidden — superadmin only' }, { status: 403 });

    const body = await req.json();
    const { clienta_id, day_number, reason } = body;
    if (!clienta_id) return Response.json({ error: 'clienta_id obligatorio' }, { status: 400 });
    if (day_number == null || typeof day_number !== 'number') return Response.json({ error: 'day_number obligatorio' }, { status: 400 });
    if (!reason || !String(reason).trim()) return Response.json({ error: 'Motivo obligatorio' }, { status: 400 });

    const enrollments = await base44.asServiceRole.entities.Enrollment.filter({ clienta_id, status: 'active' });
    const enrollment = enrollments && enrollments[0];
    if (!enrollment) return Response.json({ error: 'No hay inscripción activa para esta clienta' }, { status: 404 });

    const oldValue = { override_day_number: enrollment.override_day_number ?? null, override_reason: enrollment.override_reason || null };
    const newValue = { override_day_number: day_number, override_reason: String(reason).trim() };

    await base44.asServiceRole.entities.Enrollment.update(enrollment.id, {
      override_day_number: day_number,
      override_reason: String(reason).trim(),
    });

    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id,
      action: 'admin_override_day',
      entity_type: 'Enrollment',
      entity_id: enrollment.id,
      old_value_json: JSON.stringify(oldValue),
      new_value_json: JSON.stringify(newValue),
      reason: String(reason).trim(),
      timestamp: new Date().toISOString(),
    });

    return Response.json({ enrollment_id: enrollment.id, override: newValue });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});