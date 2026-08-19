# Plan de retiro del modelo legacy "vendedora"

Fase 3 de la auditoría técnica. Este documento NO ejecuta ninguna migración de datos
real ni apaga nada en producción — es el plan, el mapeo campo por campo, y una
herramienta de dry-run para correr cuando el equipo decida avanzar.

Estado al momento de escribir esto (2026-08-20), verificado contra el código real del
repo, no asumido de documentación previa:

- `INVENTARIO.md` (sección 6) da por hecho que `AdminContenido` todavía lee el modelo
  legacy `ContenidoDiario`. **Ya no es así** — `AdminContenido.jsx` usa `ProgramDay`
  exclusivamente (verificado por grep, cero referencias a `ContenidoDiario` en ese
  archivo). Esa nota de `INVENTARIO.md` está desactualizada.
- Encontré dos pantallas legacy que **no están enrutadas en `App.jsx` ni importadas
  desde ningún otro archivo**: `src/pages/clienta/ProgramaClienta.jsx` y
  `src/pages/clienta/ProgresoClienta.jsx`. Son código muerto — inalcanzables por
  cualquier usuario real hoy. Tampoco hay ninguna función backend ni workflow que
  toque `ContenidoDiario` o `ProgresoDiario`. Candidatas a borrar directamente (no lo
  hago en esta fase, solo lo señalo — ver sección 3).

## 1. Mapeo campo por campo

### Clienta → ClientaProfile (+ Enrollment, WeeklyCycle para estado de programa)

El modelo legacy mezcla en un solo registro lo que el modelo vigente separa en
`User` (identidad) + `ClientaProfile` (perfil) + `Enrollment`/`WeeklyCycle` (estado
del programa). No hay mapeo 1:1 limpio para varios campos.

| Clienta (legacy)      | Equivalente vigente                                   | Notas |
|---|---|---|
| `user_id`              | — (no tiene equivalente directo)                      | Legacy `Clienta` no está ligada a un `User` real vía `user_id` en la práctica — ningún caller del repo lo setea al crear. |
| `nombre`                | `User.full_name`                                       | Vive en `User`, no en `ClientaProfile`. |
| `email`                 | `User.email`                                            | Idem — clave para hacer el match durante la migración (ver script). |
| `telefono`              | `ClientaProfile.phone`                                  | Directo. |
| `vendedora_id`          | `ClientaProfile.aliada_id`                              | Requiere resolver `Vendedora.id → AliadaProfile.id` primero (ver mapeo Vendedora). |
| `codigo_aliada`         | `ClientaProfile.referral_code`                          | Directo. |
| `fecha_inicio`          | `Enrollment.start_date` (o `Generation.start_date`)     | El vigente ata el inicio a una `Generation`, no a la clienta individual. |
| `dias_desbloqueados`    | *(sin campo directo)* — derivado de `WeeklyCycle.days_unlocked` sumado, o del día calculado en `getDailyAccess`/`generateDailyAlerts` a partir de `Enrollment.start_date` | El vigente no persiste "días desbloqueados" como número; se calcula desde la fecha de inicio. |
| `estado` (`activa`/`pendiente_recompra`/`vencida`/`completada`) | `ClientaProfile.status` (`pending`/`active`/`paused`/`completed`/`dropped`) | **No hay mapeo 1:1.** `pendiente_recompra` y `vencida` no tienen equivalente directo en `status`; lo más cercano es el estado de `WeeklyCycle` (`pending`/`active`/`completed`) combinado con la alerta `week_ended_no_renewal` que ya genera `generateDailyAlerts`. |
| `notas`                 | *(sin equivalente)*                                     | `ClientaProfile` no tiene campo de notas libres. |

### Compra → Sale + Enrollment (+ WeeklyCycle)

| Compra (legacy)        | Equivalente vigente         | Notas |
|---|---|---|
| `clienta_id` (→ `Clienta.id`) | `Sale.clienta_id` (→ `User.id`) | El legacy apunta al id del registro `Clienta`; el vigente apunta directo al `User.id` de la clienta. Requiere la clienta ya migrada. |
| `vendedora_id`          | `Sale.aliada_id`                | Requiere `Vendedora.id → AliadaProfile.id` resuelto. |
| `kit_id`                | `Sale.kit_id`                    | El campo existe en `Sale` como legacy de compatibilidad, no se usa activamente. |
| `kit_nombre`            | `Sale.kit_name`                  | Directo. |
| `semana_numero`         | `WeeklyCycle.week_number`        | Una `Compra` legacy equivale a una `Sale` + un `WeeklyCycle` en el vigente (`registerSale` crea ambos). |
| `dias_desbloqueados`    | `WeeklyCycle.days_unlocked`      | Directo. |
| `monto`                 | `Sale.amount` (+ `Sale.official_price`) | El vigente separa precio oficial y monto final (con descuento). Legacy no tiene esa distinción. |
| `fecha_compra`          | `Sale.sale_date`                 | Directo. |
| `notas`                 | `Sale.notes`                     | Directo. |

### Vendedora → AliadaProfile

| Vendedora (legacy)     | Equivalente vigente          | Notas |
|---|---|---|
| `user_id`               | `AliadaProfile.user_id`       | Directo, pero en la práctica casi ningún registro `Vendedora` legacy lo tiene seteado (`AdminVendedoras.jsx` nunca lo asigna al crear). |
| `nombre`                | `User.full_name`               | Vive en `User`. |
| `email`                 | `User.email`                   | Vive en `User`. |
| `telefono`              | `AliadaProfile.whatsapp`       | Campo más cercano, pero semánticamente distinto (teléfono genérico vs. WhatsApp específico) — validar formato antes de copiar. |
| `codigo_aliada`         | `AliadaProfile.aliada_code`    | Directo — clave para el match del dry-run. |
| `activa` (boolean)      | `AliadaProfile.status` (enum: `pending_training`/`active`/`suspended`/`inactive`) | Conversión boolean → enum: `activa: true` → `active` es la aproximación más razonable, pero pierde el matiz de `pending_training`/`suspended`. |
| `notas`                 | *(sin equivalente)*            | — |

### Kit → IntensityGuide

**No es un mapeo 1:1** — son modelos estructuralmente distintos:

- `Kit` (legacy) es **por semana** (13 registros, uno por semana del programa, con su propio precio).
- `IntensityGuide` (vigente) es **por intensidad** (3 registros: `renueva_7`/`activa_7`/`evoluciona_7`), y la progresión semana a semana vive en `WeeklyCycle` (generado dinámicamente por `registerSale`, no como catálogo estático).

| Kit (legacy)            | Equivalente vigente aproximado | Notas |
|---|---|---|
| `nombre`                 | `IntensityGuide.name`           | Solo si se decide colapsar los 13 kits en las 3 intensidades. |
| `descripcion`            | `IntensityGuide.description`    | — |
| `semana`                 | *(sin equivalente — es un catálogo, no una entidad)* | La "semana" en el vigente es un número en `WeeklyCycle`, generado por venta, no un catálogo editable. |
| `precio`                 | `IntensityGuide.price`          | Solo aplica si el precio no varía por semana en el modelo vigente (hoy varía por intensidad, no por semana). |
| `dias_que_desbloquea`    | *(hardcoded en `registerSale`: 7 días, 13 en semana 12)* | No es un campo editable en el vigente. |
| `activo`                 | `IntensityGuide.active`         | — |

**Recomendación:** no forzar una migración automática de `Kit`. Antes de tocarlo, alguien de producto debe confirmar si el precio por semana (legacy) sigue siendo un requisito de negocio o si el modelo por intensidad (vigente) ya lo reemplaza completamente.

### ContenidoDiario → ProgramDay

| ContenidoDiario (legacy) | Equivalente vigente        | Notas |
|---|---|---|
| `dia_numero`               | `ProgramDay.day_number`      | Directo. |
| `semana_numero`            | `ProgramDay.week_number`     | Directo. |
| `titulo`                   | `ProgramDay.title`           | Directo. |
| `video_url`                 | `ProgramDay.vimeo_url` / `vimeo_video_id` | El vigente separa la URL completa del ID parseado. |
| `video_thumbnail`           | *(sin equivalente)*          | — |
| `texto_acompanamiento`      | `ProgramDay.summary`         | Aproximado. |
| `accion_diaria`             | *(sin campo directo — se podría fusionar en `summary`)* | — |
| `activo` (boolean)          | `ProgramDay.publish_status` (enum `draft`/`published`/`archived`) | Conversión boolean → enum. |

**No hay caller vivo de `ContenidoDiario` en el repo** (ver sección 3) — probablemente no requiere migración de datos, solo confirmar que no hay lectura directa de la entidad desde fuera del código (ej. reportes externos, exports) antes de archivarla.

### ProgresoDiario → DailyCheckin + VideoProgress

| ProgresoDiario (legacy) | Equivalente vigente                          | Notas |
|---|---|---|
| `clienta_id`              | `DailyCheckin.clienta_id` / `VideoProgress.clienta_id` | Directo. |
| `dia_numero`              | *(vía `program_day_id`)*                        | El vigente referencia el día por id de `ProgramDay`, no por número — requiere resolver `dia_numero → ProgramDay.id` primero. |
| `completado`              | `DailyCheckin.completed` / `VideoProgress.completed` | El vigente separa "check-in completado" (objetivos del día) de "video completado" (`VideoProgress`); legacy los mezclaba en un solo booleano. |
| `fecha_completado`        | `DailyCheckin.completed_at` / `VideoProgress.completed_at` | Directo, una vez resuelto a cuál de los dos corresponde. |

**Tampoco tiene caller vivo en el repo** (ver sección 3).

## 2. Script de dry-run

Implementado como función backend protegida (no como script standalone) porque los
datos reales viven en el backend de Base44 en producción — no hay forma de correr un
script local contra esa base de datos desde este repo. Sigue exactamente el mismo
patrón de autenticación obligatoria de la Fase 1.

**Archivo:** `base44/functions/migrationDryRunReport/entry.ts`

- Requiere `superadmin` autenticado (usa `requireRole` del helper de Fase 1). Sin
  excepción.
- **Solo lee** (`asServiceRole.entities.X.list()` / `.filter()`) — no llama a
  `.create()`, `.update()` ni `.delete()` en ningún punto. No escribe nada.
- Para `Vendedora → AliadaProfile`: empareja por `codigo_aliada === aliada_code`.
  Reporta cuántas emparejan limpio, cuántas `Vendedora` no tienen match, y cuántas
  emparejan con más de una `AliadaProfile` (código duplicado — conflicto).
- Para `Clienta → ClientaProfile`: empareja por `email` contra `User.email` para
  encontrar el usuario correspondiente, luego revisa si ese usuario ya tiene
  `ClientaProfile`. Reporta: limpio (User existe + ClientaProfile existe), User
  existe sin ClientaProfile, sin match de User (huérfana), y si `vendedora_id`
  resuelve a una `Vendedora` que a su vez no tiene `AliadaProfile` (conflicto en
  cadena).
- Para `Compra → Sale`: cuenta cuántas `Compra` referencian una `Clienta` que sí
  migraría limpio (según el paso anterior) vs. huérfanas.
- Para `Kit`, `ContenidoDiario`, `ProgresoDiario`: no hay algoritmo de match (no son
  1:1 migrables, ver sección 1) — el reporte solo da el conteo total de registros
  existentes, para dimensionar el trabajo antes de decidir qué hacer con cada uno.

**No lo ejecuté** — esta sesión no tiene acceso al backend de Base44 en producción
(ni siquiera de prueba). Alguien con acceso al workspace de Base44 debe invocarlo
manualmente (como superadmin) una vez desplegado, revisar el reporte, y recién
entonces decidir si vale la pena escribir el script de escritura real.

## 3. Pantallas del frontend que hoy leen/escriben el modelo legacy

Verificado por grep contra el código real (no contra `INVENTARIO.md`, que tenía al
menos un dato desactualizado — ver arriba):

| Pantalla | Ruta | Entidades legacy que usa | ¿Alcanzable hoy? |
|---|---|---|---|
| `src/pages/admin/AdminClientas.jsx` | `/admin/clientas` | `Clienta`, `Vendedora` | Sí (admin) |
| `src/pages/admin/AdminCompras.jsx` | `/admin/compras` | `Clienta`, `Compra`, `Vendedora` | Sí (admin) |
| `src/pages/admin/AdminDashboard.jsx` | `/admin` | `Clienta`, `Compra`, `Vendedora` | Sí (admin) |
| `src/pages/admin/AdminReportes.jsx` | `/admin/reportes` | `Clienta`, `Compra`, `Vendedora` | Sí (admin) |
| `src/pages/admin/AdminVendedoras.jsx` | `/admin/vendedoras` | `Vendedora`, `Clienta` | Sí (admin) |
| `src/pages/admin/AdminKits.jsx` | `/admin/kits` | `Kit` | Sí (admin) |
| `src/pages/vendedora/VendedoraDashboard.jsx` | `/vendedora` | `Vendedora`, `Clienta`, `Compra` | Sí, pero sin ningún usuario real vinculado hoy (ver Fase 2) |
| `src/pages/vendedora/VendedoraClientas.jsx` | `/vendedora/clientas` | `Vendedora`, `Clienta` | Idem |
| `src/pages/vendedora/VendedoraCompras.jsx` | `/vendedora/compras` | `Vendedora`, `Clienta`, `Compra` | Idem |
| `src/pages/clienta/ProgramaClienta.jsx` | **ninguna — no está en `App.jsx`** | `ContenidoDiario`, `ProgresoDiario` | **No, código muerto** |
| `src/pages/clienta/ProgresoClienta.jsx` | **ninguna — no está en `App.jsx`** | `ProgresoDiario` | **No, código muerto** |

`AdminContenido.jsx` — corregido respecto a `INVENTARIO.md`: ya no usa
`ContenidoDiario`, usa `ProgramDay` exclusivamente.

### Recomendación de orden para Fase 3.5 / futuro trabajo de retiro

1. **Bajo riesgo, alto valor:** confirmar con el equipo que `ProgramaClienta.jsx` y
   `ProgresoClienta.jsx` de verdad no se usan (no hay ruta, no hay import) y
   borrarlos junto con las entidades `ContenidoDiario`/`ProgresoDiario` si el dry-run
   muestra 0 registros relevantes o registros claramente obsoletos.
2. **Kit / AdminKits.jsx:** requiere decisión de producto primero (¿el precio por
   semana sigue siendo necesario?) antes de intentar cualquier migración a
   `IntensityGuide`.
3. **Clienta/Compra/Vendedora (admin + `/vendedora/*`):** el bloque más grande y de
   mayor riesgo — corresponde a las pantallas de mayor uso real hoy
   (`AdminClientas`, `AdminCompras`, `AdminDashboard`, `AdminReportes`,
   `AdminVendedoras`). Requiere: (a) correr el dry-run en producción, (b) resolver
   los conflictos que reporte (códigos de aliada duplicados, clientas sin `User`
   correspondiente), (c) recién entonces escribir y probar el script de escritura
   real en un ambiente de prueba (Fase 7), nunca directo en producción.
