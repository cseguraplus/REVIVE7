import { supabase } from "@/lib/supabaseClient";

// Paso 4 de la migración fuera de Base44: capa de compatibilidad.
// Mantiene la misma superficie que usaba el resto de la app
// (`base44.functions.invoke(name, params)`, `base44.entities.X.filter/list/get/create/update`)
// para no tener que tocar los ~55 archivos que ya la usan — solo cambia lo
// que hay detrás, de `@base44/sdk` a Supabase (Edge Functions + Postgres/RLS).
// Ver supabase/README.md § Paso 4.

const TABLE_MAP = {
  Alert: "alerts",
  AliadaProfile: "aliada_profiles",
  AppSettings: "app_settings",
  AuditLog: "audit_logs",
  ClientaProfile: "clienta_profiles",
  CorrectionRequest: "correction_requests",
  DailyCheckin: "daily_checkins",
  Enrollment: "enrollments",
  Generation: "generations",
  Inventory: "inventory",
  InventoryMovement: "inventory_movements",
  IntensityGuide: "intensity_guides",
  Lead: "leads",
  ProgramDay: "program_days",
  Prospect: "prospects",
  ReassignmentRequest: "reassignment_requests",
  SafetyScreening: "safety_screenings",
  Sale: "sales",
  SalesApplicant: "sales_applicants",
  SolicitudAliada: "solicitud_aliada",
  TestControl: "test_control",
  TrainingExam: "training_exams",
  TrainingModule: "training_modules",
  TrainingProgress: "training_progress",
  VideoProgress: "video_progress",
  WeeklyCycle: "weekly_cycles",
  WeeklyMetrics: "weekly_metrics",
};

// Modelo legado "vendedora" (Clienta, Compra, Vendedora, Kit, ContenidoDiario,
// ProgresoDiario) — decisión de Fase 3: no se migró a Postgres (ver
// base44/LEGACY_MIGRATION_PLAN.md). Las pantallas que aún las usan
// (src/pages/vendedora/*, AdminVendedoras, AdminKits, AdminContenido) quedan
// pendientes de retiro, no de migración.
const LEGACY_ENTITIES = ["Clienta", "Compra", "Vendedora", "Kit", "ContenidoDiario", "ProgresoDiario"];

// Base44 ordenaba con "-created_date"/"-updated_date"; en Postgres esas
// columnas se llaman created_at/updated_at (ver 0002_schema.sql).
const SORT_FIELD_MAP = { created_date: "created_at", updated_date: "updated_at" };

function parseSort(sortStr) {
  if (!sortStr) return null;
  const desc = sortStr.startsWith("-");
  const field = desc ? sortStr.slice(1) : sortStr;
  return { column: SORT_FIELD_MAP[field] || field, ascending: !desc };
}

function makeEntity(table) {
  return {
    async filter(query = {}) {
      let q = supabase.from(table).select("*");
      for (const [k, v] of Object.entries(query)) q = q.eq(k, v);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    },
    async list(sortStr, limit) {
      let q = supabase.from(table).select("*");
      const sort = parseSort(sortStr);
      if (sort) q = q.order(sort.column, { ascending: sort.ascending });
      if (limit) q = q.limit(limit);
      const { data, error } = await q;
      if (error) throw new Error(error.message);
      return data || [];
    },
    async get(id) {
      const { data, error } = await supabase.from(table).select("*").eq("id", id).maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    },
    async create(values) {
      const { data, error } = await supabase.from(table).insert(values).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    async update(id, values) {
      const { data, error } = await supabase.from(table).update(values).eq("id", id).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    async delete(id) {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw new Error(error.message);
      return true;
    },
  };
}

function legacyEntity(name) {
  const fail = () => {
    throw new Error(
      `${name} es del modelo legacy "vendedora" y no se migró a Supabase (ver base44/LEGACY_MIGRATION_PLAN.md).`
    );
  };
  return { filter: fail, list: fail, get: fail, create: fail, update: fail, delete: fail };
}

async function invokeError(error) {
  let message = error?.message || "Error";
  let bodyError = null;
  try {
    if (error?.context && typeof error.context.json === "function") {
      const body = await error.context.json();
      bodyError = body?.error || null;
      if (bodyError) message = bodyError;
    }
  } catch {
    // el body de error no era JSON — nos quedamos con error.message
  }
  const err = /** @type {Error & { response: { data: { error: string } } }} */ (new Error(message));
  err.response = { data: { error: bodyError || message } };
  return err;
}

async function invoke(name, params = {}) {
  const { data, error } = await supabase.functions.invoke(name, { body: params });
  if (error) throw await invokeError(error);
  return { data };
}

// User no tiene tabla propia legible desde el cliente: full_name/email viven
// en auth.users.user_metadata (Register.jsx los manda en signUp), y
// public.profiles no expone eso vía RLS a otros usuarios. Los usos de
// User.list/filter/update del frontend (paneles admin) pasan por las Edge
// Functions adminListUsers/setUserRole en vez de una tabla directa.
function userEntity() {
  return {
    async list() {
      const { data, error } = await supabase.functions.invoke("adminListUsers", { body: {} });
      if (error) throw await invokeError(error);
      return data?.users || [];
    },
    async filter(query = {}) {
      const { data, error } = await supabase.functions.invoke("adminListUsers", { body: query });
      if (error) throw await invokeError(error);
      return data?.users || [];
    },
    async get(id) {
      const all = await this.list();
      return all.find((u) => u.id === id) || null;
    },
    async update(id, values) {
      if (values.app_role) {
        const { data, error } = await supabase.functions.invoke("setUserRole", { body: { user_id: id, app_role: values.app_role } });
        if (error) throw await invokeError(error);
        return data;
      }
      throw new Error("User.update solo soporta app_role (vía setUserRole) desde el frontend.");
    },
    async create() {
      throw new Error("User.create no soportado desde el frontend — usa el flujo de invitación (findOrInviteUser en las Edge Functions).");
    },
    async delete() {
      throw new Error("User.delete no soportado desde el frontend.");
    },
  };
}

// Proxy sin miembros declarados: se tipa `any` a propósito (igual que el SDK
// de Base44 original) para que `base44.entities.CualquierEntidad` siga
// resolviendo en tiempo de compilación en los ~40 archivos que la usan.
const entities = /** @type {any} */ (
  new Proxy(
    {},
    {
      get(_target, name) {
        const key = String(name);
        if (key === "User") return userEntity();
        if (LEGACY_ENTITIES.includes(key)) return legacyEntity(key);
        const table = TABLE_MAP[key];
        if (!table) throw new Error(`Entidad desconocida: ${key} (agrégala a TABLE_MAP en src/api/base44Client.js si es nueva).`);
        return makeEntity(table);
      },
    }
  )
);

export const base44 = {
  functions: { invoke },
  entities,
  users: {
    async inviteUser(email, _role) {
      const { data, error } = await supabase.functions.invoke("inviteUser", { body: { email } });
      if (error) throw await invokeError(error);
      return data;
    },
  },
};
