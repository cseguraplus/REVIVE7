import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';
import { getEffectiveNow, type EffectiveNow } from './effectiveNow.ts';
import { addDays, daysBetween } from './dates.ts';
import type { AppUser } from './auth.ts';

const OBJECTIVES = [
  'objective_video', 'objective_dailypacks', 'objective_hydration',
  'objective_nutrition', 'objective_movement', 'objective_rest',
];

// deno-lint-ignore no-explicit-any
async function computeDayStatus(svc: SupabaseClient, clientaId: string, enrollment: any, generation: any, programDay: any, effective: EffectiveNow) {
  if (!programDay) return { status: 'not_found', day_number: null };

  const dayNumber = programDay.day_number;
  const dayType = programDay.day_type;
  const startDate = (generation && generation.start_date) || (enrollment && enrollment.start_date);
  const isWelcome = dayType === 'welcome' || dayType === 'intro' || dayNumber === 0;

  const { data: checkinRows } = await svc.from('daily_checkins').select('*').eq('clienta_id', clientaId).eq('program_day_id', programDay.id);
  const checkin = checkinRows && checkinRows[0];
  const checkinCompleted = !!(checkin && checkin.completed);

  const { data: vpRows } = await svc.from('video_progress').select('*').eq('clienta_id', clientaId).eq('program_day_id', programDay.id);
  const vp = vpRows && vpRows[0];
  const videoCompleted = !!(vp && vp.completed);

  let objectivesDone = false;
  let emotionalSet = false;
  if (checkin) {
    objectivesDone = OBJECTIVES.every((k) => checkin[k] === true);
    emotionalSet = !!checkin.emotional_state;
  }
  const completable = videoCompleted && objectivesDone && emotionalSet && !checkinCompleted;

  let availableFrom: string | null = null;
  let status: string;
  let previousDayCompleted = true;

  if (isWelcome) {
    status = checkinCompleted ? 'completed' : 'available';
  } else if (!startDate) {
    status = 'locked_date';
  } else {
    availableFrom = addDays(startDate, dayNumber - 1);
    if (effective.date < availableFrom) {
      status = 'locked_date';
    } else {
      if (dayNumber >= 2) {
        const { data: prevDays } = await svc.from('program_days').select('*').eq('day_number', dayNumber - 1);
        const prevDay = prevDays && prevDays[0];
        if (prevDay) {
          const { data: prevCheckins } = await svc.from('daily_checkins').select('*').eq('clienta_id', clientaId).eq('program_day_id', prevDay.id);
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
    objectives: OBJECTIVES.reduce((o: Record<string, boolean>, k) => { o[k] = !!(checkin && checkin[k]); return o; }, {}),
  };
}

// Compartido entre getDailyAccess (edge function) y completeDailyCheckin
// (que lo reutiliza para re-consultar el acceso al día siguiente, igual que
// en Base44 vía functions.invoke — aquí es una llamada directa en proceso).
export async function computeDailyAccess(svc: SupabaseClient, user: AppUser, body: { clientaId?: string; enrollmentId?: string; dayNumber?: number }) {
  const appRole = user.app_role;
  const clientaId = body.clientaId || user.id;

  const isOwner = user.id === clientaId;
  const isAdmin = appRole === 'superadmin' || appRole === 'operaciones';
  if (!isOwner && !isAdmin) return { error: 'Forbidden', status: 403 };

  const effective = await getEffectiveNow(svc, user);

  // deno-lint-ignore no-explicit-any
  let enrollment: any = null;
  if (body.enrollmentId) {
    const { data } = await svc.from('enrollments').select('*').eq('id', body.enrollmentId).maybeSingle();
    enrollment = data;
  }
  if (!enrollment) {
    const { data } = await svc.from('enrollments').select('*').eq('clienta_id', clientaId).eq('status', 'active');
    enrollment = data && data[0];
  }

  // deno-lint-ignore no-explicit-any
  let generation: any = null;
  if (enrollment && enrollment.generation_id) {
    const { data } = await svc.from('generations').select('*').eq('id', enrollment.generation_id).maybeSingle();
    generation = data;
  }

  const startDate = (generation && generation.start_date) || (enrollment && enrollment.start_date);
  let currentDayNumber: number | null = null;
  if (startDate) {
    const diff = daysBetween(startDate, effective.date) + 1;
    currentDayNumber = diff < 1 ? 0 : Math.min(90, diff);
  }
  const overrideDay = enrollment && enrollment.override_day_number != null ? enrollment.override_day_number : null;
  if (overrideDay != null) currentDayNumber = overrideDay;

  const dayNumber = (typeof body.dayNumber === 'number') ? body.dayNumber : currentDayNumber;

  // deno-lint-ignore no-explicit-any
  let dayStatus: any;
  // deno-lint-ignore no-explicit-any
  let nextDayStatus: any = null;

  if (dayNumber == null || dayNumber === 0) {
    const { data: welcomeDays } = await svc.from('program_days').select('*').eq('day_number', 0);
    dayStatus = await computeDayStatus(svc, clientaId, enrollment, generation, welcomeDays && welcomeDays[0], effective);
  } else {
    const { data: days } = await svc.from('program_days').select('*').eq('day_number', dayNumber);
    const programDay = days && days[0];
    dayStatus = await computeDayStatus(svc, clientaId, enrollment, generation, programDay, effective);
    const { data: nextDays } = await svc.from('program_days').select('*').eq('day_number', dayNumber + 1);
    const nextDay = nextDays && nextDays[0];
    if (nextDay) nextDayStatus = await computeDayStatus(svc, clientaId, enrollment, generation, nextDay, effective);
  }

  // deno-lint-ignore no-explicit-any
  let weeklyCycles: any[] = [];
  let currentIntensity = null;
  let currentWeek = null;
  let currentWeeklyCycleId = null;
  // deno-lint-ignore no-explicit-any
  let intensityHistory: any[] = [];
  if (enrollment) {
    const { data } = await svc.from('weekly_cycles').select('*').eq('journey_id', enrollment.id);
    weeklyCycles = data || [];
    if (currentDayNumber && currentDayNumber > 0) {
      currentWeek = Math.ceil(currentDayNumber / 7);
      const wc = weeklyCycles.find((c) => c.week_number === currentWeek);
      currentIntensity = (wc && wc.intensity) || enrollment.intensity || null;
      currentWeeklyCycleId = wc ? wc.id : null;
    }
    intensityHistory = weeklyCycles.map((c) => ({ week_number: c.week_number, intensity: c.intensity })).sort((a, b) => a.week_number - b.week_number);
  }

  let completedDays = 0;
  const { data: done } = await svc.from('daily_checkins').select('id').eq('clienta_id', clientaId).eq('completed', true);
  completedDays = done ? done.length : 0;

  return {
    status: 200,
    body: {
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
    },
  };
}
