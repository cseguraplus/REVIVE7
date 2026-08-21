import { getUserAndProfile, serviceClient } from '../_shared/auth.ts';

const BUCKET_SECONDS = 5;

Deno.serve(async (req) => {
  try {
    const user = await getUserAndProfile(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { programDayId, clientaId, requiredPercent } = body;

    if (!programDayId || !clientaId) {
      return Response.json({ error: 'programDayId y clientaId son obligatorios' }, { status: 400 });
    }

    const appRole = user.app_role;
    const isOwner = user.id === clientaId;
    const isAdmin = appRole === 'superadmin' || appRole === 'operaciones';
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const svc = serviceClient();

    const { data: programDay } = await svc.from('program_days').select('*').eq('id', programDayId).maybeSingle();
    const threshold = (programDay && typeof programDay.required_percent === 'number')
      ? programDay.required_percent
      : (typeof requiredPercent === 'number' ? requiredPercent : 80);

    const { data: existing } = await svc.from('video_progress').select('*').eq('clienta_id', clientaId).eq('program_day_id', programDayId);
    const progress = existing && existing[0];
    if (!progress) {
      return Response.json({ error: 'No hay progreso registrado para este video' }, { status: 404 });
    }

    let buckets: number[] = [];
    try {
      const arr = JSON.parse(progress.watched_buckets_json || '[]');
      if (Array.isArray(arr)) buckets = arr;
    } catch { /* ignore */ }
    const uniqueWatchedSeconds = buckets.length * BUCKET_SECONDS;
    const duration = progress.duration_seconds || 0;
    const validPercent = duration > 0 ? Math.min(100, (uniqueWatchedSeconds / duration) * 100) : 0;

    // deno-lint-ignore no-explicit-any
    let updated: any = { ...progress, valid_percent: validPercent, unique_watched_seconds: uniqueWatchedSeconds };

    if (validPercent >= threshold && !progress.completed) {
      const { data: result } = await svc.from('video_progress').update({
        valid_percent: validPercent,
        completed: true,
        completed_at: new Date().toISOString(),
      }).eq('id', progress.id).select().single();
      updated = { ...updated, ...result, completed: true };
    } else if (validPercent !== progress.valid_percent) {
      const { data: result } = await svc.from('video_progress').update({ valid_percent: validPercent }).eq('id', progress.id).select().single();
      updated = { ...updated, ...result, valid_percent: validPercent };
    }

    return Response.json({
      id: progress.id,
      valid_percent: validPercent,
      unique_watched_seconds: uniqueWatchedSeconds,
      completed: updated.completed || false,
      completed_at: updated.completed_at || null,
      required_percent: threshold,
      reached_threshold: validPercent >= threshold,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
