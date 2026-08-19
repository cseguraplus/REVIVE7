import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Loader2, CheckCircle } from "lucide-react";

export default function VendedoraCompras() {
  const [vendedora, setVendedora] = useState(null);
  const [clientas, setClientas] = useState([]);
  const [form, setForm] = useState({ clienta_id: "", semana_numero: 1, monto: "", fecha_compra: new Date().toISOString().split("T")[0] });
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const me = await base44.auth.me();
      const vs = await base44.entities.Vendedora.filter({ user_id: me.id });
      if (vs.length > 0) {
        setVendedora(vs[0]);
        const cl = await base44.entities.Clienta.filter({ vendedora_id: vs[0].id });
        setClientas(cl);
      }
      setLoading(false);
    };
    init();
  }, []);

  const clientaMap = Object.fromEntries(clientas.map(c => [c.id, c]));

  const save = async (e) => {
    e.preventDefault(); setSaving(true);
    const clienta = clientaMap[form.clienta_id];
    const nuevosDias = Math.min((clienta?.dias_desbloqueados || 0) + 7, 90);

    try {
      await base44.entities.Compra.create({
        clienta_id: form.clienta_id,
        vendedora_id: vendedora.id,
        kit_nombre: `Kit Semana ${form.semana_numero}`,
        semana_numero: parseInt(form.semana_numero),
        dias_desbloqueados: 7,
        monto: parseFloat(form.monto) || 0,
        fecha_compra: form.fecha_compra,
      });

      await base44.entities.Clienta.update(form.clienta_id, {
        dias_desbloqueados: nuevosDias,
        estado: nuevosDias >= 90 ? "completada" : "activa",
      });

      setDone(clienta?.nombre);
      setForm({ clienta_id: "", semana_numero: 1, monto: "", fecha_compra: new Date().toISOString().split("T")[0] });

      // Reload clientas
      const cl = await base44.entities.Clienta.filter({ vendedora_id: vendedora.id });
      setClientas(cl);
      setTimeout(() => setDone(null), 4000);
    } catch (err) {
      console.error("[VendedoraCompras] save error:", err);
      setError(err?.message || "No se pudo registrar la compra. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-revive-green border-t-transparent rounded-full animate-spin" /></div>;

  const selectedClienta = clientaMap[form.clienta_id];
  const semanaSiguiente = selectedClienta ? Math.floor((selectedClienta.dias_desbloqueados || 0) / 7) + 1 : 1;

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-revive-dark">Registrar Compra</h1>
        <p className="text-muted-foreground text-sm mt-1">Cada kit semanal desbloquea 7 días del programa.</p>
      </div>

      {done && (
        <div className="bg-revive-green-pale border border-revive-green/30 rounded-2xl p-5 flex items-center gap-4">
          <CheckCircle className="w-8 h-8 text-revive-green flex-shrink-0" />
          <div>
            <p className="font-heading font-bold text-revive-dark">¡Compra registrada!</p>
            <p className="text-sm text-muted-foreground">{done} tiene 7 nuevos días desbloqueados en su programa.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={save} className="bg-white rounded-2xl border border-border p-6 shadow-sm space-y-5">
        <div>
          <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Clienta</label>
          <select required value={form.clienta_id} onChange={e => setForm(p => ({ ...p, clienta_id: e.target.value, semana_numero: Math.floor((clientaMap[e.target.value]?.dias_desbloqueados || 0) / 7) + 1 }))}
            className="w-full border border-input rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 bg-white">
            <option value="">Seleccionar clienta</option>
            {clientas.map(c => (
              <option key={c.id} value={c.id}>{c.nombre} — {c.dias_desbloqueados || 0} días actuales</option>
            ))}
          </select>
        </div>

        {selectedClienta && (
          <div className="bg-revive-cream rounded-xl p-4 border border-revive-green/20">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-heading font-semibold text-revive-dark uppercase tracking-wide">Progreso de {selectedClienta.nombre}</span>
              <span className="text-xs font-heading font-bold text-revive-green">{selectedClienta.dias_desbloqueados || 0}/90 días</span>
            </div>
            <div className="bg-white/60 rounded-full h-2">
              <div className="bg-revive-green h-2 rounded-full transition-all" style={{ width: `${Math.min(100, ((selectedClienta.dias_desbloqueados || 0) / 90) * 100)}%` }} />
            </div>
            <p className="text-xs text-muted-foreground mt-2">Esta compra desbloqueará <strong className="text-revive-dark">7 días más</strong> → llegará a <strong className="text-revive-dark">{Math.min((selectedClienta.dias_desbloqueados || 0) + 7, 90)} días</strong></p>
          </div>
        )}

        <div>
          <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Semana del kit</label>
          <select value={form.semana_numero} onChange={e => setForm(p => ({ ...p, semana_numero: parseInt(e.target.value) }))}
            className="w-full border border-input rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30 bg-white">
            {Array.from({ length: 13 }, (_, i) => (
              <option key={i + 1} value={i + 1}>Semana {i + 1} — Kit S{i + 1}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Monto</label>
            <input type="number" step="0.01" value={form.monto} onChange={e => setForm(p => ({ ...p, monto: e.target.value }))}
              placeholder="0.00" className="w-full border border-input rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
          </div>
          <div>
            <label className="block text-xs font-heading font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Fecha</label>
            <input type="date" required value={form.fecha_compra} onChange={e => setForm(p => ({ ...p, fecha_compra: e.target.value }))}
              className="w-full border border-input rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-revive-green/30" />
          </div>
        </div>

        <button type="submit" disabled={saving || !form.clienta_id}
          className="w-full bg-revive-green text-revive-dark font-heading font-bold py-4 rounded-xl hover:bg-revive-green-light transition-colors flex items-center justify-center gap-2 disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Registrar compra — Desbloquear 7 días"}
        </button>
      </form>
    </div>
  );
}