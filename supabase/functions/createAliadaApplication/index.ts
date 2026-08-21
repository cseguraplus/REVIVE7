import { serviceClient } from '../_shared/auth.ts';
import { corsOptions, corsJson, originFromReq, ALLOWED_ORIGINS } from '../_shared/cors.ts';

// Receptor público y validado de postulaciones de Aliada desde aliadaservivo.com.
// Sin auth. El navegador nunca escribe solicitud_aliada directamente.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ABUSE_LIMIT = 5;
const ABUSE_WINDOW_MS = 60 * 60 * 1000;

function extractIp(req: Request) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) { const v = xff.split(',')[0].trim(); if (v) return v.slice(0, 45); }
  const real = req.headers.get('x-real-ip');
  return real ? real.trim().slice(0, 45) : null;
}

Deno.serve(async (req) => {
  const origin = originFromReq(req);
  if (req.method === 'OPTIONS') return corsOptions(req);
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return corsJson(req, { error: 'Origen no permitido' }, 403);

  try {
    const svc = serviceClient();
    const body = await req.json().catch(() => ({}));
    const { full_name, email, phone, ciudad, mensaje, source_domain } = body;

    const name = full_name ? String(full_name).trim() : '';
    if (name.length < 2 || name.length > 120) return corsJson(req, { error: 'Nombre inválido (2-120)' }, 400);

    const emailNorm = email ? String(email).trim().toLowerCase() : '';
    if (!EMAIL_RE.test(emailNorm) || emailNorm.length > 200) return corsJson(req, { error: 'Email inválido' }, 400);

    const phoneStr = phone ? String(phone).trim() : '';
    const phoneDigits = phoneStr.replace(/[^\d]/g, '');
    if (phoneDigits.length < 7 || phoneStr.length > 30) return corsJson(req, { error: 'Teléfono inválido' }, 400);

    const ciudadStr = ciudad ? String(ciudad).trim().slice(0, 120) : '';
    const mensajeStr = mensaje ? String(mensaje).trim().slice(0, 2000) : '';

    const ip = extractIp(req);
    if (ip) {
      const { data: recent } = await svc.from('solicitud_aliada').select('created_at, ip');
      const cutoff = Date.now() - ABUSE_WINDOW_MS;
      const byIp = (recent || []).filter((r) => r.created_at && new Date(r.created_at).getTime() >= cutoff && r.ip === ip);
      if (byIp.length >= ABUSE_LIMIT) return corsJson(req, { error: 'Demasiadas solicitudes. Intenta más tarde.' }, 429);
    }

    const { data: byEmail } = await svc.from('solicitud_aliada').select('id').eq('email', emailNorm);
    if (byEmail && byEmail.length > 0) return corsJson(req, { ok: false, duplicate: true, id: byEmail[0].id }, 409);

    const { data: created, error } = await svc.from('solicitud_aliada').insert({
      nombre: name,
      email: emailNorm,
      telefono: phoneStr,
      ciudad: ciudadStr,
      mensaje: mensajeStr,
      estado: 'submitted',
      source_domain: source_domain ? String(source_domain).slice(0, 80) : 'aliadaservivo.com',
      ip: ip || null,
    }).select().single();
    if (error || !created) return corsJson(req, { error: error?.message || 'No se pudo registrar la postulación' }, 500);

    return corsJson(req, { ok: true, id: created.id }, 201);
  } catch (error) {
    return corsJson(req, { error: (error as Error).message }, 500);
  }
});
