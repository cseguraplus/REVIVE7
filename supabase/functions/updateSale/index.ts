import { getUserAndProfile, serviceClient } from '../_shared/auth.ts';

// Edición de venta. Aliada: solo dentro de 24h y sobre ventas propias. Operaciones/superadmin: sin límite.
// Si payment_status pasa a paid/authorized_complimentary y no estaba activa → activa (descuenta inventario, crea journey+cycle).
// Si payment_status pasa a cancelled y estaba activa → revierte inventario (sale_reversal +1).
const PAY_STATUS = ['pending', 'partial', 'paid', 'cancelled', 'authorized_complimentary'];
const ACTIVATING = ['paid', 'authorized_complimentary'];
function computeStatus(avail: number) { return avail <= 0 ? 'out_of_stock' : avail <= 3 ? 'low_stock' : 'in_stock'; }
const H24 = 24 * 60 * 60 * 1000;

Deno.serve(async (req) => {
  try {
    const user = await getUserAndProfile(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role;
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = serviceClient();
    const body = await req.json();
    const { sale_id, payment_method, payment_status, delivery_date, discount_amount, discount_reason, reason } = body;
    if (!sale_id) return Response.json({ error: 'sale_id obligatorio' }, { status: 400 });

    const { data: sale } = await svc.from('sales').select('*').eq('id', sale_id).maybeSingle();
    if (!sale) return Response.json({ error: 'Venta no encontrada' }, { status: 404 });
    if (sale.status === 'cancelled') return Response.json({ error: 'La venta está cancelada' }, { status: 400 });

    const isAdmin = appRole === 'superadmin' || appRole === 'operaciones';
    if (!isAdmin) {
      const { data: profs } = await svc.from('aliada_profiles').select('*').eq('user_id', user.id);
      const p = profs && profs[0];
      if (!p || sale.aliada_id !== p.id) return Response.json({ error: 'No puedes editar esta venta' }, { status: 403 });
      const created = sale.created_at ? new Date(sale.created_at).getTime() : 0;
      if (Date.now() - created > H24) return Response.json({ error: 'Pasaron 24h. Crea una solicitud de corrección.' }, { status: 400 });
    }

    // deno-lint-ignore no-explicit-any
    const updates: any = {};
    if (payment_method) updates.payment_method = payment_method;
    if (delivery_date !== undefined) updates.delivery_date = delivery_date || null;
    if (discount_amount !== undefined) {
      const d = Number(discount_amount) || 0;
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

      if (ACTIVATING.includes(payment_status) && !sale.activated) {
        const { data: invs } = await svc.from('inventory').select('*').eq('intensity', sale.intensity);
        const inv = invs && invs[0];
        const available = inv ? (inv.available || 0) : 0;
        if (available <= 0) return Response.json({ error: 'Sin existencia para activar. Operaciones debe autorizar excepción.' }, { status: 400 });
        const remaining = Math.max(0, available - 1);
        await svc.from('inventory').update({ available: remaining, status: computeStatus(remaining) }).eq('id', inv.id);
        const { data: mov } = await svc.from('inventory_movements').insert({ intensity: sale.intensity, aliada_id: sale.aliada_id, movement_type: 'sale', quantity: -1, related_sale_id: sale.id, status: 'confirmed', reason: `Activación por edición`, created_by: user.id, created_at: now }).select().single();
        updates.activated = true; updates.status = 'active'; updates.related_movement_id = mov?.id;

        const { data: gen } = sale.generation_id ? await svc.from('generations').select('*').eq('id', sale.generation_id).maybeSingle() : { data: null };
        const { data: existing } = await svc.from('enrollments').select('*').eq('clienta_id', sale.clienta_id).eq('generation_id', sale.generation_id).eq('status', 'active');
        let journey = existing && existing[0];
        if (!journey) {
          const { data } = await svc.from('enrollments').insert({ clienta_id: sale.clienta_id, aliada_id: sale.aliada_id, generation_id: sale.generation_id, intensity: sale.intensity, status: 'active', start_date: gen ? gen.start_date : null, end_date: gen ? gen.end_date : null }).select().single();
          journey = data;
        }
        const { data: cycles } = await svc.from('weekly_cycles').select('*').eq('journey_id', journey.id);
        const week_number = (cycles ? cycles.length : 0) + 1;
        if (week_number > 12) return Response.json({ error: 'El programa ya tiene 12 semanas.' }, { status: 400 });
        const { data: wc } = await svc.from('weekly_cycles').insert({ journey_id: journey.id, clienta_id: sale.clienta_id, week_number, intensity: sale.intensity, sale_id: sale.id, status: 'active', unlock_start_date: (gen && gen.start_date) || new Date().toISOString().slice(0, 10), days_unlocked: week_number === 12 ? 13 : 7 }).select().single();
        updates.enrollment_id = journey.id; updates.weekly_cycle_id = wc?.id;
        activated = true;
      }

      if (payment_status === 'cancelled' && sale.activated) {
        const { data: invs } = await svc.from('inventory').select('*').eq('intensity', sale.intensity);
        const inv = invs && invs[0];
        if (inv) {
          const newAvail = (inv.available || 0) + 1;
          await svc.from('inventory').update({ available: newAvail, status: computeStatus(newAvail) }).eq('id', inv.id);
        }
        const { data: revMov } = await svc.from('inventory_movements').insert({ intensity: sale.intensity, aliada_id: sale.aliada_id, movement_type: 'sale_reversal', quantity: 1, related_sale_id: sale.id, status: 'confirmed', reason: `Reverso por cancelación: ${reason || ''}`, created_by: user.id, created_at: now }).select().single();
        updates.status = 'cancelled'; updates.reversal_movement_id = revMov?.id; updates.activated = false;
        reversal = revMov?.id;
      }
      if (payment_status === 'cancelled' && !sale.activated) updates.status = 'cancelled';
    }

    await svc.from('sales').update(updates).eq('id', sale_id);
    await svc.from('audit_logs').insert({ actor_user_id: user.id, action: 'update_sale', entity_type: 'Sale', entity_id: sale_id, old_value_json: JSON.stringify({ payment_status: sale.payment_status, amount: sale.amount }), new_value_json: JSON.stringify(updates), reason: reason || 'Edición de venta', timestamp: now });

    return Response.json({ ok: true, sale_id, activated, reversal_movement_id: reversal });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
