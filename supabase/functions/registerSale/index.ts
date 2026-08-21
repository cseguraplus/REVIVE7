import { getUserAndProfile, serviceClient, userClient, getAuthUserMeta } from '../_shared/auth.ts';

// Registro de venta por Aliada (activa+capacitada) u Operaciones/superadmin.
// Precio oficial automático; descuento exige motivo; valida inventario; activa si paid/authorized_complimentary.
const PAY_METHODS = ['efectivo', 'transferencia', 'tarjeta', 'otro'];
const PAY_STATUS = ['pending', 'partial', 'paid', 'cancelled', 'authorized_complimentary'];
const ACTIVATING = ['paid', 'authorized_complimentary'];
function computeStatus(avail: number) { return avail <= 0 ? 'out_of_stock' : avail <= 3 ? 'low_stock' : 'in_stock'; }

Deno.serve(async (req) => {
  try {
    const user = await getUserAndProfile(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role;
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = serviceClient();
    const body = await req.json();
    const { clienta_id, intensity, generation_id, delivery_date, payment_method, payment_status, discount_amount, discount_reason, exception_authorized, exception_reason, sale_date, aliada_id } = body;
    if (!clienta_id || !intensity || !generation_id) return Response.json({ error: 'clienta, intensidad y generación obligatorios' }, { status: 400 });
    if (!PAY_METHODS.includes(payment_method)) return Response.json({ error: 'payment_method inválido' }, { status: 400 });
    if (!PAY_STATUS.includes(payment_status)) return Response.json({ error: 'payment_status inválido' }, { status: 400 });

    let aliadaId: string | null = null;
    if (appRole === 'aliada') {
      const { data: profs } = await svc.from('aliada_profiles').select('*').eq('user_id', user.id);
      const p = profs && profs[0];
      if (!p) return Response.json({ error: 'No tienes perfil de aliada' }, { status: 403 });
      if (p.status !== 'active' || p.training_status !== 'completed') return Response.json({ error: 'Debes completar tu capacitación para registrar ventas' }, { status: 403 });
      aliadaId = p.id;
    } else {
      aliadaId = aliada_id || null;
    }

    const { data: guides } = await svc.from('intensity_guides').select('*').eq('intensity', intensity).eq('active', true);
    const guide = guides && guides[0];
    const official_price = guide ? (guide.price || 0) : 0;
    let discount = Number(discount_amount) || 0;
    if (discount > 0 && (!discount_reason || !String(discount_reason).trim())) return Response.json({ error: 'El descuento exige motivo' }, { status: 400 });
    if (discount < 0) discount = 0;
    if (discount > official_price) return Response.json({ error: 'El descuento no puede superar el precio oficial' }, { status: 400 });
    const amount = Math.max(0, official_price - discount);

    const { data: invs } = await svc.from('inventory').select('*').eq('intensity', intensity);
    const inv = invs && invs[0];
    const available = inv ? (inv.available || 0) : 0;
    const activating = ACTIVATING.includes(payment_status);
    let exceptionUsed = false;
    if (activating && available <= 0) {
      const canExcept = (appRole === 'superadmin' || appRole === 'operaciones') && exception_authorized === true && exception_reason && String(exception_reason).trim();
      if (!canExcept) return Response.json({ error: 'Sin existencia. Operaciones debe autorizar excepción con motivo.' }, { status: 400 });
      exceptionUsed = true;
    }

    const { data: gen } = await svc.from('generations').select('*').eq('id', generation_id).maybeSingle();
    const now = new Date().toISOString();

    // Crear Sale en contexto del usuario (created_by_id = auth.uid() vía default de columna → RLS de lectura)
    const uc = userClient(req);
    const { data: saleRec, error: saleErr } = await uc.from('sales').insert({
      clienta_id, aliada_id: aliadaId, generation_id, intensity, kit_name: guide ? guide.name : null,
      official_price, amount, discount_amount: discount, discount_reason: discount ? String(discount_reason).trim() : null,
      payment_method, payment_status, delivery_date: delivery_date || null,
      sale_date: sale_date || new Date().toISOString().slice(0, 10),
      status: activating ? 'active' : 'pending', activated: !!activating,
      exception_authorized: exceptionUsed, exception_reason: exceptionUsed ? String(exception_reason).trim() : null,
    }).select().single();
    if (saleErr || !saleRec) return Response.json({ error: saleErr?.message || 'No se pudo registrar la venta' }, { status: 500 });

    let movementId = null, enrollmentId = null, weeklyCycleId = null, remaining = available;

    if (activating) {
      if (inv) {
        remaining = Math.max(0, available - 1);
        await svc.from('inventory').update({ available: remaining, status: computeStatus(remaining) }).eq('id', inv.id);
      }
      const { data: mov } = await svc.from('inventory_movements').insert({
        intensity, aliada_id: aliadaId, movement_type: 'sale', quantity: -1, related_sale_id: saleRec.id,
        status: 'confirmed', reason: `Venta ${saleRec.id}`, created_by: user.id, created_at: now,
      }).select().single();
      movementId = mov?.id;

      const { data: existing } = await svc.from('enrollments').select('*').eq('clienta_id', clienta_id).eq('generation_id', generation_id).eq('status', 'active');
      let journey = existing && existing[0];
      if (!journey) {
        const { data } = await svc.from('enrollments').insert({
          clienta_id, aliada_id: aliadaId, generation_id, intensity, status: 'active',
          start_date: gen ? gen.start_date : null, end_date: gen ? gen.end_date : null,
        }).select().single();
        journey = data;
      }
      enrollmentId = journey?.id;

      const { data: cycles } = await svc.from('weekly_cycles').select('*').eq('journey_id', journey.id);
      const week_number = (cycles ? cycles.length : 0) + 1;
      if (week_number > 12) return Response.json({ error: 'El programa ya tiene 12 semanas. No se pueden agregar más ciclos.' }, { status: 400 });
      const days_unlocked = week_number === 12 ? 13 : 7;
      const unlock_start = (gen && gen.start_date) || new Date().toISOString().slice(0, 10);
      const { data: wc } = await svc.from('weekly_cycles').insert({
        journey_id: journey.id, clienta_id, week_number, intensity, sale_id: saleRec.id,
        status: 'active', unlock_start_date: unlock_start, days_unlocked,
        notes: exceptionUsed ? 'Excepción de inventario autorizada' : null,
      }).select().single();
      weeklyCycleId = wc?.id;

      await svc.from('sales').update({ enrollment_id: journey.id, weekly_cycle_id: wc?.id, related_movement_id: movementId }).eq('id', saleRec.id);

      // Confirmación de ciclo semanal por correo — best-effort (el envío real
      // se resuelve en Paso 7 de la migración, reemplazo de SendEmail).
      try {
        const meta = await getAuthUserMeta(svc, clienta_id);
        if (meta.email) {
          // TODO(paso 7): reemplazar por el proveedor de correo elegido (ej. Resend).
          console.log('sendEmail(pending provider)', meta.email, `Semana ${week_number} confirmada · Revive 7`);
        }
      } catch { /* best-effort */ }
    }

    if (exceptionUsed) {
      await svc.from('audit_logs').insert({
        actor_user_id: user.id, action: 'inventory_exception', entity_type: 'Sale', entity_id: saleRec.id,
        old_value_json: JSON.stringify({ available }), new_value_json: JSON.stringify({ exception: true }),
        reason: String(exception_reason).trim(), timestamp: now,
      });
    }
    await svc.from('audit_logs').insert({
      actor_user_id: user.id, action: 'register_sale', entity_type: 'Sale', entity_id: saleRec.id,
      old_value_json: '{}', new_value_json: JSON.stringify({ amount, payment_status, activated: !!activating, weekly_cycle_id: weeklyCycleId }),
      reason: 'Registro de venta', timestamp: now,
    });

    return Response.json({
      ok: true, sale_id: saleRec.id, amount, official_price, activated: !!activating,
      remaining_inventory: remaining, enrollment_id: enrollmentId, weekly_cycle_id: weeklyCycleId, exception_used: exceptionUsed,
    });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
