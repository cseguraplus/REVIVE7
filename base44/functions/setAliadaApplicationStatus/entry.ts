import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Cambia el estado de una postulación: under_review | rejected | waitlist.
const ALLOWED = ['under_review', 'rejected', 'waitlist'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { solicitud_id, status, reason } = body;
    if (!solicitud_id) return Response.json({ error: 'solicitud_id obligatorio' }, { status: 400 });
    if (!ALLOWED.includes(status)) return Response.json({ error: 'status inválido' }, { status: 400 });

    const sol = await base44.asServiceRole.entities.SolicitudAliada.get(solicitud_id);
    if (!sol) return Response.json({ error: 'Postulación no encontrada' }, { status: 404 });

    const oldValue = { estado: sol.estado };
    await base44.asServiceRole.entities.SolicitudAliada.update(sol.id, { estado: status });

    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id, action: 'set_aliada_application_status',
      entity_type: 'SolicitudAliada', entity_id: sol.id,
      old_value_json: JSON.stringify(oldValue),
      new_value_json: JSON.stringify({ estado: status }),
      reason: reason || `Cambio a ${status}`, timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, solicitud_id, estado: status });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});