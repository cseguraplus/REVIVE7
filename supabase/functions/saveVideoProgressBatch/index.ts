import { getUserAndProfile, serviceClient } from '../_shared/auth.ts';

const BUCKET_SECONDS = 5;

Deno.serve(async (req) => {
  try {
    const user = await getUserAndProfile(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { programDayId, enrollmentId, clientaId, weeklyCycleId, watchedBuckets, lastPositionSeconds, durationSeconds } = body;

    if (!programDayId || !clientaId) {
      return Response.json({ error: 'programDayId y clientaId son obligatorios' }, { status: 400 });
    }

    const appRole = user.app_role;
    const isOwner = user.id === clientaId;
    const isAdmin = appRole === 'superadmin' || appRole === 'operaciones';
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden — no puedes guardar progreso de otra clienta' }, { status: 403 });
    }

    const svc = serviceClient();

    if (enrollmentId) {
      const { data: enrollment } = await svc.from('enrollments').select('*').eq('id', enrollmentId).maybeSingle();
      if (!enrollment || enrollment.clienta_id !== clientaId) {
        return Response.json({ error: 'El enrollment no pertenece a esta clienta' }, { status: 403 });
      }
    }

    if (weeklyCycleId) {
      const { data: wc } = await svc.from('weekly_cycles').select('*').eq('id', weeklyCycleId).maybeSingle();
      if (!wc || wc.clienta_id !== clientaId) {
        return Response.json({ error: 'El WeeklyCycle no pertenece a esta clienta' }, { status: 403 });
      }
      if (enrollmentId && wc.journey_id && wc.journey_id !== enrollmentId) {
        return Response.json({ error: 'El WeeklyCycle no pertenece a este Journey' }, { status: 403 });
      }
    }

    const { data: programDay } = await svc.from('program_days').select('*').eq('id', programDayId).maybeSingle();
    if (!programDay) {
      return Response.json({ error: 'ProgramDay no encontrado' }, { status: 404 });
    }

    const { data: existing } = await svc.from('video_progress').select('*').eq('clienta_id', clientaId).eq('program_day_id', programDayId);
    const progress = existing && existing[0];

    const merged = new Set<number>();
    if (progress && progress.watched_buckets_json) {
      try {
        const arr = JSON.parse(progress.watched_buckets_json);
        if (Array.isArray(arr)) arr.forEach((b) => merged.add(Number(b)));
      } catch { /* ignore malformed */ }
    }
    if (Array.isArray(watchedBuckets)) {
      watchedBuckets.forEach((b: number) => merged.add(Number(b)));
    }
    const mergedArray = Array.from(merged).sort((a, b) => a - b);

    const uniqueWatchedSeconds = mergedArray.length * BUCKET_SECONDS;
    const duration = durationSeconds || (progress && progress.duration_seconds) || 0;
    const validPercent = duration > 0 ? Math.min(100, (uniqueWatchedSeconds / duration) * 100) : 0;

    const watchedBucketsJson = JSON.stringify(mergedArray);
    const lastSavedAt = new Date().toISOString();
    const lastPos = typeof lastPositionSeconds === 'number' ? lastPositionSeconds : ((progress && progress.last_position_seconds) || 0);

    // deno-lint-ignore no-explicit-any
    let saved: any;
    if (progress) {
      // valid_percent/completed tienen field-level RLS (trigger) → rol de servicio
      const { data } = await svc.from('video_progress').update({
        watched_buckets_json: watchedBucketsJson,
        unique_watched_seconds: uniqueWatchedSeconds,
        valid_percent: validPercent,
        last_position_seconds: lastPos,
        duration_seconds: duration || undefined,
        enrollment_id: enrollmentId || progress.enrollment_id,
        last_saved_at: lastSavedAt,
      }).eq('id', progress.id).select().single();
      saved = data;
    } else {
      const { data } = await svc.from('video_progress').insert({
        clienta_id: clientaId,
        program_day_id: programDayId,
        enrollment_id: enrollmentId,
        duration_seconds: duration,
        watched_buckets_json: watchedBucketsJson,
        unique_watched_seconds: uniqueWatchedSeconds,
        valid_percent: validPercent,
        last_position_seconds: lastPos,
        last_saved_at: lastSavedAt,
      }).select().single();
      saved = data;
    }

    return Response.json({
      id: saved && saved.id,
      valid_percent: validPercent,
      unique_watched_seconds: uniqueWatchedSeconds,
      watched_buckets_count: mergedArray.length,
      duration_seconds: duration,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
