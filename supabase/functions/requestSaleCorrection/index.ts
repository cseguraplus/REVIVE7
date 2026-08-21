import { requireRole, serviceClient } from '../_shared/auth.ts';

// Solicitud de corrección de venta (aliada, después de 24h) → correction_requests.
Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['aliada', 'superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { sale_id, field, new_value, reason } = body;
    if (!sale_id || !field) return Response.json({ error: 'sale_id y field obligatorios' }, { status: 400 });
    if (!reason || !String(reason).trim()) return Response.json({ error: 'Motivo obligatorio' }, { status: 400 });

    // deno-lint-ignore no-explicit-any
    const { data: sale } = await svc.from('sales').select('*').eq('id', sale_id).maybeSingle() as { data: any };
    if (!sale) return Response.json({ error: 'Venta no encontrada' }, { status: 404 });

    const old_value = sale[field] === undefined ? '' : String(sale[field]);
    const { data: cr } = await svc.from('correction_requests').insert({
      entity_type: 'Sale', entity_id: sale_id, field, old_value, new_value: String(new_value ?? ''),
      reason: String(reason).trim(), status: 'pending', requested_by: auth.user.id,
    }).select().single();

    await svc.from('audit_logs').insert({ actor_user_id: auth.user.id, action: 'request_sale_correction', entity_type: 'CorrectionRequest', entity_id: cr?.id, old_value_json: JSON.stringify({ field, old_value }), new_value_json: JSON.stringify({ new_value }), reason: String(reason).trim(), timestamp: new Date().toISOString() });

    return Response.json({ ok: true, correction_id: cr?.id });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
