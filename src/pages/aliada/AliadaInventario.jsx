import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, Package } from "lucide-react";

const INTENSITY_LABEL = { renueva_7: "Renueva 7", activa_7: "Activa 7", evoluciona_7: "Evoluciona 7" };
const STATUS_LABEL = { in_stock: "En existencia", low_stock: "Bajo", out_of_stock: "Agotado" };

export default function AliadaInventario() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.functions.invoke("getAliadaVentas", {}).then((res) => setData(res.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;

  const inventory = data?.inventory || [];
  const movements = data?.movements || [];

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Inventario</h1>
        <p className="text-sm text-muted-foreground">Existencia disponible por Kit (solo lectura). Solicita carga a Operaciones.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Object.keys(INTENSITY_LABEL).map((k) => {
          const inv = inventory.find((i) => i.intensity === k);
          const available = inv?.available ?? 0;
          const status = inv?.status ?? "out_of_stock";
          return (
            <div key={k} className="bg-white border border-border rounded-2xl p-5 text-center">
              <Package className="w-7 h-7 text-revive-green mx-auto mb-2" />
              <p className="font-heading font-bold text-revive-dark">{INTENSITY_LABEL[k]}</p>
              <p className="font-heading font-extrabold text-3xl text-revive-dark mt-1">{available}</p>
              <p className="text-xs text-muted-foreground">disponibles</p>
              <span className={`inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full ${status === "in_stock" ? "bg-green-100 text-green-700" : status === "low_stock" ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{STATUS_LABEL[status] || status}</span>
            </div>
          );
        })}
      </div>

      <div className="bg-white border border-border rounded-2xl p-5">
        <h2 className="font-heading font-bold text-revive-dark text-sm mb-3">Movimientos recientes</h2>
        {movements.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Sin movimientos.</p>
        ) : (
          <div className="space-y-2">
            {movements.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || "")).slice(0, 15).map((m) => (
              <div key={m.id} className="flex items-center justify-between bg-revive-cream rounded-lg px-3 py-2 text-xs">
                <div>
                  <p className="font-heading font-semibold text-revive-dark">{m.movement_type === "sale" ? "Venta" : m.movement_type === "sale_reversal" ? "Reverso" : m.movement_type}</p>
                  <p className="text-muted-foreground">{INTENSITY_LABEL[m.intensity] || m.intensity} · {m.reason || ""}</p>
                </div>
                <span className={`font-heading font-bold ${m.quantity < 0 ? "text-red-600" : "text-revive-green"}`}>{m.quantity > 0 ? "+" : ""}{m.quantity}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}