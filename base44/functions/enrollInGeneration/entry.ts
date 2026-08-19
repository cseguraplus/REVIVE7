import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Inscribe a una clienta en una generación aplicando el corte dominical 20:00.
// - Inscripción posterior al corte → pasa al lunes siguiente (siguiente generación).
// - Override (operaciones/superadmin) + motivo + auditoría → permite la generación original aunque sea tardía.
const TZ = 'America/Mexico_City';
const INTENSITIES = ['renueva_7', 'activa_7', 'evoluciona_7'];

function dateTimeInTZ(d, tz) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d);
  const m = {};
  for (const p of parts) m[p.type] = p.value;
  const hh = m.hour === '24' ? '00' : m.hour;
  return `${m.year}-${m.month}-${m.day}T${hh}:${m.minute}:${m.second}`;
}
function addDays(dateStr, n) {
  const [y, mo, da] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, da));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function nextMonday(dateStr) {
  const [y, mo, da] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, da));
  const dow = dt.getUTCDay();
  const add = dow === 1 ? 0 : (dow === 0 ? 1 : 8 - dow);
  dt.setUTCDate(dt.getUTCDate() + add);
  return dt.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const appRole = user.app_role || (user.data && user.data.app_role);
    if (appRole !== 'superadmin' && appRole !== 'operaciones') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { clienta_id, intensity, desired_generation_id, override } = body;
    if (!clienta_id) return Response.json({ error: 'clienta_id obligatorio' }, { status: 400 });
    if (!INTENSITIES.includes(intensity)) return Response.json({ error: 'intensity inválido' }, { status: 400 });

    const nowISO = dateTimeInTZ(new Date(), TZ);
    let target = null;
    let usedOverride = false;

    if (desired_generation_id) {
      try { target = await base44.asServiceRole.entities.Generation.get(desired_generation_id); } catch (e) { target = null; }
      if (target) {
        const late = nowISO > String(target.enrollment_cutoff);
        if (late) {
          if (override) {
            const reason = body.reason ? String(body.reason).trim() : '';
            if (!reason) return Response.json({ error: 'Motivo obligatorio para override tardío' }, { status: 400 });
            usedOverride = true;
          } else {
            target = null; // cae al siguiente lunes
          }
        }
      }
    }

    if (!target) {
      const all = await base44.asServiceRole.entities.Generation.list('start_date', 100);
      target = (all || []).find((g) => String(g.enrollment_cutoff) >= nowISO && (g.status === 'open' || g.status === 'closed'));
      if (!target) {
        // crea la siguiente generación disponible
        const todayStr = nowISO.slice(0, 10);
        let monday = nextMonday(todayStr);
        if (monday <= todayStr) monday = addDays(monday, 7);
        const start = monday;
        target = await base44.asServiceRole.entities.Generation.create({
          name: `Generación ${start}`,
          week_index: 1,
          start_date: start,
          end_date: addDays(start, 6),
          enrollment_cutoff: `${addDays(start, -1)}T20:00:00`,
          status: 'open',
        });
      }
    }

    const enr = await base44.asServiceRole.entities.Enrollment.create({
      clienta_id,
      generation_id: target.id,
      intensity,
      status: 'active',
      start_date: target.start_date,
    });

    await base44.asServiceRole.entities.AuditLog.create({
      actor_user_id: user.id,
      action: 'enroll_in_generation',
      entity_type: 'Enrollment',
      entity_id: enr.id,
      old_value_json: JSON.stringify({}),
      new_value_json: JSON.stringify({ generation_id: target.id, start_date: target.start_date, intensity, override: usedOverride }),
      reason: usedOverride ? `Override tardío: ${String(body.reason).trim()}` : 'Inscripción normal (regla de corte dominical)',
      timestamp: new Date().toISOString(),
    });

    // Correo de inicio de generación
    try {
      const cu = await base44.asServiceRole.entities.User.get(clienta_id);
      if (cu && cu.email) {
        await base44.integrations.Core.SendEmail({
          to: cu.email,
          subject: '¡Comienza tu generación de Revive 7!',
          body: `Hola ${cu.full_name || 'clienta'},\n\nHoy inicia tu generación (${target.name}). Ya puedes ver tu contenido del día 1.\n\n— Equipo Revive 7`,
        });
      }
    } catch (e) { /* best-effort */ }

    return Response.json({ ok: true, enrollment_id: enr.id, generation: { id: target.id, start_date: target.start_date, enrollment_cutoff: target.enrollment_cutoff }, override: usedOverride });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});