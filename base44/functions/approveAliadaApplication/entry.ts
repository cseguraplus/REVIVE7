import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Aprueba una postulación: crea/vincula la cuenta User (invite), crea AliadaProfile
// con aliada_code + referral_slug únicos, envía correo de activación y audita.
function slugify(s) {
  return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { solicitud_id } = body;
    if (!solicitud_id) return Response.json({ error: 'solicitud_id obligatorio' }, { status: 400 });

    const sol = await base44.asServiceRole.entities.SolicitudAliada.get(solicitud_id);
    if (!sol) return Response.json({ error: 'Postulación no encontrada' }, { status: 404 });
    if (sol.estado === 'approved') return Response.json({ error: 'La postulación ya está aprobada' }, { status: 400 });

    // Find or invite user
    let targetUser = null;
    try {
      const byEmail = await base44.asServiceRole.entities.User.filter({ email: sol.email });
      targetUser = byEmail && byEmail[0];
    } catch (e) {}
    let invited = false;
    if (!targetUser) {
      try { await base44.users.inviteUser(sol.email, 'user'); invited = true; } catch (e) {
        return Response.json({ error: 'No se pudo invitar al usuario: ' + (e.message || String(e)) }, { status: 500 });
      }
      try {
        const byEmail2 = await base44.asServiceRole.entities.User.filter({ email: sol.email });
        targetUser = byEmail2 && byEmail2[0];
      } catch (e) {}
    }
    if (!targetUser) return Response.json({ error: 'No se pudo crear o ubicar la cuenta' }, { status: 500 });

    try { await base44.asServiceRole.entities.User.update(targetUser.id, { app_role: 'aliada' }); } catch (e) {}

    // Unique code
    const baseCode = slugify(sol.nombre).slice(0, 4).toUpperCase() || 'AL';
    let code = baseCode + Math.floor(1000 + Math.random() * 9000);
    for (let i = 0; i < 50; i++) {
      const exist = await base44.asServiceRole.entities.AliadaProfile.filter({ aliada_code: code });
      if (!exist || exist.length === 0) break;
      code = baseCode + Math.floor(1000 + Math.random() * 9000);
    }
    // Unique slug
    const baseSlug = slugify(sol.nombre) || 'aliada';
    let slug = baseSlug + '-' + Math.random().toString(36).slice(2, 6);
    for (let i = 0; i < 50; i++) {
      const exist = await base44.asServiceRole.entities.AliadaProfile.filter({ referral_slug: slug });
      if (!exist || exist.length === 0) break;
      slug = baseSlug + '-' + Math.random().toString(36).slice(2, 6);
    }

    // Create or update profile (dedup by user_id)
    const existingProfile = await base44.asServiceRole.entities.AliadaProfile.filter({ user_id: targetUser.id });
    let profile;
    if (existingProfile && existingProfile[0]) {
      const p = existingProfile[0];
      profile = await base44.asServiceRole.entities.AliadaProfile.update(p.id, {
        public_name: p.public_name || sol.nombre,
        whatsapp: p.whatsapp || sol.telefono,
        aliada_code: p.aliada_code || code,
        referral_slug: p.referral_slug || slug,
        status: p.status === 'active' ? 'active' : 'pending_training',
        training_status: p.training_status || 'not_started',
      });
    } else {
      profile = await base44.asServiceRole.entities.AliadaProfile.create({
        user_id: targetUser.id, public_name: sol.nombre, whatsapp: sol.telefono,
        aliada_code: code, referral_slug: slug, status: 'pending_training', training_status: 'not_started',
      });
    }

    await base44.asServiceRole.entities.SolicitudAliada.update(sol.id, { estado: 'approved' });

    try {
      await base44.integrations.Core.SendEmail({
        to: sol.email,
        subject: 'Bienvenida a Revive 7 — Tu cuenta de Aliada',
        body: `Hola ${sol.nombre},\n\n¡Tu postulación fue aprobada! Tu cuenta de Aliada Revive 7 está lista.\nCódigo de aliada: ${profile.aliada_code}\n\nCompleta tu capacitación inicial en la plataforma para comenzar a acompañar a tus clientas.\n\n— Equipo Revive 7`,
      });
    } catch (e) { /* best-effort */ }

    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id, action: 'approve_aliada_application',
      entity_type: 'SolicitudAliada', entity_id: sol.id,
      old_value_json: JSON.stringify({ estado: sol.estado }),
      new_value_json: JSON.stringify({ estado: 'approved', user_id: targetUser.id, profile_id: profile.id, aliada_code: profile.aliada_code }),
      reason: 'Aprobación de postulación de aliada', timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, profile, user_id: targetUser.id, invited });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});