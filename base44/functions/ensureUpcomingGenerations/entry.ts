import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Mantiene al menos las próximas 8 generaciones disponibles (lunes→domingo).
// Cierre de inscripción = domingo 20:00 America/Mexico_City (un día antes del lunes).
// Superadmin / operaciones. Idempotente (dedup por start_date).
const TZ = 'America/Mexico_City';
const KEEP = 8;

function dateInTZ(d, tz) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const m = {};
  for (const p of parts) m[p.type] = p.value;
  return `${m.year}-${m.month}-${m.day}`;
}
function addDays(dateStr, n) {
  const [y, mo, da] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, da));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function nextMonday(dateStr) {
  const [y, mo, da] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, da));
  const dow = dt.getUTCDay(); // 0 Sun .. 6 Sat
  const add = dow === 1 ? 0 : (dow === 0 ? 1 : 8 - dow);
  dt.setUTCDate(dt.getUTCDate() + add);
  return dt.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const todayStr = dateInTZ(new Date(), TZ);
    let monday = nextMonday(todayStr);
    if (monday <= todayStr) monday = addDays(monday, 7); // estrictamente futura

    const existing = await base44.asServiceRole.entities.Generation.list('start_date', 100);
    const byStart = new Map((existing || []).map((g) => [g.start_date, g]));

    const created = [];
    for (let i = 0; i < KEEP; i++) {
      const start = addDays(monday, i * 7);
      if (byStart.has(start)) continue;
      const end = addDays(start, 6);
      const cutoff = `${addDays(start, -1)}T20:00:00`;
      const g = await base44.asServiceRole.entities.Generation.create({
        name: `Generación ${start}`,
        week_index: i + 1,
        start_date: start,
        end_date: end,
        enrollment_cutoff: cutoff,
        status: 'open',
      });
      created.push({ id: g.id, start_date: start });
    }

    return Response.json({ ok: true, created: created.length, created_items: created, ensured: KEEP });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});