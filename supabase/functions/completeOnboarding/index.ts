import { getUserAndProfile, serviceClient } from '../_shared/auth.ts';

// Cierra el onboarding del propio usuario autenticado (clienta/aliada/equipo).
// Marca onboarding_status=completed y activa la cuenta solo si NO está suspendida
// (un usuario suspendido no puede auto-reactivarse). También guarda teléfono y
// última actividad. Usa el rol de servicio porque onboarding_status/account_status
// tienen field-level RLS (trigger) admin-only.
Deno.serve(async (req) => {
  try {
    const user = await getUserAndProfile(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const now = new Date().toISOString();

    // deno-lint-ignore no-explicit-any
    const patch: any = { onboarding_status: 'completed', last_activity_at: now };
    if (body.phone) patch.phone = String(body.phone).trim().slice(0, 30);

    const currentStatus = user.account_status || 'pending';
    if (currentStatus !== 'suspended') patch.account_status = 'active';

    const svc = serviceClient();
    await svc.from('profiles').update(patch).eq('id', user.id);
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
