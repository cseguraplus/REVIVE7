import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts";

export default function AdminReportes() {
  const [compras, setCompras] = useState([]);
  const [clientas, setClientas] = useState([]);
  const [vendedoras, setVendedoras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      base44.entities.Compra.list("-fecha_compra", 500),
      base44.entities.Clienta.list(),
      base44.entities.Vendedora.list(),
    ]).then(([co, cl, v]) => { setCompras(co); setClientas(cl); setVendedoras(v); setLoading(false); });
  }, []);

  // Compras por semana del programa
  const compraPorSemana = Array.from({ length: 13 }, (_, i) => ({
    semana: `S${i + 1}`,
    compras: compras.filter(c => c.semana_numero === i + 1).length,
  }));

  // Ventas por vendedora
  const ventasPorVendedora = vendedoras.map(v => ({
    nombre: v.nombre.split(" ")[0],
    compras: compras.filter(c => c.vendedora_id === v.id).length,
    clientas: clientas.filter(c => c.vendedora_id === v.id).length,
  })).sort((a, b) => b.compras - a.compras).slice(0, 8);

  const totalIngresos = compras.reduce((s, c) => s + (c.monto || 0), 0);
  const tasaRecompra = compras.length > 0 ? Math.round((compras.length / Math.max(clientas.length, 1)) * 100) / 100 : 0;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Reportes</h1>
        <p className="text-muted-foreground text-sm mt-1">Análisis del ecosistema Revive 7</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total compras", val: compras.length },
          { label: "Ingresos totales", val: `$${totalIngresos.toLocaleString("es-MX")}` },
          { label: "Compras / clienta", val: tasaRecompra.toFixed(1) },
          { label: "Clientas completadas", val: clientas.filter(c => c.estado === "completada").length },
        ].map(({ label, val }) => (
          <div key={label} className="bg-white rounded-2xl border border-border p-5 shadow-sm text-center">
            <p className="text-muted-foreground text-xs font-heading font-semibold uppercase tracking-wide mb-2">{label}</p>
            <p className="font-heading font-extrabold text-2xl text-revive-dark">{val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="font-heading font-bold text-revive-dark mb-6">Compras por semana del programa</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={compraPorSemana} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4e8" />
              <XAxis dataKey="semana" tick={{ fontSize: 11, fontFamily: "Montserrat" }} />
              <YAxis tick={{ fontSize: 11, fontFamily: "Montserrat" }} />
              <Tooltip contentStyle={{ fontFamily: "Lato", fontSize: 12, borderRadius: 8, border: "1px solid #e0e8cc" }} />
              <Bar dataKey="compras" fill="#A5C223" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
          <h2 className="font-heading font-bold text-revive-dark mb-6">Ranking de vendedoras (compras)</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ventasPorVendedora} layout="vertical" barSize={14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4e8" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11, fontFamily: "Montserrat" }} width={60} />
              <Tooltip contentStyle={{ fontFamily: "Lato", fontSize: 12, borderRadius: 8 }} />
              <Bar dataKey="compras" fill="#103439" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Estado clientas */}
      <div className="bg-white rounded-2xl border border-border p-6 shadow-sm">
        <h2 className="font-heading font-bold text-revive-dark mb-5">Estado de clientas</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { estado: "activa", label: "Activas", color: "bg-revive-green-pale text-revive-dark" },
            { estado: "pendiente_recompra", label: "Pendientes recompra", color: "bg-yellow-100 text-yellow-700" },
            { estado: "vencida", label: "Vencidas", color: "bg-red-100 text-red-600" },
            { estado: "completada", label: "Completadas", color: "bg-blue-100 text-blue-700" },
          ].map(({ estado, label, color }) => (
            <div key={estado} className={`rounded-xl p-4 ${color} text-center`}>
              <p className="font-heading font-extrabold text-3xl">{clientas.filter(c => c.estado === estado).length}</p>
              <p className="text-xs font-heading font-semibold mt-1 opacity-80">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}