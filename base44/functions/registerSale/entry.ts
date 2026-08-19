import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Registro de venta por Aliada (activa+capacitada) u Operaciones/superadmin.
// Precio oficial automático; descuento exige motivo; valida inventario; activa si paid/authorized_complimentary.
const PAY_METHODS = ['efectivo', 'transferencia', 'tarjeta', 'otro'];
const PAY_STATUS = ['pending', 'partial', 'paid', 'cancelled', 'authorized_complimentary'];
const ACTIVATING = ['paid', 'authorized_complimentary'];
function computeStatus(avail) { return avail <= 0 ? 'out_of_stock' : avail <= 3 ? 'low_stock' : 'in_stock'; }

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { clienta_id, intensity, generation_id, delivery_date, payment_method, payment_status, discount_amount, discount_reason, exception_authorized, exception_reason, sale_date, aliada_id } = body;
    if (!clienta_id || !intensity || !generation_id) return Response.json({ error: 'clienta, intensidad y generación obligatorios' }, { status: 400 });
    if (!PAY_METHODS.includes(payment_method)) return Response.json({ error: 'payment_method inválido' }, { status: 400 });
    if (!PAY_STATUS.includes(payment_status)) return Response.json({ error: 'payment_status inválido' }, { status: 400 });

    // Aliada profile + capacitación
    let aliadaId = null;
    if (appRole === 'aliada') {
      const profs = await base44.asServiceRole.entities.AliadaProfile.filter({ user_id: user.id });
      const p = profs && profs[0];
      if (!p) return Response.json({ error: 'No tienes perfil de aliada' }, { status: 403 });
      if (p.status !== 'active' || p.training_status !== 'completed') return Response.json({ error: 'Debes completar tu capacitación para registrar ventas' }, { status: 403 });
      aliadaId = p.id;
    } else {
      aliadaId = aliada_id || null;
    }

    // Precio oficial
    const guides = await base44.asServiceRole.entities.IntensityGuide.filter({ intensity, active: true });
    const guide = guides && guides[0];
    const official_price = guide ? (guide.price || 0) : 0;
    let discount = Number(discount_amount) || 0;
    if (discount > 0 && (!discount_reason || !String(discount_reason).trim())) return Response.json({ error: 'El descuento exige motivo' }, { status: 400 });
    if (discount < 0) discount = 0;
    if (discount > official_price) return Response.json({ error: 'El descuento no puede superar el precio oficial' }, { status: 400 });
    const amount = Math.max(0, official_price - discount);

    // Inventario
    const invs = await base44.asServiceRole.entities.Inventory.filter({ intensity });
    const inv = invs && invs[0];
    const available = inv ? (inv.available || 0) : 0;
    const activating = ACTIVATING.includes(payment_status);
    let exceptionUsed = false;
    if (activating && available <= 0) {
      const canExcept = (appRole === 'superadmin' || appRole === 'operaciones') && exception_authorized === true && exception_reason && String(exception_reason).trim();
      if (!canExcept) return Response.json({ error: 'Sin existencia. Operaciones debe autorizar excepción con motivo.' }, { status: 400 });
      exceptionUsed = true;
    }

    const gen = await base44.asServiceRole.entities.Generation.get(generation_id);
    const now = new Date().toISOString();

    // Crear Sale en contexto del usuario (created_by_id = user.id → RLS de lectura)
    const saleRec = await base44.entities.Sale.create({
      clienta_id, aliada_id: aliadaId, generation_id, intensity, kit_name: guide ? guide.name : null,
      official_price, amount, discount_amount: discount, discount_reason: discount ? String(discount_reason).trim() : null,
      payment_method, payment_status, delivery_date: delivery_date || null,
      sale_date: sale_date || new Date().toISOString().slice(0, 10),
      status: activating ? 'active' : 'pending', activated: !!activating,
      exception_authorized: exceptionUsed, exception_reason: exceptionUsed ? String(exception_reason).trim() : null,
    });

    let movementId = null, enrollmentId = null, weeklyCycleId = null, remaining = available;

    if (activating) {
      if (inv) {
        remaining = Math.max(0, available - 1);
        await base44.asServiceRole.entities.Inventory.update(inv.id, { available: remaining, status: computeStatus(remaining) });
      }
      const mov = await base44.asServiceRole.entities.InventoryMovement.create({
        intensity, aliada_id: aliadaId, movement_type: 'sale', quantity: -1, related_sale_id: saleRec.id,
        status: 'confirmed', reason: `Venta ${saleRec.id}`, created_by: user.id, created_at: now,
      });
      movementId = mov.id;

      // ProgramJourney (Enrollment): crear o reutilizar
      const existing = await base44.asServiceRole.entities.Enrollment.filter({ clienta_id, generation_id, status: 'active' });
      let journey = existing && existing[0];
      if (!journey) {
        journey = await base44.asServiceRole.entities.Enrollment.create({
          clienta_id, aliada_id: aliadaId, generation_id, intensity, status: 'active',
          start_date: gen ? gen.start_date : null, end_date: gen ? gen.end_date : null,
        });
      }
      enrollmentId = journey.id;

      // WeeklyCycle: siguiente semana (1-12). Semana 12 → 13 días (Consolida 6).
      const cycles = await base44.asServiceRole.entities.WeeklyCycle.filter({ journey_id: journey.id });
      const week_number = (cycles ? cycles.length : 0) + 1;
      if (week_number > 12) return Response.json({ error: 'El programa ya tiene 12 semanas. No se pueden agregar más ciclos.' }, { status: 400 });
      const days_unlocked = week_number === 12 ? 13 : 7;
      const unlock_start = (gen && gen.start_date) || new Date().toISOString().slice(0, 10);
      const wc = await base44.asServiceRole.entities.WeeklyCycle.create({
        journey_id: journey.id, clienta_id, week_number, intensity, sale_id: saleRec.id,
        status: 'active', unlock_start_date: unlock_start, days_unlocked,
        notes: exceptionUsed ? 'Excepción de inventario autorizada' : null,
      });
      weeklyCycleId = wc.id;

      await base44.asServiceRole.entities.Sale.update(saleRec.id, { enrollment_id: journey.id, weekly_cycle_id: wc.id, related_movement_id: movementId });

      // Confirmación de ciclo semanal por correo
      try {
        const cu = await base44.asServiceRole.entities.User.get(clienta_id);
        if (cu && cu.email) {
          await base44.integrations.Core.SendEmail({
            to: cu.email,
            subject: `Semana ${week_number} confirmada · Revive 7`,
            body: `Hola ${cu.full_name || 'clienta'},\n\nTu Kit de la semana ${week_number} (${intensity}) fue confirmado. ¡Sigue con tu proceso!\n\n— Equipo Revive 7`,
          });
        }
      } catch (e) { /* best-effort */ }
    }

    if (exceptionUsed) {
      await base44.asServiceRole.entities.AuditLog.create({
        actor_user_id: user.id, action: 'inventory_exception', entity_type: 'Sale', entity_id: saleRec.id,
        old_value_json: JSON.stringify({ available }), new_value_json: JSON.stringify({ exception: true }),
        reason: String(exception_reason).trim(), timestamp: now,
      });
    }
    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id, action: 'register_sale', entity_type: 'Sale', entity_id: saleRec.id,
      old_value_json: '{}', new_value_json: JSON.stringify({ amount, payment_status, activated: !!activating, weekly_cycle_id: weeklyCycleId }),
      reason: 'Registro de venta', timestamp: now,
    });

    return Response.json({
      ok: true, sale_id: saleRec.id, amount, official_price, activated: !!activating,
      remaining_inventory: remaining, enrollment_id: enrollmentId, weekly_cycle_id: weeklyCycleId, exception_used: exceptionUsed,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});