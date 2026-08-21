import { requireRole, serviceClient } from '../_shared/auth.ts';

// Registra una entrada de auditoría. Solo admin/operaciones.
// Toda corrección administrativa exige motivo y valor anterior/nuevo.
Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const body = await req.json().catch(() => ({}));
    const { action, entity_type, entity_id, old_value, new_value, reason } = body;
    if (!action) return Response.json({ error: 'action obligatorio' }, { status: 400 });
    const reasonStr = reason ? String(reason).trim() : '';
    if (String(action).includes('correction') && !reasonStr) {
      return Response.json({ error: 'Motivo obligatorio para correcciones' }, { status: 400 });
    }

    const svc = serviceClient();
    const { data: log } = await svc.from('audit_logs').insert({
      actor_user_id: auth.user.id, action,
      entity_type: entity_type || null, entity_id: entity_id || null,
      old_value_json: old_value != null ? (typeof old_value === 'string' ? old_value : JSON.stringify(old_value)) : '',
      new_value_json: new_value != null ? (typeof new_value === 'string' ? new_value : JSON.stringify(new_value)) : '',
      reason: reasonStr, timestamp: new Date().toISOString(),
    }).select().single();
    return Response.json({ ok: true, id: log?.id });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
