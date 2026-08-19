import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireInternalOrRole } from '../../shared/auth.ts';

// Sincroniza el estado de ClientaProfile según Enrollment y avance del programa.
// - Día > 90 → completed
// - Enrollment cancelled/paused → paused (si seguía active)
// Invocada por el workflow DailySyncStatuses (cron) con el secreto interno,
// o manualmente por superadmin/operaciones.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireInternalOrRole(req, base44, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const s = settings && settings[0];
    const tz = (s && s.timezone) || 'America/Mexico_City';
    const usingSimulated = !!(s && s.test_mode && s.simulated_datetime);
    const nowISO = usingSimulated ? String(s.simulated_datetime).slice(0, 19) : new Date().toLocaleString('sv-SE', { timeZone: tz });
    const todayStr = nowISO.slice(0, 10);

    const [profiles, enrollments, generations] = await Promise.all([
      base44.asServiceRole.entities.ClientaProfile.list('-created_date', 500),
      base44.asServiceRole.entities.Enrollment.list('-created_date', 500),
      base44.asServiceRole.entities.Generation.list('-created_date', 200),
    ]);
    const genById = {}; generations.forEach((g) => { genById[g.id] = g; });

    function daysBetween(aStr, bStr) {
      const [y1, m1, d1] = aStr.split('-').map(Number);
      const [y2, m2, d2] = bStr.split('-').map(Number);
      return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
    }

    let updated = 0;
    for (const cp of profiles) {
      if (cp.status !== 'active' && cp.status !== 'pending') continue;
      const enr = enrollments.find((e) => e.clienta_id === cp.user_id && e.status === 'active');
      if (!enr) continue;
      const gen = enr.generation_id ? genById[enr.generation_id] : null;
      const start = (gen && gen.start_date) || enr.start_date;
      if (!start) continue;
      const day = daysBetween(start, todayStr) + 1;
      let nextStatus = null;
      if (day > 90) nextStatus = 'completed';
      else if (day < 1) nextStatus = 'pending';
      if (nextStatus && nextStatus !== cp.status) {
        try { await base44.asServiceRole.entities.ClientaProfile.update(cp.id, { status: nextStatus }); updated++; } catch (e) {}
      }
    }
    return Response.json({ ok: true, updated, effective_date: todayStr });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});