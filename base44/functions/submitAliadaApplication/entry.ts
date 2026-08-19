import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { corsOptions, corsJson, originFromReq, ALLOWED_ORIGINS } from '../../shared/cors.ts';

// API pública controlada para postulaciones de Aliada desde aliadaservivo.com.
// Solo POST. CORS limitado a dominios autorizados. Honeypot + rate limit por IP.
// Dedupe por correo y teléfono. No devuelve datos internos.
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
  const origin = originFromReq(req);
  if (req.method === 'OPTIONS') return corsOptions(req);
  if (req.method !== 'POST') return corsJson(req, { error: 'Método no permitido' }, 405);
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return corsJson(req, { error: 'Origen no permitido' }, 403);

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Honeypot: campo oculto "website". bots lo llenan; humanos no.
    if (body.website && String(body.website).trim()) {
      return corsJson(req, { ok: true }, 201); // aceptar silenciosamente, no crear
    }

    const { full_name, email, phone, ciudad, ocupacion, experiencia_venta, tiempo_disponible, mensaje, source_domain, campaign, consent } = body;

    if (consent !== true) return corsJson(req, { error: 'Consentimiento obligatorio' }, 400);

    const name = full_name ? String(full_name).trim() : '';
    if (name.length < 2 || name.length > 120) return corsJson(req, { error: 'Nombre inválido (2-120)' }, 400);

    const emailNorm = email ? String(email).trim().toLowerCase() : '';
    if (!EMAIL_RE.test(emailNorm) || emailNorm.length > 200) return corsJson(req, { error: 'Email inválido' }, 400);

    const phoneStr = phone ? String(phone).trim() : '';
    const phoneDigits = phoneStr.replace(/[^\d]/g, '');
    if (phoneDigits.length < 7 || phoneStr.length > 30) return corsJson(req, { error: 'Teléfono inválido' }, 400);

    const ciudadStr = ciudad ? String(ciudad).trim().slice(0, 120) : '';
    const ocupacionStr = ocupacion ? String(ocupacion).trim().slice(0, 120) : '';
    const experienciaStr = experiencia_venta ? String(experiencia_venta).trim().slice(0, 120) : '';
    const tiempoStr = tiempo_disponible ? String(tiempo_disponible).trim().slice(0, 120) : '';
    const mensajeStr = mensaje ? String(mensaje).trim().slice(0, 2000) : '';
    const campaignStr = campaign ? String(campaign).trim().slice(0, 120) : '';
    const domainStr = source_domain ? String(source_domain).trim().slice(0, 80) : 'aliadaservivo.com';

    const ip = extractIp(req);
    if (ip) {
      try {
        const recent = await base44.asServiceRole.entities.SolicitudAliada.filter({ ip });
        const cutoff = Date.now() - ABUSE_WINDOW_MS;
        const byIp = (recent || []).filter((r) => r.created_date && new Date(r.created_date).getTime() >= cutoff);
        if (byIp.length >= ABUSE_LIMIT) return corsJson(req, { error: 'Demasiadas solicitudes. Intenta más tarde.' }, 429);
      } catch (e) { /* best-effort */ }
    }

    // Dedupe por correo o teléfono
    try {
      const byEmail = await base44.asServiceRole.entities.SolicitudAliada.filter({ email: emailNorm });
      if (byEmail && byEmail.length > 0) return corsJson(req, { ok: true, duplicate: true }, 200);
      const byPhone = await base44.asServiceRole.entities.SolicitudAliada.filter({ telefono: phoneStr });
      if (byPhone && byPhone.length > 0) return corsJson(req, { ok: true, duplicate: true }, 200);
    } catch (e) { /* proceed */ }

    await base44.asServiceRole.entities.SolicitudAliada.create({
      nombre: name, email: emailNorm, telefono: phoneStr, ciudad: ciudadStr,
      ocupacion: ocupacionStr, experiencia_venta: experienciaStr, tiempo_disponible: tiempoStr,
      mensaje: mensajeStr, estado: 'submitted', source_domain: domainStr, campaign: campaignStr, ip: ip || null,
    });

    return corsJson(req, { ok: true }, 201);
  } catch (error) {
    return corsJson(req, { error: 'No se pudo procesar' }, 500);
  }
});