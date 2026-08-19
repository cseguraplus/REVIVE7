import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Video, Activity } from "lucide-react";

export default function PilotVideoPanel() {
  const [clientas, setClientas] = useState([]);
  const [selected, setSelected] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    base44.entities.User.list().then((all) => {
      const pilots = (all || []).filter((u) => u.is_test_account && (u.app_role === "clienta" || (u.data && u.data.app_role) === "clienta"));
      setClientas(pilots);
      if (pilots[0]) setSelected(pilots[0].id);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) { setData(null); return; }
    setLoading(true);
    base44.functions.invoke("getPilotVideoProgress", { clienta_id: selected })
      .then((res) => setData(res?.data || null))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [selected]);

  const rows = data?.progress || [];
  const events = data?.events || [];

  return (
    <div className="bg-white rounded-2xl border border-border shadow-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Video className="w-5 h-5 text-revive-green" />
        <h2 className="font-heading font-bold text-revive-dark">Vista técnica de video (piloto)</h2>
      </div>
      <p className="text-xs text-muted-foreground">Duración, buckets, segundos únicos, porcentaje y eventos recientes de la cuenta piloto.</p>

      <select value={selected} onChange={(e) => setSelected(e.target.value)} className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-white">
        {clientas.length === 0 && <option value="">Sin clientas piloto</option>}
        {clientas.map((c) => <option key={c.id} value={c.id}>{c.full_name || c.email}</option>)}
      </select>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-revive-green" /></div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Sin progreso de video registrado para esta cuenta.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-revive-cream text-revive-dark text-left">
                <tr>
                  <th className="px-2 py-2 font-heading font-bold">Día</th>
                  <th className="px-2 py-2 font-heading font-bold">Título</th>
                  <th className="px-2 py-2 font-heading font-bold">Duración</th>
                  <th className="px-2 py-2 font-heading font-bold">Buckets</th>
                  <th className="px-2 py-2 font-heading font-bold">Seg. únicos</th>
                  <th className="px-2 py-2 font-heading font-bold">%</th>
                  <th className="px-2 py-2 font-heading font-bold">Últ. pos.</th>
                  <th className="px-2 py-2 font-heading font-bold">Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.program_day_id} className="border-t border-border">
                    <td className="px-2 py-2 font-heading font-bold text-revive-dark">{r.day_number ?? "—"}</td>
                    <td className="px-2 py-2 text-muted-foreground">{r.title}</td>
                    <td className="px-2 py-2 tabular-nums">{Math.round(r.duration_seconds)}s</td>
                    <td className="px-2 py-2 tabular-nums">{r.buckets_count}</td>
                    <td className="px-2 py-2 tabular-nums">{Math.round(r.unique_watched_seconds)}s</td>
                    <td className="px-2 py-2 tabular-nums font-semibold">{Math.round(r.valid_percent)}%</td>
                    <td className="px-2 py-2 tabular-nums">{Math.round(r.last_position_seconds)}s</td>
                    <td className="px-2 py-2">{r.completed ? <span className="text-revive-green font-bold">✓</span> : <span className="text-muted-foreground">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="text-xs font-heading font-bold text-revive-dark mb-2 flex items-center gap-1.5"><Activity className="w-3.5 h-3.5" /> Eventos recientes</p>
            <div className="space-y-1.5">
              {events.map((e, i) => (
                <div key={i} className="flex items-center justify-between bg-revive-cream rounded-lg px-3 py-1.5 text-xs">
                  <span className="text-revive-dark font-heading font-semibold">Día {e.day_number ?? "—"} · {e.title}</span>
                  <span className="text-muted-foreground tabular-nums">{Math.round(e.valid_percent)}% {e.completed ? "✓" : ""} · {e.last_saved_at ? new Date(e.last_saved_at).toLocaleString("es-MX") : "—"}</span>
                </div>
              ))}
              {events.length === 0 && <p className="text-xs text-muted-foreground">Sin eventos.</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}