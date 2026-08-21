import { getUserAndProfile, serviceClient } from '../_shared/auth.ts';

// Cancelación de venta (nunca se elimina). Reversa inventario si estaba activa.
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
    const { sale_id, reason } = body;
    if (!sale_id) return Response.json({ error: 'sale_id obligatorio' }, { status: 400 });
    if (!reason || !String(reason).trim()) return Response.json({ error: 'Motivo obligatorio para cancelar' }, { status: 400 });

    const { data: sale } = await svc.from('sales').select('*').eq('id', sale_id).maybeSingle();
    if (!sale) return Response.json({ error: 'Venta no encontrada' }, { status: 404 });
    if (sale.status === 'cancelled') return Response.json({ error: 'Ya está cancelada' }, { status: 400 });

    const isAdmin = appRole === 'superadmin' || appRole === 'operaciones';
    if (!isAdmin) {
      const { data: profs } = await svc.from('aliada_profiles').select('*').eq('user_id', user.id);
      const p = profs && profs[0];
      if (!p || sale.aliada_id !== p.id) return Response.json({ error: 'No puedes cancelar esta venta' }, { status: 403 });
      const created = sale.created_at ? new Date(sale.created_at).getTime() : 0;
      if (Date.now() - created > H24) return Response.json({ error: 'Pasaron 24h. Solicita corrección a Operaciones.' }, { status: 400 });
    }

    const now = new Date().toISOString();
    let reversalId = null;
    if (sale.activated) {
      const { data: invs } = await svc.from('inventory').select('*').eq('intensity', sale.intensity);
      const inv = invs && invs[0];
      if (inv) {
        const newAvail = (inv.available || 0) + 1;
        await svc.from('inventory').update({ available: newAvail, status: computeStatus(newAvail) }).eq('id', inv.id);
      }
      const { data: rev } = await svc.from('inventory_movements').insert({ intensity: sale.intensity, aliada_id: sale.aliada_id, movement_type: 'sale_reversal', quantity: 1, related_sale_id: sale.id, status: 'confirmed', reason: `Cancelación: ${String(reason).trim()}`, created_by: user.id, created_at: now }).select().single();
      reversalId = rev?.id;
    }

    await svc.from('sales').update({ status: 'cancelled', payment_status: 'cancelled', activated: false, reversal_movement_id: reversalId }).eq('id', sale_id);
    await svc.from('audit_logs').insert({ actor_user_id: user.id, action: 'cancel_sale', entity_type: 'Sale', entity_id: sale_id, old_value_json: JSON.stringify({ status: sale.status, activated: sale.activated }), new_value_json: JSON.stringify({ status: 'cancelled', reversal_movement_id: reversalId }), reason: String(reason).trim(), timestamp: now });

    return Response.json({ ok: true, sale_id, status: 'cancelled', reversal_movement_id: reversalId });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
