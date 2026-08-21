import { requireRole, serviceClient } from '../_shared/auth.ts';

// Changes a user's app_role. Superadmin only. El navegador nunca puede cambiar
// roles (profiles.app_role tiene field-level RLS/trigger); esto corre con el
// rol de servicio y deja auditoría.
const ALLOWED_ROLES = ['clienta', 'aliada', 'operaciones', 'contenidos', 'superadmin'];

Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['superadmin']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { user_id, app_role, reason } = body;
    if (!user_id) return Response.json({ error: 'user_id obligatorio' }, { status: 400 });
    if (!ALLOWED_ROLES.includes(app_role)) return Response.json({ error: 'app_role inválido' }, { status: 400 });

    const { data: target } = await svc.from('profiles').select('*').eq('id', user_id).maybeSingle();
    if (!target) return Response.json({ error: 'Usuario no encontrado' }, { status: 404 });

    const oldValue = { app_role: target.app_role || null };
    await svc.from('profiles').update({ app_role }).eq('id', user_id);

    await svc.from('audit_logs').insert({
      actor_user_id: auth.user.id,
      action: 'set_user_role',
      entity_type: 'User',
      entity_id: user_id,
      old_value_json: JSON.stringify(oldValue),
      new_value_json: JSON.stringify({ app_role }),
      reason: reason || `Cambio de rol a ${app_role}`,
      timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, user_id, app_role });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
