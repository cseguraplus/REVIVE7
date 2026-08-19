import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Resets the pilot clienta's test progress: deletes DailyCheckin + VideoProgress
// and clears any day override on their enrollment. Superadmin only. Reason required.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin') return Response.json({ error: 'Forbidden — superadmin only' }, { status: 403 });

    const body = await req.json();
    const { clienta_id, reason } = body;
    if (!clienta_id) return Response.json({ error: 'clienta_id obligatorio' }, { status: 400 });
    if (!reason || !String(reason).trim()) return Response.json({ error: 'Motivo obligatorio' }, { status: 400 });

    const checkins = await base44.asServiceRole.entities.DailyCheckin.filter({ clienta_id });
    const vps = await base44.asServiceRole.entities.VideoProgress.filter({ clienta_id });
    const enrollments = await base44.asServiceRole.entities.Enrollment.filter({ clienta_id });

    const oldSummary = {
      daily_checkins: checkins.length,
      video_progress: vps.length,
      enrollment_overrides: enrollments.map(e => ({ id: e.id, override_day_number: e.override_day_number ?? null })),
    };

    for (const ch of checkins) {
      try { await base44.asServiceRole.entities.DailyCheckin.delete(ch.id); } catch (e) {}
    }
    for (const vp of vps) {
      try { await base44.asServiceRole.entities.VideoProgress.delete(vp.id); } catch (e) {}
    }
    for (const e of enrollments) {
      if (e.override_day_number != null || e.override_reason) {
        try { await base44.asServiceRole.entities.Enrollment.update(e.id, { override_day_number: null, override_reason: null }); } catch (err) {}
      }
    }

    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id,
      action: 'reset_pilot_user',
      entity_type: 'Clienta',
      entity_id: clienta_id,
      old_value_json: JSON.stringify(oldSummary),
      new_value_json: JSON.stringify({
        daily_checkins: 0,
        video_progress: 0,
        enrollment_overrides: enrollments.map(e => ({ id: e.id, override_day_number: null })),
      }),
      reason: String(reason).trim(),
      timestamp: new Date().toISOString(),
    });

    return Response.json({ reset: true, deleted: { daily_checkins: checkins.length, video_progress: vps.length } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});