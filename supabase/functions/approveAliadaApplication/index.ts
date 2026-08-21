import { requireRole, serviceClient, findOrInviteUser } from '../_shared/auth.ts';

// Aprueba una postulación: crea/vincula la cuenta (invite), crea aliada_profiles
// con aliada_code + referral_slug únicos, envía correo de activación y audita.
function slugify(s: string) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { solicitud_id } = body;
    if (!solicitud_id) return Response.json({ error: 'solicitud_id obligatorio' }, { status: 400 });

    const { data: sol } = await svc.from('solicitud_aliada').select('*').eq('id', solicitud_id).maybeSingle();
    if (!sol) return Response.json({ error: 'Postulación no encontrada' }, { status: 404 });
    if (sol.estado === 'approved') return Response.json({ error: 'La postulación ya está aprobada' }, { status: 400 });

    const targetUser = await findOrInviteUser(svc, sol.email);
    if (!targetUser) return Response.json({ error: 'No se pudo crear o ubicar la cuenta' }, { status: 500 });

    await svc.from('profiles').update({ app_role: 'aliada' }).eq('id', targetUser.id);

    const baseCode = slugify(sol.nombre).slice(0, 4).toUpperCase() || 'AL';
    let code = baseCode + Math.floor(1000 + Math.random() * 9000);
    for (let i = 0; i < 50; i++) {
      const { data: exist } = await svc.from('aliada_profiles').select('id').eq('aliada_code', code);
      if (!exist || exist.length === 0) break;
      code = baseCode + Math.floor(1000 + Math.random() * 9000);
    }
    const baseSlug = slugify(sol.nombre) || 'aliada';
    let slug = baseSlug + '-' + Math.random().toString(36).slice(2, 6);
    for (let i = 0; i < 50; i++) {
      const { data: exist } = await svc.from('aliada_profiles').select('id').eq('referral_slug', slug);
      if (!exist || exist.length === 0) break;
      slug = baseSlug + '-' + Math.random().toString(36).slice(2, 6);
    }

    const { data: existingProfile } = await svc.from('aliada_profiles').select('*').eq('user_id', targetUser.id);
    // deno-lint-ignore no-explicit-any
    let profile: any;
    if (existingProfile && existingProfile[0]) {
      const p = existingProfile[0];
      const { data } = await svc.from('aliada_profiles').update({
        public_name: p.public_name || sol.nombre,
        whatsapp: p.whatsapp || sol.telefono,
        aliada_code: p.aliada_code || code,
        referral_slug: p.referral_slug || slug,
        status: p.status === 'active' ? 'active' : 'pending_training',
        training_status: p.training_status || 'not_started',
      }).eq('id', p.id).select().single();
      profile = data;
    } else {
      const { data } = await svc.from('aliada_profiles').insert({
        user_id: targetUser.id, public_name: sol.nombre, whatsapp: sol.telefono,
        aliada_code: code, referral_slug: slug, status: 'pending_training', training_status: 'not_started',
      }).select().single();
      profile = data;
    }

    await svc.from('solicitud_aliada').update({ estado: 'approved' }).eq('id', sol.id);

    // TODO(paso 7): reemplazar por el proveedor de correo elegido (ej. Resend).
    console.log('sendEmail(pending provider)', sol.email, 'Bienvenida a Revive 7 — Tu cuenta de Aliada', profile?.aliada_code);

    await svc.from('audit_logs').insert({
      actor_user_id: auth.user.id, action: 'approve_aliada_application',
      entity_type: 'SolicitudAliada', entity_id: sol.id,
      old_value_json: JSON.stringify({ estado: sol.estado }),
      new_value_json: JSON.stringify({ estado: 'approved', user_id: targetUser.id, profile_id: profile?.id, aliada_code: profile?.aliada_code }),
      reason: 'Aprobación de postulación de aliada', timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, profile, user_id: targetUser.id });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
