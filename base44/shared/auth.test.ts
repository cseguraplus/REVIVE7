// Pruebas del helper de autenticación obligatoria para funciones backend.
// Ejecutar con: deno test base44/shared/auth.test.ts
// Cubren el hallazgo de la auditoría: auth.me() sin token no debe abrir la puerta
// a ejecutar lógica de negocio (antes: catch silencioso + "if (user) {...}" saltado).
import { requireInternalOrRole, requireRole } from './auth.ts';

function assertEquals(actual: unknown, expected: unknown) {
  if (actual !== expected) {
    throw new Error(`assertEquals failed: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function assertStatus(result: { ok: boolean; response?: Response }, expected: number) {
  if (result.ok) throw new Error('expected result.ok to be false');
  if (!result.response) throw new Error('expected result.response to be defined');
  assertEquals(result.response.status, expected);
}

const SECRET_HEADER = 'x-internal-invoke-secret';

function fakeBase44(meResult: unknown) {
  return {
    auth: {
      async me() {
        if (meResult === 'throw') throw new Error('no token');
        return meResult;
      },
    },
  };
}

function fakeReq(headers: Record<string, string> = {}) {
  return new Request('https://example.com/fn', { headers });
}

Deno.test('requireRole: sin token (auth.me lanza) responde 401 y no ejecuta lógica', async () => {
  const result = await requireRole(fakeReq(), fakeBase44('throw'), ['superadmin']);
  assertEquals(result.ok, false);
  assertStatus(result, 401);
});

Deno.test('requireRole: usuario autenticado con rol no permitido responde 403', async () => {
  const result = await requireRole(fakeReq(), fakeBase44({ app_role: 'clienta' }), ['superadmin', 'operaciones']);
  assertEquals(result.ok, false);
  assertStatus(result, 403);
});

Deno.test('requireRole: usuario autenticado con rol permitido pasa', async () => {
  const result = await requireRole(fakeReq(), fakeBase44({ app_role: 'operaciones' }), ['superadmin', 'operaciones']);
  assertEquals(result.ok, true);
});

Deno.test('requireInternalOrRole: sin secreto y sin token responde 401', async () => {
  Deno.env.delete('INTERNAL_FUNCTION_SECRET');
  const result = await requireInternalOrRole(fakeReq(), fakeBase44('throw'), ['superadmin']);
  assertEquals(result.ok, false);
  assertStatus(result, 401);
});

Deno.test('requireInternalOrRole: secreto interno correcto pasa sin usuario (uso por cron/workflow)', async () => {
  Deno.env.set('INTERNAL_FUNCTION_SECRET', 'test-secret-value');
  const result = await requireInternalOrRole(fakeReq({ [SECRET_HEADER]: 'test-secret-value' }), fakeBase44('throw'), ['superadmin']);
  if (!result.ok) throw new Error('expected result.ok to be true');
  assertEquals(result.ok, true);
  assertEquals(result.viaInternalSecret, true);
  Deno.env.delete('INTERNAL_FUNCTION_SECRET');
});

Deno.test('requireInternalOrRole: secreto interno incorrecto cae a exigir usuario y responde 401 sin token', async () => {
  Deno.env.set('INTERNAL_FUNCTION_SECRET', 'test-secret-value');
  const result = await requireInternalOrRole(fakeReq({ [SECRET_HEADER]: 'wrong-value' }), fakeBase44('throw'), ['superadmin']);
  assertEquals(result.ok, false);
  assertStatus(result, 401);
  Deno.env.delete('INTERNAL_FUNCTION_SECRET');
});

Deno.test('requireInternalOrRole: sin INTERNAL_FUNCTION_SECRET configurado, el header nunca es suficiente', async () => {
  Deno.env.delete('INTERNAL_FUNCTION_SECRET');
  const result = await requireInternalOrRole(fakeReq({ [SECRET_HEADER]: 'anything' }), fakeBase44('throw'), ['superadmin']);
  assertEquals(result.ok, false);
  assertStatus(result, 401);
});

Deno.test('requireInternalOrRole: usuario humano con rol permitido pasa aunque no haya secreto', async () => {
  Deno.env.delete('INTERNAL_FUNCTION_SECRET');
  const result = await requireInternalOrRole(fakeReq(), fakeBase44({ app_role: 'superadmin' }), ['superadmin', 'operaciones']);
  if (!result.ok) throw new Error('expected result.ok to be true');
  assertEquals(result.ok, true);
  assertEquals(result.viaInternalSecret, false);
});
