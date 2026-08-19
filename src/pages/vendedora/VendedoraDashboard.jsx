import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import MetricCard from "@/components/MetricCard";
import { Users, ShoppingBag, AlertCircle, Activity, Copy, CheckCircle } from "lucide-react";

const estadoStyle = {
  activa: "bg-revive-green-pale text-revive-dark",
  pendiente_recompra: "bg-yellow-100 text-yellow-700",
  vencida: "bg-red-100 text-red-600",
  completada: "bg-blue-100 text-blue-700",
};
const estadoLabel = { activa: "Activa", pendiente_recompra: "⚡ Recompra pendiente", vencida: "⚠ Vencida", completada: "✓ Completada" };

export default function VendedoraDashboard() {
  const [vendedora, setVendedora] = useState(null);
  const [clientas, setClientas] = useState([]);
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const init = async () => {
      const me = await base44.auth.me();
      const vs = await base44.entities.Vendedora.filter({ user_id: me.id });
      if (vs.length > 0) {
        const v = vs[0];
        setVendedora(v);
        const [cl, co] = await Promise.all([
          base44.entities.Clienta.filter({ vendedora_id: v.id }),
          base44.entities.Compra.filter({ vendedora_id: v.id }),
        ]);
        setClientas(cl); setCompras(co);
      }
      setLoading(false);
    };
    init();
  }, []);

  const copy = () => {
    if (!vendedora) return;
    navigator.clipboard.writeText(`${window.location.origin}/registro?aliada=${vendedora.codigo_aliada}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" /></div>;

  if (!vendedora) return (
    <div className="text-center py-20">
      <p className="text-muted-foreground text-lg">Tu perfil de vendedora no está configurado aún.</p>
      <p className="text-sm text-muted-foreground mt-2">Contacta al administrador para que lo active.</p>
    </div>
  );

  const activas = clientas.filter(c => c.estado === "activa");
  const pendientes = clientas.filter(c => c.estado === "pendiente_recompra");
  const vencidas = clientas.filter(c => c.estado === "vencida");
  const comprasSemana = compras.filter(c => new Date(c.fecha_compra) >= new Date(Date.now() - 7 * 86400000));

  return (
    <div className="space-y-8">
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-muted-foreground text-sm font-heading font-semibold uppercase tracking-wide">Hola,</p>
            <h1 className="font-heading font-bold text-2xl text-revive-dark">{vendedora.nombre}</h1>
            <p className="text-muted-foreground text-sm mt-1">Aliada Ser Vivo · <span className="font-mono font-bold text-revive-dark bg-revive-green-pale px-1.5 py-0.5 rounded text-xs">{vendedora.codigo_aliada}</span></p>
          </div>
          <button onClick={copy} className="flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-revive-green-light transition-colors">
            {copied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "¡Copiado!" : "Copiar mi enlace"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard icon={Users} label="Mis clientas" value={clientas.length} color="dark" />
        <MetricCard icon={Activity} label="Activas" value={activas.length} color="green" />
        <MetricCard icon={AlertCircle} label="Pendientes recompra" value={pendientes.length} color="yellow" />
        <MetricCard icon={ShoppingBag} label="Compras esta semana" value={comprasSemana.length} color="dark" />
      </div>

      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-heading font-bold text-revive-dark">Mis clientas — seguimiento</h2>
          <Link to="/vendedora/clientas" className="text-revive-green text-xs font-heading font-semibold hover:underline">Ver todas</Link>
        </div>
        <div className="space-y-3">
          {[...pendientes, ...vencidas, ...activas].slice(0, 8).length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">Aún no tienes clientas. ¡Comparte tu enlace para empezar!</p>
          )}
          {[...pendientes, ...vencidas, ...activas].slice(0, 8).map(c => (
            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-revive-cream/50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-revive-green flex items-center justify-center text-white font-heading font-bold text-sm flex-shrink-0">
                  {c.nombre?.[0] || "?"}
                </div>
                <div>
                  <p className="font-heading font-semibold text-revive-dark text-sm">{c.nombre}</p>
                  <p className="text-xs text-muted-foreground">{c.dias_desbloqueados || 0} días desbloqueados</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-20 hidden sm:block">
                  <div className="bg-border rounded-full h-1.5">
                    <div className="bg-revive-green h-1.5 rounded-full" style={{ width: `${Math.min(100, ((c.dias_desbloqueados || 0) / 90) * 100)}%` }} />
                  </div>
                </div>
                <span className={`text-xs font-heading font-bold px-2.5 py-1 rounded-full whitespace-nowrap ${estadoStyle[c.estado] || "bg-muted text-muted-foreground"}`}>
                  {estadoLabel[c.estado] || c.estado}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}