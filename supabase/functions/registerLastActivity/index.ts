import { getUserAndProfile, userClient } from '../_shared/auth.ts';

// Actualiza last_activity_at del usuario autenticado al usar la app.
// profiles.last_activity_at es la única columna que la propia clienta/aliada
// puede modificar directo (ver 0004_rls.sql) — se usa el cliente con su JWT,
// no el rol de servicio.
Deno.serve(async (req) => {
  try {
    const user = await getUserAndProfile(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      const uc = userClient(req);
      await uc.from('profiles').update({ last_activity_at: new Date().toISOString() }).eq('id', user.id);
    } catch { /* best-effort */ }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
