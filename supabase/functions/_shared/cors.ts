// Mismo whitelist que base44/shared/cors.ts — usado por las Edge Functions
// públicas invocadas desde los landing pages externos (aliadaservivo.com,
// revive7.mx). Las funciones internas (llamadas solo desde la app logueada)
// no necesitan este whitelist, pero incluirlo no hace daño.
export const ALLOWED_ORIGINS = [
  'https://aliadaservivo.com',
  'https://www.aliadaservivo.com',
  'https://revive7.mx',
  'https://www.revive7.mx',
];

export function corsHeaders(origin: string | null) {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Vary': 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function originFromReq(req: Request) {
  try { return req.headers.get('origin') || ''; } catch { return ''; }
}

export function corsOptions(req: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(originFromReq(req)) });
}

export function corsJson(req: Request, data: unknown, status = 200) {
  return Response.json(data, { status, headers: corsHeaders(originFromReq(req)) });
}
