import { getUserAndProfile, serviceClient, getAuthUserMeta } from '../_shared/auth.ts';

// Datos para las pantallas de ventas/inventario de la Aliada.
Deno.serve(async (req) => {
  try {
    const user = await getUserAndProfile(req);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role;
    if (appRole !== 'aliada' && appRole !== 'superadmin' && appRole !== 'operaciones') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const svc = serviceClient();

    let aliadaId: string | null = null;
    if (appRole === 'aliada') {
      const { data: profs } = await svc.from('aliada_profiles').select('*').eq('user_id', user.id);
      const p = profs && profs[0];
      if (!p) return Response.json({ error: 'No tienes perfil de aliada' }, { status: 403 });
      aliadaId = p.id;
    }

    const [
      { data: allClientas },
      { data: allSales },
      { data: inventory },
      { data: allGenerations },
      { data: guides },
      { data: movements },
    ] = await Promise.all([
      aliadaId ? svc.from('clienta_profiles').select('*').eq('aliada_id', aliadaId) : svc.from('clienta_profiles').select('*'),
      aliadaId ? svc.from('sales').select('*').eq('aliada_id', aliadaId) : svc.from('sales').select('*'),
      svc.from('inventory').select('*'),
      svc.from('generations').select('*'),
      svc.from('intensity_guides').select('*').eq('active', true),
      aliadaId ? svc.from('inventory_movements').select('*').eq('aliada_id', aliadaId) : svc.from('inventory_movements').select('*'),
    ]);

    const clientas = [];
    for (const c of allClientas || []) {
      const meta = await getAuthUserMeta(svc, c.user_id);
      clientas.push({ id: c.id, user_id: c.user_id, full_name: meta.full_name || 'Clienta', phone: c.phone, status: c.status, safety_flag: c.safety_flag });
    }
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
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
