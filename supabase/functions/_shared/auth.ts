// Equivalente Supabase de base44/shared/auth.ts (Fase 1 de la auditoría).
// Mismo contrato: toda función que use requireRole/requireInternalOrRole
// responde 401/403 y NO ejecuta lógica de negocio si ninguna vía autorizada
// se cumple. auth.getUser() nunca lanza silenciosamente hacia "asumir
// invocación interna confiable" — a diferencia de Base44, aquí revisamos el
// error explícitamente.
import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const INTERNAL_SECRET_HEADER = 'x-internal-invoke-secret';

export function serviceClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Cliente que actúa como el usuario autenticado (RLS activo, no la bypasea).
 * Equivalente a `base44.entities.X` (sin asServiceRole) — úsalo cuando una
 * tabla tiene columnas con `default auth.uid()` (ej. `sales.created_by_id`)
 * y quieres que la política de RLS decida si el insert/update es válido, en
 * vez de forzarlo con el rol de servicio.
 */
export function userClient(req: Request): SupabaseClient {
  const authHeader = req.headers.get('Authorization') || '';
  return createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

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

export type AppUser = { id: string; email: string | null; app_role?: string | null; [key: string]: unknown };

/** Resuelve el usuario autenticado (auth.users + fila de public.profiles fusionada) a partir del JWT de la petición. null si no hay token válido. */
export async function getUserAndProfile(req: Request): Promise<AppUser | null> {
  const authHeader = req.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) return null;

  const supabase = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;

  const svc = serviceClient();
  const { data: profile } = await svc.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return { id: user.id, email: user.email, ...(profile || {}) };
}

/**
 * full_name/phone de registro viven en auth.users.user_metadata (Register.jsx
 * los manda en signUp({ options: { data } })), no en public.profiles. Único
 * lookup soportado para leerlos server-side con el rol de servicio —
 * equivalente a leer `User.full_name`/`User.data.phone` en Base44.
 */
export async function getAuthUserMeta(svc: SupabaseClient, userId: string): Promise<{ full_name: string | null; phone: string | null; email: string | null }> {
  const { data, error } = await svc.auth.admin.getUserById(userId);
  if (error || !data || !data.user) return { full_name: null, phone: null, email: null };
  const meta = data.user.user_metadata || {};
  return { full_name: meta.full_name || null, phone: meta.phone || meta.whatsapp || null, email: data.user.email || null };
}

/**
 * Ubica una cuenta por email o la crea invitándola por correo (Supabase Auth
 * envía el magic link de invitación). Equivalente a
 * `base44.asServiceRole.entities.User.filter({email})` + `base44.users.inviteUser(...)`.
 * El trigger `on_auth_user_created` crea la fila en `public.profiles`
 * automáticamente — no hace falta crearla a mano.
 */
export async function findOrInviteUser(svc: SupabaseClient, email: string): Promise<{ id: string; email: string | null } | null> {
  const emailNorm = email.trim().toLowerCase();
  const { data: found } = await svc.auth.admin.listUsers();
  const existing = found?.users?.find((u) => (u.email || '').toLowerCase() === emailNorm);
  if (existing) return { id: existing.id, email: existing.email ?? null };

  const { data, error } = await svc.auth.admin.inviteUserByEmail(emailNorm);
  if (error || !data?.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

function roleOf(user: AppUser | null): string {
  return (user && user.app_role) || '';
}

type AuthDenied = { ok: false; response: Response };
type AuthGranted = { ok: true; user: AppUser | null; viaInternalSecret: boolean };
type AuthResult = AuthDenied | AuthGranted;

type RoleAuthGranted = { ok: true; user: AppUser };
type RoleAuthResult = AuthDenied | RoleAuthGranted;

function denied(status: number, error: string): AuthDenied {
  return { ok: false, response: Response.json({ error }, { status }) };
}

/** Exige un usuario autenticado con uno de los roles permitidos. Sin excepción para peticiones sin token. */
export async function requireRole(req: Request, allowedRoles: string[]): Promise<RoleAuthResult> {
  const user = await getUserAndProfile(req);
  if (!user) return denied(401, 'No autenticado');
  if (!allowedRoles.includes(roleOf(user))) return denied(403, 'Forbidden');
  return { ok: true, user };
}

/**
 * Exige que la petición traiga el secreto interno de invocación (cron/pg_cron/
 * llamadas servidor-a-servidor) o un usuario autenticado con uno de los roles
 * permitidos.
 */
export async function requireInternalOrRole(req: Request, allowedRoles: string[]): Promise<AuthResult> {
  if (hasValidInternalSecret(req)) {
    return { ok: true, user: null, viaInternalSecret: true };
  }
  const result = await requireRole(req, allowedRoles);
  if (!result.ok) return result;
  return { ok: true, user: result.user, viaInternalSecret: false };
}
