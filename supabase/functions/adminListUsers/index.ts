import { requireRole, serviceClient } from '../_shared/auth.ts';

// Lista usuarios con su perfil fusionado (full_name/email vienen de
// auth.users.user_metadata, que el cliente nunca puede leer directo — ver
// getAuthUserMeta). Reemplaza los usos de `base44.entities.User.list()`/
// `.filter({email})` del frontend, que en Base44 podían leer el listado
// completo de usuarios porque la entidad User era de primera clase ahí.
// Solo superadmin/operaciones. Sin caller sin filtro: pagina auth.users
// completo (hasta 2000) — suficiente para el tamaño actual de la base.
const PAGE_SIZE = 200;
const MAX_PAGES = 10;

Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json().catch(() => ({}));
    const emailFilter = body.email ? String(body.email).trim().toLowerCase() : null;

    // deno-lint-ignore no-explicit-any
    const authUsers: any[] = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const { data, error } = await svc.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
      if (error || !data?.users?.length) break;
      authUsers.push(...data.users);
      if (data.users.length < PAGE_SIZE) break;
    }

    const filtered = emailFilter ? authUsers.filter((u) => (u.email || '').toLowerCase() === emailFilter) : authUsers;
    const ids = filtered.map((u) => u.id);
    const { data: profiles } = await svc.from('profiles').select('*').in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000']);
    // deno-lint-ignore no-explicit-any
    const profileById: Record<string, any> = {};
    (profiles || []).forEach((p) => { profileById[p.id] = p; });

    const users = filtered.map((u) => {
      const p = profileById[u.id] || {};
      return {
        id: u.id,
        email: u.email || null,
        full_name: u.user_metadata?.full_name || null,
        phone: u.user_metadata?.phone || p.phone || null,
        app_role: p.app_role || null,
        account_status: p.account_status || null,
        onboarding_status: p.onboarding_status || null,
        is_test_account: !!p.is_test_account,
        created_date: u.created_at,
      };
    });

    return Response.json({ users });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
