import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Alta de clienta por Aliada (forma 1). La aliada nunca crea ni conoce la
// contraseña: se invita a la clienta y ella define su contraseña desde el enlace.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { full_name, email, phone, terms_accepted, privacy_accepted, aliada_id } = body;
    if (!full_name || !email || !phone) return Response.json({ error: 'Nombre, correo y teléfono obligatorios' }, { status: 400 });
    if (!terms_accepted || !privacy_accepted) return Response.json({ error: 'Debe aceptar términos y privacidad' }, { status: 400 });

    let aliadaId = null;
    if (appRole === 'aliada') {
      const profs = await base44.asServiceRole.entities.AliadaProfile.filter({ user_id: user.id });
      if (!profs || !profs[0]) return Response.json({ error: 'No tienes perfil de aliada' }, { status: 403 });
      if (profs[0].status !== 'active') return Response.json({ error: 'Tu perfil de aliada no está activo' }, { status: 403 });
      aliadaId = profs[0].id;
    } else {
      aliadaId = aliada_id || null;
    }

    const emailNorm = String(email).trim().toLowerCase();
    let targetUser = null;
    try { const byEmail = await base44.asServiceRole.entities.User.filter({ email: emailNorm }); targetUser = byEmail && byEmail[0]; } catch (e) {}
    let invited = false;
    if (!targetUser) {
      try { await base44.users.inviteUser(emailNorm, 'user'); invited = true; } catch (e) {
        return Response.json({ error: 'No se pudo invitar a la clienta: ' + (e.message || String(e)) }, { status: 500 });
      }
      try { const byEmail2 = await base44.asServiceRole.entities.User.filter({ email: emailNorm }); targetUser = byEmail2 && byEmail2[0]; } catch (e) {}
    }
    if (!targetUser) return Response.json({ error: 'No se pudo crear/ubicar la cuenta' }, { status: 500 });

    try { await base44.asServiceRole.entities.User.update(targetUser.id, { app_role: 'clienta' }); } catch (e) {}

    const now = new Date().toISOString();
    const existing = await base44.asServiceRole.entities.ClientaProfile.filter({ user_id: targetUser.id });
    let profile;
    if (existing && existing[0]) {
      const p = existing[0];
      profile = await base44.asServiceRole.entities.ClientaProfile.update(p.id, {
        aliada_id: aliadaId || p.aliada_id, phone, terms_accepted_at: p.terms_accepted_at || now, privacy_accepted_at: p.privacy_accepted_at || now,
        status: p.status === 'active' ? 'active' : 'pending',
      });
    } else {
      profile = await base44.asServiceRole.entities.ClientaProfile.create({
        user_id: targetUser.id, aliada_id: aliadaId, status: 'pending', phone, terms_accepted_at: now, privacy_accepted_at: now,
      });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id, action: 'register_clienta', entity_type: 'ClientaProfile', entity_id: profile.id,
      old_value_json: JSON.stringify({}), new_value_json: JSON.stringify({ user_id: targetUser.id, aliada_id: aliadaId, invited }),
      reason: 'Alta de clienta por aliada', timestamp: now,
    });

    return Response.json({ ok: true, profile, user_id: targetUser.id, invited });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});