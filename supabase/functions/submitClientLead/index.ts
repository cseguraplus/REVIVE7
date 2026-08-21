import { serviceClient } from '../_shared/auth.ts';
import { corsOptions, corsJson, originFromReq, ALLOWED_ORIGINS } from '../_shared/cors.ts';

// API pública controlada para leads de clienta desde revive7.mx.
// Solo POST. CORS limitado. Honeypot + rate limit por IP. Dedupe por correo/teléfono.
// Reconoce referral_code de una Aliada activa; sin código crea prospecto general.
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
  if (req.method !== 'POST') return corsJson(req, { error: 'Método no permitido' }, 405);
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return corsJson(req, { error: 'Origen no permitido' }, 403);

  try {
    const svc = serviceClient();
    const body = await req.json().catch(() => ({}));

    if (body.website && String(body.website).trim()) {
      return corsJson(req, { ok: true }, 201);
    }

    const { full_name, email, phone, referral_code, ciudad, intensity_interest, campaign, source_domain, consent } = body;
    if (consent !== true) return corsJson(req, { error: 'Consentimiento obligatorio' }, 400);

    const name = full_name ? String(full_name).trim() : '';
    if (name.length < 2 || name.length > 120) return corsJson(req, { error: 'Nombre inválido (2-120)' }, 400);

    const emailRaw = email ? String(email).trim().toLowerCase() : '';
    let emailNorm = '';
    if (emailRaw) {
      if (!EMAIL_RE.test(emailRaw) || emailRaw.length > 200) return corsJson(req, { error: 'Email inválido' }, 400);
      emailNorm = emailRaw;
    }

    const phoneStr = phone ? String(phone).trim() : '';
    const phoneDigits = phoneStr.replace(/[^\d]/g, '');
    if (phoneDigits.length < 7 || phoneStr.length > 30) return corsJson(req, { error: 'Teléfono inválido' }, 400);

    const referral = referral_code ? String(referral_code).trim().slice(0, 40) : '';
    const ciudadStr = ciudad ? String(ciudad).trim().slice(0, 120) : '';
    const intensityStr = intensity_interest ? String(intensity_interest).trim().slice(0, 40) : '';
    const campaignStr = campaign ? String(campaign).trim().slice(0, 120) : '';
    const domainStr = source_domain ? String(source_domain).trim().slice(0, 80) : 'revive7.mx';

    const ip = extractIp(req);
    if (ip) {
      const { data: recentByIp } = await svc.from('leads').select('created_at').eq('ip', ip);
      const cutoff = Date.now() - ABUSE_WINDOW_MS;
      const recent = (recentByIp || []).filter((l) => l.created_at && new Date(l.created_at).getTime() >= cutoff);
      if (recent.length >= ABUSE_LIMIT) return corsJson(req, { error: 'Demasiadas solicitudes. Intenta más tarde.' }, 429);
    }

    if (emailNorm) {
      const { data: byEmail } = await svc.from('leads').select('id').eq('email', emailNorm);
      if (byEmail && byEmail.length > 0) return corsJson(req, { ok: true, duplicate: true }, 200);
    }
    const { data: byPhone } = await svc.from('leads').select('id').eq('phone', phoneStr);
    if (byPhone && byPhone.length > 0) return corsJson(req, { ok: true, duplicate: true }, 200);

    let assignedAliadaId: string | null = null;
    let assignmentStatus = 'general_prospect';
    if (referral) {
      const { data: aliadas } = await svc.from('aliada_profiles').select('id').eq('aliada_code', referral).eq('status', 'active');
      if (aliadas && aliadas.length > 0) {
        assignedAliadaId = aliadas[0].id;
        assignmentStatus = 'assigned_to_aliada';
      }
    }

    await svc.from('leads').insert({
      source_domain: domainStr, lead_type: 'clienta_or_prospect',
      full_name: name, email: emailNorm || null, phone: phoneStr,
      ciudad: ciudadStr, intensity_interest: intensityStr || null,
      referral_code: referral || null, campaign: campaignStr || null, consent: true,
      assigned_aliada_id: assignedAliadaId, assignment_status: assignmentStatus,
      ip: ip || null, status: 'new',
    });

    return corsJson(req, { ok: true, assigned: !!assignedAliadaId }, 201);
  } catch {
    return corsJson(req, { error: 'No se pudo procesar' }, 500);
  }
});
