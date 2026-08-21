import { requireInternalOrRole, serviceClient, getAuthUserMeta } from '../_shared/auth.ts';

// Resumen diario para cada Aliada activa: acciones pendientes + enlace a /aliada/inicio.
// Gated por app_settings.daily_summary_enabled. No WhatsApp automático.
// Invocada por pg_cron/scheduled function (Paso 6) con el secreto interno, o
// manualmente por superadmin/operaciones.
Deno.serve(async (req) => {
  try {
    const auth = await requireInternalOrRole(req, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const { data: settings } = await svc.from('app_settings').select('*').maybeSingle();
    if (!settings || !settings.daily_summary_enabled) return Response.json({ skipped: true, reason: 'daily_summary_disabled' });

    let origin = '';
    try { origin = new URL(req.url).origin; } catch { /* ignore */ }
    const link = `${origin}/aliada/inicio`;

    const [{ data: aliadas }, { data: openAlerts }] = await Promise.all([
      svc.from('aliada_profiles').select('*').eq('status', 'active'),
      svc.from('alerts').select('*').eq('status', 'open'),
    ]);

    let sent = 0;
    const errors: { aliada: string; reason: string }[] = [];
    for (const ap of aliadas || []) {
      const count = (openAlerts || []).filter((a) => a.aliada_id === ap.id).length;
      const meta = await getAuthUserMeta(svc, ap.user_id);
      if (!meta.email) { errors.push({ aliada: ap.id, reason: 'sin email' }); continue; }
      const name = ap.public_name || 'Aliada';
      const body =
        `Hola ${name},\n\n` +
        `Tienes ${count} acción(es) pendiente(s) con tus clientas hoy.\n\n` +
        `Revisa tu panel aquí:\n${link}\n\n` +
        `— Equipo Revive 7`;
      // TODO(paso 7): reemplazar por el proveedor de correo elegido (ej. Resend).
      console.log('sendEmail(pending provider)', meta.email, 'Resumen diario · Revive 7', body);
      sent++;
    }
    return Response.json({ sent, total_aliadas: (aliadas || []).length, errors });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
