import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Solicitud de corrección de venta (aliada, después de 24h) → CorrectionRequest.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { sale_id, field, new_value, reason } = body;
    if (!sale_id || !field) return Response.json({ error: 'sale_id y field obligatorios' }, { status: 400 });
    if (!reason || !String(reason).trim()) return Response.json({ error: 'Motivo obligatorio' }, { status: 400 });

    const sale = await base44.asServiceRole.entities.Sale.get(sale_id);
    if (!sale) return Response.json({ error: 'Venta no encontrada' }, { status: 404 });

    const old_value = sale[field] === undefined ? '' : String(sale[field]);
    const cr = await base44.asServiceRole.entities.CorrectionRequest.create({
      entity_type: 'Sale', entity_id: sale_id, field, old_value, new_value: String(new_value ?? ''),
      reason: String(reason).trim(), status: 'pending', requested_by: user.id,
    });

    await base44.asServiceRole.entities.AuditLog.create({ actor_user_id: user.id, action: 'request_sale_correction', entity_type: 'CorrectionRequest', entity_id: cr.id, old_value_json: JSON.stringify({ field, old_value }), new_value_json: JSON.stringify({ new_value }), reason: String(reason).trim(), timestamp: new Date().toISOString() });

    return Response.json({ ok: true, correction_id: cr.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});