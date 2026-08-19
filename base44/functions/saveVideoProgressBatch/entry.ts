import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const BUCKET_SECONDS = 5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { programDayId, enrollmentId, clientaId, weeklyCycleId, watchedBuckets, lastPositionSeconds, durationSeconds } = body;

    if (!programDayId || !clientaId) {
      return Response.json({ error: 'programDayId y clientaId son obligatorios' }, { status: 400 });
    }

    // Authorization: the authenticated user must own this progress, or be admin/operaciones
    const appRole = user.app_role || (user.data && user.data.app_role);
    const isOwner = user.id === clientaId;
    const isAdmin = appRole === 'superadmin' || appRole === 'operaciones';
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden — no puedes guardar progreso de otra clienta' }, { status: 403 });
    }

    // If enrollmentId provided, verify it belongs to this clienta
    if (enrollmentId) {
      let enrollment = null;
      try {
        enrollment = await base44.asServiceRole.entities.Enrollment.get(enrollmentId);
      } catch (e) { /* not found */ }
      if (!enrollment || enrollment.clienta_id !== clientaId) {
        return Response.json({ error: 'El enrollment no pertenece a esta clienta' }, { status: 403 });
      }
    }

    // WeeklyCycle membership (if provided)
    if (weeklyCycleId) {
      let wc = null;
      try { wc = await base44.asServiceRole.entities.WeeklyCycle.get(weeklyCycleId); } catch (e) { /* not found */ }
      if (!wc || wc.clienta_id !== clientaId) {
        return Response.json({ error: 'El WeeklyCycle no pertenece a esta clienta' }, { status: 403 });
      }
      if (enrollmentId && wc.journey_id && wc.journey_id !== enrollmentId) {
        return Response.json({ error: 'El WeeklyCycle no pertenece a este Journey' }, { status: 403 });
      }
    }

    // ProgramDay existence
    let programDay = null;
    try { programDay = await base44.asServiceRole.entities.ProgramDay.get(programDayId); } catch (e) { /* not found */ }
    if (!programDay) {
      return Response.json({ error: 'ProgramDay no encontrado' }, { status: 404 });
    }

    // Find existing VideoProgress for this clienta + program_day
    const existing = await base44.asServiceRole.entities.VideoProgress.filter({
      clienta_id: clientaId,
      program_day_id: programDayId,
    });
    const progress = existing && existing[0];

    // Merge buckets (union — never overwrite previous buckets)
    const merged = new Set();
    if (progress && progress.watched_buckets_json) {
      try {
        const arr = JSON.parse(progress.watched_buckets_json);
        if (Array.isArray(arr)) arr.forEach((b) => merged.add(Number(b)));
      } catch (e) { /* ignore malformed */ }
    }
    if (Array.isArray(watchedBuckets)) {
      watchedBuckets.forEach((b) => merged.add(Number(b)));
    }
    const mergedArray = Array.from(merged).sort((a, b) => a - b);

    // Recalculate from merged buckets (server is source of truth)
    const uniqueWatchedSeconds = mergedArray.length * BUCKET_SECONDS;
    const duration = durationSeconds || (progress && progress.duration_seconds) || 0;
    const validPercent = duration > 0 ? Math.min(100, (uniqueWatchedSeconds / duration) * 100) : 0;

    const watchedBucketsJson = JSON.stringify(mergedArray);
    const lastSavedAt = new Date().toISOString();
    const lastPos = typeof lastPositionSeconds === 'number' ? lastPositionSeconds : ((progress && progress.last_position_seconds) || 0);

    let saved;
    if (progress) {
      // valid_percent / completed have field-level RLS → must use service role
      saved = await base44.asServiceRole.entities.VideoProgress.update(progress.id, {
        watched_buckets_json: watchedBucketsJson,
        unique_watched_seconds: uniqueWatchedSeconds,
        valid_percent: validPercent,
        last_position_seconds: lastPos,
        duration_seconds: duration || undefined,
        enrollment_id: enrollmentId || progress.enrollment_id,
        last_saved_at: lastSavedAt,
      });
    } else {
      saved = await base44.asServiceRole.entities.VideoProgress.create({
        clienta_id: clientaId,
        program_day_id: programDayId,
        enrollment_id: enrollmentId,
        duration_seconds: duration,
        watched_buckets_json: watchedBucketsJson,
        unique_watched_seconds: uniqueWatchedSeconds,
        valid_percent: validPercent,
        last_position_seconds: lastPos,
        last_saved_at: lastSavedAt,
      });
    }

    return Response.json({
      id: saved && saved.id,
      valid_percent: validPercent,
      unique_watched_seconds: uniqueWatchedSeconds,
      watched_buckets_count: mergedArray.length,
      duration_seconds: duration,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});