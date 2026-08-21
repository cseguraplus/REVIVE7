import { getUserAndProfile, serviceClient } from '../_shared/auth.ts';
import { computeDailyAccess } from '../_shared/dailyAccess.ts';

Deno.serve(async (req) => {
  try {
    const user = await getUserAndProfile(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const svc = serviceClient();
    const result = await computeDailyAccess(svc, user, body);
    if (result.error) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.body);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
