import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import MetricCard from "@/components/MetricCard";
import { Users, Star, ShoppingBag, AlertCircle, TrendingUp, CheckCircle, Activity } from "lucide-react";

export default function AdminDashboard() {
  const [vendedoras, setVendedoras] = useState([]);
  const [clientas, setClientas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Vendedora.list(),
      base44.entities.Clienta.list(),
      base44.entities.Compra.list("-created_date", 200),
    ]).then(([v, c, co]) => {
      setVendedoras(v);
      setClientas(c);
      setCompras(co);
      setLoading(false);
    });
  }, []);

  const today = new Date();
  const weekAgo = new Date(today - 7 * 86400000);
  const comprasSemana = compras.filter(c => new Date(c.fecha_compra) >= weekAgo);
  const activas = clientas.filter(c => c.estado === "activa");
  const pendientes = clientas.filter(c => c.estado === "pendiente_recompra");
  const vencidas = clientas.filter(c => c.estado === "vencida");
  const progProm = clientas.length > 0 ? Math.round(clientas.reduce((s, c) => s + (c.dias_desbloqueados || 0), 0) / clientas.length) : 0;

  // Ranking vendedoras
  const ranking = vendedoras.map(v => ({
    ...v,
    misClientas: clientas.filter(c => c.vendedora_id === v.id).length,
    misCompras: compras.filter(c => c.vendedora_id === v.id).length,
  })).sort((a, b) => b.misCompras - a.misCompras).slice(0, 5);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Dashboard General</h1>
        <p className="text-muted-foreground text-sm mt-1">Ecosistema Revive 7 — Vista completa</p>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <MetricCard icon={Star} label="Vendedoras" value={vendedoras.length} color="dark" />
        <MetricCard icon={Users} label="Clientas" value={clientas.length} color="green" />
        <MetricCard icon={Activity} label="Activas" value={activas.length} sub={`${pendientes.length} pendientes de recompra`} color="green" />
        <MetricCard icon={ShoppingBag} label="Compras esta semana" value={comprasSemana.length} color="dark" />
        <MetricCard icon={AlertCircle} label="Pendientes recompra" value={pendientes.length} color="yellow" />
        <MetricCard icon={TrendingUp} label="Vencidas" value={vencidas.length} color="red" />
        <MetricCard icon={CheckCircle} label="Progreso promedio" value={`${progProm} días`} sub="de 90 días del programa" color="blue" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ranking Vendedoras */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-heading font-bold text-revive-dark">Ranking de Vendedoras</h2>
            <Link to="/admin/vendedoras" className="text-revive-green text-xs font-heading font-semibold hover:underline">Ver todas</Link>
          </div>
          <div className="space-y-3">
            {ranking.length === 0 && <p className="text-muted-foreground text-sm text-center py-6">Sin vendedoras registradas.</p>}
            {ranking.map((v, i) => (
              <div key={v.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-revive-cream/50 transition-colors">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-heading font-black ${i === 0 ? "bg-revive-green text-revive-dark" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                <div className="flex-1">
                  <p className="font-heading font-semibold text-revive-dark text-sm">{v.nombre}</p>
                  <p className="text-xs text-muted-foreground">{v.misClientas} clientas · {v.misCompras} compras</p>
                </div>
                <span className="text-revive-green font-heading font-bold text-sm">{v.misCompras} kits</span>
              </div>
            ))}
          </div>
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="font-heading font-bold text-revive-dark mb-5">Clientas que necesitan atención</h2>
          <div className="space-y-3 max-h-72 overflow-y-auto">
            {[...pendientes, ...vencidas].length === 0 && <p className="text-muted-foreground text-sm text-center py-6">¡Todo al día! Sin alertas.</p>}
            {[...pendientes.slice(0, 5), ...vencidas.slice(0, 3)].map(c => (
              <div key={c.id} className="flex items-center justify-between p-3 rounded-xl bg-revive-cream/50">
                <div>
                  <p className="font-heading font-semibold text-revive-dark text-sm">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground">{c.dias_desbloqueados || 0} días desbloqueados</p>
                </div>
                <span className={`text-xs font-heading font-bold px-2.5 py-1 rounded-full ${c.estado === "pendiente_recompra" ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-600"}`}>
                  {c.estado === "pendiente_recompra" ? "Pendiente" : "Vencida"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}