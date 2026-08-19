import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, AlertCircle, Plus, X, CheckCircle2 } from "lucide-react";

const INTENSITY_LABEL = { renueva_7: "Renueva 7", activa_7: "Activa 7", evoluciona_7: "Evoluciona 7" };
const PAY_METHODS = [{ key: "efectivo", label: "Efectivo" }, { key: "transferencia", label: "Transferencia" }, { key: "tarjeta", label: "Tarjeta" }, { key: "otro", label: "Otro" }];

export default function AliadaVentas() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState(null);
  const [formError, setFormError] = useState(null);
  const [form, setForm] = useState({ clienta_id: "", intensity: "renueva_7", generation_id: "", delivery_date: "", payment_method: "efectivo", payment_status: "paid", discount_amount: "", discount_reason: "" });

  const load = async () => {
    try {
      const res = await base44.functions.invoke("getAliadaVentas", {});
      setData(res.data);
      if (res.data?.generations?.[0]) setForm((f) => ({ ...f, generation_id: f.generation_id || res.data.generations[0].id }));
    } catch (err) { setError(err.message || "Error"); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const stockFor = (intensity) => (data?.inventory || []).find((i) => i.intensity === intensity)?.available ?? 0;

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true); setFormError(null); setResult(null);
    try {
      const res = await base44.functions.invoke("registerSale", form);
      setResult(res.data);
      setShowForm(false);
      await load();
    } catch (err) {
      setFormError(err?.response?.data?.error || err.message || "No se pudo registrar la venta.");
    } finally { setSaving(false); }
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-revive-green" /></div>;
  if (error) return <div className="bg-red-50 border border-red-200 rounded-xl p-6 flex items-start gap-3"><AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" /><p className="text-sm text-red-700">{error}</p></div>;

  const sales = data?.sales || [];
  const clientas = data?.clientas || [];
  const generations = data?.generations || [];

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-2xl text-revive-dark">Ventas</h1>
          <p className="text-sm text-muted-foreground">{sales.length} ventas registradas</p>
        </div>
        <button onClick={() => { setShowForm(true); setResult(null); }} className="flex items-center gap-2 bg-revive-green text-revive-dark font-heading font-bold px-4 py-2.5 rounded-xl">
          <Plus className="w-4 h-4" /> Registrar venta
        </button>
      </div>

      {result && (
        <div className="bg-revive-green-pale border border-revive-green/30 rounded-xl p-4 space-y-1">
          <div className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-revive-green" /><p className="font-heading font-bold text-revive-dark">Venta registrada</p></div>
          <p className="text-sm text-revive-dark/80">Monto: ${result.amount} · {result.activated ? "Programa activado" : "Pendiente de pago"}</p>
          <p className="text-sm text-revive-dark/80">Inventario restante: {result.remaining_inventory} {result.weekly_cycle_id ? `· Semana ${result.weekly_cycle_id ? "" : ""}` : ""}</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={submit} className="bg-white border border-border rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-revive-dark">Registrar venta</h2>
            <button type="button" onClick={() => setShowForm(false)}><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          <div>
            <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Clienta</label>
            <select value={form.clienta_id} onChange={(e) => setForm({ ...form, clienta_id: e.target.value })} required className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-white">
              <option value="">Selecciona clienta</option>
              {clientas.map((c) => <option key={c.id} value={c.user_id}>{c.full_name}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Kit / Intensidad</label>
              <select value={form.intensity} onChange={(e) => setForm({ ...form, intensity: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-white">
                {Object.keys(INTENSITY_LABEL).map((k) => <option key={k} value={k}>{INTENSITY_LABEL[k]} ({stockFor(k)} disp.)</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Generación</label>
              <select value={form.generation_id} onChange={(e) => setForm({ ...form, generation_id: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-white">
                {generations.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Fecha entrega</label>
              <input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Método de pago</label>
              <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-white">
                {PAY_METHODS.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase mb-1">Estado de pago</label>
              <select value={form.payment_status} onChange={(e) => setForm({ ...form, payment_status: e.target.value })} className="w-full border border-input rounded-lg px-3 py-2.5 text-sm bg-white">
                <option value="pending">Pendiente</option>
                <option value="partial">Parcial</option>
                <option value="paid">Pagada (activa programa)</option>
                <option value="authorized_complimentary">Cortesía autorizada (activa)</option>
              </select>
            </div>
            <input placeholder="Descuento (opcional)" type="number" value={form.discount_amount} onChange={(e) => setForm({ ...form, discount_amount: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm" />
            <input placeholder="Motivo del descuento" value={form.discount_reason} onChange={(e) => setForm({ ...form, discount_reason: e.target.value })} className="border border-input rounded-lg px-3 py-2.5 text-sm" />
          </div>
          {formError && <p className="text-sm text-red-600">{formError}</p>}
          <button type="submit" disabled={saving} className="w-full flex items-center justify-center gap-2 bg-revive-green text-revive-dark font-heading font-bold py-3 rounded-xl disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrar venta"}
          </button>
        </form>
      )}

      {sales.length === 0 && !showForm ? (
        <div className="bg-white border border-border rounded-xl p-12 text-center text-muted-foreground">No tienes ventas registradas.</div>
      ) : (
        <div className="space-y-2">
          {sales.sort((a, b) => (b.sale_date || "").localeCompare(a.sale_date || "")).map((s) => (
            <div key={s.id} className="bg-white border border-border rounded-xl p-4">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-revive-dark truncate">{INTENSITY_LABEL[s.intensity] || s.intensity}</p>
                  <p className="text-xs text-muted-foreground">${s.amount} · {s.sale_date || ""}</p>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.status === "active" ? "bg-green-100 text-green-700" : s.status === "cancelled" ? "bg-gray-200 text-gray-600" : "bg-amber-100 text-amber-700"}`}>
                  {s.status === "active" ? "Activa" : s.status === "cancelled" ? "Cancelada" : "Pendiente"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">{s.payment_method} · {s.payment_status}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}