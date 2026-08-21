import { getUserAndProfile, serviceClient } from '../_shared/auth.ts';
import { computeAliadaClientData } from '../_shared/aliadaClientData.ts';

Deno.serve(async (req) => {
  try {
    const user = await getUserAndProfile(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const appRole = user.app_role;
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') {
      return Response.json({ error: 'Forbidden — only aliadas or admins' }, { status: 403 });
    }

    const svc = serviceClient();
    const result = await computeAliadaClientData(svc, user.id);
    if (result.error) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.body);
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
