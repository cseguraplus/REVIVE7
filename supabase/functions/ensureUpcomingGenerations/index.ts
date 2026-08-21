import { requireInternalOrRole, serviceClient } from '../_shared/auth.ts';

// Mantiene al menos las próximas 8 generaciones disponibles (lunes→domingo).
// Cierre de inscripción = domingo 20:00 America/Mexico_City (un día antes del lunes).
// Superadmin / operaciones, o cron vía secreto interno. Idempotente (dedup por start_date).
const TZ = 'America/Mexico_City';
const KEEP = 8;

function dateInTZ(d: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  return `${m.year}-${m.month}-${m.day}`;
}
function addDays(dateStr: string, n: number) {
  const [y, mo, da] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, da));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function nextMonday(dateStr: string) {
  const [y, mo, da] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, da));
  const dow = dt.getUTCDay();
  const add = dow === 1 ? 0 : (dow === 0 ? 1 : 8 - dow);
  dt.setUTCDate(dt.getUTCDate() + add);
  return dt.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    const auth = await requireInternalOrRole(req, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const todayStr = dateInTZ(new Date(), TZ);
    let monday = nextMonday(todayStr);
    if (monday <= todayStr) monday = addDays(monday, 7);

    const { data: existing } = await svc.from('generations').select('*').order('start_date', { ascending: true }).limit(100);
    const byStart = new Map((existing || []).map((g) => [g.start_date, g]));

    const created: { id: string; start_date: string }[] = [];
    for (let i = 0; i < KEEP; i++) {
      const start = addDays(monday, i * 7);
      if (byStart.has(start)) continue;
      const end = addDays(start, 6);
      const cutoff = `${addDays(start, -1)}T20:00:00`;
      const { data: g } = await svc.from('generations').insert({
        name: `Generación ${start}`,
        week_index: i + 1,
        start_date: start,
        end_date: end,
        enrollment_cutoff: cutoff,
        status: 'open',
      }).select().single();
      if (g) created.push({ id: g.id, start_date: start });
    }

    return Response.json({ ok: true, created: created.length, created_items: created, ensured: KEEP });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
