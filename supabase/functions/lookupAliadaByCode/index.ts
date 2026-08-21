import { corsOptions, corsJson, originFromReq, ALLOWED_ORIGINS } from '../_shared/cors.ts';
import { serviceClient } from '../_shared/auth.ts';

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

    const svc = serviceClient();
    const { data: aliadas } = await svc.from('aliada_profiles').select('*').eq('aliada_code', code).eq('status', 'active');
    if (aliadas && aliadas.length > 0) {
      return corsJson(req, { valid: true, public_name: aliadas[0].public_name || '' }, 200);
    }
    return corsJson(req, { valid: false }, 200);
  } catch {
    return corsJson(req, { valid: false }, 200);
  }
});
