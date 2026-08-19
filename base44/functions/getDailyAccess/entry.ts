import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const OBJECTIVES = [
  'objective_video', 'objective_dailypacks', 'objective_hydration',
  'objective_nutrition', 'objective_movement', 'objective_rest',
];

function toISOInTZ(date, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(date);
  const map = {};
  for (const p of parts) map[p.type] = p.value;
  const hh = map.hour === '24' ? '00' : map.hour;
  return `${map.year}-${map.month}-${map.day}T${hh}:${map.minute}:${map.second}`;
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}

function daysBetween(startDateStr, todayStr) {
  const [y1, m1, d1] = startDateStr.split('-').map(Number);
  const [y2, m2, d2] = todayStr.split('-').map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.round((b - a) / 86400000);
}

// Mirrors getEffectiveNow inline (no local imports allowed).
// Per-account TestControl — simulated date only affects is_test_account users.
async function getEffectiveNowInternal(base44, user) {
  const settings = await base44.asServiceRole.entities.AppSettings.list();
  const s = settings && settings[0];
  const tz = (s && s.timezone) || 'America/Mexico_City';
  const isTestAccount = !!(user.is_test_account || (user.data && user.data.is_test_account));
  let usingSimulated = false;
  let nowISO;
  if (isTestAccount) {
    const tcs = await base44.asServiceRole.entities.TestControl.filter({ user_id: user.id });
    const tc = tcs && tcs[0];
    if (tc && tc.enabled && tc.effective_datetime) {
      usingSimulated = true;
      nowISO = String(tc.effective_datetime).slice(0, 19);
    }
  }
  if (!usingSimulated) { nowISO = toISOInTZ(new Date(), tz); }
  return { now: nowISO, date: nowISO.slice(0, 10), tz, testMode: false, simulated: null, isTestUser: isTestAccount, usingSimulated };
}

// Computes the access status for a single program day
async function computeDayStatus(base44, clientaId, enrollment, generation, programDay, effective) {
  if (!programDay) return { status: 'not_found', day_number: null };

  const dayNumber = programDay.day_number;
  const dayType = programDay.day_type;
  const startDate = (generation && generation.start_date) || (enrollment && enrollment.start_date);
  const isWelcome = dayType === 'welcome' || dayType === 'intro' || dayNumber === 0;

  const checkins = await base44.asServiceRole.entities.DailyCheckin.filter({ clienta_id: clientaId, program_day_id: programDay.id });
  const checkin = checkins && checkins[0];
  const checkinCompleted = !!(checkin && checkin.completed);

  const vps = await base44.asServiceRole.entities.VideoProgress.filter({ clienta_id: clientaId, program_day_id: programDay.id });
  const vp = vps && vps[0];
  const videoCompleted = !!(vp && vp.completed);

  let objectivesDone = false;
  let emotionalSet = false;
  if (checkin) {
    objectivesDone = OBJECTIVES.every((k) => checkin[k] === true);
    emotionalSet = !!checkin.emotional_state;
  }
  const completable = videoCompleted && objectivesDone && emotionalSet && !checkinCompleted;

  let availableFrom = null;
  let status;
  let previousDayCompleted = true;

  if (isWelcome) {
    // Welcome is available before starting
    status = checkinCompleted ? 'completed' : 'available';
  } else if (!startDate) {
    status = 'locked_date';
  } else {
    availableFrom = addDays(startDate, dayNumber - 1); // Day 1 from start_date, Day N from start_date + (N-1)
    if (effective.date < availableFrom) {
      status = 'locked_date';
    } else {
      // Day N (N>=2) requires Day N-1 completed
      if (dayNumber >= 2) {
        const prevDays = await base44.asServiceRole.entities.ProgramDay.filter({ day_number: dayNumber - 1 });
        const prevDay = prevDays && prevDays[0];
        if (prevDay) {
          const prevCheckins = await base44.asServiceRole.entities.DailyCheckin.filter({ clienta_id: clientaId, program_day_id: prevDay.id });
          previousDayCompleted = !!(prevCheckins && prevCheckins[0] && prevCheckins[0].completed);
        } else {
          previousDayCompleted = false;
        }
      }
      if (!previousDayCompleted) {
        status = 'locked_previous';
      } else if (checkinCompleted) {
        status = 'completed';
      } else {
        const started = !!(vp || (checkin && (OBJECTIVES.some((k) => checkin[k] === true) || emotionalSet)));
        status = started ? 'in_progress' : 'available';
      }
    }
  }

  return {
    status,
    day_number: dayNumber,
    day_type: dayType,
    title: programDay.title,
    summary: programDay.summary,
    program_day_id: programDay.id,
    vimeo_video_id: programDay.vimeo_video_id,
    vimeo_url: programDay.vimeo_url,
    vimeo_privacy_hash: programDay.vimeo_privacy_hash,
    required_percent: programDay.required_percent,
    available_from: availableFrom,
    video_completed: videoCompleted,
    objectives_done: objectivesDone,
    emotional_state_set: emotionalSet,
    checkin_completed: checkinCompleted,
    completable,
    previous_day_completed: previousDayCompleted,
    checkin_id: checkin ? checkin.id : null,
    emotional_state: checkin ? checkin.emotional_state : null,
    share_with_aliada: checkin ? checkin.share_with_aliada : true,
    objectives: OBJECTIVES.reduce((o, k) => { o[k] = !!(checkin && checkin[k]); return o; }, {}),
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const appRole = user.app_role || (user.data && user.data.app_role);
    const body = await req.json().catch(() => ({}));
    const clientaId = body.clientaId || user.id;

    const isOwner = user.id === clientaId;
    const isAdmin = appRole === 'superadmin' || appRole === 'operaciones';
    if (!isOwner && !isAdmin) return Response.json({ error: 'Forbidden' }, { status: 403 });

    const effective = await getEffectiveNowInternal(base44, user);

    // Find the clienta's active enrollment (or use the one provided)
    let enrollment = null;
    if (body.enrollmentId) {
      try { enrollment = await base44.asServiceRole.entities.Enrollment.get(body.enrollmentId); } catch (e) { enrollment = null; }
    }
    if (!enrollment) {
      const enrolls = await base44.asServiceRole.entities.Enrollment.filter({ clienta_id: clientaId, status: 'active' });
      enrollment = enrolls && enrolls[0];
    }

    let generation = null;
    if (enrollment && enrollment.generation_id) {
      try { generation = await base44.asServiceRole.entities.Generation.get(enrollment.generation_id); } catch (e) { generation = null; }
    }

    const startDate = (generation && generation.start_date) || (enrollment && enrollment.start_date);
    let currentDayNumber = null;
    if (startDate) {
      const diff = daysBetween(startDate, effective.date) + 1;
      currentDayNumber = diff < 1 ? 0 : Math.min(90, diff);
    }
    // Admin override: force a specific day for this clienta (testing)
    const overrideDay = enrollment && enrollment.override_day_number != null ? enrollment.override_day_number : null;
    if (overrideDay != null) currentDayNumber = overrideDay;

    // Day to evaluate: explicit dayNumber, else today's day (possibly overridden), else welcome (0)
    let dayNumber = (typeof body.dayNumber === 'number') ? body.dayNumber : currentDayNumber;

    let dayStatus;
    let nextDayStatus = null;

    if (dayNumber == null || dayNumber === 0) {
      const welcomeDays = await base44.asServiceRole.entities.ProgramDay.filter({ day_number: 0 });
      const welcomeDay = welcomeDays && welcomeDays[0];
      dayStatus = await computeDayStatus(base44, clientaId, enrollment, generation, welcomeDay, effective);
    } else {
      const days = await base44.asServiceRole.entities.ProgramDay.filter({ day_number: dayNumber });
      const programDay = days && days[0];
      dayStatus = await computeDayStatus(base44, clientaId, enrollment, generation, programDay, effective);
      const nextDays = await base44.asServiceRole.entities.ProgramDay.filter({ day_number: dayNumber + 1 });
      const nextDay = nextDays && nextDays[0];
      if (nextDay) {
        nextDayStatus = await computeDayStatus(base44, clientaId, enrollment, generation, nextDay, effective);
      }
    }

    // Weekly cycles → intensidad, semana actual e historial
    let weeklyCycles = [];
    let currentIntensity = null;
    let currentWeek = null;
    let currentWeeklyCycleId = null;
    let intensityHistory = [];
    if (enrollment) {
      try { weeklyCycles = await base44.asServiceRole.entities.WeeklyCycle.filter({ journey_id: enrollment.id }); } catch (e) { weeklyCycles = []; }
      if (currentDayNumber && currentDayNumber > 0) {
        currentWeek = Math.ceil(currentDayNumber / 7);
        const wc = weeklyCycles.find((c) => c.week_number === currentWeek);
        currentIntensity = (wc && wc.intensity) || enrollment.intensity || null;
        currentWeeklyCycleId = wc ? wc.id : null;
      }
      intensityHistory = weeklyCycles.map((c) => ({ week_number: c.week_number, intensity: c.intensity })).sort((a, b) => a.week_number - b.week_number);
    }
    let completedDays = 0;
    try { const done = await base44.asServiceRole.entities.DailyCheckin.filter({ clienta_id: clientaId, completed: true }); completedDays = done ? done.length : 0; } catch (e) { /* noop */ }

    return Response.json({
      effective_now: effective.now,
      effective_date: effective.date,
      timezone: effective.tz,
      test_mode: effective.testMode,
      using_simulated: effective.usingSimulated,
      is_test_user: effective.isTestUser,
      start_date: startDate || null,
      current_day_number: currentDayNumber,
      current_week: currentWeek,
      current_intensity: currentIntensity,
      current_weekly_cycle_id: currentWeeklyCycleId,
      generation_name: generation ? generation.name : null,
      completed_days: completedDays,
      intensity_history: intensityHistory,
      is_consolida: !!(currentDayNumber && currentDayNumber >= 85),
      override_day_number: overrideDay != null ? overrideDay : null,
      enrollment_id: enrollment ? enrollment.id : null,
      day: dayStatus,
      next_day: nextDayStatus,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});