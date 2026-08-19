import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Crea una clienta piloto desde /admin/prueba asignada a una Aliada piloto.
// Opción de enviar invitación o marcar la cuenta como preparada (active) para pruebas.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin') return Response.json({ error: 'Forbidden — superadmin only' }, { status: 403 });

    const body = await req.json();
    const { email, full_name, phone, aliada_id, send_invite, force_prepared, reason } = body;
    if (!email || !full_name) return Response.json({ error: 'email y full_name obligatorios' }, { status: 400 });
    if (!reason || !String(reason).trim()) return Response.json({ error: 'Motivo obligatorio' }, { status: 400 });

    const emailNorm = String(email).trim().toLowerCase();
    let targetUser = null;
    try { const byEmail = await base44.asServiceRole.entities.User.filter({ email: emailNorm }); targetUser = byEmail && byEmail[0]; } catch (e) {}
    let invited = false;
    if (!targetUser) {
      if (send_invite === false) return Response.json({ error: 'No existe el usuario y no se solicitó invitación' }, { status: 400 });
      try { await base44.users.inviteUser(emailNorm, 'user'); invited = true; } catch (e) {
        return Response.json({ error: 'No se pudo invitar: ' + (e.message || String(e)) }, { status: 500 });
      }
      try { const byEmail2 = await base44.asServiceRole.entities.User.filter({ email: emailNorm }); targetUser = byEmail2 && byEmail2[0]; } catch (e) {}
    }
    if (!targetUser) return Response.json({ error: 'No se pudo crear/ubicar la cuenta' }, { status: 500 });

    const force = force_prepared === true;
    const userUpdate = { app_role: 'clienta', is_test_account: true };
    if (force) userUpdate.account_status = 'active';
    try { await base44.asServiceRole.entities.User.update(targetUser.id, userUpdate); } catch (e) {}

    const now = new Date().toISOString();
    const existing = await base44.asServiceRole.entities.ClientaProfile.filter({ user_id: targetUser.id });
    let profile;
    if (existing && existing[0]) {
      const p = existing[0];
      profile = await base44.asServiceRole.entities.ClientaProfile.update(p.id, {
        aliada_id: aliada_id || p.aliada_id, phone: phone || p.phone,
        status: force ? 'active' : (p.status === 'active' ? 'active' : 'pending'),
        terms_accepted_at: p.terms_accepted_at || now, privacy_accepted_at: p.privacy_accepted_at || now,
      });
    } else {
      profile = await base44.asServiceRole.entities.ClientaProfile.create({
        user_id: targetUser.id, aliada_id: aliada_id || null, status: force ? 'active' : 'pending',
        phone: phone || '', terms_accepted_at: now, privacy_accepted_at: now,
      });
    }

    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id, action: 'create_pilot_clienta', entity_type: 'ClientaProfile', entity_id: profile.id,
      old_value_json: JSON.stringify({}), new_value_json: JSON.stringify({ user_id: targetUser.id, aliada_id, force_prepared: force, invited }),
      reason: `Clienta piloto: ${String(reason).trim()}`, timestamp: now,
    });

    return Response.json({ ok: true, profile, user_id: targetUser.id, invited, is_test_account: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});