import { requireRole, serviceClient } from '../_shared/auth.ts';

// Approves an account (account_status -> active). Superadmin or operaciones.
Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { user_id, reason } = body;
    if (!user_id) return Response.json({ error: 'user_id obligatorio' }, { status: 400 });

    const { data: target } = await svc.from('profiles').select('*').eq('id', user_id).maybeSingle();
    if (!target) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const oldValue = { account_status: target.account_status || null };
    await svc.from('profiles').update({ account_status: 'active' }).eq('id', user_id);

    await svc.from('audit_logs').insert({
      actor_user_id: auth.user.id,
      action: 'approve_account',
      entity_type: 'User',
      entity_id: user_id,
      old_value_json: JSON.stringify(oldValue),
      new_value_json: JSON.stringify({ account_status: 'active' }),
      reason: reason || 'Aprobación de cuenta',
      timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, user_id, account_status: 'active' });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
