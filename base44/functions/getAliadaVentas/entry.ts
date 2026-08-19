import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Datos para las pantallas de ventas/inventario de la Aliada.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    let aliadaId = null;
    if (appRole === 'aliada') {
      const profs = await base44.asServiceRole.entities.AliadaProfile.filter({ user_id: user.id });
      const p = profs && profs[0];
      if (!p) return Response.json({ error: 'No tienes perfil de aliada' }, { status: 403 });
      aliadaId = p.id;
    }

    const [allClientas, allSales, inventory, allGenerations, guides, users, movements] = await Promise.all([
      aliadaId ? base44.asServiceRole.entities.ClientaProfile.filter({ aliada_id: aliadaId }) : base44.asServiceRole.entities.ClientaProfile.list(),
      aliadaId ? base44.asServiceRole.entities.Sale.filter({ aliada_id: aliadaId }) : base44.asServiceRole.entities.Sale.list(),
      base44.asServiceRole.entities.Inventory.list(),
      base44.asServiceRole.entities.Generation.list(),
      base44.asServiceRole.entities.IntensityGuide.filter({ active: true }),
      base44.asServiceRole.entities.User.list(),
      aliadaId ? base44.asServiceRole.entities.InventoryMovement.filter({ aliada_id: aliadaId }) : base44.asServiceRole.entities.InventoryMovement.list(),
    ]);

    const userMap = {};
    (users || []).forEach((u) => { userMap[u.id] = u; });
    const clientas = (allClientas || []).map((c) => ({ id: c.id, user_id: c.user_id, full_name: userMap[c.user_id]?.full_name || "Clienta", phone: c.phone, status: c.status, safety_flag: c.safety_flag }));
    const generations = (allGenerations || []).filter((g) => g.status === 'open' || g.status === 'closed');

    return Response.json({
      aliada_id: aliadaId,
      clientas,
      sales: allSales || [],
      inventory: inventory || [],
      generations,
      guides: guides || [],
      movements: movements || [],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});