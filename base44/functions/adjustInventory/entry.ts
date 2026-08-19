import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Solo Operaciones o superadmin aumentan/ajustan inventario.
// movement_type: receipt | adjustment | return. quantity con signo (receipt/return siempre positivo).
const ALLOWED = ['receipt', 'adjustment', 'return'];
function computeStatus(avail) { return avail <= 0 ? 'out_of_stock' : avail <= 3 ? 'low_stock' : 'in_stock'; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden — solo Operaciones o superadmin' }, { status: 403 });

    const body = await req.json();
    const { intensity, movement_type, quantity, reason, aliada_id, related_sale_id } = body;
    if (!intensity) return Response.json({ error: 'intensity obligatorio' }, { status: 400 });
    if (!ALLOWED.includes(movement_type)) return Response.json({ error: 'movement_type inválido' }, { status: 400 });
    if (!reason || !String(reason).trim()) return Response.json({ error: 'Motivo obligatorio' }, { status: 400 });
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty === 0) return Response.json({ error: 'quantity inválido' }, { status: 400 });

    let signed = qty;
    if (movement_type === 'receipt' || movement_type === 'return') signed = Math.abs(qty);

    const invs = await base44.asServiceRole.entities.Inventory.filter({ intensity });
    let inv = invs && invs[0];
    if (!inv) inv = await base44.asServiceRole.entities.Inventory.create({ intensity, available: 0, reserved: 0, status: 'out_of_stock' });

    const newAvail = (inv.available || 0) + signed;
    if (newAvail < 0) return Response.json({ error: 'No se puede dejar inventario negativo' }, { status: 400 });

    await base44.asServiceRole.entities.Inventory.update(inv.id, { available: newAvail, status: computeStatus(newAvail) });

    const mov = await base44.asServiceRole.entities.InventoryMovement.create({
      intensity, aliada_id: aliada_id || null, movement_type, quantity: signed,
      related_sale_id: related_sale_id || null, status: 'confirmed', reason: String(reason).trim(),
      created_by: user.id, created_at: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id, action: 'adjust_inventory', entity_type: 'Inventory', entity_id: inv.id,
      old_value_json: JSON.stringify({ available: inv.available }), new_value_json: JSON.stringify({ available: newAvail }),
      reason: `${movement_type}: ${String(reason).trim()}`, timestamp: new Date().toISOString(),
    });

    return Response.json({ ok: true, inventory_id: inv.id, available: newAvail, movement_id: mov.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});