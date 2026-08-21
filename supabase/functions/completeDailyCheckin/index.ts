import { getUserAndProfile, serviceClient } from '../_shared/auth.ts';
import { computeDailyAccess } from '../_shared/dailyAccess.ts';

const OBJECTIVES = [
  'objective_video', 'objective_dailypacks', 'objective_hydration',
  'objective_nutrition', 'objective_movement', 'objective_rest',
];

Deno.serve(async (req) => {
  try {
    const user = await getUserAndProfile(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const appRole = user.app_role;
    const body = await req.json();
    const { clientaId, programDayId } = body;
    if (!clientaId || !programDayId) {
      return Response.json({ error: 'clientaId y programDayId son obligatorios' }, { status: 400 });
    }

    const isOwner = user.id === clientaId;
    const isAdmin = appRole === 'superadmin' || appRole === 'operaciones';
    if (!isOwner && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = serviceClient();

    const { data: vps } = await svc.from('video_progress').select('*').eq('clienta_id', clientaId).eq('program_day_id', programDayId);
    const vp = vps && vps[0];
    if (!vp || !vp.completed) {
      return Response.json({ error: 'Aún no has completado el video de hoy.', code: 'video_not_completed' }, { status: 409 });
    }

    const { data: checkins } = await svc.from('daily_checkins').select('*').eq('clienta_id', clientaId).eq('program_day_id', programDayId);
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

    const completedAt = new Date().toISOString();
    const { data: updated } = await svc.from('daily_checkins').update({
      completed: true,
      completed_at: completedAt,
      video_completed: true,
    }).eq('id', checkin.id).select().single();

    // deno-lint-ignore no-explicit-any
    let nextDay: any = null;
    try {
      const { data: programDay } = await svc.from('program_days').select('*').eq('id', programDayId).maybeSingle();
      if (programDay && typeof programDay.day_number === 'number') {
        const accessRes = await computeDailyAccess(svc, user, { clientaId, dayNumber: programDay.day_number });
        nextDay = accessRes.body?.next_day;
      }
    } catch { /* next day re-query is best-effort */ }

    if (checkin.emotional_state === 'low' || checkin.emotional_state === 'bad') {
      try {
        const { data: profiles } = await svc.from('clienta_profiles').select('*').eq('user_id', clientaId);
        const profile = profiles && profiles[0];
        const aliadaId = (profile && profile.aliada_id) || null;
        const { data: existing } = await svc.from('alerts').select('*').eq('type', 'at_risk').eq('clienta_id', clientaId).eq('status', 'open');
        if (!existing || existing.length === 0) {
          await svc.from('alerts').insert({
            type: 'at_risk',
            clienta_id: clientaId,
            aliada_id: aliadaId,
            reason: `Check-in marcado "Con dificultad" (estado: ${checkin.emotional_state})`,
            severity: checkin.emotional_state === 'bad' ? 'high' : 'medium',
            status: 'open',
            created_at: completedAt,
          });
        }
      } catch { /* best-effort */ }
    }

    return Response.json({
      checkin: updated,
      completed: true,
      completed_at: completedAt,
      next_day: nextDay,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
