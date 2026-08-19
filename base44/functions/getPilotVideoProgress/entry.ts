import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Vista técnica de progreso de video para la cuenta piloto (superadmin/operaciones).
// No expone datos sensibles; solo métricas de reproducción.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { clienta_id } = body;
    if (!clienta_id) return Response.json({ error: 'clienta_id obligatorio' }, { status: 400 });

    const [progress, days] = await Promise.all([
      base44.asServiceRole.entities.VideoProgress.filter({ clienta_id }),
      base44.asServiceRole.entities.ProgramDay.list(),
    ]);
    const dayMap = {};
    (days || []).forEach((d) => { dayMap[d.id] = d; });

    const rows = (progress || []).map((p) => {
      let buckets = [];
      try { buckets = JSON.parse(p.watched_buckets_json || '[]'); } catch (e) { buckets = []; }
      const arr = Array.isArray(buckets) ? buckets : [];
      return {
        program_day_id: p.program_day_id,
        day_number: dayMap[p.program_day_id]?.day_number ?? null,
        title: dayMap[p.program_day_id]?.title ?? '—',
        duration_seconds: p.duration_seconds || 0,
        buckets_count: arr.length,
        buckets: arr,
        unique_watched_seconds: p.unique_watched_seconds || 0,
        valid_percent: p.valid_percent || 0,
        completed: !!p.completed,
        last_position_seconds: p.last_position_seconds || 0,
        last_saved_at: p.last_saved_at || p.updated_date || null,
      };
    });
    rows.sort((a, b) => (a.day_number ?? 999) - (b.day_number ?? 999));

    const events = rows
      .filter((r) => r.last_saved_at)
      .sort((a, b) => new Date(b.last_saved_at) - new Date(a.last_saved_at))
      .slice(0, 10)
      .map((r) => ({ day_number: r.day_number, title: r.title, valid_percent: r.valid_percent, completed: r.completed, last_saved_at: r.last_saved_at }));

    return Response.json({ progress: rows, events });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});