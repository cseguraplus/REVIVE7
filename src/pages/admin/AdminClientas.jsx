import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Search, Filter } from "lucide-react";

const estadoStyle = {
  activa: "bg-revive-green-pale text-revive-dark",
  pendiente_recompra: "bg-yellow-100 text-yellow-700",
  vencida: "bg-red-100 text-red-600",
  completada: "bg-blue-100 text-blue-700",
};
const estadoLabel = { activa: "Activa", pendiente_recompra: "Pendiente recompra", vencida: "Vencida", completada: "Completada" };

export default function AdminClientas() {
  const [clientas, setClientas] = useState([]);
  const [vendedoras, setVendedoras] = useState([]);
  const [search, setSearch] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([base44.entities.Clienta.list(), base44.entities.Vendedora.list()])
      .then(([c, v]) => { setClientas(c); setVendedoras(v); setLoading(false); });
  }, []);

  const vendedoraMap = Object.fromEntries(vendedoras.map(v => [v.id, v.nombre]));

  const filtered = clientas.filter(c => {
    const matchSearch = c.nombre?.toLowerCase().includes(search.toLowerCase()) || c.email?.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === "todos" || c.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Clientas</h1>
        <p className="text-muted-foreground text-sm mt-1">{clientas.length} clientas en el ecosistema</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nombre o email..."
            className="w-full pl-9 pr-4 py-2.5 border border-input rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
        </div>
        <select value={filtroEstado} onChange={e => setFiltroEstado(e.target.value)}
          className="border border-input rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 bg-white">
          <option value="todos">Todos los estados</option>
          <option value="activa">Activas</option>
          <option value="pendiente_recompra">Pendientes recompra</option>
          <option value="vencida">Vencidas</option>
          <option value="completada">Completadas</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-border shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-revive-cream/50 border-b border-border">
            <tr>
              {["Nombre", "Email", "Vendedora", "Días desbloqueados", "Progreso", "Estado"].map(h => (
                <th key={h} className="text-left px-4 py-3 font-heading font-semibold text-revive-dark text-xs uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">Sin resultados.</td></tr>
            )}
            {filtered.map(c => (
              <tr key={c.id} className="hover:bg-revive-cream/30 transition-colors">
                <td className="px-4 py-3 font-heading font-semibold text-revive-dark">{c.nombre}</td>
                <td className="px-4 py-3 text-muted-foreground">{c.email}</td>
                <td className="px-4 py-3 text-muted-foreground">{vendedoraMap[c.vendedora_id] || "—"}</td>
                <td className="px-4 py-3 font-heading font-bold text-revive-dark">{c.dias_desbloqueados || 0} días</td>
                <td className="px-4 py-3 w-36">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-border rounded-full h-1.5">
                      <div className="bg-revive-green h-1.5 rounded-full" style={{ width: `${Math.min(100, ((c.dias_desbloqueados || 0) / 90) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{Math.round(((c.dias_desbloqueados || 0) / 90) * 100)}%</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-heading font-bold ${estadoStyle[c.estado] || "bg-muted text-muted-foreground"}`}>
                    {estadoLabel[c.estado] || c.estado}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}