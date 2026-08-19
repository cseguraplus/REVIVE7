import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Resumen diario para cada Aliada activa: acciones pendientes + enlace a /aliada/inicio.
// Gated by AppSettings.daily_summary_enabled. No WhatsApp automático.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch (e) {}
    if (user) {
      const appRole = user.app_role || (user.data && user.data.app_role);
      if (appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const settings = await base44.asServiceRole.entities.AppSettings.list();
    const s = settings && settings[0];
    if (!s || !s.daily_summary_enabled) return Response.json({ skipped: true, reason: 'daily_summary_disabled' });

    let origin = '';
    try { origin = new URL(req.url).origin; } catch (e) {}
    const link = `${origin}/aliada/inicio`;

    const [aliadas, openAlerts] = await Promise.all([
      base44.asServiceRole.entities.AliadaProfile.filter({ status: 'active' }),
      base44.asServiceRole.entities.Alert.filter({ status: 'open' }),
    ]);

    let sent = 0;
    const errors = [];
    for (const ap of aliadas) {
      const count = openAlerts.filter((a) => a.aliada_id === ap.id).length;
      let email = null;
      try { const u = await base44.asServiceRole.entities.User.get(ap.user_id); email = u && u.email; } catch (e) {}
      if (!email) { errors.push({ aliada: ap.id, reason: 'sin email' }); continue; }
      const name = ap.public_name || 'Aliada';
      const body =
        `Hola ${name},\n\n` +
        `Tienes ${count} acción(es) pendiente(s) con tus clientas hoy.\n\n` +
        `Revisa tu panel aquí:\n${link}\n\n` +
        `— Equipo Revive 7`;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({ to: email, subject: 'Resumen diario · Revive 7', body });
        sent++;
      } catch (e) { errors.push({ aliada: ap.id, reason: e.message }); }
    }
    return Response.json({ sent, total_aliadas: aliadas.length, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});