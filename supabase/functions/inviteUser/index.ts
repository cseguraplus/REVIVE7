import { requireRole, serviceClient, findOrInviteUser } from '../_shared/auth.ts';

// Invita (o ubica) una cuenta por email — Supabase Auth manda el correo de
// invitación. Equivalente a `base44.users.inviteUser(email, role)`, usado
// hoy solo desde el panel admin (InviteAliada.jsx) para altas manuales.
// Superadmin/operaciones.
Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { email } = body;
    if (!email) return Response.json({ error: 'email obligatorio' }, { status: 400 });

    const user = await findOrInviteUser(svc, email);
    if (!user) return Response.json({ error: 'No se pudo invitar o ubicar la cuenta' }, { status: 500 });

    return Response.json({ ok: true, user_id: user.id, email: user.email });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
