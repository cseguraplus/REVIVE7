import { requireRole } from '../_shared/auth.ts';

// Correos transaccionales para usuarios registrados (SendEmail solo llega a
// usuarios registrados). Tipos soportados: account_activation, aliada_approval,
// clienta_invitation, weekly_cycle_confirmation, generation_start, admin_change.
// No campañas promocionales, no WhatsApp automático.
// Sin caller conocido en el repo (ni cron ni frontend): no acepta secreto
// interno, solo usuarios humanos con rol permitido.
Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['superadmin', 'operaciones', 'aliada']);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const { type, to, name, context } = body;
    if (!type) return Response.json({ error: 'type obligatorio' }, { status: 400 });
    const email = String(to || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: 'destinatario inválido' }, { status: 400 });

    let origin = '';
    try { origin = new URL(req.url).origin; } catch { /* ignore */ }
    const ctx = context || {};
    const n = name || 'usuaria';

    // deno-lint-ignore no-explicit-any
    const templates: Record<string, any> = {
      account_activation: {
        subject: 'Tu cuenta de Revive 7 está activa',
        body: `Hola ${n},\n\nTu cuenta en Revive 7 ha sido activada. Ya puedes iniciar sesión y comenzar.\n\n${origin}\n\n— Equipo Revive 7`,
      },
      aliada_approval: {
        subject: '¡Bienvenida a Revive 7 como Aliada!',
        body: `Hola ${n},\n\nTu postulación fue aprobada. Tu cuenta de Aliada está lista${ctx.aliada_code ? `\nCódigo de aliada: ${ctx.aliada_code}` : ''}.\nCompleta tu capacitación inicial para acompañar a tus clientas.\n\n${origin}/aliada/inicio\n\n— Equipo Revive 7`,
      },
      clienta_invitation: {
        subject: 'Te invitan a comenzar Revive 7',
        body: `Hola ${n},\n\n${ctx.aliada_name || 'Tu Aliada'} te invitó a comenzar Revive 7. Crea tu cuenta para iniciar tu programa.\n\n${origin}/register\n\n— Equipo Revive 7`,
      },
      weekly_cycle_confirmation: {
        subject: `Semana ${ctx.week_number || ''} confirmada`,
        body: `Hola ${n},\n\nTu Kit de la semana ${ctx.week_number || ''} (${ctx.intensity || ''}) fue confirmado. ¡Sigue con tu proceso!\n\n${origin}/hoy\n\n— Equipo Revive 7`,
      },
      generation_start: {
        subject: '¡Comienza tu generación de Revive 7!',
        body: `Hola ${n},\n\nHoy inicia tu generación (${ctx.generation_name || ''}). Ya puedes ver tu contenido del día 1.\n\n${origin}/hoy\n\n— Equipo Revive 7`,
      },
      admin_change: {
        subject: 'Actualización importante en tu cuenta',
        body: `Hola ${n},\n\nSe realizó un cambio administrativo en tu cuenta: ${ctx.summary || 'revisa tu panel'}.\nSi tienes dudas, contacta a soporte.\n\n${origin}\n\n— Equipo Revive 7`,
      },
    };

    const tpl = templates[type];
    if (!tpl) return Response.json({ error: 'tipo no soportado' }, { status: 400 });

    // TODO(paso 7): reemplazar por el proveedor de correo elegido (ej. Resend).
    console.log('sendEmail(pending provider)', email, tpl.subject, tpl.body);
    return Response.json({ ok: true, type, to: email });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
