import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Loader2, Bell, ArrowLeftRight, FileEdit, Check, X } from "lucide-react";
import { EmptyState, SearchInput, useAdminList } from "@/components/admin/AdminUI";

const TABS = [
  { key: "alertas", label: "Alertas", icon: Bell },
  { key: "reasignaciones", label: "Reasignaciones", icon: ArrowLeftRight },
  { key: "correcciones", label: "Correcciones", icon: FileEdit },
];

const SEV_LABEL = { low: "Baja", medium: "Media", high: "Alta" };
const ALERT_STATUS = { open: "Abierta", acknowledged: "Reconocida", resolved: "Resuelta" };
const ALERT_TYPE = { no_activity: "Sin actividad", low_completion: "Baja cumplimiento", safety: "Seguridad", at_risk: "En riesgo", onboarding: "Onboarding" };

export default function AdminAlertas() {
  const { user: me } = useAuth();
  const [tab, setTab] = useState("alertas");
  const [alerts, setAlerts] = useState([]);
  const [reassignments, setReassignments] = useState([]);
  const [corrections, setCorrections] = useState([]);
  const [clientas, setClientas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const [a, r, c, cp] = await Promise.all([
        base44.entities.Alert.list("-created_date", 200),
        base44.entities.ReassignmentRequest.list("-created_date", 100),
        base44.entities.CorrectionRequest.list("-created_date", 100),
        base44.entities.ClientaProfile.list("-created_date", 500),
      ]);
      setAlerts(a || []); setReassignments(r || []); setCorrections(c || []); setClientas(cp || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const setAlertStatus = async (al, status) => {
    setBusy(true);
    try { await base44.entities.Alert.update(al.id, { status }); await load(); } catch (e) { /* ignore */ }
    finally { setBusy(false); }
  };

  const resolveReassign = async (rr, status) => {
    setBusy(true);
    try {
      if (status === "approved") {
        await base44.entities.ClientaProfile.update(rr.clienta_id, { aliada_id: rr.to_aliada_id });
      }
      await base44.entities.ReassignmentRequest.update(rr.id, { status, resolved_at: new Date().toISOString() });
      await load();
    } catch (e) { /* ignore */ }
    finally { setBusy(false); }
  };

  const resolveCorrection = async (cr, status) => {
    setBusy(true);
    try {
      if (status === "approved") {
        let entityName;
        if (cr.entity_type === "Sale") entityName = "Sale";
        else if (cr.entity_type === "Enrollment") entityName = "Enrollment";
        else if (cr.entity_type === "ClientaProfile") entityName = "ClientaProfile";
        if (entityName) await base44.entities[entityName].update(cr.entity_id, { [cr.field]: cr.new_value });
        await base44.entities.AuditLog.create({
          actor_user_id: me?.id, action: `correction_approved:${cr.entity_type}.${cr.field}`,
          entity_type: cr.entity_type, entity_id: cr.entity_id,
          old_value_json: cr.old_value || "", new_value_json: cr.new_value || "", reason: cr.reason || "",
          timestamp: new Date().toISOString(),
        });
      }
      await base44.entities.CorrectionRequest.update(cr.id, { status, resolved_at: new Date().toISOString() });
      await load();
    } catch (e) { /* ignore */ }
    finally { setBusy(false); }
  };

  const alList = useAdminList({ items: alerts, filterFn: (a, s) => (a.reason || "").toLowerCase().includes(s.toLowerCase()) });
  const rrList = useAdminList({ items: reassignments });
  const crList = useAdminList({ items: corrections });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;

  return (
    <div className="space-y-5 max-w-5xl">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Alertas y solicitudes</h1>
        <p className="text-sm text-muted-foreground">Alertas de clientas, reasignaciones y correcciones pendientes.</p>
      </div>

      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {TABS.map((t) => {
          const count = t.key === "alertas" ? alerts.filter((a) => a.status === "open").length : t.key === "reasignaciones" ? reassignments.filter((r) => r.status === "pending").length : corrections.filter((c) => c.status === "pending").length;
          return (
            <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2.5 text-sm font-heading font-semibold border-b-2 -mb-px whitespace-nowrap ${tab === t.key ? "border-revive-green text-revive-dark" : "border-transparent text-muted-foreground"}`}>
              <t.icon className="w-4 h-4" /> {t.label} {count > 0 && <span className="bg-amber-100 text-amber-700 text-xs px-1.5 rounded-full">{count}</span>}
            </button>
          );
        })}
      </div>

      {tab === "alertas" && (
        <div className="space-y-3">
          <SearchInput value={alList.search} onChange={(v) => { alList.setSearch(v); alList.setPage(1); }} placeholder="Buscar alerta…" />
          {alList.total === 0 ? <EmptyState icon={Bell} title="Sin alertas" hint="No hay alertas activas." /> : (
            alList.paged.map((a) => (
              <div key={a.id} className="bg-white border border-border rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-semibold bg-revive-cream text-revive-dark px-2 py-0.5 rounded-full">{ALERT_TYPE[a.type] || a.type}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${a.severity === "high" ? "bg-red-100 text-red-700" : a.severity === "medium" ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-600"}`}>{SEV_LABEL[a.severity]}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${a.status === "open" ? "bg-orange-100 text-orange-700" : a.status === "acknowledged" ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>{ALERT_STATUS[a.status]}</span>
                  </div>
                  <p className="text-sm text-revive-dark mt-1">{a.reason}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{a.created_at ? new Date(a.created_at).toLocaleString("es-MX") : ""}</p>
                </div>
                {a.status === "open" && (
                  <div className="flex gap-1">
                    <button onClick={() => setAlertStatus(a, "acknowledged")} disabled={busy} className="p-2 rounded-lg border border-border text-blue-600 hover:bg-blue-50"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setAlertStatus(a, "resolved")} disabled={busy} className="p-2 rounded-lg border border-border text-green-600 hover:bg-green-50"><Check className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "reasignaciones" && (
        <div className="space-y-2">
          {rrList.total === 0 ? <EmptyState icon={ArrowLeftRight} title="Sin solicitudes" hint="No hay reasignaciones pendientes." /> : (
            rrList.paged.map((rr) => (
              <div key={rr.id} className="bg-white border border-border rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-revive-dark text-sm">Clienta {rr.clienta_id?.slice(-6)}</p>
                  <p className="text-xs text-muted-foreground">{rr.from_aliada_id?.slice(-6)} → {rr.to_aliada_id?.slice(-6)}</p>
                  {rr.reason && <p className="text-xs text-muted-foreground mt-1">{rr.reason}</p>}
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${rr.status === "pending" ? "bg-amber-100 text-amber-700" : rr.status === "approved" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{rr.status}</span>
                </div>
                {rr.status === "pending" && (
                  <div className="flex gap-1">
                    <button onClick={() => resolveReassign(rr, "approved")} disabled={busy} className="p-2 rounded-lg border border-border text-green-600 hover:bg-green-50"><Check className="w-4 h-4" /></button>
                    <button onClick={() => resolveReassign(rr, "rejected")} disabled={busy} className="p-2 rounded-lg border border-border text-red-600 hover:bg-red-50"><X className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {tab === "correcciones" && (
        <div className="space-y-2">
          {crList.total === 0 ? <EmptyState icon={FileEdit} title="Sin correcciones" hint="No hay correcciones solicitadas." /> : (
            crList.paged.map((cr) => (
              <div key={cr.id} className="bg-white border border-border rounded-xl p-4 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-revive-dark text-sm">{cr.entity_type}.{cr.field}</p>
                  <p className="text-xs text-muted-foreground">Actual: <span className="line-through">{cr.old_value}</span> → Nuevo: <span className="font-semibold text-revive-dark">{cr.new_value}</span></p>
                  {cr.reason && <p className="text-xs text-muted-foreground mt-1">Motivo: {cr.reason}</p>}
                  <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${cr.status === "pending" ? "bg-amber-100 text-amber-700" : cr.status === "approved" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>{cr.status}</span>
                </div>
                {cr.status === "pending" && (
                  <div className="flex gap-1">
                    <button onClick={() => resolveCorrection(cr, "approved")} disabled={busy} className="p-2 rounded-lg border border-border text-green-600 hover:bg-green-50"><Check className="w-4 h-4" /></button>
                    <button onClick={() => resolveCorrection(cr, "rejected")} disabled={busy} className="p-2 rounded-lg border border-border text-red-600 hover:bg-red-50"><X className="w-4 h-4" /></button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}