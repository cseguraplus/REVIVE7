import { requireInternalOrRole, serviceClient } from '../_shared/auth.ts';

// Sincroniza el estado de clienta_profiles según Enrollment y avance del programa.
// - Día > 90 → completed
// - Día < 1 → pending
// Invocada por pg_cron/scheduled function (Paso 6) con el secreto interno, o
// manualmente por superadmin/operaciones.
Deno.serve(async (req) => {
  try {
    const auth = await requireInternalOrRole(req, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const { data: settings } = await svc.from('app_settings').select('*').maybeSingle();
    const tz = (settings && settings.timezone) || 'America/Mexico_City';
    const usingSimulated = !!(settings && settings.test_mode && settings.simulated_datetime);
    const nowISO = usingSimulated ? String(settings!.simulated_datetime).slice(0, 19) : new Date().toLocaleString('sv-SE', { timeZone: tz });
    const todayStr = nowISO.slice(0, 10);

    const [{ data: profiles }, { data: enrollments }, { data: generations }] = await Promise.all([
      svc.from('clienta_profiles').select('*').order('created_at', { ascending: false }).limit(500),
      svc.from('enrollments').select('*').order('created_at', { ascending: false }).limit(500),
      svc.from('generations').select('*').order('created_at', { ascending: false }).limit(200),
    ]);
    // deno-lint-ignore no-explicit-any
    const genById: Record<string, any> = {}; (generations || []).forEach((g) => { genById[g.id] = g; });

    function daysBetween(aStr: string, bStr: string) {
      const [y1, m1, d1] = aStr.split('-').map(Number);
      const [y2, m2, d2] = bStr.split('-').map(Number);
      return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
    }

    let updated = 0;
    for (const cp of profiles || []) {
      if (cp.status !== 'active' && cp.status !== 'pending') continue;
      const enr = (enrollments || []).find((e) => e.clienta_id === cp.user_id && e.status === 'active');
      if (!enr) continue;
      const gen = enr.generation_id ? genById[enr.generation_id] : null;
      const start = (gen && gen.start_date) || enr.start_date;
      if (!start) continue;
      const day = daysBetween(start, todayStr) + 1;
      let nextStatus: string | null = null;
      if (day > 90) nextStatus = 'completed';
      else if (day < 1) nextStatus = 'pending';
      if (nextStatus && nextStatus !== cp.status) {
        const { error } = await svc.from('clienta_profiles').update({ status: nextStatus }).eq('id', cp.id);
        if (!error) updated++;
      }
    }
    return Response.json({ ok: true, updated, effective_date: todayStr });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
