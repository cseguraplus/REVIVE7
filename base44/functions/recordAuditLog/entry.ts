import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Registra una entrada de auditoría. Solo admin/operaciones.
// Toda corrección administrativa exige motivo y valor anterior/nuevo.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const { action, entity_type, entity_id, old_value, new_value, reason } = body;
    if (!action) return Response.json({ error: 'action obligatorio' }, { status: 400 });
    const reasonStr = reason ? String(reason).trim() : '';
    // Las correcciones exigen motivo
    if (String(action).includes('correction') && !reasonStr) {
      return Response.json({ error: 'Motivo obligatorio para correcciones' }, { status: 400 });
    }

    const log = await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id, action,
      entity_type: entity_type || null, entity_id: entity_id || null,
      old_value_json: old_value != null ? (typeof old_value === 'string' ? old_value : JSON.stringify(old_value)) : '',
      new_value_json: new_value != null ? (typeof new_value === 'string' ? new_value : JSON.stringify(new_value)) : '',
      reason: reasonStr, timestamp: new Date().toISOString(),
    });
    return Response.json({ ok: true, id: log.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});