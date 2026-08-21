import { requireRole, serviceClient, findOrInviteUser } from '../_shared/auth.ts';

// Alta de clienta por Aliada (forma 1). La aliada nunca crea ni conoce la
// contraseña: se invita a la clienta y ella define su contraseña desde el enlace.
Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['aliada', 'superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;
    const appRole = auth.user.app_role;

    const svc = serviceClient();
    const body = await req.json();
    const { full_name, email, phone, terms_accepted, privacy_accepted, aliada_id } = body;
    if (!full_name || !email || !phone) return Response.json({ error: 'Nombre, correo y teléfono obligatorios' }, { status: 400 });
    if (!terms_accepted || !privacy_accepted) return Response.json({ error: 'Debe aceptar términos y privacidad' }, { status: 400 });

    let aliadaId: string | null = null;
    if (appRole === 'aliada') {
      const { data: profs } = await svc.from('aliada_profiles').select('*').eq('user_id', auth.user.id);
      const p = profs && profs[0];
      if (!p) return Response.json({ error: 'No tienes perfil de aliada' }, { status: 403 });
      if (p.status !== 'active') return Response.json({ error: 'Tu perfil de aliada no está activo' }, { status: 403 });
      aliadaId = p.id;
    } else {
      aliadaId = aliada_id || null;
    }

    const targetUser = await findOrInviteUser(svc, email);
    if (!targetUser) return Response.json({ error: 'No se pudo invitar o ubicar la cuenta de la clienta' }, { status: 500 });

    await svc.from('profiles').update({ app_role: 'clienta' }).eq('id', targetUser.id);

    const now = new Date().toISOString();
    const { data: existing } = await svc.from('clienta_profiles').select('*').eq('user_id', targetUser.id);
    // deno-lint-ignore no-explicit-any
    let profile: any;
    if (existing && existing[0]) {
      const p = existing[0];
      const { data } = await svc.from('clienta_profiles').update({
        aliada_id: aliadaId || p.aliada_id, phone, terms_accepted_at: p.terms_accepted_at || now, privacy_accepted_at: p.privacy_accepted_at || now,
        status: p.status === 'active' ? 'active' : 'pending',
      }).eq('id', p.id).select().single();
      profile = data;
    } else {
      const { data } = await svc.from('clienta_profiles').insert({
        user_id: targetUser.id, aliada_id: aliadaId, status: 'pending', phone, terms_accepted_at: now, privacy_accepted_at: now,
      }).select().single();
      profile = data;
    }

    await svc.from('audit_logs').insert({
      actor_user_id: auth.user.id, action: 'register_clienta', entity_type: 'ClientaProfile', entity_id: profile?.id,
      old_value_json: JSON.stringify({}), new_value_json: JSON.stringify({ user_id: targetUser.id, aliada_id: aliadaId }),
      reason: 'Alta de clienta por aliada', timestamp: now,
    });

    return Response.json({ ok: true, profile, user_id: targetUser.id });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
