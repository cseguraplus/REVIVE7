import { requireInternalOrRole, serviceClient } from '../_shared/auth.ts';

// Generación diaria de alertas preventivas para clientas activas.
// Invocada por pg_cron/scheduled function (Paso 6) con el secreto interno, o
// manualmente por superadmin/operaciones.
// Tipos: incomplete_previous_day, no_activity, con_dificultad,
// week_ending_soon, week_ended_no_renewal, prep_incomplete, low_inventory.
// Dedupe: no crea alerta abierta duplicada para mismo tipo + clienta + ciclo (cycle_key).

function toISOInTZ(date: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) map[p.type] = p.value;
  const hh = map.hour === '24' ? '00' : map.hour;
  return `${map.year}-${map.month}-${map.day}T${hh}:${map.minute}:${map.second}`;
}
function daysBetween(aStr: string, bStr: string) {
  const [y1, m1, d1] = aStr.split('-').map(Number);
  const [y2, m2, d2] = bStr.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}
const DIFFICULT = ['low', 'bad'];

Deno.serve(async (req) => {
  try {
    const auth = await requireInternalOrRole(req, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const { data: settings } = await svc.from('app_settings').select('*').maybeSingle();
    const tz = (settings && settings.timezone) || 'America/Mexico_City';
    const usingSimulated = !!(settings && settings.test_mode && settings.simulated_datetime);
    const nowISO = usingSimulated ? String(settings!.simulated_datetime).slice(0, 19) : toISOInTZ(new Date(), tz);
    const effectiveDate = nowISO.slice(0, 10);

    const [
      { data: profiles }, { data: enrollments }, { data: generations }, { data: programDays },
      { data: checkins }, { data: vps }, { data: cycles }, { data: openAlerts }, { data: inventory },
    ] = await Promise.all([
      svc.from('clienta_profiles').select('*').order('created_at', { ascending: false }).limit(500),
      svc.from('enrollments').select('*').order('created_at', { ascending: false }).limit(500),
      svc.from('generations').select('*').order('created_at', { ascending: false }).limit(200),
      svc.from('program_days').select('*').order('day_number', { ascending: true }).limit(200),
      svc.from('daily_checkins').select('*').order('created_at', { ascending: false }).limit(1000),
      svc.from('video_progress').select('*').order('created_at', { ascending: false }).limit(1000),
      svc.from('weekly_cycles').select('*').order('created_at', { ascending: false }).limit(1000),
      svc.from('alerts').select('*').eq('status', 'open'),
      svc.from('inventory').select('*'),
    ]);

    // deno-lint-ignore no-explicit-any
    const genById: Record<string, any> = {}; (generations || []).forEach((g) => { genById[g.id] = g; });
    // deno-lint-ignore no-explicit-any
    const dayByNumber: Record<number, any> = {}; (programDays || []).forEach((pd) => { dayByNumber[pd.day_number] = pd; });

    const hasOpenAlert = (type: string, clientaId: string | null, cycleKey: string | null) =>
      (openAlerts || []).some((a) => a.type === type && (a.clienta_id || null) === (clientaId || null) && (a.cycle_key || null) === (cycleKey || null));

    let created = 0;
    async function createAlert(type: string, clientaId: string | null, aliadaId: string | null, reason: string, severity: string, cycleKey: string | null) {
      if (hasOpenAlert(type, clientaId, cycleKey)) return false;
      const { error } = await svc.from('alerts').insert({
        type, clienta_id: clientaId || null, aliada_id: aliadaId || null,
        reason, severity, cycle_key: cycleKey || null, status: 'open', created_at: nowISO,
      });
      if (error) return false;
      created++;
      return true;
    }

    for (const cp of profiles || []) {
      const clientaId = cp.user_id;
      if (!clientaId) continue;
      const aliadaId = cp.aliada_id || null;

      if (cp.status === 'pending') {
        const enr = (enrollments || []).find((e) => e.clienta_id === clientaId && (e.status === 'active' || e.status === 'pending'));
        const start = enr && (enr.start_date || (enr.generation_id && genById[enr.generation_id] && genById[enr.generation_id].start_date));
        if (start && daysBetween(effectiveDate, start) <= 3) {
          await createAlert('prep_incomplete', clientaId, aliadaId, `Preparación incompleta; inicio programado ${start}`, 'high', start);
        }
        continue;
      }

      if (cp.status !== 'active') continue;
      const enrollment = (enrollments || []).find((e) => e.clienta_id === clientaId && e.status === 'active');
      if (!enrollment) continue;
      const generation = enrollment.generation_id ? genById[enrollment.generation_id] : null;
      const startDate = (generation && generation.start_date) || enrollment.start_date;
      if (!startDate) continue;
      const diff = daysBetween(startDate, effectiveDate) + 1;
      const currentDayNumber = diff < 1 ? 0 : Math.min(90, diff);
      const weekNumber = currentDayNumber <= 77 ? Math.ceil(currentDayNumber / 7) : 12;
      const weekCycleKey = `w${weekNumber}`;

      if (currentDayNumber >= 2) {
        const prevDay = dayByNumber[currentDayNumber - 1];
        if (prevDay) {
          const prevCheckin = (checkins || []).find((ch) => ch.clienta_id === clientaId && ch.program_day_id === prevDay.id);
          if (!prevCheckin || !prevCheckin.completed) {
            await createAlert('incomplete_previous_day', clientaId, aliadaId, `Día ${currentDayNumber - 1} no completado`, 'medium', `d${currentDayNumber - 1}`);
          }
        }
      }

      const cCheckins = (checkins || []).filter((ch) => ch.clienta_id === clientaId);
      const cVps = (vps || []).filter((v) => v.clienta_id === clientaId);
      const hasHistory = cCheckins.length > 0 || cVps.length > 0;
      if (hasHistory && currentDayNumber >= 1) {
        let lastActivity: string | null = null;
        for (const ch of cCheckins) { const d = ch.updated_at || ch.created_at; if (d && (!lastActivity || d > lastActivity)) lastActivity = d; }
        for (const v of cVps) { const d = v.last_saved_at || v.updated_at || v.created_at; if (d && (!lastActivity || d > lastActivity)) lastActivity = d; }
        if (lastActivity) {
          const lastDate = String(lastActivity).slice(0, 10);
          if (daysBetween(lastDate, effectiveDate) >= 2) {
            await createAlert('no_activity', clientaId, aliadaId, `Sin actividad desde ${lastDate} (2+ días)`, 'medium', effectiveDate);
          }
        }
      }

      const sortedCheckins = [...cCheckins].sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''));
      const latest = sortedCheckins[0] || null;
      if (latest && latest.emotional_state && DIFFICULT.includes(latest.emotional_state)) {
        await createAlert('con_dificultad', clientaId, aliadaId, `Estado emocional: ${latest.emotional_state}`, 'high', effectiveDate);
      }

      if (weekNumber) {
        const weekEndDay = weekNumber <= 11 ? weekNumber * 7 : 90;
        const daysToEnd = weekEndDay - currentDayNumber;
        if (daysToEnd >= 0 && daysToEnd <= 2) {
          await createAlert('week_ending_soon', clientaId, aliadaId, `Termina semana ${weekNumber} en ${daysToEnd} día(s)`, 'low', weekCycleKey);
        }
      }

      const clientCycles = (cycles || []).filter((c) => c.journey_id === enrollment.id);
      const latestCycleWeek = clientCycles.reduce((m, c) => Math.max(m, c.week_number || 0), 0);
      if (weekNumber && latestCycleWeek && latestCycleWeek < weekNumber) {
        await createAlert('week_ended_no_renewal', clientaId, aliadaId, `Semana ${latestCycleWeek} terminó; sin Kit de la semana ${weekNumber}`, 'high', weekCycleKey);
      }
    }

    for (const inv of (inventory || [])) {
      const avail = inv.available || 0;
      if (avail <= 3) {
        const key = `${inv.intensity}:${effectiveDate}`;
        await createAlert('low_inventory', null, null, `Inventario bajo: ${inv.intensity} (${avail} disp.)`, avail <= 0 ? 'high' : 'medium', key);
      }
    }

    return Response.json({ effective_date: effectiveDate, using_simulated: usingSimulated, alerts_created: created });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
