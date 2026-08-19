import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Effective "now" for the authenticated user.
// Production = real date in AppSettings.timezone.
// Test accounts (is_test_account=true) with an enabled TestControl get the
// simulated effective_datetime (individual, never affects normal users).
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isTestAccount = !!(user.is_test_account || (user.data && user.data.is_test_account));

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const s = settings && settings[0];
    const tz = (s && s.timezone) || 'America/Mexico_City';

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
    if (!usingSimulated) {
      nowISO = toISOInTZ(new Date(), tz);
    }
    const dateStr = nowISO.slice(0, 10);

    return Response.json({
      now: nowISO,
      date: dateStr,
      timezone: tz,
      test_mode: false,
      simulated_datetime: null,
      is_test_user: isTestAccount,
      using_simulated: usingSimulated,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});