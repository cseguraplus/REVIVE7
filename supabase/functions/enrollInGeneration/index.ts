import { requireRole, serviceClient, getAuthUserMeta } from '../_shared/auth.ts';

// Inscribe a una clienta en una generación aplicando el corte dominical 20:00.
// - Inscripción posterior al corte → pasa al lunes siguiente (siguiente generación).
// - Override (operaciones/superadmin) + motivo + auditoría → permite la generación original aunque sea tardía.
const TZ = 'America/Mexico_City';
const INTENSITIES = ['renueva_7', 'activa_7', 'evoluciona_7'];

function dateTimeInTZ(d: Date, tz: string) {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  const hh = m.hour === '24' ? '00' : m.hour;
  return `${m.year}-${m.month}-${m.day}T${hh}:${m.minute}:${m.second}`;
}
function addDays(dateStr: string, n: number) {
  const [y, mo, da] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, da));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function nextMonday(dateStr: string) {
  const [y, mo, da] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, da));
  const dow = dt.getUTCDay();
  const add = dow === 1 ? 0 : (dow === 0 ? 1 : 8 - dow);
  dt.setUTCDate(dt.getUTCDate() + add);
  return dt.toISOString().slice(0, 10);
}

Deno.serve(async (req) => {
  try {
    const auth = await requireRole(req, ['superadmin', 'operaciones']);
    if (!auth.ok) return auth.response;

    const svc = serviceClient();
    const body = await req.json();
    const { clienta_id, intensity, desired_generation_id, override } = body;
    if (!clienta_id) return Response.json({ error: 'clienta_id obligatorio' }, { status: 400 });
    if (!INTENSITIES.includes(intensity)) return Response.json({ error: 'intensity inválido' }, { status: 400 });

    const nowISO = dateTimeInTZ(new Date(), TZ);
    // deno-lint-ignore no-explicit-any
    let target: any = null;
    let usedOverride = false;

    if (desired_generation_id) {
      const { data } = await svc.from('generations').select('*').eq('id', desired_generation_id).maybeSingle();
      target = data;
      if (target) {
        const late = nowISO > String(target.enrollment_cutoff);
        if (late) {
          if (override) {
            const reason = body.reason ? String(body.reason).trim() : '';
            if (!reason) return Response.json({ error: 'Motivo obligatorio para override tardío' }, { status: 400 });
            usedOverride = true;
          } else {
            target = null;
          }
        }
      }
    }

    if (!target) {
      const { data: all } = await svc.from('generations').select('*').order('start_date', { ascending: true }).limit(100);
      target = (all || []).find((g) => String(g.enrollment_cutoff) >= nowISO && (g.status === 'open' || g.status === 'closed'));
      if (!target) {
        const todayStr = nowISO.slice(0, 10);
        let monday = nextMonday(todayStr);
        if (monday <= todayStr) monday = addDays(monday, 7);
        const start = monday;
        const { data } = await svc.from('generations').insert({
          name: `Generación ${start}`,
          week_index: 1,
          start_date: start,
          end_date: addDays(start, 6),
          enrollment_cutoff: `${addDays(start, -1)}T20:00:00`,
          status: 'open',
        }).select().single();
        target = data;
      }
    }

    const { data: enr } = await svc.from('enrollments').insert({
      clienta_id,
      generation_id: target.id,
      intensity,
      status: 'active',
      start_date: target.start_date,
    }).select().single();

    await svc.from('audit_logs').insert({
      actor_user_id: auth.user.id,
      action: 'enroll_in_generation',
      entity_type: 'Enrollment',
      entity_id: enr.id,
      old_value_json: JSON.stringify({}),
      new_value_json: JSON.stringify({ generation_id: target.id, start_date: target.start_date, intensity, override: usedOverride }),
      reason: usedOverride ? `Override tardío: ${String(body.reason).trim()}` : 'Inscripción normal (regla de corte dominical)',
      timestamp: new Date().toISOString(),
    });

    try {
      const meta = await getAuthUserMeta(svc, clienta_id);
      if (meta.email) {
        // TODO(paso 7): reemplazar por el proveedor de correo elegido (ej. Resend).
        console.log('sendEmail(pending provider)', meta.email, '¡Comienza tu generación de Revive 7!', target.name);
      }
    } catch { /* best-effort */ }

    return Response.json({ ok: true, enrollment_id: enr.id, generation: { id: target.id, start_date: target.start_date, enrollment_cutoff: target.enrollment_cutoff }, override: usedOverride });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});
