import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Edición de venta. Aliada: solo dentro de 24h y sobre ventas propias. Operaciones/superadmin: sin límite.
// Si payment_status pasa a paid/authorized_complimentary y no estaba activa → activa (descuenta inventario, crea journey+cycle).
// Si payment_status pasa a cancelled y estaba activa → revierte inventario (sale_reversal +1).
const PAY_STATUS = ['pending', 'partial', 'paid', 'cancelled', 'authorized_complimentary'];
const ACTIVATING = ['paid', 'authorized_complimentary'];
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
    const { sale_id, payment_method, payment_status, delivery_date, discount_amount, discount_reason, reason } = body;
    if (!sale_id) return Response.json({ error: 'sale_id obligatorio' }, { status: 400 });

    const sale = await base44.asServiceRole.entities.Sale.get(sale_id);
    if (!sale) return Response.json({ error: 'Venta no encontrada' }, { status: 404 });
    if (sale.status === 'cancelled') return Response.json({ error: 'La venta está cancelada' }, { status: 400 });

    // Permisos
    const isAdmin = appRole === 'superadmin' || appRole === 'operaciones';
    if (!isAdmin) {
      const profs = await base44.asServiceRole.entities.AliadaProfile.filter({ user_id: user.id });
      const p = profs && profs[0];
      if (!p || sale.aliada_id !== p.id) return Response.json({ error: 'No puedes editar esta venta' }, { status: 403 });
      const created = sale.created_date ? new Date(sale.created_date).getTime() : 0;
      if (Date.now() - created > H24) return Response.json({ error: 'Pasaron 24h. Crea una solicitud de corrección.' }, { status: 400 });
    }

    const updates = {};
    if (payment_method) updates.payment_method = payment_method;
    if (delivery_date !== undefined) updates.delivery_date = delivery_date || null;
    if (discount_amount !== undefined) {
      let d = Number(discount_amount) || 0;
      if (d > 0 && (!discount_reason || !String(discount_reason).trim())) return Response.json({ error: 'El descuento exige motivo' }, { status: 400 });
      if (d > (sale.official_price || 0)) return Response.json({ error: 'Descuento no puede superar el precio oficial' }, { status: 400 });
      updates.discount_amount = d;
      updates.discount_reason = d ? String(discount_reason).trim() : null;
      updates.amount = Math.max(0, (sale.official_price || 0) - d);
    }

    const now = new Date().toISOString();
    let activated = !!sale.activated;
    let reversal = null;

    if (payment_status && payment_status !== sale.payment_status) {
      if (!PAY_STATUS.includes(payment_status)) return Response.json({ error: 'payment_status inválido' }, { status: 400 });
      updates.payment_status = payment_status;

      // Activar
      if (ACTIVATING.includes(payment_status) && !sale.activated) {
        const invs = await base44.asServiceRole.entities.Inventory.filter({ intensity: sale.intensity });
        const inv = invs && invs[0];
        const available = inv ? (inv.available || 0) : 0;
        if (available <= 0) return Response.json({ error: 'Sin existencia para activar. Operaciones debe autorizar excepción.' }, { status: 400 });
        const remaining = Math.max(0, available - 1);
        await base44.asServiceRole.entities.Inventory.update(inv.id, { available: remaining, status: computeStatus(remaining) });
        const mov = await base44.asServiceRole.entities.InventoryMovement.create({ intensity: sale.intensity, aliada_id: sale.aliada_id, movement_type: 'sale', quantity: -1, related_sale_id: sale.id, status: 'confirmed', reason: `Activación por edición`, created_by: user.id, created_at: now });
        updates.activated = true; updates.status = 'active'; updates.related_movement_id = mov.id;
        // journey + cycle
        const gen = sale.generation_id ? await base44.asServiceRole.entities.Generation.get(sale.generation_id) : null;
        const existing = await base44.asServiceRole.entities.Enrollment.filter({ clienta_id: sale.clienta_id, generation_id: sale.generation_id, status: 'active' });
        let journey = existing && existing[0];
        if (!journey) journey = await base44.asServiceRole.entities.Enrollment.create({ clienta_id: sale.clienta_id, aliada_id: sale.aliada_id, generation_id: sale.generation_id, intensity: sale.intensity, status: 'active', start_date: gen ? gen.start_date : null, end_date: gen ? gen.end_date : null });
        const cycles = await base44.asServiceRole.entities.WeeklyCycle.filter({ journey_id: journey.id });
        const week_number = (cycles ? cycles.length : 0) + 1;
        if (week_number > 12) return Response.json({ error: 'El programa ya tiene 12 semanas.' }, { status: 400 });
        const wc = await base44.asServiceRole.entities.WeeklyCycle.create({ journey_id: journey.id, clienta_id: sale.clienta_id, week_number, intensity: sale.intensity, sale_id: sale.id, status: 'active', unlock_start_date: (gen && gen.start_date) || new Date().toISOString().slice(0, 10), days_unlocked: week_number === 12 ? 13 : 7 });
        updates.enrollment_id = journey.id; updates.weekly_cycle_id = wc.id;
        activated = true;
      }

      // Cancelar y revertir
      if (payment_status === 'cancelled' && sale.activated) {
        const invs = await base44.asServiceRole.entities.Inventory.filter({ intensity: sale.intensity });
        const inv = invs && invs[0];
        if (inv) {
          const newAvail = (inv.available || 0) + 1;
          await base44.asServiceRole.entities.Inventory.update(inv.id, { available: newAvail, status: computeStatus(newAvail) });
        }
        const revMov = await base44.asServiceRole.entities.InventoryMovement.create({ intensity: sale.intensity, aliada_id: sale.aliada_id, movement_type: 'sale_reversal', quantity: 1, related_sale_id: sale.id, status: 'confirmed', reason: `Reverso por cancelación: ${reason || ''}`, created_by: user.id, created_at: now });
        updates.status = 'cancelled'; updates.reversal_movement_id = revMov.id; updates.activated = false;
        reversal = revMov.id;
      }
      if (payment_status === 'cancelled' && !sale.activated) updates.status = 'cancelled';
    }

    await base44.asServiceRole.entities.Sale.update(sale_id, updates);
    await base44.asServiceRole.entities.AuditLog.create({ actor_user_id: user.id, action: 'update_sale', entity_type: 'Sale', entity_id: sale_id, old_value_json: JSON.stringify({ payment_status: sale.payment_status, amount: sale.amount }), new_value_json: JSON.stringify(updates), reason: reason || 'Edición de venta', timestamp: now });

    return Response.json({ ok: true, sale_id, activated, reversal_movement_id: reversal });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});