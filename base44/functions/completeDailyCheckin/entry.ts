import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const OBJECTIVES = [
  'objective_video', 'objective_dailypacks', 'objective_hydration',
  'objective_nutrition', 'objective_movement', 'objective_rest',
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const appRole = user.app_role || (user.data && user.data.app_role);
    const body = await req.json();
    const { clientaId, programDayId } = body;
    if (!clientaId || !programDayId) {
      return Response.json({ error: 'clientaId y programDayId son obligatorios' }, { status: 400 });
    }

    const isOwner = user.id === clientaId;
    const isAdmin = appRole === 'superadmin' || appRole === 'operaciones';
    if (!isOwner && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    // 1. Video must be completed (VideoProgress.completed === true)
    const vps = await base44.asServiceRole.entities.VideoProgress.filter({ clienta_id: clientaId, program_day_id: programDayId });
    const vp = vps && vps[0];
    if (!vp || !vp.completed) {
      return Response.json({ error: 'Aún no has completado el video de hoy.', code: 'video_not_completed' }, { status: 409 });
    }

    // 2. DailyCheckin must exist with the six objectives saved and emotional_state set
    const checkins = await base44.asServiceRole.entities.DailyCheckin.filter({ clienta_id: clientaId, program_day_id: programDayId });
    const checkin = checkins && checkins[0];
    if (!checkin) {
      return Response.json({ error: 'Guarda tus objetivos y estado emocional antes de cerrar el día.', code: 'checkin_missing' }, { status: 409 });
    }
    const objectivesDone = OBJECTIVES.every((k) => checkin[k] === true);
    if (!objectivesDone) {
      return Response.json({ error: 'Marca tus seis objetivos del día para cerrarlo.', code: 'objectives_incomplete' }, { status: 409 });
    }
    if (!checkin.emotional_state) {
      return Response.json({ error: 'Registra cómo te sientes hoy para cerrar el día.', code: 'emotional_missing' }, { status: 409 });
    }
    if (checkin.completed) {
      return Response.json({ checkin, already_completed: true, completed: true });
    }

    // 3. Mark the day completed (only the backend flips this)
    const completedAt = new Date().toISOString();
    const updated = await base44.asServiceRole.entities.DailyCheckin.update(checkin.id, {
      completed: true,
      completed_at: completedAt,
      video_completed: true,
    });

    // 4. Re-query the next day's access so the UI can open it immediately
    let nextDay = null;
    try {
      const programDay = await base44.asServiceRole.entities.ProgramDay.get(programDayId);
      if (programDay && typeof programDay.day_number === 'number') {
        const accessRes = await base44.functions.invoke('getDailyAccess', { clientaId, dayNumber: programDay.day_number });
        nextDay = accessRes && accessRes.data && accessRes.data.next_day;
      }
    } catch (e) { /* next day re-query is best-effort */ }

    // 5. Alert if emotional state is "Con dificultad" (low/bad) — never copies the private comment
    if (checkin.emotional_state === 'low' || checkin.emotional_state === 'bad') {
      try {
        const profiles = await base44.asServiceRole.entities.ClientaProfile.filter({ user_id: clientaId });
        const profile = profiles && profiles[0];
        const aliadaId = (profile && profile.aliada_id) || null;
        const existing = await base44.asServiceRole.entities.Alert.filter({ type: 'at_risk', clienta_id: clientaId, status: 'open' });
        if (!existing || existing.length === 0) {
          await base44.asServiceRole.entities.Alert.create({
            type: 'at_risk',
            clienta_id: clientaId,
            aliada_id: aliadaId,
            reason: `Check-in marcado "Con dificultad" (estado: ${checkin.emotional_state})`,
            severity: checkin.emotional_state === 'bad' ? 'high' : 'medium',
            status: 'open',
            created_at: completedAt,
          });
        }
      } catch (e) { /* best-effort */ }
    }

    return Response.json({
      checkin: updated,
      completed: true,
      completed_at: completedAt,
      next_day: nextDay,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});