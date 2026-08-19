import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
import { corsOptions, corsJson, originFromReq, ALLOWED_ORIGINS } from '../../shared/cors.ts';

// Consulta pública segura: dado un código de Aliada, devuelve SOLO si es válido
// y el nombre público. Nunca expone datos internos (user_id, whatsapp, etc.).
Deno.serve(async (req) => {
  const origin = originFromReq(req);
  if (req.method === 'OPTIONS') return corsOptions(req);
  if (req.method !== 'POST') return corsJson(req, { error: 'Método no permitido' }, 405);
  if (origin && !ALLOWED_ORIGINS.includes(origin)) return corsJson(req, { valid: false }, 200);

  try {
    const body = await req.json().catch(() => ({}));
    const code = String(body.code || body.referral_code || body.aliada || '').trim().slice(0, 40);
    if (!code) return corsJson(req, { valid: false }, 200);

    const base44 = createClientFromRequest(req);
    const aliadas = await base44.asServiceRole.entities.AliadaProfile.filter({ aliada_code: code, status: 'active' });
    if (aliadas && aliadas.length > 0) {
      return corsJson(req, { valid: true, public_name: aliadas[0].public_name || '' }, 200);
    }
    return corsJson(req, { valid: false }, 200);
  } catch (e) {
    return corsJson(req, { valid: false }, 200);
  }
});