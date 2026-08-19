import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Generación diaria de alertas preventivas para clientas activas.
// Tipos: incomplete_previous_day, no_activity, con_dificultad,
// week_ending_soon, week_ended_no_renewal, prep_incomplete, low_inventory.
// Dedupe: no crea alerta abierta duplicada para mismo tipo + clienta + ciclo (cycle_key).

function toISOInTZ(date, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(date);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  const hh = map.hour === '24' ? '00' : map.hour;
  return `${map.year}-${map.month}-${map.day}T${hh}:${map.minute}:${map.second}`;
}
function daysBetween(aStr, bStr) {
  const [y1, m1, d1] = aStr.split('-').map(Number);
  const [y2, m2, d2] = bStr.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}
const DIFFICULT = ['low', 'bad'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (e) {}
    if (user) {
      const appRole = user.app_role || (user.data && user.data.app_role);
      if (appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const s = settings && settings[0];
    const tz = (s && s.timezone) || 'America/Mexico_City';
    const usingSimulated = !!(s && s.test_mode && s.simulated_datetime);
    const nowISO = usingSimulated ? String(s.simulated_datetime).slice(0, 19) : toISOInTZ(new Date(), tz);
    const effectiveDate = nowISO.slice(0, 10);

    const [profiles, enrollments, generations, programDays, checkins, vps, cycles, openAlerts, inventory] = await Promise.all([
      base44.asServiceRole.entities.ClientaProfile.list('-created_date', 500),
      base44.asServiceRole.entities.Enrollment.list('-created_date', 500),
      base44.asServiceRole.entities.Generation.list('-created_date', 200),
      base44.asServiceRole.entities.ProgramDay.list('day_number', 200),
      base44.asServiceRole.entities.DailyCheckin.list('-created_date', 1000),
      base44.asServiceRole.entities.VideoProgress.list('-created_date', 1000),
      base44.asServiceRole.entities.WeeklyCycle.list('-created_date', 1000),
      base44.asServiceRole.entities.Alert.filter({ status: 'open' }),
      base44.asServiceRole.entities.Inventory.list(),
    ]);

    const genById = {}; generations.forEach((g) => { genById[g.id] = g; });
    const dayByNumber = {}; programDays.forEach((pd) => { dayByNumber[pd.day_number] = pd; });

    const hasOpenAlert = (type, clientaId, cycleKey) =>
      openAlerts.some((a) => a.type === type && (a.clienta_id || null) === (clientaId || null) && (a.cycle_key || null) === (cycleKey || null));

    let created = 0;
    async function createAlert(type, clientaId, aliadaId, reason, severity, cycleKey) {
      if (hasOpenAlert(type, clientaId, cycleKey)) return false;
      try {
        await base44.asServiceRole.entities.Alert.create({
          type, clienta_id: clientaId || null, aliada_id: aliadaId || null,
          reason, severity, cycle_key: cycleKey || null, status: 'open', created_at: nowISO,
        });
        created++;
        return true;
      } catch (e) { return false; }
    }

    for (const cp of profiles) {
      const clientaId = cp.user_id;
      if (!clientaId) continue;
      const aliadaId = cp.aliada_id || null;

      // Preparación pendiente antes del lunes (clienta pendiente con inscripción próxima)
      if (cp.status === 'pending') {
        const enr = enrollments.find((e) => e.clienta_id === clientaId && (e.status === 'active' || e.status === 'pending'));
        const start = enr && (enr.start_date || (enr.generation_id && genById[enr.generation_id] && genById[enr.generation_id].start_date));
        if (start && daysBetween(effectiveDate, start) <= 3) {
          await createAlert('prep_incomplete', clientaId, aliadaId, `Preparación incompleta; inicio programado ${start}`, 'high', start);
        }
        continue; // los demás tipos aplican a clientas activas
      }

      if (cp.status !== 'active') continue;
      const enrollment = enrollments.find((e) => e.clienta_id === clientaId && e.status === 'active');
      if (!enrollment) continue;
      const generation = enrollment.generation_id ? genById[enrollment.generation_id] : null;
      const startDate = (generation && generation.start_date) || enrollment.start_date;
      if (!startDate) continue;
      const diff = daysBetween(startDate, effectiveDate) + 1;
      const currentDayNumber = diff < 1 ? 0 : Math.min(90, diff);
      const weekNumber = currentDayNumber <= 77 ? Math.ceil(currentDayNumber / 7) : 12;
      const weekCycleKey = `w${weekNumber}`;

      // 1. Día anterior incompleto
      if (currentDayNumber >= 2) {
        const prevDay = dayByNumber[currentDayNumber - 1];
        if (prevDay) {
          const prevCheckin = checkins.find((ch) => ch.clienta_id === clientaId && ch.program_day_id === prevDay.id);
          if (!prevCheckin || !prevCheckin.completed) {
            await createAlert('incomplete_previous_day', clientaId, aliadaId, `Día ${currentDayNumber - 1} no completado`, 'medium', `d${currentDayNumber - 1}`);
          }
        }
      }

      // 2. Dos días sin actividad
      const cCheckins = checkins.filter((ch) => ch.clienta_id === clientaId);
      const cVps = vps.filter((v) => v.clienta_id === clientaId);
      const hasHistory = cCheckins.length > 0 || cVps.length > 0;
      if (hasHistory && currentDayNumber >= 1) {
        let lastActivity = null;
        for (const ch of cCheckins) { const d = ch.updated_date || ch.created_date; if (d && (!lastActivity || d > lastActivity)) lastActivity = d; }
        for (const v of cVps) { const d = v.last_saved_at || v.updated_date || v.created_date; if (d && (!lastActivity || d > lastActivity)) lastActivity = d; }
        if (lastActivity) {
          const lastDate = String(lastActivity).slice(0, 10);
          if (daysBetween(lastDate, effectiveDate) >= 2) {
            await createAlert('no_activity', clientaId, aliadaId, `Sin actividad desde ${lastDate} (2+ días)`, 'medium', effectiveDate);
          }
        }
      }

      // 3. Con dificultad (estado emocional bajo en check-in más reciente)
      const sortedCheckins = [...cCheckins].sort((a, b) => (b.updated_date || '').localeCompare(a.updated_date || ''));
      const latest = sortedCheckins[0] || null;
      if (latest && latest.emotional_state && DIFFICULT.includes(latest.emotional_state)) {
        await createAlert('con_dificultad', clientaId, aliadaId, `Estado emocional: ${latest.emotional_state}`, 'high', effectiveDate);
      }

      // 4. Tres días antes de terminar semana
      if (weekNumber) {
        const weekEndDay = weekNumber <= 11 ? weekNumber * 7 : 90;
        const daysToEnd = weekEndDay - currentDayNumber;
        if (daysToEnd >= 0 && daysToEnd <= 2) {
          await createAlert('week_ending_soon', clientaId, aliadaId, `Termina semana ${weekNumber} en ${daysToEnd} día(s)`, 'low', weekCycleKey);
        }
      }

      // 5. Terminó semana sin renovación
      const clientCycles = cycles.filter((c) => c.journey_id === enrollment.id);
      const latestCycleWeek = clientCycles.reduce((m, c) => Math.max(m, c.week_number || 0), 0);
      if (weekNumber && latestCycleWeek && latestCycleWeek < weekNumber) {
        await createAlert('week_ended_no_renewal', clientaId, aliadaId, `Semana ${latestCycleWeek} terminó; sin Kit de la semana ${weekNumber}`, 'high', weekCycleKey);
      }
    }

    // 6. Inventario bajo (por intensidad, sin clienta)
    for (const inv of (inventory || [])) {
      const avail = inv.available || 0;
      if (avail <= 3) {
        const key = `${inv.intensity}:${effectiveDate}`;
        await createAlert('low_inventory', null, null, `Inventario bajo: ${inv.intensity} (${avail} disp.)`, avail <= 0 ? 'high' : 'medium', key);
      }
    }

    return Response.json({ effective_date: effectiveDate, using_simulated: usingSimulated, alerts_created: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});