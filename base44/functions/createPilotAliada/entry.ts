import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Crea una Aliada piloto desde /admin/prueba (sin hardcodear correo ni contraseña).
// Superadmin. Invita al usuario, asigna rol aliada, marca is_test_account=true,
// crea AliadaProfile. force_active => status active y training completed.
function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin') return Response.json({ error: 'Forbidden — superadmin only' }, { status: 403 });

    const body = await req.json();
    const { email, public_name, whatsapp, force_active, reason } = body;
    if (!email || !public_name) return Response.json({ error: 'email y public_name obligatorios' }, { status: 400 });
    if (!reason || !String(reason).trim()) return Response.json({ error: 'Motivo obligatorio' }, { status: 400 });

    let targetUser = null;
    try {
      const byEmail = await base44.asServiceRole.entities.User.filter({ email: String(email).trim().toLowerCase() });
      targetUser = byEmail && byEmail[0];
    } catch (e) {}
    let invited = false;
    if (!targetUser) {
      try { await base44.users.inviteUser(String(email).trim().toLowerCase(), 'user'); invited = true; } catch (e) {
        return Response.json({ error: 'No se pudo invitar al usuario: ' + (e.message || String(e)) }, { status: 500 });
      }
      try {
        const byEmail2 = await base44.asServiceRole.entities.User.filter({ email: String(email).trim().toLowerCase() });
        targetUser = byEmail2 && byEmail2[0];
      } catch (e) {}
    }
    if (!targetUser) return Response.json({ error: 'No se pudo crear/ubicar la cuenta' }, { status: 500 });

    try { await base44.asServiceRole.entities.User.update(targetUser.id, { app_role: 'aliada', is_test_account: true }); } catch (e) {}

    const baseCode = slugify(public_name).slice(0, 4).toUpperCase() || 'AL';
    let code = baseCode + Math.floor(1000 + Math.random() * 9000);
    for (let i = 0; i < 50; i++) {
      const exist = await base44.asServiceRole.entities.AliadaProfile.filter({ aliada_code: code });
      if (!exist || exist.length === 0) break;
      code = baseCode + Math.floor(1000 + Math.random() * 9000);
    }
    const baseSlug = slugify(public_name) || 'aliada';
    let slug = baseSlug + '-' + Math.random().toString(36).slice(2, 6);

    const existing = await base44.asServiceRole.entities.AliadaProfile.filter({ user_id: targetUser.id });
    const force = force_active === true;
    let profile;
    if (existing && existing[0]) {
      const p = existing[0];
      profile = await base44.asServiceRole.entities.AliadaProfile.update(p.id, {
        public_name, whatsapp: whatsapp || p.whatsapp, aliada_code: p.aliada_code || code, referral_slug: p.referral_slug || slug,
        status: force ? 'active' : (p.status === 'active' ? 'active' : 'pending_training'),
        training_status: force ? 'completed' : (p.training_status || 'not_started'),
      });
    } else {
      profile = await base44.asServiceRole.entities.AliadaProfile.create({
        user_id: targetUser.id, public_name, whatsapp: whatsapp || '',
        aliada_code: code, referral_slug: slug,
        status: force ? 'active' : 'pending_training', training_status: force ? 'completed' : 'not_started',
      });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id, action: 'create_pilot_aliada',
      entity_type: 'AliadaProfile', entity_id: profile.id,
      old_value_json: JSON.stringify({}),
      new_value_json: JSON.stringify({ user_id: targetUser.id, is_test_account: true, force_active: force, profile_id: profile.id }),
      reason: `Aliada piloto: ${String(reason).trim()}`, timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, profile, user_id: targetUser.id, invited, is_test_account: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});