import { requireRole, serviceClient } from '../_shared/auth.ts';

// Cambia el estado del perfil de aliada: suspended | active | inactive.
// También sincroniza profiles.account_status para active/suspended.
const ALLOWED = ['suspended', 'active', 'inactive'];

Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { profile_id, status, reason } = body;
    if (!profile_id) return Response.json({ error: 'profile_id obligatorio' }, { status: 400 });
    if (!ALLOWED.includes(status)) return Response.json({ error: 'status inválido' }, { status: 400 });
    if (status === 'suspended' && (!reason || !String(reason).trim())) return Response.json({ error: 'Motivo obligatorio para suspender' }, { status: 400 });

    const { data: profile } = await svc.from('aliada_profiles').select('*').eq('id', profile_id).maybeSingle();
    if (!profile) return Response.json({ error: 'Perfil no encontrado' }, { status: 404 });

    const oldValue = { status: profile.status };
    await svc.from('aliada_profiles').update({ status }).eq('id', profile_id);

    if (profile.user_id) {
      const accountStatus = status === 'active' ? 'active' : status === 'suspended' ? 'suspended' : 'inactive';
      await svc.from('profiles').update({ account_status: accountStatus }).eq('id', profile.user_id);
    }

    await svc.from('audit_logs').insert({
      actor_user_id: auth.user.id, action: 'set_aliada_profile_status',
      entity_type: 'AliadaProfile', entity_id: profile_id,
      old_value_json: JSON.stringify(oldValue),
      new_value_json: JSON.stringify({ status }),
      reason: reason || `Cambio a ${status}`, timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, profile_id, status });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
