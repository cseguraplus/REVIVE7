import { requireRole, serviceClient } from '../_shared/auth.ts';

// Cambia el estado de una postulación: under_review | rejected | waitlist.
const ALLOWED = ['under_review', 'rejected', 'waitlist'];

Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { solicitud_id, status, reason } = body;
    if (!solicitud_id) return Response.json({ error: 'solicitud_id obligatorio' }, { status: 400 });
    if (!ALLOWED.includes(status)) return Response.json({ error: 'status inválido' }, { status: 400 });

    const { data: sol } = await svc.from('solicitud_aliada').select('*').eq('id', solicitud_id).maybeSingle();
    if (!sol) return Response.json({ error: 'Postulación no encontrada' }, { status: 404 });

    const oldValue = { estado: sol.estado };
    await svc.from('solicitud_aliada').update({ estado: status }).eq('id', sol.id);

    await svc.from('audit_logs').insert({
      actor_user_id: auth.user.id, action: 'set_aliada_application_status',
      entity_type: 'SolicitudAliada', entity_id: sol.id,
      old_value_json: JSON.stringify(oldValue),
      new_value_json: JSON.stringify({ estado: status }),
      reason: reason || `Cambio a ${status}`, timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, solicitud_id, estado: status });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
