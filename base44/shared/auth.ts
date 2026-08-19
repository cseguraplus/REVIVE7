// Autenticación obligatoria para funciones backend invocadas por workflows/cron
// internos o por roles humanos específicos. auth.me() lanza si no hay token: NUNCA
// debe tratarse ese catch como "asumir invocación interna confiable". Toda función
// que use este helper responde 401/403 y no ejecuta lógica de negocio si ninguna de
// las dos vías (secreto interno o usuario con rol permitido) se cumple.

const INTERNAL_SECRET_HEADER = 'x-internal-invoke-secret';

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function hasValidInternalSecret(req: Request): boolean {
  const expected = Deno.env.get('INTERNAL_FUNCTION_SECRET');
  if (!expected) return false; // sin secreto configurado, esta vía nunca pasa
  const provided = req.headers.get(INTERNAL_SECRET_HEADER) || '';
  if (!provided) return false;
  return timingSafeEqual(provided, expected);
}

async function getUser(base44: any): Promise<any> {
  try {
    return await base44.auth.me();
  } catch (e) {
    return null;
  }
}

function roleOf(user: any): string {
  return (user && (user.app_role || (user.data && user.data.app_role))) || '';
}

type AuthDenied = { ok: false; response: Response };
type AuthGranted = { ok: true; user: any; viaInternalSecret: boolean };
type AuthResult = AuthDenied | AuthGranted;

type RoleAuthGranted = { ok: true; user: any };
type RoleAuthResult = AuthDenied | RoleAuthGranted;

/**
 * Exige que la petición traiga el secreto interno de invocación (workflows/cron)
 * o un usuario autenticado con uno de los roles permitidos. Responde con un
 * Response de error (401/403) cuando ninguna condición se cumple; devuelve el
 * usuario (o null si vino por secreto interno) cuando la petición está autorizada.
 */
export async function requireInternalOrRole(req: Request, base44: any, allowedRoles: string[]): Promise<AuthResult> {
  if (hasValidInternalSecret(req)) {
    return { ok: true, user: null, viaInternalSecret: true };
  }
  const user = await getUser(base44);
  if (!user) {
    return { ok: false, response: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  }
  const role = roleOf(user);
  if (!allowedRoles.includes(role)) {
    return { ok: false, response: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, user, viaInternalSecret: false };
}

/** Exige un usuario autenticado con uno de los roles permitidos. Sin excepción para peticiones sin token. */
export async function requireRole(req: Request, base44: any, allowedRoles: string[]): Promise<RoleAuthResult> {
  const user = await getUser(base44);
  if (!user) {
    return { ok: false, response: Response.json({ error: 'No autenticado' }, { status: 401 }) };
  }
  const role = roleOf(user);
  if (!allowedRoles.includes(role)) {
    return { ok: false, response: Response.json({ error: 'Forbidden' }, { status: 403 }) };
  }
  return { ok: true, user };
}
