import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Cancelación de venta (nunca se elimina). Reversa inventario si estaba activa.
function computeStatus(avail) { return avail <= 0 ? 'out_of_stock' : avail <= 3 ? 'low_stock' : 'in_stock'; }
const H24 = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { sale_id, reason } = body;
    if (!sale_id) return Response.json({ error: 'sale_id obligatorio' }, { status: 400 });
    if (!reason || !String(reason).trim()) return Response.json({ error: 'Motivo obligatorio para cancelar' }, { status: 400 });

    const sale = await base44.asServiceRole.entities.Sale.get(sale_id);
    if (!sale) return Response.json({ error: 'Venta no encontrada' }, { status: 404 });
    if (sale.status === 'cancelled') return Response.json({ error: 'Ya está cancelada' }, { status: 400 });

    const isAdmin = appRole === 'superadmin' || appRole === 'operaciones';
    if (!isAdmin) {
      const profs = await base44.asServiceRole.entities.AliadaProfile.filter({ user_id: user.id });
      const p = profs && profs[0];
      if (!p || sale.aliada_id !== p.id) return Response.json({ error: 'No puedes cancelar esta venta' }, { status: 403 });
      const created = sale.created_date ? new Date(sale.created_date).getTime() : 0;
      if (Date.now() - created > H24) return Response.json({ error: 'Pasaron 24h. Solicita corrección a Operaciones.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let reversalId = null;
    if (sale.activated) {
      const invs = await base44.asServiceRole.entities.Inventory.filter({ intensity: sale.intensity });
      const inv = invs && invs[0];
      if (inv) {
        const newAvail = (inv.available || 0) + 1;
        await base44.asServiceRole.entities.Inventory.update(inv.id, { available: newAvail, status: computeStatus(newAvail) });
      }
      const rev = await base44.asServiceRole.entities.InventoryMovement.create({ intensity: sale.intensity, aliada_id: sale.aliada_id, movement_type: 'sale_reversal', quantity: 1, related_sale_id: sale.id, status: 'confirmed', reason: `Cancelación: ${String(reason).trim()}`, created_by: user.id, created_at: now });
      reversalId = rev.id;
    }

    await base44.asServiceRole.entities.Sale.update(sale_id, { status: 'cancelled', payment_status: 'cancelled', activated: false, reversal_movement_id: reversalId });
    await base44.asServiceRole.entities.AuditLog.create({ actor_user_id: user.id, action: 'cancel_sale', entity_type: 'Sale', entity_id: sale_id, old_value_json: JSON.stringify({ status: sale.status, activated: sale.activated }), new_value_json: JSON.stringify({ status: 'cancelled', reversal_movement_id: reversalId }), reason: String(reason).trim(), timestamp: now });

    return Response.json({ ok: true, sale_id, status: 'cancelled', reversal_movement_id: reversalId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});