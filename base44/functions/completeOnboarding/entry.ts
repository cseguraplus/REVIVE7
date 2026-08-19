import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Cierra el onboarding del propio usuario autenticado (clienta/aliada/equipo).
// Marca onboarding_status=completed y activa la cuenta solo si NO está suspendida
// (un usuario suspendido no puede auto-reactivarse). También guarda teléfono y
// última actividad. Usa asServiceRole porque onboarding_status/account_status tienen
// RLS de campo admin-only.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const now = new Date().toISOString();

    const patch = { onboarding_status: 'completed', last_activity_at: now };
    if (body.phone) patch.phone = String(body.phone).trim().slice(0, 30);

    const currentStatus = user.account_status || (user.data && user.data.account_status) || 'pending';
    if (currentStatus !== 'suspended') patch.account_status = 'active';

    await base44.asServiceRole.entities.User.update(user.id, patch);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});