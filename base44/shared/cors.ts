export const ALLOWED_ORIGINS = [
  'https://aliadaservivo.com',
  'https://www.aliadaservivo.com',
  'https://revive7.mx',
  'https://www.revive7.mx',
];

export function corsHeaders(origin) {
  const headers = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function originFromReq(req) {
  try { return req.headers.get('origin') || ''; } catch (e) { return ''; }
}

export function corsOptions(req) {
  return new Response(null, { status: 204, headers: corsHeaders(originFromReq(req)) });
}

export function corsJson(req, data, status = 200) {
  return Response.json(data, { status, headers: corsHeaders(originFromReq(req)) });
}