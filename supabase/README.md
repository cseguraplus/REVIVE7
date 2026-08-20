# Esquema Supabase para REVIVE7 — Paso 1 de la migración fuera de Base44

Migraciones SQL que traducen el modelo vigente de Base44 (28 entidades en
`base44/entities/*.jsonc`, sin el modelo legacy "vendedora" — ver
`base44/LEGACY_MIGRATION_PLAN.md`) a tablas Postgres reales con Row Level
Security, probadas de punta a punta contra un Postgres 16 local antes de
entregarlas (ver "Cómo las probé" abajo).

## Cómo aplicarlas en tu proyecto Supabase (`REVIVE7_1`)

**No pude ejecutarlas yo directo contra tu proyecto** — esta sesión no tiene
salida de red hacia `supabase.co` (ni HTTPS ni conexión Postgres directa),
el proxy del entorno la bloquea por política. Dos formas de aplicarlas tú:

### Opción A — SQL Editor (más rápido, sin instalar nada)

1. Entra a tu proyecto → **SQL Editor** → **New query**.
2. Pega el contenido de `0001_init_profiles_and_helpers.sql`, ejecútalo.
3. Repite en orden con `0002_schema.sql`, `0003_triggers.sql`,
   `0004_rls.sql`, `0005_indexes.sql` — **el orden importa**, cada archivo
   depende de que el anterior ya haya corrido.

### Opción B — Supabase CLI (mejor para el largo plazo, versiona el estado)

```bash
npm install -g supabase
supabase login
supabase link --project-ref ntsecphrxxdcovhuweeo
supabase db push
```

`supabase db push` aplica todo lo que esté en `supabase/migrations/` en
orden, y lleva registro de qué ya se aplicó — mejor que copiar/pegar si vas
a seguir iterando el esquema.

### Después de aplicar

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

## Qué falta (siguientes pasos de la migración, no parte de este paso)

Este es solo el **paso 1** del plan de 10 pasos que te compartí. Todavía
faltan: migrar Supabase Auth para el login real, reescribir las 47 funciones
backend como Edge Functions, reemplazar el cliente Base44 en el frontend,
migrar los datos reales, recrear los 5 workflows de cron, y reemplazar el
envío de correos.
