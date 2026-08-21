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

## Paso 2 — Supabase Auth en el frontend

Reemplacé el SDK de Base44 por `@supabase/supabase-js` solo en la capa de
autenticación (no toqué todavía las llamadas a `base44.entities.*`/
`base44.functions.invoke` del resto de la app — eso es el paso 4):

- `src/lib/supabaseClient.js` (nuevo) — cliente de Supabase, lee
  `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` de `.env.local` (ver
  `.env.local.example`, copia y llena tu anon key desde el dashboard →
  Project Settings → API).
- `src/lib/AuthContext.jsx` — reescrito para usar `supabase.auth.*` en vez
  de `base44.auth.*`. `useAuth().user` sigue exponiendo la misma forma que
  ya esperaba el resto de la app tras la Fase 4 (`.id`, `.app_role`,
  `.phone`, etc.) — internamente ahora es `auth.users` + la fila de
  `public.profiles` fusionadas.
- `Login.jsx`, `Register.jsx`, `ForgotPassword.jsx`, `ResetPassword.jsx`,
  `LandingClientas.jsx`, `AppLayout.jsx`, `Cuenta.jsx` — actualizados para
  llamar a Supabase en vez de Base44 (login por contraseña, Google OAuth,
  registro con verificación por código, recuperar/restablecer contraseña,
  logout).
- `OAuthConsent.jsx` — **no lo toqué a propósito**. No es autenticación de
  usuario: es la pantalla de consentimiento del servidor MCP de Base44 para
  clientes de IA. No tiene equivalente en Supabase; cuando cortes por
  completo con Base44 esta página se puede borrar.

### Configuración pendiente en el dashboard de Supabase (no lo pude hacer yo)

El conector MCP se desconectó a mitad de esta fase, así que esto quedó
pendiente de que lo hagas tú en **Authentication** → **Settings**/**Email
Templates**:

1. **Habilitar el proveedor Google** (Authentication → Providers → Google)
   si quieres que el botón "Entrar con Google" funcione — necesita un
   Client ID/Secret de Google Cloud Console.
2. **Plantilla de "Confirm signup" con código OTP, no enlace.** La pantalla
   de registro (`Register.jsx`) ya tiene una caja para capturar un código de
   6 dígitos — pero la plantilla de correo por defecto de Supabase manda un
   **enlace**, no un código. Para que el flujo funcione como está hoy en la
   UI, en Authentication → Email Templates → "Confirm signup", cambia el
   cuerpo para incluir `{{ .Token }}` (el código OTP) en vez de
   `{{ .ConfirmationURL }}`. Si prefieres mantener el enlace en vez del
   código, dímelo y ajusto `Register.jsx` a ese flujo en vez de al de OTP.
3. **Redirect URLs permitidas** (Authentication → URL Configuration) —
   agrega las URLs reales de tus dominios (`revive7.mx`, `apprevive7.mx`,
   etc.) a la lista de "Redirect URLs", si no ya quedan bloqueados el login
   con Google y el enlace de "olvidé mi contraseña".

## Paso 3 — Edge Functions (completo: escritas y desplegadas)

Reescribí las funciones backend de Base44 (`base44/functions/*`, Deno +
`@base44/sdk`) como Supabase Edge Functions (Deno + `@supabase/supabase-js`)
en `supabase/functions/`.

### Qué queda fuera de alcance (y por qué)

Antes de portar nada leí las 49 funciones para decidir cuáles son código de
producción real y cuáles son herramientas de piloto/pruebas usadas solo desde
`/admin/prueba`. Estas 5 **no se portan**:

- `createPilotAliada`, `registerClientaPilot`, `resetPilotUser`,
  `getPilotVideoProgress`, `seedTestData`

Todas exigen `superadmin`, crean/resetean cuentas de prueba con
`is_test_account=true`, y no las llama nada fuera del panel de pruebas. Si
las necesitas para probar el proyecto Supabase antes del corte, dímelo y las
agrego — no se descartó nada, solo se postergó.

Las 44 funciones restantes sí están en alcance para portar (producción real:
ventas, checkins, video, dashboards de aliada, leads públicos, etc.).

### Ya portadas y desplegadas (45 de 45)

45 = las 43 en alcance de Base44 + 2 nuevas (`adminListUsers`, `inviteUser`,
agregadas en Paso 4 como puente de compatibilidad — ver esa sección).
Confirmado con `list_edge_functions`: las 45 están `ACTIVE` contra tu
proyecto real (`ntsecphrxxdcovhuweeo`). Las 5 públicas
(`lookupAliadaByCode`, `createAliadaApplication`, `createLandingLead`,
`submitAliadaApplication`, `submitClientLead`) se desplegaron con
`verify_jwt: false`; el resto exige JWT normal.

`_shared/` (equivalentes a `base44/shared/`):
- `auth.ts` — `requireRole`/`requireInternalOrRole` (mismo contrato que
  `base44/shared/auth.ts`, Fase 1 de la auditoría: nunca tratar "sin token"
  como invocación interna confiable), más `getUserAndProfile`,
  `serviceClient` (equivalente a `asServiceRole`), `userClient` (equivalente
  a `base44.entities.X` sin `asServiceRole` — deja que RLS decida, útil para
  columnas con `default auth.uid()` como `sales.created_by_id`), y
  `getAuthUserMeta` (lee `full_name`/`phone` de `auth.users.user_metadata`,
  donde vive el registro de `Register.jsx` — Base44 los tenía directo en la
  entidad `User`).
- `cors.ts` — igual que `base44/shared/cors.ts`.
- `dates.ts`, `effectiveNow.ts`, `dailyAccess.ts`, `aliadaClientData.ts` —
  lógica que Base44 obligaba a duplicar inline en cada función (no permitía
  imports locales); aquí es un módulo compartido real, una sola fuente de
  verdad para el reloj efectivo (fecha real vs. simulada en cuentas de
  prueba), el cálculo de acceso diario, y el agregado de clientas por aliada.

Funciones portadas (43): `getEffectiveNow`, `getDailyAccess`,
`getMyAliadaContact`, `getAliadaClientData`, `getAliadaDashboard`,
`getAliadaVentas`, `registerSale`, `updateSale`, `cancelSale`,
`completeDailyCheckin`, `saveVideoProgressBatch`, `validateVideoCompletion`,
`lookupAliadaByCode`, `registerLastActivity`, `recordAuditLog`,
`acceptTrainingGuidelines`, `adjustInventory`, `adminOverrideDay`,
`approveAccount`, `approveAliadaApplication`, `completeOnboarding`,
`completeTrainingModule`, `enrollInGeneration`, `ensureUpcomingGenerations`,
`createAliadaApplication`, `createLandingLead`, `registerClienta`,
`generateDailyAlerts`, `requestSaleCorrection`, `sendAliadaDailyDigest`,
`sendAliadaDailySummary`, `sendTransactionalEmail`,
`setAliadaApplicationStatus`, `setAliadaProfileStatus`, `setTestControl`,
`setTestEffectiveDate`, `setUserRole`, `submitAliadaApplication`,
`submitClientLead`, `submitSafetyScreening`, `submitTrainingExam`,
`suspendAccount`, `syncClientStatuses`.

**`migrationDryRunReport` no se porta** — no aplica a Supabase. Es un
reporte de solo-lectura que audita las tablas legacy de Base44 (`Clienta`,
`Compra`, `Vendedora`, `Kit`, `ContenidoDiario`, `ProgresoDiario`) para
dimensionar la Fase 3 de retiro del modelo "vendedora" (ver
`base44/LEGACY_MIGRATION_PLAN.md`). Esas tablas nunca se migraron a Postgres
(decisión de Fase 3, antes de empezar la migración a Supabase) y solo
existen en Base44 — la función se queda ahí como herramienta de
planeación hasta que decidas retirar ese modelo definitivamente.

**Dos pares de funciones públicas quedaron duplicados**, tal como estaban
en Base44 (la auditoría original, Fase 6, ya había marcado esto para
consolidar, pero se pospuso — ver `base44/functions/`): `createAliadaApplication`
vs. `submitAliadaApplication` (ambas reciben postulaciones de Aliada desde
aliadaservivo.com) y `createLandingLead` vs. `submitClientLead` (ambas
reciben leads de revive7.mx). Las porté a las dos tal cual para no romper
ningún caller real sin confirmar primero cuál usa cada landing page — dime
cuál sigue viva en cada dominio y elimino la que sobra.

**Duplicado interno también en `sendAliadaDailyDigest`/`sendAliadaDailySummary`**
— eran funciones idénticas en Base44 (mismo cuerpo, dos nombres, invocadas por
dos workflows de cron distintos). Las porté igual de duplicadas; al recrear
los cron jobs en Paso 6 probablemente conviene quedarse solo con una.

Decisiones de traducción:
- Donde Base44 encadenaba `base44.functions.invoke('otraFuncion', ...)`
  (ej. `getAliadaDashboard` invocando `getAliadaClientData` y
  `getEffectiveNow`; `completeDailyCheckin` invocando `getDailyAccess`), aquí
  esa lógica vive en `_shared/` y se llama directo en el mismo proceso — más
  rápido y sin el riesgo de que una Edge Function importe a otra por su
  `index.ts` (eso re-ejecutaría su `Deno.serve` y rompería el runtime).
- `registerSale` inserta la `Sale` con el cliente autenticado como el
  usuario (no con el rol de servicio) para que la política RLS de inserción
  y el `default auth.uid()` de `created_by_id` apliquen igual que en Base44
  (`base44.entities.Sale.create` sin `asServiceRole`).
- El envío de correo de confirmación de ciclo semanal en `registerSale`
  quedó con un `console.log` marcado `TODO(paso 7)` — Base44 usaba
  `base44.integrations.Core.SendEmail`; el reemplazo real (Resend u otro) es
  el Paso 7 de la migración, no este paso.
- `lookupAliadaByCode` sigue siendo pública (sin JWT) — al desplegarla hay
  que pasar `verify_jwt: false`, si no el gateway de Supabase la bloquea
  antes de que corra el código (el resto sí exige JWT normal).

### Desplegado — estado final de Paso 3

Las 45 funciones ya están desplegadas y `ACTIVE` contra tu proyecto real
(`ntsecphrxxdcovhuweeo`), subidas directo vía `deploy_edge_function` del
conector MCP (no hizo falta la CLI). Verificado con `list_edge_functions` y
con el advisor de seguridad — sin hallazgos nuevos atribuibles a estas
funciones (los 3 warnings que muestra el advisor sobre
`current_app_role()`/`current_aliada_id()` ya estaban documentados desde el
hardening del Paso 1; hay uno nuevo, `rls_auto_enable()`, que es una función
propia de Supabase, no algo que este proyecto creó).

Pendiente de tu lado, en el dashboard del proyecto (Project Settings → Edge
Functions → Secrets):
- Variable `INTERNAL_FUNCTION_SECRET` — mismo propósito que en Base44:
  permite que `ensureUpcomingGenerations`, `generateDailyAlerts`,
  `syncClientStatuses`, `sendAliadaDailyDigest`/`sendAliadaDailySummary`
  corran vía cron sin un usuario humano detrás (Paso 6). Sin esta variable
  configurada, esa vía nunca pasa (ver `hasValidInternalSecret` en
  `_shared/auth.ts`) — no es un fallo de seguridad, es el comportamiento
  esperado hasta que definas el secreto.

Nota conocida: `findOrInviteUser` (en `_shared/auth.ts`) usa
`auth.admin.listUsers()` para buscar por email antes de invitar, que pagina
de a 50 sin filtrar por email en el servidor. Funciona bien mientras la base
de usuarios sea chica (como ahora); si crece antes de que lo revisemos, hay
que cambiarlo a una consulta más dirigida.

## Paso 4 — Cliente Base44 reemplazado en el resto del frontend

En vez de tocar los ~59 archivos que llamaban a `base44.entities.*`/
`base44.functions.invoke`/`base44.users.inviteUser`, reescribí
`src/api/base44Client.js`: sigue exportando el mismo objeto `base44` con la
misma forma, pero por dentro ahora habla con Supabase (Postgres + RLS, Edge
Functions) en vez de con el SDK de Base44. Cero cambios en los archivos que
lo consumen — mismo patrón que ya habíamos usado en `useBase44Query`/
`useBase44Mutation` (Fase 4 original).

- `base44.functions.invoke(name, params)` → `supabase.functions.invoke(name, { body: params })`,
  con un traductor de errores para que `err.message` y
  `err.response.data.error` sigan funcionando igual que con el SDK de Base44
  (los ~26 call sites que leen `err?.response?.data?.error` no se tocaron).
- `base44.entities.EntidadX.filter/list/get/create/update/delete` → tabla
  Postgres real vía `supabase.from(tabla)`, con `TABLE_MAP` traduciendo cada
  nombre de entidad Base44 a su tabla (`AliadaProfile` → `aliada_profiles`,
  etc.) y `-created_date`/`-updated_date` (convención de ordenamiento de
  Base44) traducidos a `created_at`/`updated_at` (convención de las
  migraciones). RLS decide qué filas ve cada usuario — el frontend nunca usa
  el rol de servicio.
- `base44.entities.User` es un caso especial: `full_name`/`email` viven en
  `auth.users.user_metadata`, no en `public.profiles`, y ningún usuario
  puede leer eso de otro por RLS. Los paneles admin que listaban usuarios
  (`AdminCapacitacion`, `AdminConfiguracion`, `AdminAuditoria`,
  `InviteAliada`) ahora pasan por dos Edge Functions nuevas (no existían en
  Base44, son puente de compatibilidad para este paso):
  - `adminListUsers` — lista usuarios con su perfil fusionado (superadmin/operaciones).
  - `inviteUser` — equivalente a `base44.users.inviteUser(email, role)`.
- **El modelo legacy "vendedora" no se tocó** — `base44.entities.Clienta`/
  `Compra`/`Vendedora`/`Kit`/`ContenidoDiario`/`ProgresoDiario` ahora lanzan
  un error explícito ("es del modelo legacy... no se migró a Supabase") en
  vez de fallar en silencio. Las pantallas que las usan
  (`src/pages/vendedora/*`, `AdminVendedoras.jsx`, `AdminKits.jsx`,
  `AdminContenido.jsx`) quedan tal como estaban — su destino es el retiro
  (Fase 3 de la auditoría original), no la migración.
- Verificado con `npm run typecheck` (127 errores preexistentes sin
  relación con este cambio, ninguno nuevo — de hecho corrige uno) y
  `npm run build` (compila limpio). No se pudo probar en navegador real en
  esta sesión (sin `.env.local` con las credenciales del proyecto ni
  Edge Functions desplegadas todavía — ver Paso 3).

### Pendiente de Paso 4

- Probar en un navegador real ahora que las Edge Functions ya están
  desplegadas — falta un `.env.local` con las credenciales del proyecto
  (`VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`, ver `.env.local.example`).
- Decidir si conservar ambos duplicados públicos (`createAliadaApplication`/
  `submitAliadaApplication`, `createLandingLead`/`submitClientLead`) o
  retirar uno — pendiente desde el Paso 3.
- El modelo legacy "vendedora" sigue sin plan de retiro ejecutado (solo
  documentado) — decisión del usuario, no bloquea el resto de la migración.

## Qué falta (siguientes pasos de la migración, no parte de este paso)

Van 4 de 10 pasos con código completo y desplegado/verificado (Pasos 1-4).
Todavía faltan: migrar los datos reales (Paso 5), recrear los 5 workflows de
cron (Paso 6 — incluye configurar `INTERNAL_FUNCTION_SECRET`, ver arriba), y
reemplazar el envío de correos (Paso 7 — todas las funciones que enviaban
correo quedaron con un `console.log` marcado `TODO(paso 7)` en vez de
`base44.integrations.Core.SendEmail`). Después de eso: Paso 8 (desplegar el
frontend a Vercel/Cloudflare Pages), Paso 9 (probar todo en el proyecto
Supabase antes del corte) y Paso 10 (corte de DNS, con Base44 como
respaldo).
