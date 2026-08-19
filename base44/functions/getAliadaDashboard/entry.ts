import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const DIFFICULT_EMOTIONS = ['low', 'bad'];

function daysBetween(startDateStr, todayStr) {
  const [y1, m1, d1] = startDateStr.split('-').map(Number);
  const [y2, m2, d2] = todayStr.split('-').map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') {
      return Response.json({ error: 'Forbidden — only aliadas or admins' }, { status: 403 });
    }

    // Reuse existing aggregated data (checkins already have emotional_comment filtered by share_with_aliada)
    let base;
    try {
      const baseRes = await base44.functions.invoke('getAliadaClientData', {});
      base = baseRes?.data;
    } catch (e) {
      const msg = (e && e.response && e.response.data && e.response.data.error) || (e && e.message) || 'Sin datos de aliada';
      const status = (e && e.response && e.response.status) || 404;
      return Response.json({ error: msg }, { status });
    }
    if (!base || base.error) return Response.json({ error: base?.error || 'Sin datos de aliada' }, { status: 500 });

    const aliadaProfile = base.aliada_profile;
    const clientas = base.clientas || [];

    // Reuse the effective clock (real MX date, or simulated in test mode)
    const nowRes = await base44.functions.invoke('getEffectiveNow', {});
    const now = nowRes?.data || {};
    const effectiveDate = now.date;

    // ProgramDay lookup tables
    const programDays = await base44.asServiceRole.entities.ProgramDay.list('-day_number', 200);
    const dayByNumber = {};
    for (const pd of programDays) dayByNumber[pd.day_number] = pd;

    // Generation cache
    const generationCache = {};
    async function getGeneration(id) {
      if (!id) return null;
      if (generationCache[id] === undefined) {
        try { generationCache[id] = await base44.asServiceRole.entities.Generation.get(id); } catch (e) { generationCache[id] = null; }
      }
      return generationCache[id];
    }

    // Fetch User records (full_name + phone) for each clienta — aliada role can't read Users directly
    const userById = {};
    for (const c of clientas) {
      const uid = c.clienta_profile && c.clienta_profile.user_id;
      if (!uid || userById[uid] !== undefined) continue;
      try { userById[uid] = await base44.asServiceRole.entities.User.get(uid); } catch (e) { userById[uid] = null; }
    }

    const enriched = [];
    for (const c of clientas) {
      const cp = c.clienta_profile;
      const uid = cp.user_id;
      const u = userById[uid] || {};
      const fullName = u.full_name || (u.data && u.data.full_name) || null;
      const phone = (u.data && (u.data.phone || u.data.whatsapp)) || null;

      const enrollments = c.enrollments || [];
      const activeEnrollment = enrollments.find(e => e.status === 'active') || enrollments[0] || null;
      const generation = activeEnrollment ? await getGeneration(activeEnrollment.generation_id) : null;
      const startDate = (generation && generation.start_date) || (activeEnrollment && activeEnrollment.start_date) || null;

      let currentDayNumber = null;
      if (startDate) {
        const diff = daysBetween(startDate, effectiveDate) + 1;
        currentDayNumber = diff < 1 ? 0 : Math.min(90, diff);
      }

      let weekNumber = null;
      if (currentDayNumber && currentDayNumber >= 1) {
        weekNumber = currentDayNumber <= 77 ? Math.ceil(currentDayNumber / 7) : 12;
      }
      let cycles = [];
      if (activeEnrollment) {
        try { cycles = await base44.asServiceRole.entities.WeeklyCycle.filter({ journey_id: activeEnrollment.id }); } catch (e) { cycles = []; }
      }
      const currentCycle = weekNumber ? cycles.find((cy) => cy.week_number === weekNumber) : null;
      const latestCycleWeek = cycles.reduce((m, cy) => Math.max(m, cy.week_number || 0), 0);
      const intensity = (currentCycle && currentCycle.intensity) || (activeEnrollment && activeEnrollment.intensity) || null;
      const weekEndingSoon = !!(weekNumber && (
        (weekNumber <= 11 && (currentDayNumber % 7 === 6 || currentDayNumber % 7 === 0)) ||
        (weekNumber === 12 && currentDayNumber >= 89)
      ));
      const weekEndedNoRenewal = !!(weekNumber && latestCycleWeek && latestCycleWeek < weekNumber);
      let renovationDueDate = null;
      if (startDate && weekNumber) {
        const weekEndDay = weekNumber <= 11 ? weekNumber * 7 : 90;
        const [y, m, d] = startDate.split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d));
        dt.setUTCDate(dt.getUTCDate() + (weekEndDay - 1));
        renovationDueDate = dt.toISOString().slice(0, 10);
      }
      const latestMetrics = (c.weekly_metrics && c.weekly_metrics.length)
        ? [...c.weekly_metrics].sort((a, b) => (b.updated_date || '').localeCompare(a.updated_date || ''))[0]
        : null;

      const todayProgramDay = currentDayNumber != null ? dayByNumber[currentDayNumber] : null;
      const vps = c.video_progress || [];
      const checkins = c.daily_checkins || [];

      const todayVP = todayProgramDay ? vps.find(v => v.program_day_id === todayProgramDay.id) : null;
      const validPercent = todayVP ? (todayVP.valid_percent || 0) : 0;
      const videoCompleted = !!(todayVP && todayVP.completed);

      const todayCheckin = todayProgramDay ? checkins.find(ch => ch.program_day_id === todayProgramDay.id) : null;
      let checkinStatus = 'none';
      if (todayCheckin) checkinStatus = todayCheckin.completed ? 'completed' : 'in_progress';

      // Most recent checkin (for emotional state + activity signals)
      const sortedCheckins = [...checkins].sort((a, b) => (b.updated_date || '').localeCompare(a.updated_date || ''));
      const latestCheckin = sortedCheckins[0] || null;
      const emotionalState = (todayCheckin && todayCheckin.emotional_state) || (latestCheckin && latestCheckin.emotional_state) || null;
      // emotional_comment only when shared (already filtered by getAliadaClientData)
      const emotionalComment = (todayCheckin && todayCheckin.emotional_comment) || null;

      // Previous day incomplete
      let incompletePreviousDay = false;
      if (currentDayNumber != null && currentDayNumber >= 2) {
        const prevDay = dayByNumber[currentDayNumber - 1];
        if (prevDay) {
          const prevCheckin = checkins.find(ch => ch.program_day_id === prevDay.id);
          incompletePreviousDay = !(prevCheckin && prevCheckin.completed);
        }
      }

      const conDificultad = !!(emotionalState && DIFFICULT_EMOTIONS.includes(emotionalState));

      // Last activity date (checkin or video), calendar day
      const latestCheckinDate = latestCheckin ? (latestCheckin.updated_date || latestCheckin.created_date || null) : null;
      let latestVideoDate = null;
      for (const v of vps) {
        const d = v.last_saved_at || v.updated_date || v.created_date;
        if (d && (!latestVideoDate || d > latestVideoDate)) latestVideoDate = d;
      }
      let lastActivityDate = latestCheckinDate;
      if (latestVideoDate && (!lastActivityDate || latestVideoDate > lastActivityDate)) lastActivityDate = latestVideoDate;
      lastActivityDate = lastActivityDate ? String(lastActivityDate).slice(0, 10) : null;

      const hasHistory = checkins.length > 0 || vps.length > 0;
      let inactive2Days = false;
      if (hasHistory && lastActivityDate && currentDayNumber != null && currentDayNumber >= 1) {
        inactive2Days = daysBetween(lastActivityDate, effectiveDate) >= 2;
      }

      const alerts = c.alerts || [];
      const topAlert = alerts[0] || null;

      enriched.push({
        clienta_id: uid,
        clienta_profile_id: cp.id,
        full_name: fullName,
        phone,
        status: cp.status,
        safety_flag: !!cp.safety_flag,
        current_day_number: currentDayNumber,
        start_date: startDate,
        valid_percent: validPercent,
        video_completed: videoCompleted,
        checkin_status: checkinStatus,
        emotional_state: emotionalState,
        emotional_comment: emotionalComment,
        incomplete_previous_day: incompletePreviousDay,
        con_dificultad: conDificultad,
        inactive_2_days: inactive2Days,
        week_ending_soon: weekEndingSoon,
        week_ended_no_renewal: weekEndedNoRenewal,
        prep_pending: cp.status === 'pending',
        generation_name: generation ? generation.name : null,
        intensity,
        week_number: weekNumber,
        renovation_due_date: renovationDueDate,
        latest_metrics: latestMetrics ? { weight: latestMetrics.weight, waist: latestMetrics.waist, energy: latestMetrics.energy, sleep: latestMetrics.sleep, created_date: latestMetrics.created_date } : null,
        last_activity_date: lastActivityDate,
        has_history: hasHistory,
        alert: topAlert ? { type: topAlert.type, reason: topAlert.reason, severity: topAlert.severity } : null,
        open_alerts_count: alerts.length,
        enrollment: activeEnrollment ? { intensity: activeEnrollment.intensity, status: activeEnrollment.status } : null,
      });
    }

    // Low inventory (any intensity available <= 3)
    let lowInventory = [];
    try {
      const invs = await base44.asServiceRole.entities.Inventory.list();
      lowInventory = (invs || []).filter((i) => (i.available || 0) <= 3).map((i) => ({ intensity: i.intensity, available: i.available || 0, status: i.status }));
    } catch (e) { /* noop */ }

    // Prospects with overdue next action (aliada's own prospects)
    let prospectOverdue = [];
    try {
      const prosp = await base44.asServiceRole.entities.Prospect.filter({ aliada_id: aliadaProfile.id });
      const closed = ['compra_realizada', 'no_interesado', 'seguimiento_futuro'];
      prospectOverdue = (prosp || [])
        .filter((p) => p.next_action_date && p.next_action_date < effectiveDate && !closed.includes(p.status))
        .map((p) => ({ id: p.id, nombre: p.nombre, telefono: p.telefono, next_action: p.next_action, next_action_date: p.next_action_date, status: p.status }));
    } catch (e) { /* noop */ }

    return Response.json({
      aliada_profile: aliadaProfile,
      effective_date: effectiveDate,
      using_simulated: now.using_simulated || false,
      clientas: enriched,
      total_clientas: enriched.length,
      low_inventory: lowInventory,
      prospect_overdue: prospectOverdue,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});