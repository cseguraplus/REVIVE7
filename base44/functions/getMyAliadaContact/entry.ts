import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { requireRole } from '../../shared/auth.ts';

// Devuelve solo el nombre público y WhatsApp de la Aliada asignada a la clienta
// que hace la petición. AliadaProfile.read quedó restringido a admin/operaciones
// o la propia aliada (Fase 2), así que la clienta ya no puede leer el registro de
// su aliada directamente — esta función hace ese único lookup necesario con
// asServiceRole, sin exponer el resto de AliadaProfile ni el listado completo.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const auth = await requireRole(req, base44, ['clienta', 'superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const profiles = await base44.asServiceRole.entities.ClientaProfile.filter({ user_id: auth.user.id });
    const profile = profiles && profiles[0];
    if (!profile || !profile.aliada_id) {
      return Response.json({ aliada: null });
    }

    const aliada = await base44.asServiceRole.entities.AliadaProfile.get(profile.aliada_id);
    if (!aliada) return Response.json({ aliada: null });

    return Response.json({
      aliada: { public_name: aliada.public_name || null, whatsapp: aliada.whatsapp || null },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
