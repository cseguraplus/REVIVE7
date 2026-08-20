# Esquema Supabase para REVIVE7 — Paso 1 de la migración fuera de Base44

Migraciones SQL que traducen el modelo vigente de Base44 (28 entidades en
`base44/entities/*.jsonc`, sin el modelo legacy "vendedora" — ver
`base44/LEGACY_MIGRATION_PLAN.md`) a tablas Postgres reales con Row Level
Security, probadas de punta a punta contra un Postgres 16 local antes de
aplicarlas (ver "Cómo las probé" abajo).

## Estado: ya aplicadas contra tu proyecto real (`REVIVE7_1`)

Una vez conectaste tu cuenta de Supabase a esta sesión, corrí las 9
migraciones (`0001` a `0009`) directo contra `ntsecphrxxdcovhuweeo` vía el
conector MCP de Supabase — no fue necesario copiar/pegar nada a mano. Las 29
tablas existen hoy en tu proyecto con RLS activo.

Si en algún momento necesitas volver a aplicarlas desde cero (otro
proyecto, un ambiente de prueba nuevo — ver Fase 7), dos formas:

### Opción A — SQL Editor (sin instalar nada)

Entra a tu proyecto → **SQL Editor** → **New query**, pega y ejecuta cada
archivo en orden (`0001` → `0009` — el orden importa, cada uno depende del
anterior).

### Opción B — Supabase CLI (mejor para versionar el estado a futuro)

```bash
npm install -g supabase
supabase login
supabase link --project-ref ntsecphrxxdcovhuweeo
supabase db push
```

### Pendiente de tu lado

Rota la contraseña de la base de datos (Settings → Database → Reset
database password) — la compartiste en texto plano en el chat.

## Qué decisiones tomé y por qué

- **No migré el modelo legacy "vendedora"** (Clienta, Compra, Vendedora, Kit,
  ContenidoDiario, ProgresoDiario). La Fase 3 de la auditoría ya determinó
  que `ContenidoDiario`/`ProgresoDiario` son código muerto (sin ruta en
  `App.jsx`) y las otras 4 están en proceso de retiro. Si necesitas
  conservarlas, dímelo y agrego las tablas correspondientes.
- **`profiles` extiende `auth.users`** (no reemplaza la tabla de Supabase
  Auth) — ahí viven `app_role`, `phone`, `account_status`, etc., que en
  Base44 vivían directo en la entidad `User`. Un trigger crea la fila
  automáticamente cuando alguien se registra.
- **Field-level RLS de Base44** (ej. `DailyCheckin.completed` solo
  editable por admin/operaciones, no por la propia clienta) se tradujo a
  triggers `BEFORE UPDATE` que bloquean el cambio de esos campos específicos
  si quien hace la petición no es admin/operaciones — la política de fila
  (`RLS` normal) sigue dejando que la clienta actualice el resto de sus
  propios campos.
- **`SalesApplicant`** no tenía ninguna regla `rls` declarada en el
  `.jsonc` original — a diferencia de las otras 27 entidades. Le asigné por
  default admin/operaciones-only (mismo criterio que `SolicitudAliada`,
  entidad hermana). Si en producción alguien más debía poder leerla o
  escribirla, avísame para ajustar la política.
- **`InventoryMovement.read`** en el original tenía una condición
  `data.aliada_id: "{{user.aliada_id}}"` — `user.aliada_id` no es un campo
  real de la entidad `User` de Base44 (solo tiene `app_role`, `phone`,
  etc.), así que sospecho que esa cláusula nunca hizo match en producción.
  La traduje de todos modos usando `current_aliada_id()` (resuelve el
  `AliadaProfile.id` del usuario actual vía `aliada_profiles.user_id`), que
  es probablemente la intención original.
- **Confirmé con una prueba real** que, igual que en Base44 (Fase 2 de la
  auditoría), una clienta **no puede leer directo el `AliadaProfile` de su
  propia aliada asignada** — solo admin/operaciones o la propia aliada. Esto
  significa que cuando migres las Edge Functions, vas a necesitar el
  equivalente exacto de `getMyAliadaContact` (la función que ya construimos
  en Base44 con `asServiceRole`) para que `MiAliada.jsx`/`Preparacion.jsx`
  sigan funcionando.

## Cómo las probé (no son solo SQL "que debería funcionar")

Instalé Postgres 16 localmente en esta sesión (sin salida a internet, así
que no es tu Supabase real, pero sí un Postgres real), simulé el esquema
`auth` de Supabase (`auth.users` + `auth.uid()`), y corrí las 5 migraciones
de punta a punta sin errores. Encontré y corregí un bug real de orden en el
camino: `current_aliada_id()` se creaba antes de que existiera la tabla
`aliada_profiles` que consulta — Postgres valida eso al crear la función, no
en tiempo de ejecución.

Después probé con tres usuarios simulados (clienta / aliada activa /
superadmin) usando un rol Postgres de bajo privilegio (no superusuario, para
que RLS realmente aplicara) y confirmé:

- Una clienta **no puede** subirse a sí misma a `superadmin` (trigger de
  campos protegidos en `profiles`).
- Una clienta **sí puede** actualizar su propio `last_activity_at`.
- Una clienta **no puede** leer el `AliadaProfile` de otra persona.
- Una clienta **no puede** crear una `Sale` directo (solo aliada activa u
  operaciones/superadmin).
- Una aliada activa **sí puede** crear una `Sale` para su clienta y leerla
  después.
- Una clienta **no puede** marcar su propio `DailyCheckin.completed = true`
  directo, pero **sí puede** actualizar campos normales como
  `objective_hydration`.
- Un superadmin **sí puede** marcar `completed = true`.
- `intensity_guides`, `training_modules` y `app_settings` son legibles sin
  sesión (públicas), tal como en el original.

## Hardening post-aplicación (0006-0009)

Después de aplicar `0001`-`0005`, corrí el advisor de seguridad y de
performance de Supabase contra el proyecto real y cerré todo lo accionable:

- **0006/0007 (seguridad):** 5 funciones sin `search_path` fijo (riesgo de
  shadowing), `handle_new_user()` invocable directo como RPC pública sin
  necesidad (ahora revocada — solo la usa el trigger), y
  `current_app_role()`/`current_aliada_id()` invocables por `anon` sin
  sesión. El primer intento de revocar de `anon` no bastó — Postgres otorga
  `EXECUTE` a `PUBLIC` (que `anon` hereda) al crear una función, y hay que
  revocar de `PUBLIC` explícitamente, no solo del rol nombrado. Verificado
  con el advisor tras cada cambio hasta quedar limpio (los 2 warnings que
  quedan son esperados: `authenticated` necesita poder ejecutar esas dos
  funciones para que las políticas RLS de usuarios logueados funcionen).
- **0008 (performance):** 25 foreign keys sin índice de cobertura que
  `0005_indexes.sql` no cubrió (cubría las columnas que el código ya usaba
  en `.filter()`, pero se quedaron fuera varias FK que sí importan para
  joins).
- **0009 (performance):** las 115 políticas RLS llamaban a
  `auth.uid()`/las funciones helper sin envolver en `(select ...)`, lo que
  fuerza a Postgres a re-evaluarlas fila por fila en vez de una vez por
  consulta. Se regeneraron todas con el patrón recomendado por Supabase.
  Antes de aplicar contra producción, corrí esta migración contra el
  Postgres local y repetí la prueba de "clienta no puede subirse a
  superadmin" para confirmar que el comportamiento de seguridad no cambió.

Quedan únicamente hallazgos `unused_index` (nivel INFO, no WARN) — esperado
en una base con 0 filas y 0 consultas reales todavía; se resuelven solos en
cuanto la app empiece a usarse.

## Qué falta (siguientes pasos de la migración, no parte de este paso)

Este es solo el **paso 1** del plan de 10 pasos que te compartí. Todavía
faltan: migrar Supabase Auth para el login real, reescribir las 47 funciones
backend como Edge Functions, reemplazar el cliente Base44 en el frontend,
migrar los datos reales, recrear los 5 workflows de cron, y reemplazar el
envío de correos.
