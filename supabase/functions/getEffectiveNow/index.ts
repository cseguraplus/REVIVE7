import { getUserAndProfile, serviceClient } from '../_shared/auth.ts';
import { getEffectiveNow } from '../_shared/effectiveNow.ts';

Deno.serve(async (req) => {
  try {
    const user = await getUserAndProfile(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const svc = serviceClient();
    const effective = await getEffectiveNow(svc, user);

    return Response.json({
      now: effective.now,
      date: effective.date,
      timezone: effective.tz,
      test_mode: effective.testMode,
      simulated_datetime: effective.simulated,
      is_test_user: effective.isTestUser,
      using_simulated: effective.usingSimulated,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
