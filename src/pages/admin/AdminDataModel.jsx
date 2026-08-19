import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Database, CheckCircle, AlertTriangle } from "lucide-react";

// Modelo de datos definitivo — mapeo nombre canónico → entidad real (reutilizada o nueva).
const MODEL = [
  { canon: "UserProfile", entity: "User", kind: "reutilizada", note: "+ is_test_account, last_activity_at; account_status normalizado" },
  { canon: "ProgramSettings", entity: "AppSettings", kind: "reutilizada", note: "singleton + support_email, terms/privacy version" },
  { canon: "TestControl", entity: "TestControl", kind: "nueva", note: "control de prueba por cuenta (reemplaza test_mode global)" },
  { canon: "AliadaApplication", entity: "SolicitudAliada", kind: "reutilizada", note: "solicitud de aliada (no renombrada)" },
  { canon: "AliadaProfile", entity: "AliadaProfile", kind: "reutilizada", note: "perfil de aliada" },
  { canon: "TrainingModule", entity: "TrainingModule", kind: "nueva", note: "catálogo de capacitación" },
  { canon: "TrainingProgress", entity: "TrainingProgress", kind: "nueva", note: "avance por aliada/módulo" },
  { canon: "Lead", entity: "Lead", kind: "reutilizada", note: "captación multicanal" },
  { canon: "ClientaProfile", entity: "ClientaProfile", kind: "reutilizada", note: "perfil de clienta" },
  { canon: "SafetyScreening", entity: "SafetyScreening", kind: "nueva", note: "cuestionario preventivo (no diagnóstico)" },
  { canon: "Generation", entity: "Generation", kind: "reutilizada", note: "cohorte" },
  { canon: "ProgramJourney", entity: "Enrollment", kind: "reutilizada", note: "proceso de 90 días (no renombrada)" },
  { canon: "ProgramDay", entity: "ProgramDay", kind: "reutilizada", note: "contenido diario Vimeo" },
  { canon: "IntensityGuide", entity: "IntensityGuide", kind: "nueva", note: "Renueva/Activa/Evoluciona 7 + precio" },
  { canon: "VideoProgress", entity: "VideoProgress", kind: "reutilizada", note: "buckets vistos (field-RLS)" },
  { canon: "DailyCheckin", entity: "DailyCheckin", kind: "reutilizada", note: "check-in diario" },
  { canon: "WeeklyMetrics", entity: "WeeklyMetrics", kind: "reutilizada", note: "métricas semanales" },
  { canon: "WeeklyCycle", entity: "WeeklyCycle", kind: "nueva", note: "compra semanal + intensidad (cambia cada semana)" },
  { canon: "Sale", entity: "Sale", kind: "reutilizada", note: "+ weekly_cycle_id, intensity (no se elimina)" },
  { canon: "InventoryBalance", entity: "Inventory", kind: "reutilizada", note: "+ intensity (no renombrada)" },
  { canon: "InventoryMovement", entity: "InventoryMovement", kind: "nueva", note: "movimientos auditables (no se eliminan)" },
  { canon: "Alert", entity: "Alert", kind: "reutilizada", note: "alertas" },
  { canon: "ReassignmentRequest", entity: "ReassignmentRequest", kind: "nueva", note: "reasignación de clienta" },
  { canon: "CorrectionRequest", entity: "CorrectionRequest", kind: "nueva", note: "solicitud de corrección" },
  { canon: "AuditLog", entity: "AuditLog", kind: "reutilizada", note: "auditoría" },
];

export default function AdminDataModel() {
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const results = await Promise.allSettled(
        MODEL.map((m) => base44.entities[m.entity].list())
      );
      const c = {};
      MODEL.forEach((m, i) => {
        c[m.entity] = results[i].status === "fulfilled" ? results[i].value.length : "error";
      });
      setCounts(c);
      setLoading(false);
    })();
  }, []);

  const nuevas = MODEL.filter((m) => m.kind === "nueva").length;
  const reutilizadas = MODEL.filter((m) => m.kind === "reutilizada").length;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-2">
        <Database className="w-6 h-6 text-revive-green" />
        <div>
          <h1 className="font-heading font-bold text-2xl text-revive-dark">Modelo de datos · Producción</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Vista temporal para verificar relaciones. {reutilizadas} reutilizadas · {nuevas} nuevas · sin duplicados.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-revive-cream/50 border-b border-border">
            <tr>
              {["Nombre canónico", "Entidad", "Tipo", "Registros", "Notas / migración"].map((h) => (
                <th key={h} className="text-left px-4 py-3 font-heading font-semibold text-revive-dark text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={5} className="text-center py-10"><Loader2 className="w-6 h-6 animate-spin text-revive-green mx-auto" /></td></tr>
            )}
            {!loading && MODEL.map((m) => {
              const count = counts[m.entity];
              return (
                <tr key={m.entity} className="hover:bg-revive-cream/30 transition-colors">
                  <td className="px-4 py-3 font-heading font-semibold text-revive-dark">{m.canon}</td>
                  <td className="px-4 py-3"><code className="text-xs bg-muted px-1.5 py-0.5 rounded">{m.entity}</code></td>
                  <td className="px-4 py-3">
                    {m.kind === "nueva"
                      ? <span className="inline-flex items-center gap-1 text-xs font-semibold text-revive-green"><CheckCircle className="w-3.5 h-3.5" /> nueva</span>
                      : <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground"><AlertTriangle className="w-3.5 h-3.5" /> reutilizada</span>}
                  </td>
                  <td className="px-4 py-3 font-heading font-bold text-revive-dark tabular-nums">{count}</td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">{m.note}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="bg-revive-cream border border-revive-green/20 rounded-2xl p-5 text-sm text-revive-dark space-y-2">
        <p className="font-heading font-bold">Reglas implementadas en el modelo</p>
        <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
          <li>ProgramJourney (Enrollment) = proceso de 90 días; WeeklyCycle = compra semanal con intensidad Renueva/Activa/Evoluciona 7.</li>
          <li>La clienta puede cambiar de intensidad cada semana (intensidad vive en WeeklyCycle, no en Enrollment).</li>
          <li>Días 85–90 incluidos en el WeeklyCycle de la semana 12 (lógica de desbloqueo).</li>
          <li>Sale, InventoryMovement y WeeklyCycle son registros separados y relacionados; no se eliminan, se cambian de estado y se auditan.</li>
          <li>TestControl reemplaza el modo de prueba global: fecha real en producción, simulada solo si is_test_account + TestControl.enabled.</li>
        </ul>
      </div>
    </div>
  );
}