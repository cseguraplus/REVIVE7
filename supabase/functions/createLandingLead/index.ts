import { serviceClient } from '../_shared/auth.ts';
import { corsOptions, corsJson, originFromReq, ALLOWED_ORIGINS } from '../_shared/cors.ts';

// Receptor público y controlado de leads de landing para aliadaservivo.com y
// revive7.mx. Sin auth. Valida formato, consentimiento, longitud, campos
// permitidos; dedup por email/teléfono; protección básica contra abuso por IP;
// asigna a una Aliada activa cuando el referral_code coincide.
const DOMAIN_LEAD_TYPE: Record<string, string> = {
  'aliadaservivo.com': 'aliada_application',
  'revive7.mx': 'clienta_or_prospect',
};
const ALLOWED_DOMAINS = Object.keys(DOMAIN_LEAD_TYPE);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ABUSE_LIMIT = 5;
const ABUSE_WINDOW_MS = 60 * 60 * 1000;

function normalizeDomain(d: string) {
  if (!d) return '';
  return String(d).trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}
function extractIp(req: Request) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) { const v = xff.split(',')[0].trim(); if (v) return v.slice(0, 45); }
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim().slice(0, 45);
  return null;
}

Deno.serve(async (req) => {
  const origin = originFromReq(req);
  if (req.method === 'OPTIONS') return corsOptions(req);
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return corsJson(req, { error: 'Origen no permitido' }, 403);

  try {
    const svc = serviceClient();
    const body = await req.json().catch(() => ({}));

    const { source_domain, lead_type, full_name, email, phone, referral_code, campaign, consent } = body;

    const domain = normalizeDomain(source_domain);
    if (!ALLOWED_DOMAINS.includes(domain)) {
      return corsJson(req, { error: 'source_domain no permitido' }, 400);
    }
    const expectedLeadType = DOMAIN_LEAD_TYPE[domain];
    if (lead_type && lead_type !== expectedLeadType) {
      return corsJson(req, { error: `lead_type inválido para ${domain}: debe ser ${expectedLeadType}` }, 400);
    }
    const finalLeadType = expectedLeadType;

    const name = full_name ? String(full_name).trim() : '';
    if (name.length < 2 || name.length > 120) {
      return corsJson(req, { error: 'full_name inválido (2-120 caracteres)' }, 400);
    }

    const emailNorm = email ? String(email).trim().toLowerCase() : '';
    if (!EMAIL_RE.test(emailNorm) || emailNorm.length > 200) {
      return corsJson(req, { error: 'email inválido' }, 400);
    }

    const phoneStr = phone ? String(phone).trim() : '';
    const phoneDigits = phoneStr.replace(/[^\d]/g, '');
    if (phoneDigits.length < 7 || phoneStr.length > 30) {
      return corsJson(req, { error: 'phone inválido' }, 400);
    }

    if (consent !== true) {
      return corsJson(req, { error: 'consent obligatorio (debe ser true)' }, 400);
    }

    const referral = referral_code ? String(referral_code).trim().slice(0, 40) : '';
    const campaignStr = campaign ? String(campaign).trim().slice(0, 120) : '';

    const ip = extractIp(req);
    if (ip) {
      const { data: recentByIp } = await svc.from('leads').select('created_at').eq('ip', ip);
      const cutoff = Date.now() - ABUSE_WINDOW_MS;
      const recent = (recentByIp || []).filter((l) => l.created_at && new Date(l.created_at).getTime() >= cutoff);
      if (recent.length >= ABUSE_LIMIT) {
        return corsJson(req, { error: 'Demasiadas solicitudes. Intenta más tarde.' }, 429);
      }
    }

    const { data: byEmail } = await svc.from('leads').select('id').eq('email', emailNorm);
    if (byEmail && byEmail.length > 0) {
      return corsJson(req, { ok: false, duplicate: true, lead_id: byEmail[0].id, reason: 'email' }, 409);
    }
    const { data: byPhone } = await svc.from('leads').select('id').eq('phone', phoneStr);
    if (byPhone && byPhone.length > 0) {
      return corsJson(req, { ok: false, duplicate: true, lead_id: byPhone[0].id, reason: 'phone' }, 409);
    }

    let assignedAliadaId: string | null = null;
    let assignmentStatus = 'general_prospect';
    if (finalLeadType === 'clienta_or_prospect' && referral) {
      const { data: aliadas } = await svc.from('aliada_profiles').select('id').eq('aliada_code', referral).eq('status', 'active');
      if (aliadas && aliadas.length > 0) {
        assignedAliadaId = aliadas[0].id;
        assignmentStatus = 'assigned_to_aliada';
      }
    }

    const { data: lead, error } = await svc.from('leads').insert({
      source_domain: domain,
      lead_type: finalLeadType,
      full_name: name,
      email: emailNorm,
      phone: phoneStr,
      referral_code: referral || null,
      campaign: campaignStr || null,
      consent: true,
      assigned_aliada_id: assignedAliadaId,
      assignment_status: assignmentStatus,
      ip: ip || null,
      status: 'new',
    }).select().single();
    if (error || !lead) return corsJson(req, { error: error?.message || 'No se pudo registrar el lead' }, 500);

    return corsJson(req, {
      ok: true,
      lead_id: lead.id,
      lead_type: finalLeadType,
      assignment_status: assignmentStatus,
      assigned_aliada_id: assignedAliadaId,
    }, 201);
  } catch (error) {
    return corsJson(req, { error: (error as Error).message }, 500);
  }
});
