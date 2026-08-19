import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Public, validated receiver for Aliada applications from aliadaservivo.com.
// No auth required. The browser never writes SolicitudAliada directly.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ABUSE_LIMIT = 5;
const ABUSE_WINDOW_MS = 60 * 60 * 1000;

function extractIp(req) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) { const v = xff.split(',')[0].trim(); if (v) return v.slice(0, 45); }
  const real = req.headers.get('x-real-ip');
  return real ? real.trim().slice(0, 45) : null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { full_name, email, phone, ciudad, mensaje, source_domain } = body;

    const name = full_name ? String(full_name).trim() : '';
    if (name.length < 2 || name.length > 120) return Response.json({ error: 'Nombre inválido (2-120)' }, { status: 400 });

    const emailNorm = email ? String(email).trim().toLowerCase() : '';
    if (!EMAIL_RE.test(emailNorm) || emailNorm.length > 200) return Response.json({ error: 'Email inválido' }, { status: 400 });

    const phoneStr = phone ? String(phone).trim() : '';
    const phoneDigits = phoneStr.replace(/[^\d]/g, '');
    if (phoneDigits.length < 7 || phoneStr.length > 30) return Response.json({ error: 'Teléfono inválido' }, { status: 400 });

    const ciudadStr = ciudad ? String(ciudad).trim().slice(0, 120) : '';
    const mensajeStr = mensaje ? String(mensaje).trim().slice(0, 2000) : '';

    const ip = extractIp(req);
    if (ip) {
      try {
        const recent = await base44.asServiceRole.entities.SolicitudAliada.filter({});
        const cutoff = Date.now() - ABUSE_WINDOW_MS;
        const byIp = (recent || []).filter((r) => r.created_date && new Date(r.created_date).getTime() >= cutoff && r.ip === ip);
        if (byIp.length >= ABUSE_LIMIT) return Response.json({ error: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429 });
      } catch (e) { /* best-effort */ }
    }

    // Dedup by email
    try {
      const byEmail = await base44.asServiceRole.entities.SolicitudAliada.filter({ email: emailNorm });
      if (byEmail && byEmail.length > 0) return Response.json({ ok: false, duplicate: true, id: byEmail[0].id }, { status: 409 });
    } catch (e) { /* proceed */ }

    const created = await base44.asServiceRole.entities.SolicitudAliada.create({
      nombre: name,
      email: emailNorm,
      telefono: phoneStr,
      ciudad: ciudadStr,
      mensaje: mensajeStr,
      estado: 'pendiente',
      source_domain: source_domain ? String(source_domain).slice(0, 80) : 'aliadaservivo.com',
      ip: ip || null,
    });

    return Response.json({ ok: true, id: created.id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});