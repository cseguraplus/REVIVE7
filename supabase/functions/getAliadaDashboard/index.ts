import { getUserAndProfile, serviceClient, getAuthUserMeta } from '../_shared/auth.ts';
import { computeAliadaClientData } from '../_shared/aliadaClientData.ts';
import { getEffectiveNow } from '../_shared/effectiveNow.ts';
import { daysBetween } from '../_shared/dates.ts';

const DIFFICULT_EMOTIONS = ['low', 'bad'];

Deno.serve(async (req) => {
  try {
    const user = await getUserAndProfile(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const appRole = user.app_role;
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') {
      return Response.json({ error: 'Forbidden — only aliadas or admins' }, { status: 403 });
    }

    const svc = serviceClient();

    const base = await computeAliadaClientData(svc, user.id);
    if (base.error) return Response.json({ error: base.error }, { status: base.status });

    const aliadaProfile = base.body.aliada_profile;
    const clientas = base.body.clientas || [];

    const now = await getEffectiveNow(svc, user);
    const effectiveDate = now.date;

    const { data: programDays } = await svc.from('program_days').select('*').order('day_number', { ascending: false }).limit(200);
    // deno-lint-ignore no-explicit-any
    const dayByNumber: Record<number, any> = {};
    for (const pd of programDays || []) dayByNumber[pd.day_number] = pd;

    // deno-lint-ignore no-explicit-any
    const generationCache: Record<string, any> = {};
    async function getGeneration(id: string | null) {
      if (!id) return null;
      if (generationCache[id] === undefined) {
        const { data } = await svc.from('generations').select('*').eq('id', id).maybeSingle();
        generationCache[id] = data || null;
      }
      return generationCache[id];
    }

    // full_name/phone viven en auth.users.user_metadata (Register.jsx), no en profiles
    const metaByUid: Record<string, { full_name: string | null; phone: string | null }> = {};
    for (const c of clientas) {
      const uid = c.clienta_profile && c.clienta_profile.user_id;
      if (!uid || metaByUid[uid] !== undefined) continue;
      metaByUid[uid] = await getAuthUserMeta(svc, uid);
    }

    // deno-lint-ignore no-explicit-any
    const enriched: any[] = [];
    for (const c of clientas) {
      const cp = c.clienta_profile;
      const uid = cp.user_id;
      const meta = metaByUid[uid] || { full_name: null, phone: null };

      const enrollments = c.enrollments || [];
      const activeEnrollment = enrollments.find((e: { status: string }) => e.status === 'active') || enrollments[0] || null;
      const generation = activeEnrollment ? await getGeneration(activeEnrollment.generation_id) : null;
      const startDate = (generation && generation.start_date) || (activeEnrollment && activeEnrollment.start_date) || null;

      let currentDayNumber: number | null = null;
      if (startDate) {
        const diff = daysBetween(startDate, effectiveDate) + 1;
        currentDayNumber = diff < 1 ? 0 : Math.min(90, diff);
      }

      let weekNumber: number | null = null;
      if (currentDayNumber && currentDayNumber >= 1) {
        weekNumber = currentDayNumber <= 77 ? Math.ceil(currentDayNumber / 7) : 12;
      }
      let cycles: { week_number: number; intensity: string }[] = [];
      if (activeEnrollment) {
        const { data } = await svc.from('weekly_cycles').select('*').eq('journey_id', activeEnrollment.id);
        cycles = data || [];
      }
      const currentCycle = weekNumber ? cycles.find((cy) => cy.week_number === weekNumber) : null;
      const latestCycleWeek = cycles.reduce((m, cy) => Math.max(m, cy.week_number || 0), 0);
      const intensity = (currentCycle && currentCycle.intensity) || (activeEnrollment && activeEnrollment.intensity) || null;
      const weekEndingSoon = !!(weekNumber && (
        (weekNumber <= 11 && (currentDayNumber! % 7 === 6 || currentDayNumber! % 7 === 0)) ||
        (weekNumber === 12 && currentDayNumber! >= 89)
      ));
      const weekEndedNoRenewal = !!(weekNumber && latestCycleWeek && latestCycleWeek < weekNumber);
      let renovationDueDate: string | null = null;
      if (startDate && weekNumber) {
        const weekEndDay = weekNumber <= 11 ? weekNumber * 7 : 90;
        const [y, m, d] = startDate.split('-').map(Number);
        const dt = new Date(Date.UTC(y, m - 1, d));
        dt.setUTCDate(dt.getUTCDate() + (weekEndDay - 1));
        renovationDueDate = dt.toISOString().slice(0, 10);
      }
      const latestMetrics = (c.weekly_metrics && c.weekly_metrics.length)
        ? [...c.weekly_metrics].sort((a: { updated_at?: string }, b: { updated_at?: string }) => (b.updated_at || '').localeCompare(a.updated_at || ''))[0]
        : null;

      const todayProgramDay = currentDayNumber != null ? dayByNumber[currentDayNumber] : null;
      const vps = c.video_progress || [];
      const checkins = c.daily_checkins || [];

      const todayVP = todayProgramDay ? vps.find((v: { program_day_id: string }) => v.program_day_id === todayProgramDay.id) : null;
      const validPercent = todayVP ? (todayVP.valid_percent || 0) : 0;
      const videoCompleted = !!(todayVP && todayVP.completed);

      const todayCheckin = todayProgramDay ? checkins.find((ch: { program_day_id: string }) => ch.program_day_id === todayProgramDay.id) : null;
      let checkinStatus = 'none';
      if (todayCheckin) checkinStatus = todayCheckin.completed ? 'completed' : 'in_progress';

      const sortedCheckins = [...checkins].sort((a: { updated_at?: string }, b: { updated_at?: string }) => (b.updated_at || '').localeCompare(a.updated_at || ''));
      const latestCheckin = sortedCheckins[0] || null;
      const emotionalState = (todayCheckin && todayCheckin.emotional_state) || (latestCheckin && latestCheckin.emotional_state) || null;
      const emotionalComment = (todayCheckin && todayCheckin.emotional_comment) || null;

      let incompletePreviousDay = false;
      if (currentDayNumber != null && currentDayNumber >= 2) {
        const prevDay = dayByNumber[currentDayNumber - 1];
        if (prevDay) {
          const prevCheckin = checkins.find((ch: { program_day_id: string }) => ch.program_day_id === prevDay.id);
          incompletePreviousDay = !(prevCheckin && prevCheckin.completed);
        }
      }

      const conDificultad = !!(emotionalState && DIFFICULT_EMOTIONS.includes(emotionalState));

      const latestCheckinDate = latestCheckin ? (latestCheckin.updated_at || latestCheckin.created_at || null) : null;
      let latestVideoDate: string | null = null;
      for (const v of vps) {
        const d = v.last_saved_at || v.updated_at || v.created_at;
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
        full_name: meta.full_name,
        phone: meta.phone,
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
        latest_metrics: latestMetrics ? { weight: latestMetrics.weight, waist: latestMetrics.waist, energy: latestMetrics.energy, sleep: latestMetrics.sleep, created_date: latestMetrics.created_at } : null,
        last_activity_date: lastActivityDate,
        has_history: hasHistory,
        alert: topAlert ? { type: topAlert.type, reason: topAlert.reason, severity: topAlert.severity } : null,
        open_alerts_count: alerts.length,
        enrollment: activeEnrollment ? { intensity: activeEnrollment.intensity, status: activeEnrollment.status } : null,
      });
    }

    let lowInventory: { intensity: string; available: number; status: string }[] = [];
    const { data: invs } = await svc.from('inventory').select('*');
    lowInventory = (invs || []).filter((i) => (i.available || 0) <= 3).map((i) => ({ intensity: i.intensity, available: i.available || 0, status: i.status }));

    let prospectOverdue: { id: string; nombre: string; telefono: string; next_action: string; next_action_date: string; status: string }[] = [];
    const { data: prosp } = await svc.from('prospects').select('*').eq('aliada_id', aliadaProfile.id);
    const closed = ['compra_realizada', 'no_interesado', 'seguimiento_futuro'];
    prospectOverdue = (prosp || [])
      .filter((p) => p.next_action_date && p.next_action_date < effectiveDate && !closed.includes(p.status))
      .map((p) => ({ id: p.id, nombre: p.nombre, telefono: p.telefono, next_action: p.next_action, next_action_date: p.next_action_date, status: p.status }));

    return Response.json({
      aliada_profile: aliadaProfile,
      effective_date: effectiveDate,
      using_simulated: now.usingSimulated || false,
      clientas: enriched,
      total_clientas: enriched.length,
      low_inventory: lowInventory,
      prospect_overdue: prospectOverdue,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
