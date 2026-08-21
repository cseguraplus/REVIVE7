import { requireRole, serviceClient } from '../_shared/auth.ts';

// Solo Operaciones o superadmin aumentan/ajustan inventario.
// movement_type: receipt | adjustment | return. quantity con signo (receipt/return siempre positivo).
const ALLOWED = ['receipt', 'adjustment', 'return'];
function computeStatus(avail: number) { return avail <= 0 ? 'out_of_stock' : avail <= 3 ? 'low_stock' : 'in_stock'; }

Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { intensity, movement_type, quantity, reason, aliada_id, related_sale_id } = body;
    if (!intensity) return Response.json({ error: 'intensity obligatorio' }, { status: 400 });
    if (!ALLOWED.includes(movement_type)) return Response.json({ error: 'movement_type inválido' }, { status: 400 });
    if (!reason || !String(reason).trim()) return Response.json({ error: 'Motivo obligatorio' }, { status: 400 });
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty === 0) return Response.json({ error: 'quantity inválido' }, { status: 400 });

    let signed = qty;
    if (movement_type === 'receipt' || movement_type === 'return') signed = Math.abs(qty);

    const { data: invs } = await svc.from('inventory').select('*').eq('intensity', intensity);
    let inv = invs && invs[0];
    if (!inv) {
      const { data } = await svc.from('inventory').insert({ intensity, available: 0, reserved: 0, status: 'out_of_stock' }).select().single();
      inv = data;
    }

    const newAvail = (inv.available || 0) + signed;
    if (newAvail < 0) return Response.json({ error: 'No se puede dejar inventario negativo' }, { status: 400 });

    await svc.from('inventory').update({ available: newAvail, status: computeStatus(newAvail) }).eq('id', inv.id);

    const { data: mov } = await svc.from('inventory_movements').insert({
      intensity, aliada_id: aliada_id || null, movement_type, quantity: signed,
      related_sale_id: related_sale_id || null, status: 'confirmed', reason: String(reason).trim(),
      created_by: auth.user.id, created_at: new Date().toISOString(),
    }).select().single();

    await svc.from('audit_logs').insert({
      actor_user_id: auth.user.id, action: 'adjust_inventory', entity_type: 'Inventory', entity_id: inv.id,
      old_value_json: JSON.stringify({ available: inv.available }), new_value_json: JSON.stringify({ available: newAvail }),
      reason: `${movement_type}: ${String(reason).trim()}`, timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, inventory_id: inv.id, available: newAvail, movement_id: mov?.id });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
