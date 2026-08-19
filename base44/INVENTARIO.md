# Inventario comparativo — Mi Revive 7 (producción)

Dominios: `aliadasservivo.com` (Landing Aliadas) · `revive7.mx` (Landing Revive7) · `apprevive7.mx` (App).
Idioma: español de México. Zona horaria: `America/Mexico_City`. Diseño: mobile-first.

## 1. Arquitectura objetivo

- Roles funcionales (User.app_role): `clienta`, `aliada`, `operaciones`, `contenidos`, `superadmin`.
- Modelo de negocio: **Aliadas** (mentoras/vendedoras) → **Clientas** con **Enrollment** por **Generation** e **intensity** (kit).
- Contenido: **ProgramDay** (Vimeo) con progreso validado en backend.
- Fecha: real en producción; simulada solo para cuentas `is_test_account=true`.
- Reglas sensibles (roles, ventas, inventario, activaciones, progreso, auditoría) se validan en backend.

## 2. Estado actual — Entidades

### Producción (en uso)
| Entidad | Rol | Estado |
|---|---|---|
| User | Cuenta + app_role + account_status + onboarding | ✅ (falta `is_test_account`) |
| AliadaProfile | Perfil de aliada | ✅ |
| ClientaProfile | Perfil de clienta (status, safety_flag, prep) | ✅ |
| Enrollment | Inscripción clienta→generación+intensity | ✅ |
| Generation | Cohorte | ✅ |
| ProgramDay | Contenido diario (Vimeo, required_percent, publish_status) | ✅ |
| VideoProgress | Buckews vistos (valid_percent/completed con field-RLS) | ✅ |
| DailyCheckin | Check-in diario (objetivos + emocional) | ✅ |
| WeeklyMetrics | Métricas iniciales/semanales/finales | ✅ |
| Sale | Venta (aliada, enrollment, kit, monto) | ✅ |
| AppSettings | Config global (tz, required_video_percent, test_mode) | ✅ |
| Alert / AuditLog | Alertas y auditoría | ✅ |
| Lead / SolicitudAliada / SalesApplicant | Captación de leads | ✅ |

### Legacy (MVP vendedora / prueba anterior) — NO eliminar, no usar en código nuevo
| Entidad | Sustituida por | Aún referenciada por |
|---|---|---|
| **ContenidoDiario** | ProgramDay | AdminContenido (a migrar) |
| **ProgresoDiario** | VideoProgress + DailyCheckin | (sin uso en producción) |
| **Vendedora** | AliadaProfile | AdminVendedoras, Vendedora* (a migrar) |
| **Clienta** | ClientaProfile | AdminClientas, AdminCompras, Vendedora* (a migrar) |
| **Compra** | Sale + Enrollment | AdminCompras, VendedoraCompras (a migrar) |
| **Kit** (semana/precio) | Enrollment.intensity (renueva_7/activa_7/evoluciona_7) | AdminKits (a migrar) |
| **Inventory** | (sin equivalente en modelo aliada aún) | (sin página) — definir inventario por intensity |

Notas:
- `app_role` **no incluye** `vendedora`; las rutas `/vendedora*` y `/admin/compras` operan sobre el modelo legacy.
- `Kit` y `Inventory` no tienen RLS — gap a corregir al migrar.

## 3. Funciones backend
| Función | Estado |
|---|---|
| getEffectiveNow, getDailyAccess | ✅ base de fecha y acceso |
| saveVideoProgressBatch | ✅ merge de buckets en backend (field-RLS respetado) |
| validateVideoCompletion | ✅ recalcula y marca `completed` solo backend |
| completeDailyCheckin | ✅ |
| generateDailyAlerts, sendAliadaDailySummary | ✅ (usados por workflow) |
| getAliadaDashboard, getAliadaClientData | ✅ |
| adminOverrideDay, resetPilotUser, setTestEffectiveDate | ✅ (superadmin/operaciones, con AuditLog) |
| seedTestData, createLandingLead | ✅ |

Reglas 4 y 5 cumplidas en el flujo de video: la clienta no escribe `valid_percent`/`completed`/`completed_at` (field-RLS + service-role en backend).

## 4. Workflows
- `DailyAlertsAndSummary` — cron `0 8 * * *` America/Mexico_City → generateDailyAlerts → sendAliadaDailySummary. ✅

## 5. Rutas (App.jsx)
- Dominios configurados: `/` por dominio; `/aliadas` solo en `aliadasservivo.com`. ✅
- Sin rutas rotas (todos los imports resuelven).
- **Pendiente (no bloqueante):** las rutas `/vendedora*` y `/admin/compras` exponen el modelo legacy y no tienen guard de `app_role` real (AppLayout recibe `role` hardcodeado). Tras migrar, desactivar/redirigir.

## 6. Permisos (RLS) — gaps a cerrar
- `Kit`, `Inventory`: sin RLS → definir read/create/update/delete por rol.
- `Clienta.update` y `Compra.read`/`Vendedora.read` quedaron abiertos (`true`) para desbloquear la prueba; al migrar al modelo aliada, restringir.
- `User.app_role` update: solo superadmin/operaciones. ✅

## 7. Integraciones
- Core: InvokeLLM, UploadFile, GenerateImage, GenerateSpeech, GenerateVideo, SendEmail (solo usuarios registrados), ExtractData, etc. ✅
- Vimeo: @vimeo/player (privacidad por dominio + referrer `origin` configurado). ✅
- Sin conectores OAuth autorizados todavía.

## 8. Brechas vs. reglas objetivo (pendiente)
1. **is_test_account**: hoy se usa `AppSettings.test_mode` (global) + `user.data.test_cohort`. Objetivo: flag por cuenta `is_test_account` editable en panel admin → agregar campo a User + ajustar getEffectiveNow/getDailyAccess.
2. **Migración modelo vendedora → aliada**: datos de `Clienta`/`Compra`/`Vendedora`/`Kit`/`Inventory` a `ClientaProfile`/`Sale`/`Enrollment`/`AliadaProfile` (script de migración seguro, sin borrar origen).
3. **RLS** pendientes en Kit/Inventory y reajuste de Clienta/Compra.
4. **Guard de rol real** en rutas (AppLayout/ProtectedRoute por `app_role`).
5. **Cuestionario preventivo**: verificar que no emite diagnóstico médico (solo alerta).
6. **Privacidad emocional**: `DailyCheckin.share_with_aliada` existe; auditar que vistas de aliada respeten `false`.

## 9. Correcciones aplicadas en este turno
- Ningún borrado/renombre. Sin rutas rotas detectadas.
- Duplicados evidentes marcados como **legacy** en este inventario (ContenidoDiario, ProgresoDiario y el bloque vendedora) — se conservan hasta migración segura.

## 10. Pruebas que debes realizar
- Recorrer `/` en cada dominio y confirmar landing correcta; `/aliadas` solo en aliadasservivo.com.
- Flujo clienta: Preparación → Hoy → video Vimeo → check-in → desbloqueo de día siguiente (getDailyAccess).
- Validar que `valid_percent`/`completed` solo los mueve el backend.
- Probar fecha simulada solo con cuenta de prueba (tras implementar is_test_account).
- Verificar que aliada no ve comentarios emocionales con `share_with_aliada=false`.