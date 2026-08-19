import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Public, controlled landing-lead receiver for aliadaservivo.com and revive7.mx.
// No auth required. Validates format, consent, length, allowed fields; dedups by email/phone;
// basic IP-based abuse protection; assigns to an active Aliada when referral_code matches.

const DOMAIN_LEAD_TYPE = {
  'aliadaservivo.com': 'aliada_application',
  'revive7.mx': 'clienta_or_prospect',
};
const ALLOWED_DOMAINS = Object.keys(DOMAIN_LEAD_TYPE);
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ABUSE_LIMIT = 5;
const ABUSE_WINDOW_MS = 60 * 60 * 1000;

function normalizeDomain(d) {
  if (!d) return '';
  return String(d).trim().toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}
function extractIp(req) {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) { const v = xff.split(',')[0].trim(); if (v) return v.slice(0, 45); }
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim().slice(0, 45);
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Only whitelisted fields are read; everything else is ignored.
    const { source_domain, lead_type, full_name, email, phone, referral_code, campaign, consent } = body;

    // source_domain (whitelist)
    const domain = normalizeDomain(source_domain);
    if (!ALLOWED_DOMAINS.includes(domain)) {
      return Response.json({ error: 'source_domain no permitido' }, { status: 400 });
    }
    const expectedLeadType = DOMAIN_LEAD_TYPE[domain];
    if (lead_type && lead_type !== expectedLeadType) {
      return Response.json({ error: `lead_type inválido para ${domain}: debe ser ${expectedLeadType}` }, { status: 400 });
    }
    const finalLeadType = expectedLeadType;

    // full_name
    const name = full_name ? String(full_name).trim() : '';
    if (name.length < 2 || name.length > 120) {
      return Response.json({ error: 'full_name inválido (2-120 caracteres)' }, { status: 400 });
    }

    // email
    const emailNorm = email ? String(email).trim().toLowerCase() : '';
    if (!EMAIL_RE.test(emailNorm) || emailNorm.length > 200) {
      return Response.json({ error: 'email inválido' }, { status: 400 });
    }

    // phone
    const phoneStr = phone ? String(phone).trim() : '';
    const phoneDigits = phoneStr.replace(/[^\d]/g, '');
    if (phoneDigits.length < 7 || phoneStr.length > 30) {
      return Response.json({ error: 'phone inválido' }, { status: 400 });
    }

    // consent
    if (consent !== true) {
      return Response.json({ error: 'consent obligatorio (debe ser true)' }, { status: 400 });
    }

    // optional fields (length-capped)
    const referral = referral_code ? String(referral_code).trim().slice(0, 40) : '';
    const campaignStr = campaign ? String(campaign).trim().slice(0, 120) : '';

    // IP + basic abuse protection (rate limit per IP, 1h window)
    const ip = extractIp(req);
    if (ip) {
      try {
        const recentByIp = await base44.asServiceRole.entities.Lead.filter({ ip });
        const cutoff = Date.now() - ABUSE_WINDOW_MS;
        const recent = (recentByIp || []).filter((l) => l.created_date && new Date(l.created_date).getTime() >= cutoff);
        if (recent.length >= ABUSE_LIMIT) {
          return Response.json({ error: 'Demasiadas solicitudes. Intenta más tarde.' }, { status: 429 });
        }
      } catch (e) { /* best-effort */ }
    }

    // Dedup by email or phone
    try {
      const byEmail = await base44.asServiceRole.entities.Lead.filter({ email: emailNorm });
      if (byEmail && byEmail.length > 0) {
        return Response.json({ ok: false, duplicate: true, lead_id: byEmail[0].id, reason: 'email' }, { status: 409 });
      }
      const byPhone = await base44.asServiceRole.entities.Lead.filter({ phone: phoneStr });
      if (byPhone && byPhone.length > 0) {
        return Response.json({ ok: false, duplicate: true, lead_id: byPhone[0].id, reason: 'phone' }, { status: 409 });
      }
    } catch (e) { /* proceed */ }

    // Referral → Aliada assignment (only for prospect leads)
    let assignedAliadaId = null;
    let assignmentStatus = 'general_prospect';
    if (finalLeadType === 'clienta_or_prospect' && referral) {
      try {
        const aliadas = await base44.asServiceRole.entities.AliadaProfile.filter({ aliada_code: referral, status: 'active' });
        if (aliadas && aliadas.length > 0) {
          assignedAliadaId = aliadas[0].id;
          assignmentStatus = 'assigned_to_aliada';
        }
      } catch (e) { /* no match → general */ }
    }

    const lead = await base44.asServiceRole.entities.Lead.create({
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
    });

    return Response.json({
      ok: true,
      lead_id: lead.id,
      lead_type: finalLeadType,
      assignment_status: assignmentStatus,
      assigned_aliada_id: assignedAliadaId,
    }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});