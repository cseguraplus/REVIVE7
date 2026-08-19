import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Actualiza last_activity_at del usuario autenticado al usar la app.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    try {
      await base44.asServiceRole.entities.User.update(user.id, { last_activity_at: new Date().toISOString() });
    } catch (e) { /* best-effort */ }
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});