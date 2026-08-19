import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const BUCKET_SECONDS = 5;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { programDayId, enrollmentId, clientaId, requiredPercent } = body;

    if (!programDayId || !clientaId) {
      return Response.json({ error: 'programDayId y clientaId son obligatorios' }, { status: 400 });
    }

    const appRole = user.app_role || (user.data && user.data.app_role);
    const isOwner = user.id === clientaId;
    const isAdmin = appRole === 'superadmin' || appRole === 'operaciones';
    if (!isOwner && !isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    let programDay = null;
    try { programDay = await base44.asServiceRole.entities.ProgramDay.get(programDayId); } catch (e) { /* not found */ }
    const threshold = (programDay && typeof programDay.required_percent === 'number')
      ? programDay.required_percent
      : (typeof requiredPercent === 'number' ? requiredPercent : 80);

    const existing = await base44.asServiceRole.entities.VideoProgress.filter({
      clienta_id: clientaId,
      program_day_id: programDayId,
    });
    const progress = existing && existing[0];
    if (!progress) {
      return Response.json({ error: 'No hay progreso registrado para este video' }, { status: 404 });
    }

    // Recalculate valid_percent from stored buckets — never trust the client
    let buckets = [];
    try {
      const arr = JSON.parse(progress.watched_buckets_json || '[]');
      if (Array.isArray(arr)) buckets = arr;
    } catch (e) { /* ignore */ }
    const uniqueWatchedSeconds = buckets.length * BUCKET_SECONDS;
    const duration = progress.duration_seconds || 0;
    const validPercent = duration > 0 ? Math.min(100, (uniqueWatchedSeconds / duration) * 100) : 0;

    let updated = { ...progress, valid_percent: validPercent, unique_watched_seconds: uniqueWatchedSeconds };

    // Only mark completed when backend-recalculated percent >= threshold
    if (validPercent >= threshold && !progress.completed) {
      const result = await base44.asServiceRole.entities.VideoProgress.update(progress.id, {
        valid_percent: validPercent,
        completed: true,
        completed_at: new Date().toISOString(),
      });
      updated = { ...updated, ...result, completed: true };
    } else if (validPercent !== progress.valid_percent) {
      // sync the recalculated percent even if not yet complete
      const result = await base44.asServiceRole.entities.VideoProgress.update(progress.id, {
        valid_percent: validPercent,
      });
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});