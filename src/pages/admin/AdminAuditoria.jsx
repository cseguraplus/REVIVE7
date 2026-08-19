import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Loader2, ScrollText, Download, FlaskConical } from "lucide-react";
import { EmptyState, SearchInput, Pagination, useAdminList } from "@/components/admin/AdminUI";
import { exportToCsv } from "@/lib/exportCsv";

export default function AdminAuditoria() {
  const [logs, setLogs] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState("");

  const load = async () => {
    try {
      const [l, u] = await Promise.all([
        base44.entities.AuditLog.list("-timestamp", 200),
        base44.entities.User.list("-created_date", 200),
      ]);
      setLogs(l || []); setUsers(u || []);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const actorName = (uid) => { const u = users.find((x) => x.id === uid); return u?.full_name || u?.email || (uid || "").slice(-6); };

  const list = useAdminList({
    items: logs,
    filterFn: (l, s) => {
      const q = s.toLowerCase();
      const matchesText = (l.action || "").toLowerCase().includes(q) || (l.entity_type || "").toLowerCase().includes(q) || (l.reason || "").toLowerCase().includes(q);
      const matchesAction = !actionFilter || (l.action || "").includes(actionFilter);
      return matchesText && matchesAction;
    },
  });

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;

  const actions = [...new Set(logs.map((l) => l.action).filter(Boolean))].sort();

  const exportRows = logs.map((l) => ({
    fecha: l.timestamp ? new Date(l.timestamp).toISOString() : "",
    actor: actorName(l.actor_user_id),
    accion: l.action,
    entidad: l.entity_type,
    entidad_id: l.entity_id,
    valor_anterior: l.old_value_json,
    valor_nuevo: l.new_value_json,
    motivo: l.reason,
  }));

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-revive-dark">Auditoría</h1>
          <p className="text-sm text-muted-foreground">Registro de acciones sensibles con valor anterior y nuevo.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => exportToCsv("auditoria.csv", exportRows)} disabled={logs.length === 0} className="flex items-center gap-2 bg-white border border-border text-revive-dark font-heading font-semibold px-4 py-2.5 rounded-xl text-sm disabled:opacity-50">
            <Download className="w-4 h-4" /> Exportar CSV
          </button>
          <Link to="/admin/prueba" className="flex items-center gap-2 bg-revive-dark text-white font-heading font-bold px-4 py-2.5 rounded-xl text-sm">
            <FlaskConical className="w-4 h-4" /> Consola de prueba
          </Link>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1"><SearchInput value={list.search} onChange={(v) => { list.setSearch(v); list.setPage(1); }} placeholder="Buscar por acción, entidad o motivo…" /></div>
        <select value={actionFilter} onChange={(e) => { setActionFilter(e.target.value); list.setPage(1); }} className="border border-input rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">Todas las acciones</option>
          {actions.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {list.total === 0 ? (
        <EmptyState icon={ScrollText} title="Sin registros" hint="Las acciones sensibles aparecerán aquí." />
      ) : (
        <div className="space-y-2">
          {list.paged.map((l) => (
            <div key={l.id} className="bg-white border border-border rounded-xl p-4 space-y-1">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <p className="font-heading font-semibold text-revive-dark text-sm">{l.action}</p>
                <span className="text-xs text-muted-foreground">{l.timestamp ? new Date(l.timestamp).toLocaleString("es-MX") : ""}</span>
              </div>
              <p className="text-xs text-muted-foreground">{actorName(l.actor_user_id)} · {l.entity_type} {l.entity_id?.slice(-6)}</p>
              {(l.old_value_json || l.new_value_json) && (
                <div className="text-xs bg-revive-cream rounded-lg p-2 mt-1">
                  {l.old_value_json && <p className="text-red-700">Antes: <span className="font-mono">{l.old_value_json}</span></p>}
                  {l.new_value_json && <p className="text-green-700">Después: <span className="font-mono">{l.new_value_json}</span></p>}
                </div>
              )}
              {l.reason && <p className="text-xs text-muted-foreground italic">Motivo: {l.reason}</p>}
            </div>
          ))}
          <Pagination page={list.page} totalPages={list.totalPages} onPage={list.setPage} />
        </div>
      )}
    </div>
  );
}