import { requireRole, serviceClient } from '../_shared/auth.ts';

// Suspends an account (account_status -> suspended). Superadmin or operaciones.
// Reason required.
Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { user_id, reason } = body;
    if (!user_id) return Response.json({ error: 'user_id obligatorio' }, { status: 400 });
    if (!reason || !String(reason).trim()) return Response.json({ error: 'Motivo obligatorio' }, { status: 400 });

    const { data: target } = await svc.from('profiles').select('*').eq('id', user_id).maybeSingle();
    if (!target) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const oldValue = { account_status: target.account_status || null };
    await svc.from('profiles').update({ account_status: 'suspended' }).eq('id', user_id);

    await svc.from('audit_logs').insert({
      actor_user_id: auth.user.id,
      action: 'suspend_account',
      entity_type: 'User',
      entity_id: user_id,
      old_value_json: JSON.stringify(oldValue),
      new_value_json: JSON.stringify({ account_status: 'suspended' }),
      reason: String(reason).trim(),
      timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, user_id, account_status: 'suspended' });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
